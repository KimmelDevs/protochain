'use client';

import { use, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle, User, Mail, Phone, MapPin,
  Loader2, Download, Upload, Wand2, ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import {
  type RequestDetail, type Profile,
  normaliseProfile, sha256Hex, generateDocument,
} from '@/app/lib/utils/Docgenerators';

/* ─────────────────────────── helpers ───────────────────────────────────── */
const toSentenceCase = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '—';

const fmtDocType = (s: string) =>
  (s ?? '—').split(/[\s-]/).map(toSentenceCase).join(' ');

/* ─────────────────────────── sub-components ────────────────────────────── */
const SectionLabel = ({ label }: { label: string }) => (
  <p className="mono text-[11px] tracking-[0.2em] uppercase text-[#5c5a54] dark:text-[#9e9b94] border-b border-[#c8c6c0] dark:border-[#2a2a32] pb-2 mb-4">
    {label}
  </p>
);

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-1">
      {label}
    </p>
    <p className="text-[13px] font-medium text-[#1a1917] dark:text-[#f0eee8]">
      {value ?? '—'}
    </p>
  </div>
);

const IconDetail = ({
  icon: Icon, label, value,
}: { icon: React.ElementType; label: string; value?: string }) => (
  <div className="flex items-start gap-3 py-3 border-b border-[#e8e5e0] dark:border-[#222228] last:border-0">
    <Icon className="w-4 h-4 text-[#7a7870] dark:text-[#7e7b75] mt-0.5 flex-shrink-0" />
    <div>
      <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-0.5">
        {label}
      </p>
      <p className="text-[13px] text-[#1a1917] dark:text-[#f0eee8]">{value ?? '—'}</p>
    </div>
  </div>
);

const AlertBanner = ({
  variant, children, onClose,
}: { variant: 'error' | 'success'; children: React.ReactNode; onClose?: () => void }) => {
  const cls = variant === 'success'
    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
    : 'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400';
  return (
    <div className={`border-l-2 pl-4 py-2.5 pr-3 flex items-start justify-between gap-3 ${cls}`}>
      <p className="text-[13px] leading-snug">{children}</p>
      {onClose && (
        <button onClick={onClose} className="mono text-[11px] font-bold opacity-60 hover:opacity-100 flex-shrink-0 mt-0.5">✕</button>
      )}
    </div>
  );
};

const HashDisplay = ({ hash }: { hash: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="border-l-2 border-emerald-500 pl-3 py-1">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="mono text-[10px] font-bold tracking-[0.1em] uppercase text-emerald-600 dark:text-emerald-400">
          SHA-256 Hash
        </span>
      </div>
      <p className="mono text-[10px] text-[#5c5a54] dark:text-[#9e9b94] break-all leading-relaxed mb-1">
        {hash}
      </p>
      <button
        onClick={() => { navigator.clipboard.writeText(hash); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="mono text-[10px] text-orange-600 dark:text-orange-400 hover:underline"
      >
        {copied ? '✓ Copied' : 'Copy hash'}
      </button>
    </div>
  );
};

const OutlineBtn = ({
  label, icon: Icon, onClick, disabled, loading,
}: { label: string; icon: React.ElementType; onClick: () => void; disabled?: boolean; loading?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-[#c8c6c0] dark:border-[#2a2a32] text-[12px] font-semibold text-[#3d3b36] dark:text-[#c9c6be] hover:border-[#1a1917] dark:hover:border-[#f0eee8] hover:text-[#1a1917] dark:hover:text-[#f0eee8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
    {loading ? 'Processing…' : label}
  </button>
);

const FillBtn = ({
  label, icon: Icon, onClick, disabled, loading,
}: { label: string; icon: React.ElementType; onClick: () => void; disabled?: boolean; loading?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#1a1917] dark:bg-[#f0eee8] text-white dark:text-[#1a1917] text-[12px] font-semibold hover:bg-[#3d3b36] dark:hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
    {loading ? 'Processing…' : label}
  </button>
);

/* ─────────────────────────── buildExtraDetails ─────────────────────────── */
function buildExtraDetails(req: RequestDetail) {
  switch (req.document_type) {
    case 'barangay-clearance':
      return [
        { label: 'Purok / Zone',      value: req.purok },
        { label: 'CTC Number',        value: req.ctc_no },
        { label: 'CTC Date Issued',   value: req.ctc_date_issued },
        { label: 'CTC Place Issued',  value: req.ctc_place_issued },
      ];
    case 'business-clearance':
      return [
        { label: 'Business Name',    value: req.business_name },
        { label: 'Location / Purok', value: req.purok },
      ];
    case 'certification-of-death':
      return [
        { label: 'Deceased Name',     value: req.deceased_name },
        { label: 'Age at Death',      value: req.deceased_age },
        { label: 'Date of Death',     value: req.date_of_death },
        { label: 'Place of Death',    value: req.place_of_death },
        { label: 'Relationship',      value: req.relationship_to_deceased },
      ];
    case 'job-seeker':
      return [
        { label: 'BCN Number',         value: req.bcn_no },
        { label: 'Purok / Zone',       value: req.purok },
        { label: 'Years of Residency', value: req.years_of_residency },
      ];
    case 'oath-of-undertaking':
      return [
        { label: 'Purok / Zone',       value: req.purok },
        { label: 'Years of Residency', value: req.years_of_residency },
      ];
    default:
      return [];
  }
}

/* ─────────────────────────── page ──────────────────────────────────────── */
export default function ApprovedDocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }    = use(params);
  const uploadRef = useRef<HTMLInputElement>(null);

  const [request,           setRequest]           = useState<RequestDetail | null>(null);
  const [profile,           setProfile]           = useState<Profile | null>(null);
  const [loading,           setLoading]           = useState(true);
  const [notFound,          setNotFound]          = useState(false);
  const [error,             setError]             = useState('');
  const [success,           setSuccess]           = useState('');
  const [generating,        setGenerating]        = useState(false);
  const [uploading,         setUploading]         = useState(false);
  const [generatedBlob,     setGeneratedBlob]     = useState<Blob | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState('');
  const [uploadedHash,      setUploadedHash]      = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/requests?id=${id}&status=approved`);
        if (!r.ok) { setNotFound(true); return; }
        const j = await r.json();
        if (!j.data?.[0]) { setNotFound(true); return; }
        const rd: RequestDetail = j.data[0];
        setRequest(rd);
        if (rd.file_hash) setUploadedHash(rd.file_hash);

        const pr = await fetch(`/api/profile?id=${rd.user_id}`);
        if (pr.ok) { const pj = await pr.json(); setProfile(normaliseProfile(pj.data)); }
      } catch { setNotFound(true); }
      finally  { setLoading(false); }
    })();
  }, [id]);

  const handleGenerate = async () => {
    if (!request || !profile) return;
    setGenerating(true); setError('');
    try {
      const { blob, fileName } = await generateDocument(request, profile);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      setGeneratedBlob(blob); setGeneratedFileName(fileName);
      setSuccess('Document generated. Upload it below to share with the resident.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to generate.');
    } finally { setGenerating(false); }
  };

  const uploadFile = async (file: Blob, fileName: string) => {
    setUploading(true); setError('');
    try {
      const hash = await sha256Hex(file);
      const path = `documents/${id}/${fileName}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
      const res = await fetch(`/api/requests?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: urlData.publicUrl, file_hash: hash }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Failed to update.');
      setRequest(p => p ? { ...p, file_url: urlData.publicUrl, file_hash: hash } : p);
      setUploadedHash(hash);
      setSuccess('Document uploaded. The resident can now download it.');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to upload.');
    } finally { setUploading(false); }
  };

  /* ── early returns ─────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f4f0] dark:bg-[#16161a]">
      <span className="mono text-[12px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase animate-pulse">
        Loading…
      </span>
    </div>
  );

  if (notFound || !request) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f4f0] dark:bg-[#16161a]">
      <div className="text-center">
        <p className="text-[14px] text-[#3d3b36] dark:text-[#c9c6be] mb-4">Document not found.</p>
        <Link href="/approved-documents" className="mono text-[11px] tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 hover:underline">
          ← Back to Approved Documents
        </Link>
      </div>
    </div>
  );

  const displayPurpose = request.purpose === 'others' && request.custom_purpose
    ? request.custom_purpose : request.purpose;
  const approvedDate  = request.processed_at ?? request.created_at;
  const extraDetails  = buildExtraDetails(request);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        .pg   { font-family: 'IBM Plex Sans', sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      <input
        ref={uploadRef}
        type="file"
        accept=".docx,.pdf"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, f.name); }}
      />

      <div className="pg min-h-screen bg-[#f5f4f0] dark:bg-[#16161a] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* ── MASTHEAD ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-b-2 border-[#1a1917] dark:border-[#f0eee8] pb-5 mb-10"
          >
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="mono text-[11px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase">
                    {request.id.slice(0, 8).toUpperCase()}
                  </p>
                  {/* approved badge */}
                  <span className="mono text-[10px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 border text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30">
                    Approved
                  </span>
                </div>
                <h1 className="mono text-2xl md:text-3xl font-bold text-[#1a1917] dark:text-[#f0eee8] tracking-tight leading-none">
                  {fmtDocType(request.type ?? request.document_type).toUpperCase()}
                </h1>
              </div>
              <Link
                href="/approved-documents"
                className="mono text-[11px] tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors"
              >
                ← Approved Documents
              </Link>
            </div>
          </motion.div>

          {/* ── ALERTS ───────────────────────────────────────────────── */}
          {(error || success) && (
            <div className="mb-8 space-y-3">
              {error   && <AlertBanner variant="error"   onClose={() => setError('')}>{error}</AlertBanner>}
              {success && <AlertBanner variant="success" onClose={() => setSuccess('')}>{success}</AlertBanner>}
            </div>
          )}

          {/* ── MAIN GRID ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* ── LEFT: details ──────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="lg:col-span-2 space-y-10"
            >
              {/* Request info */}
              <div>
                <SectionLabel label="Request Information" />
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <DetailRow label="Document Type"   value={fmtDocType(request.type ?? request.document_type)} />
                  <DetailRow label="Purpose"          value={displayPurpose ?? '—'} />
                  <DetailRow label="Date Requested"   value={new Date(request.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} />
                  <DetailRow label="Date Approved"    value={new Date(approvedDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} />
                  {request.additional_info && (
                    <div className="col-span-2">
                      <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-2">
                        Additional Information
                      </p>
                      <p className="text-[13px] text-[#3d3b36] dark:text-[#c9c6be] leading-relaxed border-l-2 border-[#c8c6c0] dark:border-[#2a2a32] pl-3">
                        {request.additional_info}
                      </p>
                    </div>
                  )}
                  {request.notes && (
                    <div className="col-span-2">
                      <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-2">
                        Approval Notes
                      </p>
                      <p className="text-[13px] text-[#3d3b36] dark:text-[#c9c6be] leading-relaxed border-l-2 border-emerald-400 pl-3">
                        {request.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Extra submitted details */}
              {extraDetails.length > 0 && (
                <div>
                  <SectionLabel label="Submitted Information" />
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    {extraDetails.map(d => (
                      <DetailRow key={d.label} label={d.label} value={d.value ?? undefined} />
                    ))}
                  </div>
                </div>
              )}

              {/* Applicant info */}
              {profile && (
                <div>
                  <SectionLabel label="Applicant Information" />
                  <IconDetail icon={User}   label="Full Name" value={`${profile.firstName} ${profile.lastName}`} />
                  <IconDetail icon={Mail}   label="Email"     value={profile.email} />
                  <IconDetail icon={Phone}  label="Phone"     value={profile.phone} />
                  <IconDetail icon={MapPin} label="Address"   value={profile.address} />
                  {profile.birthday && (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5 pt-4">
                      <DetailRow label="Birthday"     value={new Date(profile.birthday).toLocaleDateString('en-PH')} />
                      <DetailRow label="Civil Status" value={profile.civilStatus ?? undefined} />
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* ── RIGHT: status + document ───────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="space-y-8"
            >

              {/* Status */}
              <div>
                <SectionLabel label="Status" />
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">
                    Approved
                  </span>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="mono text-[10px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75]">Submitted</p>
                  <p className="text-[12px] text-[#3d3b36] dark:text-[#c9c6be]">
                    {new Date(request.created_at).toLocaleString('en-PH')}
                  </p>
                  <p className="mono text-[10px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mt-2">Approved</p>
                  <p className="text-[12px] text-[#3d3b36] dark:text-[#c9c6be]">
                    {new Date(approvedDate).toLocaleString('en-PH')}
                  </p>
                </div>
              </div>

              {/* Document */}
              <div>
                <SectionLabel label="Document" />
                <div className="space-y-2.5">
                  {request.file_url && (
                    <>
                      <a href={request.file_url} target="_blank" rel="noopener noreferrer" download>
                        <OutlineBtn label="Download Document" icon={Download} onClick={() => {}} />
                      </a>
                      {uploadedHash && <HashDisplay hash={uploadedHash} />}
                      <div className="flex items-center gap-3 py-1">
                        <div className="flex-1 h-px bg-[#e0deda] dark:bg-[#222228]" />
                        <span className="mono text-[10px] text-[#7a7870] dark:text-[#7e7b75] uppercase tracking-wider">or replace</span>
                        <div className="flex-1 h-px bg-[#e0deda] dark:bg-[#222228]" />
                      </div>
                    </>
                  )}

                  {!request.file_url && (
                    <p className="text-[12px] text-[#5c5a54] dark:text-[#9e9b94] leading-relaxed mb-1">
                      Generate the document, then upload it so the resident can download it.
                    </p>
                  )}

                  <FillBtn
                    label={request.file_url ? 'Re-generate Document' : 'Step 1: Generate .docx'}
                    icon={Wand2}
                    onClick={handleGenerate}
                    loading={generating}
                    disabled={generating || uploading}
                  />

                  {generatedBlob && (
                    <OutlineBtn
                      label={`Step 2: Upload "${generatedFileName}"`}
                      icon={Upload}
                      onClick={() => uploadFile(generatedBlob, generatedFileName)}
                      loading={uploading}
                      disabled={uploading}
                    />
                  )}

                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-[#e0deda] dark:bg-[#222228]" />
                    <span className="mono text-[10px] text-[#7a7870] dark:text-[#7e7b75] uppercase tracking-wider">or upload manually</span>
                    <div className="flex-1 h-px bg-[#e0deda] dark:bg-[#222228]" />
                  </div>

                  <OutlineBtn
                    label="Upload Existing File (.docx or .pdf)"
                    icon={Upload}
                    onClick={() => uploadRef.current?.click()}
                    disabled={uploading}
                  />

                  {!request.file_url && uploadedHash && <HashDisplay hash={uploadedHash} />}
                </div>
              </div>

            </motion.div>
          </div>

        </div>
      </div>
    </>
  );
}