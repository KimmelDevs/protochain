'use client';

import { use, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle, XCircle, User, Mail, Phone,
  MapPin, Loader2, Download, Upload, Wand2,
  ShieldCheck, AlertTriangle, Clock, Lock,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import {
  type RequestDetail, type Profile,
  normaliseProfile, sha256Hex, generateDocument,
} from '@/app/lib/utils/Docgenerators';

/* ─── helpers ─────────────────────────────────────────────────────────── */
const toSentenceCase = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '—';
const fmtDocType = (s: string) =>
  (s ?? '—').split(/[\s-]/).map(toSentenceCase).join(' ');

/* ─── sub-components ──────────────────────────────────────────────────── */
const SectionLabel = ({ label }: { label: string }) => (
  <p className="mono text-[11px] tracking-[0.2em] uppercase text-[#5c5a54] dark:text-[#9e9b94] border-b border-[#c8c6c0] dark:border-[#2a2a32] pb-2 mb-4">{label}</p>
);
const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-1">{label}</p>
    <p className="text-[13px] font-medium text-[#1a1917] dark:text-[#f0eee8]">{value ?? '—'}</p>
  </div>
);
const IconDetail = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string }) => (
  <div className="flex items-start gap-3 py-3 border-b border-[#e8e5e0] dark:border-[#222228] last:border-0">
    <Icon className="w-4 h-4 text-[#7a7870] dark:text-[#7e7b75] mt-0.5 flex-shrink-0" />
    <div>
      <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-0.5">{label}</p>
      <p className="text-[13px] text-[#1a1917] dark:text-[#f0eee8]">{value ?? '—'}</p>
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
const ActionBtn = ({ label, icon: Icon, onClick, disabled, variant='default', loading }: {
  label: string; icon: React.ElementType; onClick: () => void;
  disabled?: boolean; variant?: 'default'|'danger'|'orange'|'blue'; loading?: boolean;
}) => {
  const cls = {
    default: 'bg-[#1a1917] dark:bg-[#f0eee8] text-white dark:text-[#1a1917] hover:bg-[#3d3b36] dark:hover:bg-white border-[#1a1917] dark:border-[#f0eee8]',
    orange:  'bg-orange-600 text-white hover:bg-orange-700 border-orange-600',
    blue:    'bg-blue-600 text-white hover:bg-blue-700 border-blue-600',
    danger:  'bg-transparent text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-400 dark:border-red-700',
  }[variant];
  return (
    <button onClick={onClick} disabled={disabled||loading} className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 border text-[12px] font-semibold transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Icon className="w-4 h-4"/>}
      {loading ? 'Processing...' : label}
    </button>
  );
};
const HashDisplay = ({ hash }: { hash: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="border-l-2 border-emerald-500 pl-3 py-1">
      <div className="flex items-center gap-2 mb-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"/><span className="mono text-[10px] font-bold tracking-[0.1em] uppercase text-emerald-600 dark:text-emerald-400">SHA-256 Hash</span></div>
      <p className="mono text-[10px] text-[#5c5a54] dark:text-[#9e9b94] break-all leading-relaxed mb-1">{hash}</p>
      <button onClick={() => { navigator.clipboard.writeText(hash); setCopied(true); setTimeout(()=>setCopied(false),2000); }} className="mono text-[10px] text-orange-600 dark:text-orange-400 hover:underline">{copied ? 'Copied' : 'Copy hash'}</button>
    </div>
  );
};
const Modal = ({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <motion.div initial={{ opacity:0, scale:0.97, y:8 }} animate={{ opacity:1, scale:1, y:0 }} transition={{ duration:0.15 }} onClick={e=>e.stopPropagation()} className="w-full max-w-md mx-4 bg-[#fafaf9] dark:bg-[#1e1e24] border border-[#c8c6c0] dark:border-[#2a2a32] p-6">
        <div className="flex items-center justify-between border-b border-[#c8c6c0] dark:border-[#2a2a32] pb-3 mb-5">
          <h2 className="mono text-[14px] font-bold text-[#1a1917] dark:text-[#f0eee8] tracking-tight uppercase">{title}</h2>
          <button onClick={onClose} className="text-[#7a7870] hover:text-[#1a1917] dark:hover:text-[#f0eee8] transition-colors mono text-[13px]">x</button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};

/* ─── Approval Flow Banner ────────────────────────────────────────────── */
function ApprovalFlowBanner({ status, bypassEnabled }: { status: string; bypassEnabled: boolean }) {
  const steps = [
    { key:'pending',            label:'Step 1', title:'Secretary Review',  done: status !== 'pending' },
    { key:'secretary_approved', label:'Step 2', title:'Captain Approval',  done: status === 'approved' },
    { key:'approved',           label:'Done',   title:'Fully Approved',    done: status === 'approved' },
  ];
  return (
    <div className="border border-[#e8e5e0] dark:border-[#222228] p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <p className="mono text-[10px] tracking-[0.18em] uppercase text-[#5c5a54] dark:text-[#9e9b94]">Approval Flow</p>
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
                : 'border-[#e8e5e0] dark:border-[#222228] text-[#7a7870] dark:text-[#7e7b75]'
            }`}>
              {step.done ? <CheckCircle className="w-3 h-3"/> : status===step.key ? <Clock className="w-3 h-3 animate-pulse"/> : <Lock className="w-3 h-3"/>}
              <div>
                <p className="mono text-[9px] tracking-[0.1em] uppercase opacity-70">{step.label}</p>
                <p className="mono text-[10px] font-bold">{step.title}</p>
              </div>
            </div>
            {i < steps.length-1 && <div className={`h-px w-6 ${step.done ? 'bg-emerald-400' : 'bg-[#e8e5e0] dark:bg-[#222228]'}`}/>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── buildExtraDetails ───────────────────────────────────────────────── */
function buildExtraDetails(req: RequestDetail) {
  switch (req.document_type) {
    case 'barangay-clearance':     return [{label:'Purok / Zone',value:req.purok},{label:'CTC Number',value:req.ctc_no},{label:'CTC Date Issued',value:req.ctc_date_issued},{label:'CTC Place Issued',value:req.ctc_place_issued}];
    case 'business-clearance':     return [{label:'Business Name',value:req.business_name},{label:'Location / Purok',value:req.purok}];
    case 'certification-of-death': return [{label:'Deceased Name',value:req.deceased_name},{label:'Age at Death',value:req.deceased_age},{label:'Date of Death',value:req.date_of_death},{label:'Place of Death',value:req.place_of_death},{label:'Relationship',value:req.relationship_to_deceased}];
    case 'job-seeker':             return [{label:'BCN Number',value:req.bcn_no},{label:'Purok / Zone',value:req.purok},{label:'Years of Residency',value:req.years_of_residency}];
    case 'oath-of-undertaking':    return [{label:'Purok / Zone',value:req.purok},{label:'Years of Residency',value:req.years_of_residency}];
    default: return [];
  }
}

/* ─── Page ────────────────────────────────────────────────────────────── */
export default function ReviewRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }    = use(params);
  const router    = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);

  const [request,           setRequest]           = useState<RequestDetail|null>(null);
  const [profile,           setProfile]           = useState<Profile|null>(null);
  const [adminId,           setAdminId]           = useState<string|null>(null);
  const [adminEmail,        setAdminEmail]        = useState<string|null>(null);
  const [adminName,         setAdminName]         = useState<string|null>(null);
  const [loading,           setLoading]           = useState(true);
  const [notFound,          setNotFound]          = useState(false);
  const [bypassEnabled,     setBypassEnabled]     = useState(false);
  const [showSecModal,      setShowSecModal]      = useState(false);
  const [showCapModal,      setShowCapModal]      = useState(false);
  const [showRejectModal,   setShowRejectModal]   = useState(false);
  const [rejectReason,      setRejectReason]      = useState('');
  const [approvalNotes,     setApprovalNotes]     = useState('');
  const [processing,        setProcessing]        = useState(false);
  const [error,             setError]             = useState('');
  const [success,           setSuccess]           = useState('');
  const [generating,        setGenerating]        = useState(false);
  const [uploading,         setUploading]         = useState(false);
  const [generatedBlob,     setGeneratedBlob]     = useState<Blob|null>(null);
  const [generatedFileName, setGeneratedFileName] = useState('');
  const [uploadedHash,      setUploadedHash]      = useState<string|null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setAdminId(user.id); setAdminEmail(user.email ?? null);
          const ar = await fetch(`/api/profile?id=${user.id}`);
          if (ar.ok) { const aj = await ar.json(); const p=aj.data; if(p){const n=`${p.firstName??p.first_name??''} ${p.lastName??p.last_name??''}`.trim();if(n)setAdminName(n);} }
        }

        // Load bypass setting
        try {
          const { data: bs } = await supabase.from('barangay_settings').select('bypass_two_step_approval').eq('id',1).single();
          if (bs) setBypassEnabled(bs.bypass_two_step_approval ?? false);
        } catch {}

        const r = await fetch(`/api/requests?id=${id}`);
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

  const auditMeta = () => ({ admin_id: adminId, admin_email: adminEmail, admin_name: adminName });

  const handleSecretaryApprove = async () => {
    setProcessing(true); setError('');
    try {
      const res = await fetch(`/api/requests?id=${id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ status:'secretary_approved', notes: approvalNotes||null, secretary_approved_at: new Date().toISOString(), ...auditMeta() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Failed.');
      setRequest(p => p ? {...p, status:'secretary_approved', notes: approvalNotes||null} : p);
      setShowSecModal(false); setApprovalNotes('');
      setSuccess('Secretary approval recorded. Awaiting Captain final approval.');
    } catch(e:unknown) { setError(e instanceof Error ? e.message : 'Failed.'); }
    finally { setProcessing(false); }
  };

  const handleCaptainApprove = async () => {
    setProcessing(true); setError('');
    try {
      const res = await fetch(`/api/requests?id=${id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ status:'approved', notes: approvalNotes||null, processed_at: new Date().toISOString(), ...auditMeta() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Failed.');
      setRequest(p => p ? {...p, status:'approved', notes: approvalNotes||null} : p);
      setShowCapModal(false); setApprovalNotes('');
      setSuccess('Request fully approved. Generate and upload the document below.');
    } catch(e:unknown) { setError(e instanceof Error ? e.message : 'Failed.'); }
    finally { setProcessing(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { setError('Please provide a reason.'); return; }
    setProcessing(true); setError('');
    try {
      const res = await fetch(`/api/requests?id=${id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ status:'rejected', notes: rejectReason, processed_at: new Date().toISOString(), ...auditMeta() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Failed.');
      setShowRejectModal(false);
      router.push('/pending-requests');
    } catch(e:unknown) { setError(e instanceof Error ? e.message : 'Failed.'); }
    finally { setProcessing(false); }
  };

  const handleGenerate = async () => {
    if (!request||!profile) return;
    setGenerating(true); setError('');
    try {
      const { blob, fileName } = await generateDocument(request, profile);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=fileName; a.click();
      URL.revokeObjectURL(url);
      setGeneratedBlob(blob); setGeneratedFileName(fileName);
      setSuccess('Document generated. Upload it below.');
    } catch(e:unknown) { setError(e instanceof Error ? e.message : 'Failed to generate.'); }
    finally { setGenerating(false); }
  };

  const uploadFile = async (file: Blob, fileName: string) => {
    setUploading(true); setError('');
    try {
      const hash = await sha256Hex(file);
      const path = `documents/${id}/${fileName}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert:true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
      const res = await fetch(`/api/requests?id=${id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ file_url: urlData.publicUrl, file_hash: hash, ...auditMeta() }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Failed.');
      setRequest(p => p ? {...p, file_url: urlData.publicUrl, file_hash: hash} : p);
      setUploadedHash(hash);
      setSuccess('Document uploaded. The resident can now download it.');
    } catch(e:unknown) { setError(e instanceof Error ? e.message : 'Failed to upload.'); }
    finally { setUploading(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] dark:bg-[#16161a]"><span className="mono text-[12px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase animate-pulse">Loading...</span></div>;
  if (notFound||!request) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] dark:bg-[#16161a]">
      <div className="text-center"><p className="text-[14px] text-[#3d3b36] dark:text-[#c9c6be] mb-4">Request not found.</p>
        <Link href="/pending-requests" className="mono text-[11px] tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 hover:underline">Back to Pending Requests</Link></div>
    </div>
  );

  const displayPurpose = request.purpose==='others' && request.custom_purpose ? request.custom_purpose : request.purpose;
  const daysAgo = Math.floor((Date.now()-new Date(request.created_at).getTime())/86_400_000);
  const extraDetails = buildExtraDetails(request);

  const isPending       = request.status === 'pending';
  const isSecApproved   = request.status === 'secretary_approved';
  const isFullyApproved = request.status === 'approved';
  const isRejected      = request.status === 'rejected';
  const captainCanApprove = bypassEnabled || isSecApproved;
  const captainLocked   = !captainCanApprove && isPending;

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap'); .pg{font-family:'IBM Plex Sans',sans-serif} .mono{font-family:'IBM Plex Mono',monospace}`}</style>
      <input ref={uploadRef} type="file" accept=".docx,.pdf" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)uploadFile(f,f.name);}} />

      <div className="pg min-h-screen bg-[#fafaf9] dark:bg-[#16161a] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* MASTHEAD */}
          <motion.div initial={{opacity:0}} animate={{opacity:1}} className="border-b-2 border-[#1a1917] dark:border-[#f0eee8] pb-5 mb-10">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="mono text-[11px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase">{request.id.slice(0,8).toUpperCase()}</p>
                  <StatusBadge status={request.status}/>
                  {daysAgo>=2&&!isFullyApproved&&!isRejected&&<span className="flex items-center gap-1 mono text-[10px] font-bold text-red-600 dark:text-red-400"><AlertTriangle className="w-3 h-3"/>{daysAgo} days waiting</span>}
                </div>
                <h1 className="mono text-2xl md:text-3xl font-bold text-[#1a1917] dark:text-[#f0eee8] tracking-tight leading-none">{fmtDocType(request.type??request.document_type).toUpperCase()}</h1>
              </div>
              <Link href="/pending-requests" className="mono text-[11px] tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors">Back to Pending</Link>
            </div>
          </motion.div>

          {/* ALERTS */}
          {(error||success)&&(
            <div className="mb-8 space-y-3">
              {error  &&<AlertBanner variant="error"   onClose={()=>setError('')}>{error}</AlertBanner>}
              {success&&<AlertBanner variant="success" onClose={()=>setSuccess('')}>{success}</AlertBanner>}
            </div>
          )}

          {/* FLOW BANNER */}
          {!isRejected&&<ApprovalFlowBanner status={request.status} bypassEnabled={bypassEnabled}/>}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* LEFT */}
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.08}} className="lg:col-span-2 space-y-10">
              <div>
                <SectionLabel label="Request Information"/>
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <DetailRow label="Document Type" value={fmtDocType(request.type??request.document_type)}/>
                  <DetailRow label="Purpose"       value={displayPurpose??'—'}/>
                  <DetailRow label="Date Requested" value={new Date(request.created_at).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})}/>
                  <DetailRow label="Waiting"       value={daysAgo===0?'Submitted today':`${daysAgo} day${daysAgo>1?'s':''}`}/>
                  {request.additional_info&&<div className="col-span-2"><p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-2">Additional Information</p><p className="text-[13px] text-[#3d3b36] dark:text-[#c9c6be] leading-relaxed border-l-2 border-[#c8c6c0] dark:border-[#2a2a32] pl-3">{request.additional_info}</p></div>}
                </div>
              </div>
              {extraDetails.length>0&&<div><SectionLabel label="Submitted Information"/><div className="grid grid-cols-2 gap-x-8 gap-y-5">{extraDetails.map(d=><DetailRow key={d.label} label={d.label} value={d.value??undefined}/>)}</div></div>}
              {profile&&<div><SectionLabel label="Applicant Information"/>
                <IconDetail icon={User}   label="Full Name" value={`${profile.firstName} ${profile.lastName}`}/>
                <IconDetail icon={Mail}   label="Email"     value={profile.email}/>
                <IconDetail icon={Phone}  label="Phone"     value={profile.phone}/>
                <IconDetail icon={MapPin} label="Address"   value={profile.address}/>
                {profile.birthday&&<div className="grid grid-cols-2 gap-x-8 gap-y-5 pt-4"><DetailRow label="Birthday" value={new Date(profile.birthday).toLocaleDateString('en-PH')}/><DetailRow label="Civil Status" value={profile.civilStatus??undefined}/></div>}
              </div>}
            </motion.div>

            {/* RIGHT */}
            <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.14}} className="space-y-8">

              {/* ACTIONS */}
              <div>
                <SectionLabel label="Actions"/>
                {isRejected ? (
                  <div className="flex items-center gap-2 py-2"><XCircle className="w-4 h-4 text-red-600 dark:text-red-400"/><span className="text-[13px] font-semibold text-red-600 dark:text-red-400">Rejected</span></div>
                ) : isFullyApproved ? (
                  <div className="flex items-center gap-2 py-2"><CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400"/><span className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">Fully Approved</span></div>
                ) : (
                  <div className="space-y-4">

                    {/* Step 1 - Secretary */}
                    <div>
                      <p className="mono text-[10px] tracking-[0.15em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-1.5">Step 1 — Barangay Secretary</p>
                      {isSecApproved ? (
                        <div className="flex items-center gap-2 px-3 py-2 border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30">
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0"/>
                          <span className="text-[12px] text-emerald-700 dark:text-emerald-400">Secretary approved</span>
                        </div>
                      ) : (
                        <ActionBtn label="Secretary: Approve" icon={CheckCircle} variant="blue" onClick={()=>setShowSecModal(true)} disabled={!isPending}/>
                      )}
                    </div>

                    {/* Step 2 - Captain */}
                    <div>
                      <p className="mono text-[10px] tracking-[0.15em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-1.5">Step 2 — Barangay Captain</p>
                      {captainLocked ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 px-3 py-2.5 border border-[#c8c6c0] dark:border-[#2a2a32] bg-[#f5f4f0] dark:bg-[#1e1e24] opacity-60 cursor-not-allowed">
                            <Lock className="w-4 h-4 text-[#7a7870] dark:text-[#7e7b75] flex-shrink-0"/>
                            <span className="text-[12px] font-semibold text-[#5c5a54] dark:text-[#9e9b94]">Captain Approval Locked</span>
                          </div>
                          <div className="border-l-2 border-amber-400 pl-3 py-1">
                            <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-snug">
                              Waiting for Secretary approval before the Captain can approve this document.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <ActionBtn label="Captain: Final Approval" icon={CheckCircle} variant="orange" onClick={()=>setShowCapModal(true)}/>
                      )}
                    </div>

                    {/* Reject */}
                    <div>
                      <p className="mono text-[10px] tracking-[0.15em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-1.5">Reject</p>
                      <ActionBtn label="Reject Request" icon={XCircle} variant="danger" onClick={()=>setShowRejectModal(true)}/>
                    </div>
                  </div>
                )}
                {request.notes&&<div className="mt-4 border-l-2 border-[#c8c6c0] dark:border-[#2a2a32] pl-3"><p className="mono text-[10px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-1">{request.status==='rejected'?'Rejection Reason':'Notes'}</p><p className="text-[12px] text-[#3d3b36] dark:text-[#c9c6be] leading-relaxed">{request.notes}</p></div>}
              </div>

              {/* DOCUMENT */}
              <div>
                <SectionLabel label="Document"/>
                <div className="space-y-2.5">
                  {request.file_url&&(<>
                    <a href={request.file_url} target="_blank" rel="noopener noreferrer" download>
                      <button className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-[#c8c6c0] dark:border-[#2a2a32] text-[12px] font-semibold text-[#3d3b36] dark:text-[#c9c6be] hover:border-[#1a1917] dark:hover:border-[#f0eee8] hover:text-[#1a1917] dark:hover:text-[#f0eee8] transition-colors">
                        <Download className="w-4 h-4"/>Download Uploaded Document
                      </button>
                    </a>
                    {uploadedHash&&<HashDisplay hash={uploadedHash}/>}
                    <div className="flex items-center gap-3 py-1"><div className="flex-1 h-px bg-[#e0deda] dark:bg-[#222228]"/><span className="mono text-[10px] text-[#7a7870] dark:text-[#7e7b75] uppercase tracking-wider">or replace</span><div className="flex-1 h-px bg-[#e0deda] dark:bg-[#222228]"/></div>
                  </>)}
                  {!request.file_url&&<p className="text-[12px] text-[#5c5a54] dark:text-[#9e9b94] leading-relaxed mb-1">Generate the document, then upload it so the resident can download it.</p>}
                  <ActionBtn label={request.file_url?'Re-generate Document':'Step 1: Generate .docx'} icon={Wand2} onClick={handleGenerate} loading={generating} disabled={generating||uploading}/>
                  {generatedBlob&&<ActionBtn label={`Step 2: Upload "${generatedFileName}"`} icon={Upload} onClick={()=>uploadFile(generatedBlob,generatedFileName)} loading={uploading} disabled={uploading}/>}
                  <div className="flex items-center gap-3 py-1"><div className="flex-1 h-px bg-[#e0deda] dark:bg-[#222228]"/><span className="mono text-[10px] text-[#7a7870] dark:text-[#7e7b75] uppercase tracking-wider">or upload manually</span><div className="flex-1 h-px bg-[#e0deda] dark:bg-[#222228]"/></div>
                  <button onClick={()=>uploadRef.current?.click()} disabled={uploading} className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-[#c8c6c0] dark:border-[#2a2a32] text-[12px] font-semibold text-[#3d3b36] dark:text-[#c9c6be] hover:border-[#1a1917] dark:hover:border-[#f0eee8] hover:text-[#1a1917] dark:hover:text-[#f0eee8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <Upload className="w-4 h-4"/>Upload Existing File (.docx or .pdf)
                  </button>
                  {!request.file_url&&uploadedHash&&<HashDisplay hash={uploadedHash}/>}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* SECRETARY MODAL */}
      <Modal open={showSecModal} onClose={()=>setShowSecModal(false)} title="Secretary Approval — Step 1">
        <div className="space-y-4">
          <AlertBanner variant="info">The Secretary is endorsing this request for the Captain's final approval.</AlertBanner>
          <div>
            <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-2">Endorsement Notes (Optional)</p>
            <textarea value={approvalNotes} onChange={e=>setApprovalNotes(e.target.value)} rows={3} placeholder="Add endorsement notes..." className="w-full px-3 py-2.5 text-[13px] bg-white dark:bg-[#16161a] border border-[#c8c6c0] dark:border-[#2a2a32] text-[#1a1917] dark:text-[#f0eee8] placeholder-[#7a7870] dark:placeholder-[#7e7b75] focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 resize-none transition-colors"/>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={()=>setShowSecModal(false)} disabled={processing} className="flex-1 py-2.5 text-[12px] font-semibold border border-[#c8c6c0] dark:border-[#2a2a32] text-[#5c5a54] dark:text-[#9e9b94] hover:border-[#1a1917] dark:hover:border-[#f0eee8] hover:text-[#1a1917] dark:hover:text-[#f0eee8] transition-colors disabled:opacity-40">Cancel</button>
            <button onClick={handleSecretaryApprove} disabled={processing} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40">
              {processing?<Loader2 className="w-4 h-4 animate-spin"/>:<CheckCircle className="w-4 h-4"/>}{processing?'Processing...':'Endorse to Captain'}
            </button>
          </div>
        </div>
      </Modal>

      {/* CAPTAIN MODAL */}
      <Modal open={showCapModal} onClose={()=>setShowCapModal(false)} title="Captain Final Approval — Step 2">
        <div className="space-y-4">
          <AlertBanner variant="success">
            {bypassEnabled&&!isSecApproved?'Bypass mode is ON — approving without Secretary endorsement.':'Secretary has endorsed this request. Confirming final approval.'}
          </AlertBanner>
          <div>
            <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-2">Approval Notes (Optional)</p>
            <textarea value={approvalNotes} onChange={e=>setApprovalNotes(e.target.value)} rows={3} placeholder="Add approval notes..." className="w-full px-3 py-2.5 text-[13px] bg-white dark:bg-[#16161a] border border-[#c8c6c0] dark:border-[#2a2a32] text-[#1a1917] dark:text-[#f0eee8] placeholder-[#7a7870] dark:placeholder-[#7e7b75] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 resize-none transition-colors"/>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={()=>setShowCapModal(false)} disabled={processing} className="flex-1 py-2.5 text-[12px] font-semibold border border-[#c8c6c0] dark:border-[#2a2a32] text-[#5c5a54] dark:text-[#9e9b94] hover:border-[#1a1917] dark:hover:border-[#f0eee8] hover:text-[#1a1917] dark:hover:text-[#f0eee8] transition-colors disabled:opacity-40">Cancel</button>
            <button onClick={handleCaptainApprove} disabled={processing} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors disabled:opacity-40">
              {processing?<Loader2 className="w-4 h-4 animate-spin"/>:<CheckCircle className="w-4 h-4"/>}{processing?'Processing...':'Confirm Final Approval'}
            </button>
          </div>
        </div>
      </Modal>

      {/* REJECT MODAL */}
      <Modal open={showRejectModal} onClose={()=>setShowRejectModal(false)} title="Reject Request">
        <div className="space-y-4">
          <AlertBanner variant="warning">Please provide a clear reason for rejection.</AlertBanner>
          <div>
            <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-2">Reason for Rejection <span className="text-red-500">*</span></p>
            <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} rows={4} placeholder="Explain why this request is being rejected..." className="w-full px-3 py-2.5 text-[13px] bg-white dark:bg-[#16161a] border border-[#c8c6c0] dark:border-[#2a2a32] text-[#1a1917] dark:text-[#f0eee8] placeholder-[#7a7870] dark:placeholder-[#7e7b75] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 resize-none transition-colors"/>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={()=>setShowRejectModal(false)} disabled={processing} className="flex-1 py-2.5 text-[12px] font-semibold border border-[#c8c6c0] dark:border-[#2a2a32] text-[#5c5a54] dark:text-[#9e9b94] hover:border-[#1a1917] dark:hover:border-[#f0eee8] hover:text-[#1a1917] dark:hover:text-[#f0eee8] transition-colors disabled:opacity-40">Cancel</button>
            <button onClick={handleReject} disabled={processing} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[12px] font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-40">
              {processing?<Loader2 className="w-4 h-4 animate-spin"/>:<XCircle className="w-4 h-4"/>}{processing?'Processing...':'Confirm Rejection'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
