'use client';

import { use, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import Button from '@/app/components/ui/Button';
import TextArea from '@/app/components/ui/TextArea';
import Modal from '@/app/components/ui/Modal';
import Alert from '@/app/components/ui/Alert';
import {
  ArrowLeft, CheckCircle, XCircle, User, Mail, Phone,
  MapPin, Clock, AlertCircle, Loader2,
  FileText, Download, Upload, Wand2, ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import {
  type RequestDetail,
  type Profile,
  normaliseProfile,
  sha256Hex,
  generateDocument,
} from '@/app/lib/utils/docGenerators';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReviewRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);

  const [request, setRequest]               = useState<RequestDetail | null>(null);
  const [profile, setProfile]               = useState<Profile | null>(null);
  const [loading, setLoading]               = useState(true);
  const [notFound, setNotFound]             = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal]   = useState(false);
  const [rejectReason, setRejectReason]     = useState('');
  const [approvalNotes, setApprovalNotes]   = useState('');
  const [processing, setProcessing]         = useState(false);
  const [error, setError]                   = useState('');
  const [success, setSuccess]               = useState('');
  const [generating, setGenerating]         = useState(false);
  const [uploading, setUploading]           = useState(false);
  const [generatedBlob, setGeneratedBlob]   = useState<Blob | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState('');
  const [uploadedHash, setUploadedHash]     = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        // API route decrypts SENSITIVE_FIELDS (purok, ctc_no, etc.) server-side
        const reqRes = await fetch(`/api/requests?id=${id}`);
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

  // ── Approve ────────────────────────────────────────────────────────────────

  const handleApprove = async () => {
    setProcessing(true); setError('');
    try {
      const { error: updateError } = await supabase
        .from('requests')
        .update({ status: 'approved', notes: approvalNotes || null, processed_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;
      setRequest(prev => prev ? { ...prev, status: 'approved' } : prev);
      setShowApproveModal(false);
      setSuccess('Request approved! Now generate and upload the document below.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve request.');
    } finally { setProcessing(false); }
  };

  // ── Reject ─────────────────────────────────────────────────────────────────

  const handleReject = async () => {
    if (!rejectReason.trim()) { setError('Please provide a reason for rejection.'); return; }
    setProcessing(true); setError('');
    try {
      const { error: updateError } = await supabase
        .from('requests')
        .update({ status: 'rejected', notes: rejectReason, processed_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;
      setShowRejectModal(false);
      router.push('/pending-requests');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject request.');
    } finally { setProcessing(false); }
  };

  // ── Generate ───────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!request || !profile) return;
    setGenerating(true); setError('');
    try {
      const { blob, fileName } = await generateDocument(request, profile);
      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      setGeneratedBlob(blob);
      setGeneratedFileName(fileName);
      setSuccess('Document generated and downloaded! Review it, then click "Upload to Supabase" to make it available to the resident.');
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
        <p className="text-gray-400 mb-4">Request not found</p>
        <Link href="/pending-requests"><Button>Back to Pending Requests</Button></Link>
      </CardContent></Card>
    </div>
  );

  // ── Derived values ─────────────────────────────────────────────────────────

  const displayPurpose = request.purpose === 'others' && request.custom_purpose
    ? request.custom_purpose
    : request.purpose;

  const daysWaiting = Math.floor(
    (Date.now() - new Date(request.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  const extraDetails = buildExtraDetails(request);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <input ref={uploadRef} type="file" accept=".docx,.pdf" className="hidden" onChange={handleManualUpload} />

        <Link href="/pending-requests">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />Back to Pending Requests
          </Button>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">{request.type ?? request.document_type}</h1>
            <Badge variant={request.status as any}>{request.status}</Badge>
          </div>
          <p className="text-gray-400 font-mono text-sm">ID: {request.id.toUpperCase()}</p>
        </motion.div>

        {daysWaiting >= 2 && request.status === 'pending' && (
          <div className="mb-6">
            <Alert variant="error" title="Waiting Too Long">
              This request has been waiting for {daysWaiting} days. Please process it as soon as possible.
            </Alert>
          </div>
        )}
        {error   && <div className="mb-6"><Alert variant="error"   onClose={() => setError('')}>{error}</Alert></div>}
        {success && <div className="mb-6"><Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert></div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Request info */}
            <Card>
              <CardHeader><CardTitle>Request Information</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label="Document Type" value={request.type ?? request.document_type} />
                  <DetailRow label="Purpose"        value={displayPurpose ?? '—'} />
                  <DetailRow label="Date Requested" value={new Date(request.created_at).toLocaleDateString()} />
                  <DetailRow label="Days Waiting"   value={daysWaiting === 0 ? 'Today' : `${daysWaiting} day${daysWaiting > 1 ? 's' : ''}`} />
                  {request.additional_info && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-400 mb-2">Additional Information</p>
                      <p className="text-white bg-white/5 p-3 rounded-lg">{request.additional_info}</p>
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
                  <IconRow icon={<User  className="w-5 h-5 text-gray-400" />} label="Full Name" value={`${profile.firstName} ${profile.lastName}`} />
                  <IconRow icon={<Mail  className="w-5 h-5 text-gray-400" />} label="Email"     value={profile.email} />
                  <IconRow icon={<Phone className="w-5 h-5 text-gray-400" />} label="Phone"     value={profile.phone} />
                  <IconRow icon={<MapPin className="w-5 h-5 text-gray-400" />} label="Address"  value={profile.address} />
                  {profile.birthday && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <DetailRow label="Birthday"     value={new Date(profile.birthday).toLocaleDateString()} />
                      <DetailRow label="Civil Status" value={profile.civilStatus ?? '—'} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Document generation (approved only) */}
            {request.status === 'approved' && (
              <DocumentGenerationCard
                fileUrl={request.file_url}
                uploadedHash={uploadedHash}
                generating={generating}
                uploading={uploading}
                generatedBlob={generatedBlob}
                generatedFileName={generatedFileName}
                onGenerate={handleGenerate}
                onUploadGenerated={handleUploadGenerated}
                onManualUpload={() => uploadRef.current?.click()}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {request.status === 'pending' ? (
                  <>
                    <Button className="w-full gap-2" onClick={() => setShowApproveModal(true)}>
                      <CheckCircle className="w-4 h-4" />Approve Request
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => setShowRejectModal(true)}
                    >
                      <XCircle className="w-4 h-4" />Reject Request
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-2">
                    {request.status === 'approved' && <div className="flex items-center gap-2 text-green-400 justify-center"><CheckCircle className="w-5 h-5" /><span className="font-medium">Approved</span></div>}
                    {request.status === 'rejected' && <div className="flex items-center gap-2 text-red-400   justify-center"><XCircle    className="w-5 h-5" /><span className="font-medium">Rejected</span></div>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-blue-400" />Processing Info</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Standard Processing" value="1-2 business days" />
                <DetailRow label="Date Submitted"      value={new Date(request.created_at).toLocaleString()} />
                {request.status !== 'pending' && <DetailRow label="Status" value={request.status.toUpperCase()} />}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-400 font-medium mb-1">Important</p>
                    <p className="text-xs text-gray-400">After approving, generate the document and upload it so the resident can download it.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Approve modal */}
        <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} title="Approve Request">
          <div className="space-y-4">
            <Alert variant="success">You are about to approve this request.</Alert>
            <TextArea label="Approval Notes (Optional)" value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)} rows={4} placeholder="Add any notes for this approval..." />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowApproveModal(false)} disabled={processing}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleApprove} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {processing ? 'Processing...' : 'Confirm Approval'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Reject modal */}
        <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Request">
          <div className="space-y-4">
            <Alert variant="warning">Please provide a clear reason for rejection.</Alert>
            <TextArea label="Reason for Rejection *" value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4} placeholder="Explain why this request is being rejected..." />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowRejectModal(false)} disabled={processing}>Cancel</Button>
              <Button className="flex-1 gap-2 bg-red-500 hover:bg-red-600" onClick={handleReject} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {processing ? 'Processing...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

// ─── Document Generation Card ─────────────────────────────────────────────────

function DocumentGenerationCard({
  fileUrl, uploadedHash, generating, uploading,
  generatedBlob, generatedFileName,
  onGenerate, onUploadGenerated, onManualUpload,
}: {
  fileUrl: string | null; uploadedHash: string | null;
  generating: boolean; uploading: boolean;
  generatedBlob: Blob | null; generatedFileName: string;
  onGenerate: () => void; onUploadGenerated: () => void; onManualUpload: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />Document Generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fileUrl ? (
          <div className="space-y-3">
            <Alert variant="success">Document has been uploaded. The resident can now download it.</Alert>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" download>
              <Button variant="outline" className="w-full gap-2"><Download className="w-4 h-4" />Download Uploaded Document</Button>
            </a>
            {uploadedHash && <HashDisplay hash={uploadedHash} />}
            <Divider label="or replace document" />
            <GenerateButton generating={generating} label="Re-generate & Download .docx" onClick={onGenerate} />
            {generatedBlob && <UploadButton uploading={uploading} label={`Upload "${generatedFileName}"`} onClick={onUploadGenerated} />}
            <ManualUploadButton uploading={uploading} onClick={onManualUpload} />
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Generate the document using the resident's submitted data, then upload it so they can download it.</p>
            <GenerateButton generating={generating} label="Step 1: Generate & Download .docx" onClick={onGenerate} />
            {generatedBlob && <UploadButton uploading={uploading} label={`Step 2: Upload "${generatedFileName}" to Supabase`} onClick={onUploadGenerated} />}
            <Divider label="or upload manually" />
            <ManualUploadButton uploading={uploading} onClick={onManualUpload} />
            {uploadedHash && <HashDisplay hash={uploadedHash} />}
          </div>
        )}
      </CardContent>
    </Card>
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

function ManualUploadButton({ uploading, onClick }: { uploading: boolean; onClick: () => void }) {
  return (
    <Button variant="outline" className="w-full gap-2" onClick={onClick} disabled={uploading}>
      <Upload className="w-4 h-4" />Upload Existing File (.docx or .pdf)
    </Button>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
      <div className="relative flex justify-center text-xs"><span className="bg-[#0f0f23] px-2 text-gray-500">{label}</span></div>
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
        { label: 'Purok / Zone',      value: request.purok },
        { label: 'CTC Number',        value: request.ctc_no },
        { label: 'CTC Date Issued',   value: request.ctc_date_issued },
        { label: 'CTC Place Issued',  value: request.ctc_place_issued },
      ];
    case 'business-clearance':
      return [
        { label: 'Business Name',     value: request.business_name },
        { label: 'Location / Purok',  value: request.purok },
      ];
    case 'certification-of-death':
      return [
        { label: 'Deceased Name',     value: request.deceased_name },
        { label: 'Age at Death',      value: request.deceased_age },
        { label: 'Date of Death',     value: request.date_of_death },
        { label: 'Place of Death',    value: request.place_of_death },
        { label: 'Relationship',      value: request.relationship_to_deceased },
      ];
    case 'job-seeker':
      return [
        { label: 'BCN Number',        value: request.bcn_no },
        { label: 'Purok / Zone',      value: request.purok },
        { label: 'Years of Residency', value: request.years_of_residency },
      ];
    case 'oath-of-undertaking':
      return [
        { label: 'Purok / Zone',      value: request.purok },
        { label: 'Years of Residency', value: request.years_of_residency },
      ];
    default:
      return [];
  }
}