'use client';

import { use, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle, XCircle, User, Mail, Phone,
  MapPin, Loader2, Download, Upload, Wand2,
  ShieldCheck, AlertTriangle, Clock, Lock, History, CalendarDays, Info,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import {
  type RequestDetail, type Profile,
  normaliseProfile, sha256Hex, generateDocument,
  buildRequestPayload, hashPayload,
} from '@/app/lib/utils/Docgenerators';
import { recordDocumentOnChain } from '@/app/lib/blockchain';

/* ─── helpers ─────────────────────────────────────────────────────────── */
const toSentenceCase = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '—';
const fmtDocType = (s: string) =>
  (s ?? '—').split(/[\s-]/).map(toSentenceCase).join(' ');

/* ─── sub-components ──────────────────────────────────────────────────── */
const SectionLabel = ({ label }: { label: string }) => (
  <p className="mono text-[11px] tracking-[0.2em] uppercase text-[#6C6C74] dark:text-[#9090A0] border-b border-[#E8E6E1] dark:border-[#2C2C32] pb-2 mb-4">{label}</p>
);
const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1">{label}</p>
    <p className="text-[13px] font-medium text-[#1A1A1C] dark:text-[#EAEAEC]">{value ?? '—'}</p>
  </div>
);
const IconDetail = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) => (
  <div className="flex items-start gap-3 py-3 border-b border-[#E8E6E1] dark:border-[#2C2C32] last:border-0">
    <Icon className="w-4 h-4 text-[#6C6C74] dark:text-[#9090A0] mt-0.5 flex-shrink-0" />
    <div>
      <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-0.5">{label}</p>
      <p className="text-[13px] text-[#1A1A1C] dark:text-[#EAEAEC]">{value ?? '—'}</p>
    </div>
  </div>
);
const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, string> = {
    pending:            'text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30',
    secretary_approved: 'text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30',
    approved:           'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30',
    rejected:           'text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30',
  };
  const labels: Record<string, string> = {
    pending: 'Pending', secretary_approved: 'Secretary Approved',
    approved: 'Approved', rejected: 'Rejected',
  };
  return <span className={`mono text-[10px] font-bold tracking-[0.12em] uppercase px-2.5 py-1 border ${cfg[status] ?? cfg.pending}`}>{labels[status] ?? status}</span>;
};
const AlertBanner = ({ variant, children, onClose }: { variant: 'error'|'success'|'warning'|'info'; children: React.ReactNode; onClose?: () => void }) => {
  const cfg = {
    error:   'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400',
    success: 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
    warning: 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
    info:    'border-blue-400 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400',
  };
  return (
    <div className={`border-l-2 pl-4 py-2.5 pr-3 flex items-start justify-between gap-3 ${cfg[variant]}`}>
      <p className="text-[13px] leading-snug">{children}</p>
      {onClose && <button onClick={onClose} className="text-[11px] font-bold opacity-60 hover:opacity-100 flex-shrink-0 mt-0.5">x</button>}
    </div>
  );
};
const ActionBtn = ({ label, icon: Icon, onClick, disabled, variant = 'default', loading }: {
  label: string; icon: React.ElementType; onClick: () => void;
  disabled?: boolean; variant?: 'default'|'danger'|'orange'|'blue'; loading?: boolean;
}) => {
  const cls = {
    default: 'bg-[#1a1917] dark:bg-[#f0eee8] text-white dark:text-[#1a1917] hover:bg-[#3d3b36] dark:hover:bg-white border-[#1A1A1C] dark:border-[#EAEAEC]',
    orange:  'bg-orange-600 text-white hover:bg-orange-700 border-orange-600',
    blue:    'bg-blue-600 text-white hover:bg-blue-700 border-blue-600',
    danger:  'bg-transparent text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-400 dark:border-red-700',
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled || loading} className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 border rounded-xl text-[12px] font-semibold transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden ${cls}`}>
      <span className="flex-shrink-0">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}</span>
      <span className="truncate">{loading ? 'Processing...' : label}</span>
    </button>
  );
};
const HashDisplay = ({
  hash, txHash, onRecord, recording,
}: {
  hash: string;
  txHash?: string | null;
  onRecord?: () => void;
  recording?: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="border-l-2 border-emerald-500 pl-3 py-1 space-y-2">
      <div>
        <div className="flex items-center gap-2 mb-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /><span className="mono text-[10px] font-bold tracking-[0.1em] uppercase text-emerald-600 dark:text-emerald-400">SHA-256 Hash</span></div>
        <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] break-all leading-relaxed mb-1">{hash}</p>
        <button onClick={() => { navigator.clipboard.writeText(hash); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="mono text-[10px] text-orange-600 dark:text-orange-400 hover:underline">{copied ? 'Copied' : 'Copy hash'}</button>
      </div>
      {txHash ? (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span className="mono text-[10px] font-bold tracking-[0.1em] uppercase text-blue-500">On-Chain (Sepolia)</span>
          </div>
          <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="mono text-[10px] text-blue-500 hover:underline break-all">
            {txHash.slice(0, 20)}…{txHash.slice(-10)} ↗
          </a>
        </div>
      ) : onRecord && (
        <button
          onClick={onRecord}
          disabled={recording}
          className="mono text-[10px] text-blue-500 hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {recording
            ? <><Loader2 className="w-3 h-3 animate-spin inline mr-1" />Recording on Sepolia…</>
            : '⛓ Record hash on Sepolia blockchain'}
        </button>
      )}
    </div>
  );
};
const Modal = ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.15 }} onClick={e => e.stopPropagation()} className="w-full max-w-md mx-4 bg-[#fafaf9] dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] p-6">
        <div className="flex items-center justify-between border-b border-[#E8E6E1] dark:border-[#2C2C32] pb-3 mb-5">
          <h2 className="mono text-[14px] font-bold text-[#1A1A1C] dark:text-[#EAEAEC] tracking-tight uppercase">{title}</h2>
          <button onClick={onClose} className="text-[#7a7870] hover:text-[#1a1917] dark:hover:text-[#f0eee8] transition-colors mono text-[13px]">x</button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};

/* ─── Approval Flow Banner ────────────────────────────────────────────── */
function ApprovalFlowBanner({ status, bypassEnabled, isOath }: { status: string; bypassEnabled: boolean; isOath: boolean }) {
  const steps = [
    { key: 'pending',            label: 'Step 1', title: isOath ? 'Kagawad Review' : 'Secretary Review', done: status !== 'pending' },
    { key: 'secretary_approved', label: 'Step 2', title: 'Captain Approval', done: status === 'approved' },
    { key: 'approved',           label: 'Done',   title: 'Fully Approved',   done: status === 'approved' },
  ];
  return (
    <div className="border border-[#E8E6E1] dark:border-[#2C2C32] p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <p className="mono text-[10px] tracking-[0.18em] uppercase text-[#6C6C74] dark:text-[#9090A0]">Approval Flow</p>
        {bypassEnabled && (
          <span className="mono text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
            Bypass ON
          </span>
        )}
      </div>
      <div className="flex items-center">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-2 border ${
              step.done
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
                : status === step.key
                ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400'
                : 'border-[#E8E6E1] dark:border-[#2C2C32] text-[#6C6C74] dark:text-[#9090A0]'
            }`}>
              {step.done ? <CheckCircle className="w-3 h-3" /> : status === step.key ? <Clock className="w-3 h-3 animate-pulse" /> : <Lock className="w-3 h-3" />}
              <div>
                <p className="mono text-[9px] tracking-[0.1em] uppercase opacity-70">{step.label}</p>
                <p className="mono text-[10px] font-bold">{step.title}</p>
              </div>
            </div>
            {i < steps.length - 1 && <div className={`h-px w-6 ${step.done ? 'bg-emerald-400' : 'bg-[#e8e5e0] dark:bg-[#222228]'}`} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── buildExtraDetails ───────────────────────────────────────────────── */
function buildExtraDetails(req: RequestDetail) {
  switch (req.document_type) {
    case 'barangay-clearance':       return [{ label: 'Purok / Zone', value: req.purok }, { label: 'CTC Number', value: req.ctc_no }, { label: 'CTC Date Issued', value: req.ctc_date_issued }, { label: 'CTC Place Issued', value: req.ctc_place_issued }];
    case 'business-clearance':       return [{ label: 'Business Name', value: req.business_name }, { label: 'Location / Purok', value: req.purok }, { label: 'CTC Number', value: req.ctc_no }, { label: 'CTC Date Issued', value: req.ctc_date_issued }, { label: 'CTC Place Issued', value: req.ctc_place_issued }];
    case 'certification-of-death':   return [{ label: 'Deceased Name', value: req.deceased_name }, { label: 'Age at Death', value: req.deceased_age }, { label: 'Date of Death', value: req.date_of_death }, { label: 'Place of Death', value: req.place_of_death }, { label: "Deceased's Home Address", value: req.deceased_address }, { label: 'Relationship', value: req.relationship_to_deceased }];
    case 'job-seeker':               return [{ label: 'BCN Number', value: req.bcn_no }, { label: 'Purok / Zone', value: req.purok }, { label: 'Years of Residency', value: req.years_of_residency }];
    case 'oath-of-undertaking':      return [{ label: 'Purok / Zone', value: req.purok }, { label: 'Years of Residency', value: req.years_of_residency }];
    case 'certificate-of-indigency': return [{ label: 'Purok / Zone', value: req.purok }, { label: 'CTC Number', value: req.ctc_no }, { label: 'CTC Date Issued', value: req.ctc_date_issued }, { label: 'CTC Place Issued', value: req.ctc_place_issued }];
    case 'certificate-of-residency': return [{ label: 'Purok / Zone', value: req.purok }, { label: 'CTC Number', value: req.ctc_no }, { label: 'CTC Date Issued', value: req.ctc_date_issued }, { label: 'CTC Place Issued', value: req.ctc_place_issued }, { label: 'Years Lived', value: req.years_lived }, { label: 'Months Lived', value: req.months_lived }];
    case 'barangay-certification':   return [{ label: 'Purok / Zone', value: req.purok }, { label: 'CTC Number', value: req.ctc_no }, { label: 'CTC Date Issued', value: req.ctc_date_issued }, { label: 'CTC Place Issued', value: req.ctc_place_issued }];
    default: return [];
  }
}

/* ─── Page ────────────────────────────────────────────────────────────── */

/* ─── Edit History Panel ──────────────────────────────────────────────── */
interface EditHistoryEntry {
  id: string;
  field_label: string;
  old_value: string;
  new_value: string;
  user_name: string | null;
  user_email: string | null;
  created_at: string;
}

function EditHistoryPanel({ requestId }: { requestId: string }) {
  const [history, setHistory] = useState<EditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/request-edits?requestId=${requestId}`)
      .then(r => r.json())
      .then(j => setHistory(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [requestId]);

  if (loading || history.length === 0) return null;

  return (
    <div>
      <SectionLabel label="Resident Edit History" />
      <div className="space-y-3">
        {history.map(h => {
          const who = h.user_name ?? h.user_email ?? 'Resident';
          return (
            <div key={h.id} className="flex items-start gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="mono text-[10px] tracking-[0.1em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1">
                  {h.field_label} · <span className="normal-case not-italic">{who}</span>
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] text-[#6C6C74] dark:text-[#9090A0] line-through">
                    {h.old_value || '(empty)'}
                  </span>
                  <span className="text-[10px] text-[#B0B0B8]">→</span>
                  <span className="text-[12px] font-medium text-[#1A1A1C] dark:text-[#EAEAEC]">
                    {h.new_value || '(empty)'}
                  </span>
                </div>
              </div>
              <span className="mono text-[10px] text-[#B0B0B8] dark:text-[#5c5a54] flex-shrink-0">
                {new Date(h.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ReviewRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }    = use(params);
  const router    = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);

  const [request,           setRequest]           = useState<RequestDetail | null>(null);
  const [profile,           setProfile]           = useState<Profile | null>(null);
  const [adminId,           setAdminId]           = useState<string | null>(null);
  const [adminEmail,        setAdminEmail]        = useState<string | null>(null);
  const [adminName,         setAdminName]         = useState<string | null>(null);
  const [adminPosition,     setAdminPosition]     = useState<string | null>(null);
  const [loading,           setLoading]           = useState(true);
  const [notFound,          setNotFound]          = useState(false);

  // ── Bypass: fetched fresh from DB every time this page loads ──────────────
  // This ensures the approval page always reflects the current setting,
  // not a stale value from a previous navigation.
  const [bypassEnabled, setBypassEnabled] = useState(false);

  const [showSecModal,    setShowSecModal]    = useState(false);
  const [showCapModal,    setShowCapModal]    = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason,    setRejectReason]    = useState('');
  const [approvalNotes,   setApprovalNotes]   = useState('');
  // Expiry date: defaults to 1 month from today, admin can override in Captain modal
  const [expiryDate,      setExpiryDate]      = useState<string>(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [processing,      setProcessing]      = useState(false);
  const [error,           setError]           = useState('');
  const [success,         setSuccess]         = useState('');

  const [generating,        setGenerating]        = useState(false);
  const [uploading,         setUploading]         = useState(false);
  const [generatedBlob,     setGeneratedBlob]     = useState<Blob | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState('');
  const [uploadedHash,        setUploadedHash]        = useState<string | null>(null);
  const [uploadedPayloadHash, setUploadedPayloadHash] = useState<string | null>(null);
  const [chainTxHash,       setChainTxHash]       = useState<string | null>(null);
  const [chainRecording,    setChainRecording]    = useState(false);
  const [chainError,        setChainError]        = useState('');

  useEffect(() => {
    (async () => {
      try {
        // Admin identity
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAdminId(user.id);
          setAdminEmail(user.email ?? null);
          const ar = await fetch(`/api/profile?id=${user.id}`);
          if (ar.ok) {
            const aj = await ar.json();
            const p = aj.data;
            if (p) {
              const name = `${p.firstName ?? p.first_name ?? ''} ${p.lastName ?? p.last_name ?? ''}`.trim();
              if (name) setAdminName(name);
              const pos = p.position ?? p.position ?? null;
              if (pos) setAdminPosition(pos);
            }
          }
        }

        // Fetch bypass setting fresh from DB — never rely on local state
        // from the settings page, which may have changed in another tab/session.
        const { data: settings } = await supabase
          .from('barangay_settings')
          .select('bypass_two_step_approval')
          .eq('id', 1)
          .single();
        setBypassEnabled(settings?.bypass_two_step_approval ?? false);

        // Load request
        const r = await fetch(`/api/requests?id=${id}`);
        if (!r.ok) { setNotFound(true); return; }
        const j = await r.json();
        if (!j.data?.[0]) { setNotFound(true); return; }
        const rd: RequestDetail = j.data[0];
        setRequest(rd);
        if (rd.file_hash)    setUploadedHash(rd.file_hash);
        if (rd.payload_hash) setUploadedPayloadHash(rd.payload_hash);
        if (rd.chain_tx_hash) setChainTxHash(rd.chain_tx_hash);

        // Load resident profile
        const pr = await fetch(`/api/profile?id=${rd.user_id}`);
        if (pr.ok) { const pj = await pr.json(); setProfile(normaliseProfile(pj.data)); }
      } catch { setNotFound(true); }
      finally  { setLoading(false); }
    })();
  }, [id]);

  const auditMeta = () => ({ admin_id: adminId, admin_email: adminEmail, admin_name: adminName });

  /* ── Secretary approve ────────────────────────────────────────────────── */
  const handleSecretaryApprove = async () => {
    setProcessing(true); setError('');
    try {
      const res = await fetch(`/api/requests?id=${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'secretary_approved', notes: approvalNotes || null, secretary_approved_at: new Date().toISOString(), ...auditMeta() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Failed.');
      setRequest(p => p ? { ...p, status: 'secretary_approved', notes: approvalNotes || null } : p);
      setShowSecModal(false); setApprovalNotes('');
      setSuccess('Secretary approval recorded. Awaiting Captain final approval.');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed.'); }
    finally { setProcessing(false); }
  };

  /* ── Captain approve ──────────────────────────────────────────────────── */
  const handleCaptainApprove = async () => {
    setProcessing(true); setError('');
    try {
      const res = await fetch(`/api/requests?id=${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', notes: approvalNotes || null, processed_at: new Date().toISOString(), ...auditMeta() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Failed.');
      setRequest(p => p ? { ...p, status: 'approved', notes: approvalNotes || null } : p);
      setShowCapModal(false); setApprovalNotes('');
      setSuccess('Request fully approved. Generate and upload the document below.');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed.'); }
    finally { setProcessing(false); }
  };

  /* ── Reject ───────────────────────────────────────────────────────────── */
  const handleReject = async () => {
    if (!rejectReason.trim()) { setError('Please provide a reason.'); return; }
    setProcessing(true); setError('');
    try {
      const res = await fetch(`/api/requests?id=${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', notes: rejectReason, processed_at: new Date().toISOString(), ...auditMeta() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Failed.');
      setShowRejectModal(false);
      router.push('/pending-requests');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed.'); }
    finally { setProcessing(false); }
  };

  /* ── Document ─────────────────────────────────────────────────────────── */
  const handleGenerate = async () => {
    if (!request || !profile) return;
    setGenerating(true); setError('');
    try {
      const { blob, fileName } = await generateDocument(request, profile);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      setGeneratedBlob(blob); setGeneratedFileName(fileName);
      setSuccess('Document generated. Upload it below.');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to generate.'); }
    finally { setGenerating(false); }
  };

  const uploadFile = async (file: Blob, fileName: string) => {
    setUploading(true); setError(''); setChainError('');
    try {
      // ── File-only hash (kept for independent file verification) ───────────────
      const fileHash = await sha256Hex(file);

      // ── Combined payload hash (file bytes + all locked metadata) ─────────────
      // Hash (file bytes || canonical payload string) so the blockchain record
      // proves the file AND every metadata field together.
      const _profile    = request ? normaliseProfile(request as unknown as Record<string, string>) : { id: '', firstName: '', lastName: '', email: '' };
      const payloadStr  = request ? buildRequestPayload(request, _profile) : '';
      const payloadHash = await hashPayload(file, payloadStr);

      const storagePath = `documents/${id}/${fileName}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(storagePath, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath);

      // Persist file_hash (file only), payload_hash (combined), and the
      // human-readable snapshot of every locked field.
      const res = await fetch(`/api/requests?id=${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url:         urlData.publicUrl,
          file_hash:        fileHash,
          payload_hash:     payloadHash,
          payload_snapshot: payloadStr,
          ...auditMeta(),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Failed.');
      setRequest(p => p ? { ...p, file_url: urlData.publicUrl, file_hash: fileHash } : p);
      setUploadedHash(fileHash);   // 🟦 fileHash stored — verify page sends this to /api/payload-snapshot to resolve payloadHash
      setUploadedPayloadHash(payloadHash); // 🟧 payloadHash stored — this is what goes on-chain
      setSuccess('Document uploaded. Recording hash on blockchain…');

      // ── Record on-chain (payload hash 🟧 — what the verify page resolves to) ──
      setChainRecording(true);
      try {
        const docType  = request?.document_type ?? request?.type ?? 'barangay-document';
        const expUnix  = expiryDate ? Math.floor(new Date(expiryDate).getTime() / 1000) : undefined;
        const txHash   = await recordDocumentOnChain(payloadHash, docType, expUnix);
        setChainTxHash(txHash);
        setRequest(p => p ? { ...p, chain_tx_hash: txHash } : p);
        await fetch(`/api/requests?id=${id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chain_tx_hash: txHash }),
        });
        setSuccess('Document uploaded and hash recorded on the Sepolia blockchain. ✅');
      } catch (chainErr: unknown) {
        setChainError(chainErr instanceof Error ? chainErr.message : 'Blockchain recording failed.');
        setSuccess('Document uploaded. Blockchain recording failed — see warning below.');
      } finally { setChainRecording(false); }
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed to upload.'); }
    finally { setUploading(false); }
  };

  const handleRecordOnChain = async () => {
    if (!uploadedPayloadHash || !request) return;
    setChainError(''); setChainRecording(true);
    try {
      const docType = request.document_type ?? request.type ?? 'barangay-document';
      const expUnix = expiryDate ? Math.floor(new Date(expiryDate).getTime() / 1000) : undefined;
      const txHash  = await recordDocumentOnChain(uploadedPayloadHash, docType, expUnix);
      setChainTxHash(txHash);
      setRequest(p => p ? { ...p, chain_tx_hash: txHash } : p);
      await fetch(`/api/requests?id=${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chain_tx_hash: txHash }),
      });
      setSuccess('Hash recorded on the Sepolia blockchain. ✅');
    } catch (chainErr: unknown) {
      setChainError(chainErr instanceof Error ? chainErr.message : 'Blockchain recording failed.');
    } finally { setChainRecording(false); }
  };

  /* ── Early returns ────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5F3] dark:bg-[#111113]">
      <span className="mono text-[12px] tracking-[0.25em] text-[#6C6C74] dark:text-[#9090A0] uppercase animate-pulse">Loading...</span>
    </div>
  );
  if (notFound || !request) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5F3] dark:bg-[#111113]">
      <div className="text-center">
        <p className="text-[14px] text-[#3A3A3E] dark:text-[#BABABC] mb-4">Request not found.</p>
        <Link href="/pending-requests" className="mono text-[11px] tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 hover:underline">Back to Pending Requests</Link>
      </div>
    </div>
  );

  const displayPurpose = request.purpose === 'others' && request.custom_purpose ? request.custom_purpose : request.purpose;
  const daysAgo = Math.floor((Date.now() - new Date(request.created_at).getTime()) / 86_400_000);
  const extraDetails = buildExtraDetails(request);

  const isPending       = request.status === 'pending';
  const isSecApproved   = request.status === 'secretary_approved';
  const isFullyApproved = request.status === 'approved';
  const isRejected      = request.status === 'rejected';

  // Is this document type handled by Kagawad instead of Secretary for Step 1?
  const isOath = (request.document_type ?? request.type) === 'oath-of-undertaking';

  // Who does Step 1 for this document?
  const step1Role = isOath ? 'Barangay Kagawad' : 'Barangay Secretary';

  // Captain can approve if bypass is ON or secretary/kagawad has already approved
  const captainCanApprove = bypassEnabled || isSecApproved;
  // Captain button is locked when: request is still pending AND bypass is OFF
  const captainLocked = isPending && !bypassEnabled;

  // Can this admin perform Step 1?
  const canDoStep1 = adminPosition === step1Role;
  // Can this admin perform Step 2 / Reject / Generate?
  const canDoStep2 = adminPosition === 'Barangay Captain';
  // Does this admin have any action at all?
  const hasActions = canDoStep1 || canDoStep2;

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap'); .pg{font-family:'Plus Jakarta Sans',sans-serif}`}</style>
      <input ref={uploadRef} type="file" accept=".docx,.pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, f.name); }} />

      <div className="pjs min-h-screen bg-[#F6F5F3] dark:bg-[#111113] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* MASTHEAD */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b-2 border-[#1A1A1C] dark:border-[#EAEAEC] pb-5 mb-10">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="mono text-[11px] tracking-[0.25em] text-[#6C6C74] dark:text-[#9090A0] uppercase">{request.id.slice(0, 8).toUpperCase()}</p>
                  <StatusBadge status={request.status} />
                  {daysAgo >= 2 && !isFullyApproved && !isRejected && (
                    <span className="flex items-center gap-1 mono text-[10px] font-bold text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-3 h-3" />{daysAgo} days waiting
                    </span>
                  )}
                </div>
                <h1 className="text-[26px] font-bold text-[#1A1A1C] dark:text-[#EAEAEC] tracking-tight leading-tight">
                  {fmtDocType(request.type ?? request.document_type).toUpperCase()}
                </h1>
              </div>
              <Link href="/pending-requests" className="mono text-[11px] tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors">
                Back to Pending
              </Link>
            </div>
          </motion.div>

          {/* ALERTS */}
          {(error || success) && (
            <div className="mb-8 space-y-3">
              {error      && <AlertBanner variant="error"   onClose={() => setError('')}>{error}</AlertBanner>}
              {chainError && <AlertBanner variant="error"   onClose={() => setChainError('')}>Blockchain: {chainError}</AlertBanner>}
              {success    && <AlertBanner variant="success" onClose={() => setSuccess('')}>{success}</AlertBanner>}
            </div>
          )}

          {/* FLOW BANNER */}
          {!isRejected && <ApprovalFlowBanner status={request.status} bypassEnabled={bypassEnabled} isOath={isOath} />}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* LEFT — details */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="lg:col-span-2 space-y-10">
              <div>
                <SectionLabel label="Request Information" />
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <DetailRow label="Document Type" value={fmtDocType(request.type ?? request.document_type)} />
                  <DetailRow label="Purpose"       value={displayPurpose ?? '—'} />
                  <DetailRow label="Date Requested" value={new Date(request.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} />
                  <DetailRow label="Waiting"       value={daysAgo === 0 ? 'Submitted today' : `${daysAgo} day${daysAgo > 1 ? 's' : ''}`} />
                  {request.additional_info && (
                    <div className="col-span-2">
                      <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">Additional Information</p>
                      <p className="text-[13px] text-[#3A3A3E] dark:text-[#BABABC] leading-relaxed border-l-2 border-[#E8E6E1] dark:border-[#2C2C32] pl-3">{request.additional_info}</p>
                    </div>
                  )}
                </div>
              </div>

              {extraDetails.length > 0 && (
                <div>
                  <SectionLabel label="Submitted Information" />
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    {extraDetails.map(d => <DetailRow key={d.label} label={d.label} value={d.value ?? undefined} />)}
                  </div>
                </div>
              )}

              <EditHistoryPanel requestId={request.id} />

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

            {/* RIGHT — actions + document */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="space-y-8">

              {/* ACTIONS */}
              <div>
                <SectionLabel label="Actions" />

                {isRejected ? (
                  <div className="flex items-center gap-2 py-2">
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span className="text-[13px] font-semibold text-red-600 dark:text-red-400">Rejected</span>
                  </div>
                ) : isFullyApproved ? (
                  <div className="flex items-center gap-2 py-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">Fully Approved</span>
                  </div>
                ) : (
                  <div className="space-y-4">

                    {/* Step 1 — Secretary or Kagawad depending on document type */}
                    {canDoStep1 && (
                    <div>
                      <p className="mono text-[10px] tracking-[0.15em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1.5">
                        Step 1 — {step1Role}
                      </p>
                      {isSecApproved ? (
                        <div className="flex items-center gap-2 px-3 py-2 border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30">
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                          <span className="text-[12px] text-emerald-700 dark:text-emerald-400">{step1Role} approved</span>
                        </div>
                      ) : (
                        <ActionBtn
                          label={`${step1Role}: Approve`}
                          icon={CheckCircle}
                          variant="blue"
                          onClick={() => setShowSecModal(true)}
                          disabled={!isPending}
                        />
                      )}
                    </div>
                    )}

                    {/* Step 2 — Captain (hidden from Secretary and Kagawad) */}
                    {canDoStep2 && (
                    <div>
                      <p className="mono text-[10px] tracking-[0.15em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1.5">
                        Step 2 — Barangay Captain
                        {bypassEnabled && (
                          <span className="ml-2 mono text-[9px] font-bold tracking-[0.1em] uppercase px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                            Bypass ON
                          </span>
                        )}
                      </p>
                      {captainLocked ? (
                        <div className="space-y-2">
                          {adminPosition === 'Barangay Captain' ? (
                            <>
                              <button
                                disabled
                                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border rounded-xl text-[12px] font-semibold transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400"
                              >
                                <Clock className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">Wait for Secretary Approval</span>
                              </button>
                              <div className="border-l-2 border-amber-400 pl-3 py-1">
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
                                  The Secretary must approve this request first before you can give final approval.
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 px-3 py-2.5 border border-[#E8E6E1] dark:border-[#2C2C32] bg-[#f5f4f0] dark:bg-[#1C1C1F] opacity-60 cursor-not-allowed">
                                <Lock className="w-4 h-4 text-[#6C6C74] dark:text-[#9090A0] flex-shrink-0" />
                                <span className="text-[12px] font-semibold text-[#6C6C74] dark:text-[#9090A0]">Captain Approval Locked</span>
                              </div>
                              <div className="border-l-2 border-amber-400 pl-3 py-1">
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
                                  Waiting for Secretary approval before the Captain can approve this document. To skip this requirement, enable Bypass in Settings.
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      ) : (
                        <ActionBtn
                          label="Captain: Final Approval"
                          icon={CheckCircle}
                          variant="orange"
                          onClick={() => setShowCapModal(true)}
                        />
                      )}
                    </div>
                    )}

                    {/* Reject */}
                    {hasActions && (
                    <div>
                      <p className="mono text-[10px] tracking-[0.15em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1.5">Reject</p>
                      <ActionBtn label="Reject Request" icon={XCircle} variant="danger" onClick={() => setShowRejectModal(true)} />
                    </div>
                    )}
                  </div>
                )}

                {request.notes && (
                  <div className="mt-4 border-l-2 border-[#E8E6E1] dark:border-[#2C2C32] pl-3">
                    <p className="mono text-[10px] tracking-[0.1em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1">
                      {request.status === 'rejected' ? 'Rejection Reason' : 'Notes'}
                    </p>
                    <p className="text-[12px] text-[#3A3A3E] dark:text-[#BABABC] leading-relaxed">{request.notes}</p>
                  </div>
                )}
              </div>

              {/* NO POSITION NOTICE */}
                {!hasActions && !isRejected && !isFullyApproved && (
                  <div className="mt-4 flex items-start gap-2.5 px-3 py-3 border border-[#E8E6E1] dark:border-[#2C2C32] bg-[#f5f4f0] dark:bg-[#1C1C1F] rounded-xl">
                    <Info className="w-4 h-4 text-[#6C6C74] dark:text-[#9090A0] flex-shrink-0 mt-0.5" />
                    <p className="text-[12px] text-[#6C6C74] dark:text-[#9090A0] leading-snug">
                      You have no available actions here because you have no assigned Barangay Position. Contact your Super Admin to assign you a role.
                    </p>
                  </div>
                )}

              {/* DOCUMENT */}
              {hasActions && (
              <div>
                <SectionLabel label="Document" />
                <div className="space-y-2.5">
                  {request.file_url && (
                    <>
                      <a href={request.file_url} target="_blank" rel="noopener noreferrer" download>
                        <button className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-[#E8E6E1] dark:border-[#2C2C32] text-[12px] font-semibold text-[#3A3A3E] dark:text-[#BABABC] hover:border-[#1a1917] dark:hover:border-[#f0eee8] hover:text-[#1a1917] dark:hover:text-[#f0eee8] transition-colors">
                          <Download className="w-4 h-4" />Download Uploaded Document
                        </button>
                      </a>
                      {uploadedHash && <HashDisplay hash={uploadedHash} txHash={chainTxHash} onRecord={handleRecordOnChain} recording={chainRecording} />}
                      <div className="flex items-center gap-3 py-1">
                        <div className="flex-1 h-px bg-[#E8E6E1] dark:bg-[#2C2C32]" />
                        <span className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] uppercase tracking-wider">or replace</span>
                        <div className="flex-1 h-px bg-[#E8E6E1] dark:bg-[#2C2C32]" />
                      </div>
                    </>
                  )}
                  {!request.file_url && (
                    <p className="text-[12px] text-[#6C6C74] dark:text-[#9090A0] leading-relaxed mb-1">
                      Generate the document, then upload it so the resident can download it.
                    </p>
                  )}
                  <ActionBtn label={request.file_url ? 'Re-generate Document' : 'Step 1: Generate .docx'} icon={Wand2} onClick={handleGenerate} loading={generating} disabled={generating || uploading} />
                  {generatedBlob && (
                    <ActionBtn label={`Step 2: Upload Document`} icon={Upload} onClick={() => uploadFile(generatedBlob, generatedFileName)} loading={uploading} disabled={uploading} />
                  )}
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-[#E8E6E1] dark:bg-[#2C2C32]" />
                    <span className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] uppercase tracking-wider">or upload manually</span>
                    <div className="flex-1 h-px bg-[#E8E6E1] dark:bg-[#2C2C32]" />
                  </div>
                  <button onClick={() => uploadRef.current?.click()} disabled={uploading} className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-[#E8E6E1] dark:border-[#2C2C32] text-[12px] font-semibold text-[#3A3A3E] dark:text-[#BABABC] hover:border-[#1a1917] dark:hover:border-[#f0eee8] hover:text-[#1a1917] dark:hover:text-[#f0eee8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Upload className="w-4 h-4" />Upload Existing File (.docx or .pdf)
                  </button>
                  {!request.file_url && uploadedHash && <HashDisplay hash={uploadedHash} txHash={chainTxHash} onRecord={handleRecordOnChain} recording={chainRecording} />}
                </div>
              </div>
              )}

            </motion.div>
          </div>
        </div>
      </div>

      {/* SECRETARY MODAL */}
      <Modal open={showSecModal} onClose={() => setShowSecModal(false)} title={`${step1Role} Approval — Step 1`}>
        <div className="space-y-4">
          <AlertBanner variant="info">{step1Role} is endorsing this request for the Captain's final approval.</AlertBanner>
          <div>
            <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">Endorsement Notes (Optional)</p>
            <textarea value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)} rows={3} placeholder="Add endorsement notes..." className="w-full px-3 py-2.5 text-[13px] bg-white dark:bg-[#16161a] border border-[#E8E6E1] dark:border-[#2C2C32] text-[#1A1A1C] dark:text-[#EAEAEC] placeholder-[#7a7870] dark:placeholder-[#7e7b75] focus:outline-none focus:border-blue-500 resize-none transition-colors" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowSecModal(false)} disabled={processing} className="flex-1 py-2.5 text-[12px] font-semibold border border-[#E8E6E1] dark:border-[#2C2C32] text-[#6C6C74] dark:text-[#9090A0] hover:border-[#1a1917] dark:hover:border-[#f0eee8] hover:text-[#1a1917] dark:hover:text-[#f0eee8] transition-colors disabled:opacity-40">Cancel</button>
            <button onClick={handleSecretaryApprove} disabled={processing} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40">
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {processing ? 'Processing...' : 'Endorse to Captain'}
            </button>
          </div>
        </div>
      </Modal>

      {/* CAPTAIN MODAL */}
      <Modal open={showCapModal} onClose={() => setShowCapModal(false)} title="Captain Final Approval — Step 2">
        <div className="space-y-4">
          <AlertBanner variant="success">
            {bypassEnabled && !isSecApproved
              ? 'Bypass mode is ON — approving without Secretary endorsement.'
              : 'Secretary has endorsed this request. Confirming final approval.'}
          </AlertBanner>
          <div>
            <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">Approval Notes (Optional)</p>
            <textarea value={approvalNotes} onChange={e => setApprovalNotes(e.target.value)} rows={3} placeholder="Add approval notes..." className="w-full px-3 py-2.5 text-[13px] bg-white dark:bg-[#16161a] border border-[#E8E6E1] dark:border-[#2C2C32] text-[#1A1A1C] dark:text-[#EAEAEC] placeholder-[#7a7870] dark:placeholder-[#7e7b75] focus:outline-none focus:border-[#E8500A] resize-none transition-colors" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-3.5 h-3.5 text-[#E8500A]" />
              <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#6C6C74] dark:text-[#9090A0]">Document Expiry Date</p>
            </div>
            <input
              type="date"
              value={expiryDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2.5 text-[13px] bg-white dark:bg-[#16161a] border border-[#E8E6E1] dark:border-[#2C2C32] text-[#1A1A1C] dark:text-[#EAEAEC] focus:outline-none focus:border-[#E8500A] transition-colors"
            />
            <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] mt-1.5">
              This date will be recorded on-chain as the document's expiry. Defaults to 1 month from today.
            </p>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowCapModal(false)} disabled={processing} className="flex-1 py-2.5 text-[12px] font-semibold border border-[#E8E6E1] dark:border-[#2C2C32] text-[#6C6C74] dark:text-[#9090A0] hover:border-[#1a1917] dark:hover:border-[#f0eee8] hover:text-[#1a1917] dark:hover:text-[#f0eee8] transition-colors disabled:opacity-40">Cancel</button>
            <button onClick={handleCaptainApprove} disabled={processing} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold rounded-xl bg-[#E8500A] text-white hover:bg-[#C44008] transition-colors disabled:opacity-40">
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {processing ? 'Processing...' : 'Confirm Final Approval'}
            </button>
          </div>
        </div>
      </Modal>

      {/* REJECT MODAL */}
      <Modal open={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Request">
        <div className="space-y-4">
          <AlertBanner variant="warning">Please provide a clear reason for rejection.</AlertBanner>
          <div>
            <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">Reason for Rejection <span className="text-red-500">*</span></p>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={4} placeholder="Explain why this request is being rejected..." className="w-full px-3 py-2.5 text-[13px] bg-white dark:bg-[#16161a] border border-[#E8E6E1] dark:border-[#2C2C32] text-[#1A1A1C] dark:text-[#EAEAEC] placeholder-[#7a7870] dark:placeholder-[#7e7b75] focus:outline-none focus:border-[#E8500A] resize-none transition-colors" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={() => setShowRejectModal(false)} disabled={processing} className="flex-1 py-2.5 text-[12px] font-semibold border border-[#E8E6E1] dark:border-[#2C2C32] text-[#6C6C74] dark:text-[#9090A0] hover:border-[#1a1917] dark:hover:border-[#f0eee8] hover:text-[#1a1917] dark:hover:text-[#f0eee8] transition-colors disabled:opacity-40">Cancel</button>
            <button onClick={handleReject} disabled={processing} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40">
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              {processing ? 'Processing...' : 'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}