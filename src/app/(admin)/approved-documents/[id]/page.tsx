'use client';

import { use, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import Button from '@/app/components/ui/Button';
import Alert from '@/app/components/ui/Alert';
import {
  ArrowLeft, CheckCircle, User, Mail, Phone,
  MapPin, Clock, Loader2, FileText, Download, Upload, Wand2, ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import {
  type RequestDetail,
  type Profile,
  normaliseProfile,
  sha256Hex,
  generateDocument,
} from '@/app/lib/utils/docGenerators';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ApprovedDocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const uploadRef = useRef<HTMLInputElement>(null);

  const [request, setRequest]             = useState<RequestDetail | null>(null);
  const [profile, setProfile]             = useState<Profile | null>(null);
  const [loading, setLoading]             = useState(true);
  const [notFound, setNotFound]           = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState('');
  const [generating, setGenerating]       = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState('');
  const [uploadedHash, setUploadedHash]   = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // API route decrypts SENSITIVE_FIELDS (purok, ctc_no, etc.) server-side
        const reqRes = await fetch(`/api/requests?id=${id}&status=approved`);
        if (!reqRes.ok) { setNotFound(true); return; }
        const reqJson = await reqRes.json();
        if (!reqJson.data?.[0]) { setNotFound(true); return; }
        const reqData: RequestDetail = reqJson.data[0];
        setRequest(reqData);
        if (reqData.file_hash) setUploadedHash(reqData.file_hash);

        // API route decrypts phone/address/birthday server-side.
        // normaliseProfile handles both snake_case and camelCase column names.
        const profileRes = await fetch(`/api/profile?id=${reqData.user_id}`);
        if (profileRes.ok) {
          const profileJson = await profileRes.json();
          setProfile(normaliseProfile(profileJson.data));
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // ── Generate ───────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!request || !profile) return;
    setGenerating(true); setError('');
    try {
      const { blob, fileName } = await generateDocument(request, profile);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      setGeneratedBlob(blob);
      setGeneratedFileName(fileName);
      setSuccess('Document generated and downloaded! Review it, then upload it to make it available to the resident.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate document.');
    } finally { setGenerating(false); }
  };

  // ── Upload ─────────────────────────────────────────────────────────────────

  const handleUploadGenerated = async () => {
    if (generatedBlob && generatedFileName) await uploadFile(generatedBlob, generatedFileName);
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await uploadFile(file, file.name);
  };

  const uploadFile = async (file: Blob, fileName: string) => {
    setUploading(true); setError('');
    try {
      const hash = await sha256Hex(file);

      const path = `documents/${id}/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('documents').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('requests')
        .update({ file_url: urlData.publicUrl, file_hash: hash })
        .eq('id', id);
      if (updateError) throw updateError;

      setRequest(prev => prev ? { ...prev, file_url: urlData.publicUrl, file_hash: hash } : prev);
      setUploadedHash(hash);
      setSuccess('Document uploaded and hashed! The resident can now download it.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload document.');
    } finally { setUploading(false); }
  };

  // ── Early returns ──────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  );

  if (notFound || !request) return (
    <div className="min-h-screen p-4 lg:p-8 flex items-center justify-center">
      <Card><CardContent className="p-8 text-center">
        <p className="text-gray-400 mb-4">Document not found</p>
        <Link href="/approved-documents"><Button>Back to Approved Documents</Button></Link>
      </CardContent></Card>
    </div>
  );

  // ── Derived values ─────────────────────────────────────────────────────────

  const displayPurpose = request.purpose === 'others' && request.custom_purpose
    ? request.custom_purpose
    : request.purpose;

  const approvedDate   = request.processed_at ?? request.created_at;
  const extraDetails   = buildExtraDetails(request);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <input ref={uploadRef} type="file" accept=".docx,.pdf" className="hidden" onChange={handleManualUpload} />

        <Link href="/approved-documents">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />Back to Approved Documents
          </Button>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">{request.type ?? request.document_type}</h1>
            <Badge variant="approved">approved</Badge>
          </div>
          <p className="text-gray-400 font-mono text-sm">ID: {request.id.toUpperCase()}</p>
        </motion.div>

        {error   && <div className="mb-6"><Alert variant="error"   onClose={() => setError('')}>{error}</Alert></div>}
        {success && <div className="mb-6"><Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert></div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Request info */}
            <Card>
              <CardHeader><CardTitle>Request Information</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label="Document Type"  value={request.type ?? request.document_type} />
                  <DetailRow label="Purpose"         value={displayPurpose ?? '—'} />
                  <DetailRow label="Date Requested"  value={new Date(request.created_at).toLocaleDateString()} />
                  <DetailRow label="Date Approved"   value={new Date(approvedDate).toLocaleDateString()} />
                  {request.additional_info && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-400 mb-2">Additional Information</p>
                      <p className="text-white bg-white/5 p-3 rounded-lg">{request.additional_info}</p>
                    </div>
                  )}
                  {request.notes && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-400 mb-2">Approval Notes</p>
                      <p className="text-white bg-white/5 p-3 rounded-lg">{request.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Extra doc-type fields */}
            {extraDetails.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Submitted Information</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {extraDetails.map(d => <DetailRow key={d.label} label={d.label} value={d.value ?? '—'} />)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Applicant */}
            {profile && (
              <Card>
                <CardHeader><CardTitle>Applicant Information</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <IconRow icon={<User   className="w-5 h-5 text-gray-400" />} label="Full Name" value={`${profile.firstName} ${profile.lastName}`} />
                  <IconRow icon={<Mail   className="w-5 h-5 text-gray-400" />} label="Email"     value={profile.email} />
                  <IconRow icon={<Phone  className="w-5 h-5 text-gray-400" />} label="Phone"     value={profile.phone} />
                  <IconRow icon={<MapPin className="w-5 h-5 text-gray-400" />} label="Address"   value={profile.address} />
                  {profile.birthday && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <DetailRow label="Birthday"     value={new Date(profile.birthday).toLocaleDateString()} />
                      <DetailRow label="Civil Status" value={profile.civilStatus ?? '—'} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Document generation — always shown since request is approved */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-400" />Document Generation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {request.file_url ? (
                  <div className="space-y-3">
                    <Alert variant="success">Document has been uploaded. The resident can now download it.</Alert>
                    <a href={request.file_url} target="_blank" rel="noopener noreferrer" download>
                      <Button variant="outline" className="w-full gap-2">
                        <Download className="w-4 h-4" />Download Uploaded Document
                      </Button>
                    </a>
                    {uploadedHash && <HashDisplay hash={uploadedHash} />}
                    <Divider label="or replace document" />
                    <GenerateButton generating={generating} label="Re-generate & Download .docx" onClick={handleGenerate} />
                    {generatedBlob && (
                      <UploadButton uploading={uploading} label={`Upload "${generatedFileName}"`} onClick={handleUploadGenerated} />
                    )}
                    <Button variant="outline" className="w-full gap-2" onClick={() => uploadRef.current?.click()} disabled={uploading}>
                      <Upload className="w-4 h-4" />Upload Existing File (.docx or .pdf)
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-400">Generate the document using the resident's data, then upload it so they can download it.</p>
                    <GenerateButton generating={generating} label="Step 1: Generate & Download .docx" onClick={handleGenerate} />
                    {generatedBlob && (
                      <UploadButton uploading={uploading} label={`Step 2: Upload "${generatedFileName}" to Supabase`} onClick={handleUploadGenerated} />
                    )}
                    <Divider label="or upload manually" />
                    <Button variant="outline" className="w-full gap-2" onClick={() => uploadRef.current?.click()} disabled={uploading}>
                      <Upload className="w-4 h-4" />Upload Existing File (.docx or .pdf)
                    </Button>
                    {uploadedHash && <HashDisplay hash={uploadedHash} />}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" /><span className="font-medium">Approved</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />Processing Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Date Submitted" value={new Date(request.created_at).toLocaleString()} />
                <DetailRow label="Date Approved"  value={new Date(approvedDate).toLocaleString()} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function GenerateButton({ generating, label, onClick }: { generating: boolean; label: string; onClick: () => void }) {
  return (
    <Button className="w-full gap-2" onClick={onClick} disabled={generating}>
      {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
      {generating ? 'Generating...' : label}
    </Button>
  );
}

function UploadButton({ uploading, label, onClick }: { uploading: boolean; label: string; onClick: () => void }) {
  return (
    <Button variant="outline" className="w-full gap-2" onClick={onClick} disabled={uploading}>
      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
      {uploading ? 'Uploading...' : label}
    </Button>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-[#0f0f23] px-2 text-gray-500">{label}</span>
      </div>
    </div>
  );
}

function HashDisplay({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
        <span className="text-xs font-medium text-green-400">SHA-256 Document Hash</span>
      </div>
      <p className="font-mono text-xs text-gray-300 break-all leading-relaxed">{hash}</p>
      <button
        onClick={() => { navigator.clipboard.writeText(hash); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
      >
        {copied ? '✓ Copied!' : 'Copy hash'}
      </button>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-white font-medium">{value}</p>
    </div>
  );
}

function IconRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-white">{value}</p>
      </div>
    </div>
  );
}

// ─── Extra details builder ────────────────────────────────────────────────────

function buildExtraDetails(request: RequestDetail): { label: string; value: string | null }[] {
  switch (request.document_type) {
    case 'barangay-clearance':
      return [
        { label: 'Purok / Zone',       value: request.purok },
        { label: 'CTC Number',         value: request.ctc_no },
        { label: 'CTC Date Issued',    value: request.ctc_date_issued },
        { label: 'CTC Place Issued',   value: request.ctc_place_issued },
      ];
    case 'business-clearance':
      return [
        { label: 'Business Name',      value: request.business_name },
        { label: 'Location / Purok',   value: request.purok },
      ];
    case 'certification-of-death':
      return [
        { label: 'Deceased Name',      value: request.deceased_name },
        { label: 'Age at Death',       value: request.deceased_age },
        { label: 'Date of Death',      value: request.date_of_death },
        { label: 'Place of Death',     value: request.place_of_death },
        { label: 'Relationship',       value: request.relationship_to_deceased },
      ];
    case 'job-seeker':
      return [
        { label: 'BCN Number',         value: request.bcn_no },
        { label: 'Purok / Zone',       value: request.purok },
        { label: 'Years of Residency', value: request.years_of_residency },
      ];
    case 'oath-of-undertaking':
      return [
        { label: 'Purok / Zone',       value: request.purok },
        { label: 'Years of Residency', value: request.years_of_residency },
      ];
    default:
      return [];
  }
}