'use client';

import { use, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, MapPin, Calendar, FileText,
  CheckCircle, XCircle, Clock, Eye, ExternalLink,
  ShieldOff, AlertTriangle, X, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import { decrypt } from '@/app/lib/utils/crypto';
import { revokeDocumentOnChain } from '@/app/lib/blockchain';

/* ─────────────────────────── types ─────────────────────────────────────── */
interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  birthday: string | null;
  civilStatus: string | null;
  username: string | null;
  role: string | null;
  avatar_base64: string | null;
  created_at: string;
}

interface Request {
  id: string;
  type: string;
  document_type: string;
  status: string;
  purpose: string;
  custom_purpose: string | null;
  created_at: string;
  file_url: string | null;
  payload_hash: string | null;
}

/* ─────────────────────────── helpers ───────────────────────────────────── */
const fmtDocType = (s: string | null) =>
  (s ?? '—').split(/[\s_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const getInitials = (first: string, last: string) =>
  `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';

const requestLink = (r: Request) => {
  if (r.status === 'approved') return `/approved-documents/${r.id}`;
  if (r.status === 'rejected') return `/rejected-requests/${r.id}`;
  if (r.status === 'revoked')  return `/revoked-documents/${r.id}`;
  return `/pending-requests/${r.id}`;
};

/* ─────────────────────────── sub-components ────────────────────────────── */
const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#6C6C74] dark:text-[#9090A0] border-b border-[#E8E6E1] dark:border-[#2C2C32] pb-2 mb-4">
    {label}
  </p>
);

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="text-[11px] font-500 tracking-[0.08em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1">{label}</p>
    <p className="text-[13px] font-medium text-[#1A1A1C] dark:text-[#EAEAEC]">{value ?? '—'}</p>
  </div>
);

const IconDetail = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) => (
  <div className="flex items-start gap-3 py-3 border-b border-[#E8E6E1] dark:border-[#2C2C32] last:border-0">
    <Icon className="w-4 h-4 text-[#6C6C74] dark:text-[#9090A0] mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-[11px] font-500 tracking-[0.08em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-0.5">{label}</p>
      <p className="text-[13px] text-[#1A1A1C] dark:text-[#EAEAEC]">{value ?? '—'}</p>
    </div>
  </div>
);

const STATUS_CFG = {
  approved: { label: 'Approved', icon: CheckCircle, cls: 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' },
  rejected: { label: 'Rejected', icon: XCircle,     cls: 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30'                       },
  revoked:  { label: 'Revoked',  icon: ShieldOff,   cls: 'text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30'     },
  pending:  { label: 'Pending',  icon: Clock,        cls: 'text-[#92600A] dark:text-[#F5C06A] border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30'           },
} as const;

const StatusBadge = ({ status }: { status: string }) => {
  const cfg  = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-700 tracking-[0.08em] uppercase px-2.5 py-1 border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
};

/* ─────────────────────────── kill-switch modal ──────────────────────────── */
interface KillSwitchModalProps {
  profile: Profile;
  approvedCount: number;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

function KillSwitchModal({ profile, approvedCount, onClose, onConfirm }: KillSwitchModalProps) {
  const fullName        = `${profile.firstName} ${profile.lastName}`;
  const [typed, setTyped]   = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // focus the name field on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // block background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const nameMatches = typed.trim().toLowerCase() === fullName.trim().toLowerCase();
  const canSubmit   = nameMatches && reason.trim().length >= 5 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      await onConfirm(reason.trim());
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {/* backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center px-4"
        onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      >
        {/* panel */}
        <motion.div
          key="panel"
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-md bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] shadow-2xl"
        >
          {/* header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-[#E8E6E1] dark:border-[#2C2C32]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex items-center justify-center bg-red-100 dark:bg-red-950/40">
                <ShieldOff className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-[11px] tracking-[0.16em] uppercase text-red-600 dark:text-red-400 font-semibold">
                  Danger Zone
                </p>
                <h2 className="mono text-[16px] font-bold text-[#1A1A1C] dark:text-[#EAEAEC] leading-tight">
                  Revoke All Documents
                </h2>
              </div>
            </div>
            {!loading && (
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center text-[#6C6C74] hover:text-[#1A1A1C] dark:hover:text-[#EAEAEC] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* body */}
          <div className="px-6 py-5 space-y-5">

            {/* warning banner */}
            <div className="flex items-start gap-3 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300 leading-snug">
                  This will revoke {approvedCount} active document{approvedCount !== 1 ? 's' : ''}
                </p>
                <p className="text-[12px] text-amber-700 dark:text-amber-400 mt-1 leading-snug">
                  Each document will be individually recorded as revoked on the blockchain. This action
                  is <strong>permanent</strong> and cannot be undone.
                </p>
              </div>
            </div>

            {/* resident preview */}
            <div className="flex items-center gap-3 py-3 border-y border-[#E8E6E1] dark:border-[#2C2C32]">
              {profile.avatar_base64 ? (
                <img
                  src={profile.avatar_base64}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border border-[#E8E6E1] dark:border-[#2C2C32] flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 flex-shrink-0 bg-orange-500 flex items-center justify-center">
                  <span className="mono text-[11px] font-bold text-white">
                    {getInitials(profile.firstName, profile.lastName)}
                  </span>
                </div>
              )}
              <div>
                <p className="text-[13px] font-semibold text-[#1A1A1C] dark:text-[#EAEAEC]">{fullName}</p>
                <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0]">{profile.email}</p>
              </div>
            </div>

            {/* reason field */}
            <div>
              <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">
                Reason for revocation
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                disabled={loading}
                rows={2}
                placeholder="e.g. Resident involved in a legal case filed on Apr 25, 2026"
                className="w-full px-3 py-2.5 text-[13px] bg-[#F6F5F3] dark:bg-[#111113] border border-[#E8E6E1] dark:border-[#2C2C32] text-[#1A1A1C] dark:text-[#EAEAEC] placeholder-[#B0B0B8] dark:placeholder-[#55555F] resize-none focus:outline-none focus:border-red-400 dark:focus:border-red-600 transition-colors"
              />
              {reason.trim().length > 0 && reason.trim().length < 5 && (
                <p className="text-[11px] text-red-500 mt-1">Reason must be at least 5 characters.</p>
              )}
            </div>

            {/* name confirmation field */}
            <div>
              <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1">
                Type the resident's full name to confirm
              </label>
              <p className="mono text-[11px] text-[#9090A0] mb-2">
                Type exactly: <span className="text-[#1A1A1C] dark:text-[#EAEAEC] font-bold">{fullName}</span>
              </p>
              <input
                ref={inputRef}
                type="text"
                value={typed}
                onChange={e => setTyped(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                disabled={loading}
                placeholder={fullName}
                className={`w-full px-3 py-2.5 text-[13px] bg-[#F6F5F3] dark:bg-[#111113] border text-[#1A1A1C] dark:text-[#EAEAEC] placeholder-[#B0B0B8] dark:placeholder-[#55555F] focus:outline-none transition-colors
                  ${typed.length === 0
                    ? 'border-[#E8E6E1] dark:border-[#2C2C32]'
                    : nameMatches
                    ? 'border-emerald-400 dark:border-emerald-600'
                    : 'border-red-300 dark:border-red-700'}`}
              />
              {typed.length > 0 && !nameMatches && (
                <p className="text-[11px] text-red-500 mt-1">Name does not match. Check capitalization.</p>
              )}
              {nameMatches && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">✓ Name confirmed</p>
              )}
            </div>

            {/* error */}
            {error && (
              <div className="border-l-2 border-red-500 pl-3 py-1">
                <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* footer */}
          <div className="flex items-center gap-3 px-6 pb-6 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 text-[12px] font-semibold tracking-[0.06em] uppercase border border-[#E8E6E1] dark:border-[#2C2C32] text-[#3A3A3E] dark:text-[#BABABC] hover:border-[#1A1A1C] dark:hover:border-[#EAEAEC] transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 py-2.5 text-[12px] font-bold tracking-[0.06em] uppercase bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Revoking…
                </>
              ) : (
                <>
                  <ShieldOff className="w-3.5 h-3.5" />
                  Revoke All
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─────────────────────────── page ──────────────────────────────────────── */
export default function ResidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  // kill-switch state
  const [showKillSwitch, setShowKillSwitch] = useState(false);
  const [killResult, setKillResult] = useState<{
    success: boolean;
    message: string;
    revokedCount?: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const profileRes = await fetch(`/api/profile?id=${id}`);
        if (!profileRes.ok) { setNotFound(true); return; }
        const profileJson = await profileRes.json();
        if (!profileJson.data) { setNotFound(true); return; }

        const { data: extraData } = await supabase
          .from('profiles').select('id, username, role, avatar_base64, created_at').eq('id', id).single();

        setProfile({
          ...profileJson.data,
          id,
          username:      extraData?.username      ?? null,
          role:          extraData?.role          ?? null,
          avatar_base64: extraData?.avatar_base64 ?? null,
          created_at:    extraData?.created_at    ?? '',
        });

        const { data: requestsData } = await supabase
          .from('requests')
          .select('id, type, document_type, status, purpose, custom_purpose, created_at, file_url, payload_hash')
          .eq('user_id', id)
          .order('created_at', { ascending: false });

        setRequests((requestsData ?? []).map((r: any) => ({
          ...r,
          purpose:        decrypt(r.purpose),
          custom_purpose: decrypt(r.custom_purpose),
        })));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ── kill-switch handler ─────────────────────────────────────────────── */
  const handleKillSwitch = async (reason: string) => {
    if (!profile) return;

    const approvedDocs = requests.filter(r => r.status === 'approved');
    if (!approvedDocs.length) {
      setShowKillSwitch(false);
      setKillResult({ success: false, message: 'No active documents found for this resident.' });
      return;
    }

    // get current admin info for audit log
    const { data: { user: adminUser } } = await supabase.auth.getUser();
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('firstName, lastName, email')
      .eq('id', adminUser?.id ?? '')
      .single();

    const adminName  = adminProfile ? `${adminProfile.firstName} ${adminProfile.lastName}` : 'Admin';
    const adminEmail = adminProfile?.email ?? adminUser?.email ?? '';
    const fullName   = `${profile.firstName} ${profile.lastName}`;

    let revokedCount = 0;
    const errors: string[] = [];

    // revoke each approved document sequentially
    for (const doc of approvedDocs) {
      try {
        let txHash: string | null = null;

        // attempt on-chain revocation if payload_hash exists
        if (doc.payload_hash) {
          txHash = await revokeDocumentOnChain(doc.payload_hash);
        }

        // update DB status to revoked
        await fetch(`/api/requests?id=${doc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status:          'revoked',
            revoke_tx_hash:  txHash,
            notes:           `Bulk revocation — ${reason}`,
          }),
        });

        // write audit log entry for this document
        await supabase.from('audit_logs').insert({
          request_id:      doc.id,
          action:          'revoked',
          performed_by:    adminUser?.id ?? '',
          performer_email: adminEmail,
          performer_name:  adminName,
          notes:           `ASH Kill-Switch applied to ${fullName}. Reason: ${reason}${txHash ? ` | TX: ${txHash}` : ''}`,
        });

        revokedCount++;
      } catch (err: any) {
        errors.push(`${fmtDocType(doc.type)}: ${err?.message ?? 'failed'}`);
      }
    }

    // refresh request list in UI
    setRequests(prev =>
      prev.map(r =>
        r.status === 'approved' && approvedDocs.find(d => d.id === r.id)
          ? { ...r, status: 'revoked' }
          : r
      )
    );

    setShowKillSwitch(false);

    if (errors.length === 0) {
      setKillResult({
        success: true,
        message: `Successfully revoked ${revokedCount} document${revokedCount !== 1 ? 's' : ''} for ${fullName}. Each revocation has been recorded on the blockchain and logged.`,
        revokedCount,
      });
    } else {
      setKillResult({
        success: revokedCount > 0,
        message: `Revoked ${revokedCount} of ${approvedDocs.length} documents. ${errors.length} failed: ${errors.join('; ')}`,
        revokedCount,
      });
    }
  };

  /* ── loading / not found ─────────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5F3] dark:bg-[#111113]">
      <span className="mono text-[12px] tracking-[0.25em] text-[#6C6C74] dark:text-[#9090A0] uppercase animate-pulse">Loading…</span>
    </div>
  );

  if (notFound || !profile) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5F3] dark:bg-[#111113]">
      <div className="text-center">
        <p className="text-[14px] text-[#3A3A3E] dark:text-[#BABABC] mb-4">Resident not found.</p>
        <Link href="/residents" className="text-[11px] font-500 tracking-[0.08em] uppercase text-orange-600 dark:text-orange-400 hover:underline">
          ← Back to Residents
        </Link>
      </div>
    </div>
  );

  const approvedDocs = requests.filter(r => r.status === 'approved');

  const stats = {
    total:    requests.length,
    approved: approvedDocs.length,
    pending:  requests.filter(r => r.status === 'pending').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    revoked:  requests.filter(r => r.status === 'revoked').length,
  };

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        .pjs { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      {/* ── Kill-switch modal ─────────────────────────────────────────────── */}
      {showKillSwitch && (
        <KillSwitchModal
          profile={profile}
          approvedCount={approvedDocs.length}
          onClose={() => setShowKillSwitch(false)}
          onConfirm={handleKillSwitch}
        />
      )}

      <div className="pjs min-h-screen bg-[#F6F5F3] dark:bg-[#111113] transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* MASTHEAD */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="border-b-2 border-[#1A1A1C] dark:border-[#EAEAEC] pb-5 mb-10">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="text-[11px] tracking-[0.2em] text-[#6C6C74] dark:text-[#9090A0] uppercase mb-2">
                  {id.slice(0, 8).toUpperCase()} · Resident
                </p>
                <h1 className="mono text-[26px] font-bold leading-tight text-[#1A1A1C] dark:text-[#EAEAEC] tracking-tight leading-none">
                  {profile.firstName.toUpperCase()} {profile.lastName.toUpperCase()}
                </h1>
              </div>
              <Link href="/residents"
                className="text-[11px] font-500 tracking-[0.08em] uppercase text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors">
                ← Residents
              </Link>
            </div>
          </motion.div>

          {/* result banner */}
          <AnimatePresence>
            {killResult && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`mb-8 flex items-start justify-between gap-4 border-l-2 pl-4 py-3 pr-4
                  ${killResult.success
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'border-red-500 bg-red-50 dark:bg-red-950/30'}`}
              >
                <p className={`text-[13px] leading-snug ${killResult.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                  {killResult.message}
                </p>
                <button
                  onClick={() => setKillResult(null)}
                  className="mono text-[11px] font-bold opacity-50 hover:opacity-100 flex-shrink-0"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* LEFT — main content */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="lg:col-span-2 space-y-10">

              {/* Personal info */}
              <div>
                <SectionLabel label="Personal Information" />
                <IconDetail icon={Mail}     label="Email"    value={profile.email} />
                <IconDetail icon={Phone}    label="Phone"    value={profile.phone || null} />
                <IconDetail icon={MapPin}   label="Address"  value={profile.address || null} />
                <IconDetail icon={Calendar} label="Birthday" value={profile.birthday ? new Date(profile.birthday).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : null} />
                {profile.civilStatus && (
                  <div className="pt-4 grid grid-cols-2 gap-x-8">
                    <DetailRow label="Civil Status" value={profile.civilStatus} />
                    {profile.username && <DetailRow label="Username" value={`@${profile.username}`} />}
                  </div>
                )}
              </div>

              {/* Request history */}
              <div>
                <SectionLabel label={`Request History (${requests.length})`} />

                {requests.length === 0 ? (
                  <div className="border border-[#E8E6E1] dark:border-[#2C2C32] bg-white dark:bg-[#1C1C1F] py-12 text-center">
                    <FileText className="w-7 h-7 text-[#c8c6c0] dark:text-[#2a2a32] mx-auto mb-3" />
                    <p className="text-[13px] text-[#6C6C74] dark:text-[#9090A0]">No requests submitted yet.</p>
                  </div>
                ) : (
                  <div className="border border-[#E8E6E1] dark:border-[#2C2C32] bg-white dark:bg-[#1C1C1F] overflow-x-auto">
                    {/* Header */}
                    <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.4fr] gap-4 px-5 py-3 border-b border-[#E8E6E1] dark:border-[#2C2C32] bg-[#F6F5F3] dark:bg-[#111113]">
                      {['Document', 'Date', 'Status', ''].map(h => (
                        <p key={h} className="text-[10px] font-700 tracking-[0.1em] uppercase text-[#6C6C74] dark:text-[#9090A0]">{h}</p>
                      ))}
                    </div>
                    {/* Rows */}
                    {requests.map((req, i) => {
                      const purpose = req.purpose === 'others' && req.custom_purpose
                        ? req.custom_purpose : req.purpose;
                      return (
                        <div key={req.id}
                          className={`grid grid-cols-[1.6fr_1fr_0.8fr_0.4fr] gap-4 px-5 py-4 border-b border-[#E8E6E1] dark:border-[#2C2C32] last:border-0 transition-colors hover:bg-[#F6F5F3] dark:hover:bg-[#16161a] ${i % 2 !== 0 ? 'bg-[#F6F5F3] dark:bg-[#1C1C1F]' : ''}`}>
                          {/* Document */}
                          <div>
                            <p className="text-[13px] font-medium text-[#1A1A1C] dark:text-[#EAEAEC]">
                              {fmtDocType(req.type ?? req.document_type)}
                            </p>
                            {purpose && (
                              <p className="text-[11px] text-[#6C6C74] dark:text-[#9090A0] mt-0.5 capitalize">{purpose}</p>
                            )}
                          </div>
                          {/* Date */}
                          <div className="flex items-center">
                            <div>
                              <p className="mono text-[11px] text-[#1A1A1C] dark:text-[#EAEAEC]">
                                {new Date(req.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] mt-0.5">
                                {new Date(req.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                          {/* Status */}
                          <div className="flex items-center">
                            <StatusBadge status={req.status} />
                          </div>
                          {/* Action */}
                          <div className="flex items-center justify-end">
                            <Link href={requestLink(req)}
                              className="flex items-center justify-center w-7 h-7 border border-[#E8E6E1] dark:border-[#2C2C32] hover:border-[#1a1917] dark:hover:border-[#f0eee8] hover:bg-[#1a1917] dark:hover:bg-[#f0eee8] group transition-colors duration-150">
                              <Eye className="w-3.5 h-3.5 text-[#6C6C74] dark:text-[#9090A0] group-hover:text-white dark:group-hover:text-[#1A1A1C] transition-colors" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>

            {/* RIGHT — sidebar */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
              className="space-y-8">

              {/* Avatar + identity */}
              <div>
                <SectionLabel label="Identity" />
                <div className="flex flex-col items-center text-center py-4 border border-[#E8E6E1] dark:border-[#2C2C32] bg-white dark:bg-[#1C1C1F]">
                  {profile.avatar_base64 ? (
                    <img src={profile.avatar_base64} alt=""
                      className="w-20 h-20 rounded-full object-cover border-2 border-[#E8E6E1] dark:border-[#2C2C32] mb-3" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#1a1917] dark:bg-[#f0eee8] flex items-center justify-center mb-3">
                      <span className="mono text-xl font-bold text-white dark:text-[#1A1A1C]">
                        {getInitials(profile.firstName, profile.lastName)}
                      </span>
                    </div>
                  )}
                  <p className="text-[14px] font-semibold text-[#1A1A1C] dark:text-[#EAEAEC]">
                    {profile.firstName} {profile.lastName}
                  </p>
                  {profile.username && (
                    <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0] mt-0.5">@{profile.username}</p>
                  )}
                  <p className="mono text-[10px] text-[#9e9b94] dark:text-[#6C6C74] mt-1 uppercase tracking-widest">Resident</p>
                </div>
                <div className="mt-3 space-y-2">
                  <DetailRow label="Member Since" value={memberSince} />
                  <DetailRow label="User ID"      value={id} />
                </div>
              </div>

              {/* Request summary */}
              <div>
                <SectionLabel label="Request Summary" />
                {[
                  { label: 'Total',    value: stats.total,    cls: 'text-[#1A1A1C] dark:text-[#EAEAEC]' },
                  { label: 'Approved', value: stats.approved, cls: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Pending',  value: stats.pending,  cls: 'text-[#92600A] dark:text-[#F5C06A]' },
                  { label: 'Rejected', value: stats.rejected, cls: 'text-red-600 dark:text-red-400' },
                  { label: 'Revoked',  value: stats.revoked,  cls: 'text-orange-600 dark:text-orange-400' },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between py-2.5 border-b border-[#E8E6E1] dark:border-[#2C2C32] last:border-0">
                    <p className="text-[13px] text-[#3A3A3E] dark:text-[#BABABC]">{s.label}</p>
                    <span className={`mono text-[14px] font-bold tabular-nums ${s.cls}`}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Quick links */}
              <div>
                <SectionLabel label="Quick Links" />
                <div className="space-y-2">
                  <Link href={`/audit-logs?user_id=${id}`}
                    className="flex items-center gap-2 mono text-[11px] text-orange-600 dark:text-orange-400 hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" />View audit trail →
                  </Link>
                </div>
              </div>

              {/* ── ASH KILL-SWITCH ─────────────────────────────────────── */}
              <div>
                <SectionLabel label="Active-State Heartbeat" />
                <div className="border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-4">
                  <div className="flex items-start gap-2.5 mb-3">
                    <ShieldOff className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[12px] font-semibold text-red-700 dark:text-red-400 leading-snug">
                        Kill-Switch
                      </p>
                      <p className="text-[11px] text-red-600/80 dark:text-red-500/80 mt-1 leading-snug">
                        Revokes all {stats.approved > 0 ? stats.approved : 'active'} approved document{stats.approved !== 1 ? 's' : ''} for this resident simultaneously.
                        Each revocation is recorded on the blockchain individually.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setKillResult(null);
                      setShowKillSwitch(true);
                    }}
                    disabled={stats.approved === 0}
                    className="w-full py-2.5 text-[11px] font-bold tracking-[0.08em] uppercase bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ShieldOff className="w-3.5 h-3.5" />
                    {stats.approved === 0
                      ? 'No Active Documents'
                      : `Revoke All ${stats.approved} Document${stats.approved !== 1 ? 's' : ''}`}
                  </button>

                  {stats.approved === 0 && stats.revoked > 0 && (
                    <p className="mono text-[10px] text-[#9090A0] mt-2 text-center">
                      All documents have already been revoked.
                    </p>
                  )}
                </div>
              </div>

            </motion.div>
          </div>

        </div>
      </div>
    </>
  );
}