'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Eye, User, Mail, Phone,
  ShieldOff, AlertTriangle, X, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { revokeDocumentOnChain } from '@/app/lib/blockchain';

/* ─────────────────────────── types ─────────────────────────────────────── */
interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  role: string | null;
  avatar_base64: string | null;
  totalRequests: number;
  approvedCount: number;
  revokedCount: number;
}

/* ─────────────────────────── helpers ───────────────────────────────────── */
const getInitials = (first: string, last: string) =>
  `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';

const isThisMonth = (d: string) => {
  const dt = new Date(d), now = new Date();
  return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

/* ─────────────────────────── trust indicator ───────────────────────────── */
function TrustDot({ revokedCount }: { revokedCount: number }) {
  if (revokedCount > 0) {
    return (
      <span
        title={`${revokedCount} revoked document${revokedCount !== 1 ? 's' : ''}`}
        className="inline-flex items-center gap-1.5"
      >
        <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 ring-2 ring-orange-200 dark:ring-orange-900/60" />
        <span className="text-[10px] font-semibold tracking-[0.06em] uppercase text-orange-600 dark:text-orange-400 whitespace-nowrap">
          {revokedCount} revoked
        </span>
      </span>
    );
  }
  return (
    <span
      title="Clean record — no revoked documents"
      className="inline-flex items-center gap-1.5"
    >
      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 ring-2 ring-emerald-200 dark:ring-emerald-900/60" />
      <span className="text-[10px] font-semibold tracking-[0.06em] uppercase text-emerald-600 dark:text-emerald-400">
        Clean
      </span>
    </span>
  );
}

/* ─────────────────────────── kill-switch modal ──────────────────────────── */
interface KillSwitchModalProps {
  resident: Resident;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

function KillSwitchModal({ resident, onClose, onConfirm }: KillSwitchModalProps) {
  const fullName = `${resident.firstName} ${resident.lastName}`;
  const [typed,   setTyped]   = useState('');
  const [reason,  setReason]  = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
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
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex items-center justify-center px-4"
        onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
      >
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
                  This will revoke {resident.approvedCount} active document{resident.approvedCount !== 1 ? 's' : ''}
                </p>
                <p className="text-[12px] text-amber-700 dark:text-amber-400 mt-1 leading-snug">
                  Each document will be individually recorded as revoked on the blockchain. This action
                  is <strong>permanent</strong> and cannot be undone.
                </p>
              </div>
            </div>

            {/* resident preview */}
            <div className="flex items-center gap-3 py-3 border-y border-[#E8E6E1] dark:border-[#2C2C32]">
              {resident.avatar_base64 ? (
                <img
                  src={resident.avatar_base64}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border border-[#E8E6E1] dark:border-[#2C2C32] flex-shrink-0"
                />
              ) : (
                <div className="w-9 h-9 flex-shrink-0 bg-orange-500 flex items-center justify-center">
                  <span className="mono text-[11px] font-bold text-white">
                    {getInitials(resident.firstName, resident.lastName)}
                  </span>
                </div>
              )}
              <div>
                <p className="text-[13px] font-semibold text-[#1A1A1C] dark:text-[#EAEAEC]">{fullName}</p>
                <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0]">{resident.email}</p>
              </div>
            </div>

            {/* reason */}
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

            {/* name confirmation */}
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
                <><Loader2 className="w-3.5 h-3.5 animate-spin" />Revoking…</>
              ) : (
                <><ShieldOff className="w-3.5 h-3.5" />Revoke All</>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─────────────────────────── page ──────────────────────────────────────── */
export default function ResidentsPage() {
  const router = useRouter();
  const [residents,   setResidents]   = useState<Resident[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');

  // kill-switch state
  const [killTarget,  setKillTarget]  = useState<Resident | null>(null);
  const [killResults, setKillResults] = useState<
    Record<string, { success: boolean; message: string }>
  >({});

  /* ── data load ───────────────────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: pd, error } = await supabase
          .from('profiles')
          .select('id, firstName, lastName, email, role, avatar_base64, created_at')
          .not('role', 'in', '("admin","super_admin")')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!pd?.length) { setResidents([]); setLoading(false); return; }

        const ids = pd.map((p: any) => p.id);

        // fetch request rows with status so we can compute approvedCount + revokedCount
        const { data: rd } = await supabase
          .from('requests')
          .select('user_id, status')
          .in('user_id', ids);

        const totalMap:    Record<string, number> = {};
        const approvedMap: Record<string, number> = {};
        const revokedMap:  Record<string, number> = {};

        for (const r of (rd ?? [])) {
          totalMap[r.user_id]    = (totalMap[r.user_id]    ?? 0) + 1;
          if (r.status === 'approved') approvedMap[r.user_id] = (approvedMap[r.user_id] ?? 0) + 1;
          if (r.status === 'revoked')  revokedMap[r.user_id]  = (revokedMap[r.user_id]  ?? 0) + 1;
        }

        const hydrated = await Promise.all(pd.map(async (p: any) => {
          try {
            const res = await fetch(`/api/profile?id=${p.id}`);
            if (res.ok) {
              const j = await res.json();
              const d = j.data ?? {};
              return {
                ...p,
                // Use decrypted values from API — raw Supabase rows have encrypted names/email
                firstName:     d.firstName  ?? p.firstName  ?? '',
                lastName:      d.lastName   ?? p.lastName   ?? '',
                email:         d.email      ?? p.email      ?? '',
                phone:         d.phone      ?? '',
                address:       d.address    ?? '',
                totalRequests: totalMap[p.id]    ?? 0,
                approvedCount: approvedMap[p.id] ?? 0,
                revokedCount:  revokedMap[p.id]  ?? 0,
              };
            }
          } catch {}
          return {
            ...p,
            phone:         '',
            address:       '',
            totalRequests: totalMap[p.id]    ?? 0,
            approvedCount: approvedMap[p.id] ?? 0,
            revokedCount:  revokedMap[p.id]  ?? 0,
          };
        }));

        setResidents(hydrated);
      } catch (e) { console.error(e); }
      finally     { setLoading(false); }
    })();
  }, [router]);

  /* ── kill-switch handler ─────────────────────────────────────────────── */
  const handleKillSwitch = async (reason: string) => {
    if (!killTarget) return;
    const resident = killTarget;

    const { data: approvedDocs } = await supabase
      .from('requests')
      .select('id, type, payload_hash')
      .eq('user_id', resident.id)
      .eq('status', 'approved');

    if (!approvedDocs?.length) {
      setKillTarget(null);
      setKillResults(prev => ({
        ...prev,
        [resident.id]: { success: false, message: 'No active documents found.' },
      }));
      return;
    }

    const { data: { user: adminUser } } = await supabase.auth.getUser();
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('firstName, lastName, email')
      .eq('id', adminUser?.id ?? '')
      .single();

    const adminName  = adminProfile ? `${adminProfile.firstName} ${adminProfile.lastName}` : 'Admin';
    const adminEmail = adminProfile?.email ?? adminUser?.email ?? '';
    const fullName   = `${resident.firstName} ${resident.lastName}`;
    const batchId    = crypto.randomUUID();

    let revokedCount = 0;
    const errors: string[] = [];

    for (const doc of approvedDocs) {
      try {
        let txHash: string | null = null;
        if (doc.payload_hash) txHash = await revokeDocumentOnChain(doc.payload_hash);

        await fetch(`/api/requests?id=${doc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status:         'revoked',
            revoke_tx_hash: txHash,
            notes:          `Bulk revocation — ${reason}`,
          }),
        });

        await supabase.from('audit_logs').insert({
          request_id:      doc.id,
          action:          'revoked',
          performed_by:    adminUser?.id ?? '',
          performer_email: adminEmail,
          performer_name:  adminName,
          batch_id:        batchId,
          notes:           `ASH Kill-Switch applied to ${fullName}. Reason: ${reason}${txHash ? ` | TX: ${txHash}` : ''}`,
        });

        revokedCount++;
      } catch (err: any) {
        errors.push(`${doc.type ?? 'doc'}: ${err?.message ?? 'failed'}`);
      }
    }

    // update counts in local state without a full reload
    setResidents(prev => prev.map(r =>
      r.id === resident.id
        ? { ...r, approvedCount: 0, revokedCount: r.revokedCount + revokedCount }
        : r
    ));

    setKillTarget(null);
    setKillResults(prev => ({
      ...prev,
      [resident.id]: {
        success: revokedCount > 0,
        message: errors.length === 0
          ? `Revoked ${revokedCount} doc${revokedCount !== 1 ? 's' : ''} for ${fullName}.`
          : `Revoked ${revokedCount} of ${approvedDocs.length}. ${errors.length} failed.`,
      },
    }));
  };

  /* ── derived data ────────────────────────────────────────────────────── */
  const filtered = residents.filter(r => {
    const q = search.toLowerCase();
    return (
      `${r.firstName ?? ''} ${r.lastName ?? ''}`.toLowerCase().includes(q) ||
      (r.email ?? '').toLowerCase().includes(q) ||
      (r.id    ?? '').toLowerCase().includes(q)
    );
  });

  const totalReqs    = residents.reduce((s, r) => s + (r.totalRequests ?? 0), 0);
  const newThisMonth = residents.filter(r => isThisMonth(r.created_at)).length;
  const avgReqs      = residents.length ? Math.round(totalReqs / residents.length) : 0;
  const flaggedCount = residents.filter(r => r.revokedCount > 0).length;

  const stats = [
    { label: 'Total Residents', value: residents.length },
    { label: 'New This Month',  value: newThisMonth     },
    { label: 'Total Requests',  value: totalReqs        },
    { label: 'Flagged',         value: flaggedCount,
      note: 'has revoked docs', accent: flaggedCount > 0 },
  ];

  /* ── loading ─────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5F3] dark:bg-[#111113]">
      <span className="mono text-[12px] tracking-[0.25em] text-[#6C6C74] dark:text-[#9090A0] uppercase animate-pulse">
        Loading…
      </span>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        .pjs  { font-family: 'Plus Jakarta Sans', sans-serif; }
        .mono { font-family: ui-monospace, 'JetBrains Mono', 'Fira Mono', monospace; }
      `}</style>

      {/* kill-switch modal */}
      {killTarget && (
        <KillSwitchModal
          resident={killTarget}
          onClose={() => setKillTarget(null)}
          onConfirm={handleKillSwitch}
        />
      )}

      <div className="pjs min-h-screen bg-[#F6F5F3] dark:bg-[#111113] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* ── MASTHEAD ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-b-2 border-[#1A1A1C] dark:border-[#EAEAEC] pb-5 mb-10"
          >
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] tracking-[0.2em] text-[#6C6C74] dark:text-[#9090A0] mb-2 uppercase">
                  Directory
                </p>
                <h1 className="mono text-[26px] font-bold leading-none text-[#1A1A1C] dark:text-[#EAEAEC] tracking-tight">
                  RESIDENTS
                </h1>
              </div>
              <Link
                href="/admindashboard"
                className="text-[11px] font-500 tracking-[0.08em] uppercase text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors"
              >
                ← Dashboard
              </Link>
            </div>
          </motion.div>

          {/* ── STAT STRIP ───────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 mb-12"
          >
            {stats.map(({ label, value, note, accent }) => (
              <div
                key={label}
                className={`border-t-2 pt-3 pb-4 ${
                  accent
                    ? 'border-orange-500'
                    : 'border-[#1A1A1C] dark:border-[#EAEAEC]'
                }`}
              >
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">
                  {label}
                </p>
                <p className={`mono text-4xl font-bold tabular-nums leading-none ${
                  accent && value > 0
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-[#1A1A1C] dark:text-[#EAEAEC]'
                }`}>
                  {value}
                </p>
                {note && (
                  <p className="text-[10px] text-[#9090A0] dark:text-[#6C6C74] mt-1.5 tracking-wide">
                    {note}
                  </p>
                )}
              </div>
            ))}
          </motion.div>

          {/* ── SEARCH ───────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C74] dark:text-[#9090A0]" />
              <input
                type="text"
                placeholder="Search by name, email, or ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] rounded-xl text-[#1A1A1C] dark:text-[#EAEAEC] placeholder-[#B0B0B8] dark:placeholder-[#55555F] focus:outline-none focus:border-[#E8500A] transition-colors"
              />
            </div>
          </motion.div>

          {/* ── TABLE ────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
          >
            {/* legend */}
            <div className="flex items-center gap-5 mb-3">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900/60" />
                <span className="text-[10px] text-[#6C6C74] dark:text-[#9090A0] tracking-wide">Clean record</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 ring-2 ring-orange-200 dark:ring-orange-900/60" />
                <span className="text-[10px] text-[#6C6C74] dark:text-[#9090A0] tracking-wide">Has revoked docs</span>
              </span>
            </div>

            {/* col headers */}
            <div className="grid grid-cols-[1fr_160px_120px_110px_80px_80px] py-2 border-b border-[#E8E6E1] dark:border-[#2C2C32]">
              {['Resident', 'Contact', 'Registered', 'Trust', 'Requests', ''].map(h => (
                <span key={h} className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#6C6C74] dark:text-[#9090A0]">
                  {h}
                </span>
              ))}
            </div>

            {residents.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <User className="w-6 h-6 text-[#c8c6c0] dark:text-[#3a3845]" />
                <p className="mono text-[12px] tracking-widest uppercase text-[#6C6C74] dark:text-[#9090A0]">
                  No residents yet
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <Search className="w-6 h-6 text-[#c8c6c0] dark:text-[#3a3845]" />
                <p className="mono text-[12px] tracking-widest uppercase text-[#6C6C74] dark:text-[#9090A0]">
                  No results match
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {filtered.map((res, i) => {
                  const result = killResults[res.id];
                  return (
                    <motion.div key={res.id}>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.025 * i }}
                        className={`group grid grid-cols-[1fr_160px_120px_110px_80px_80px] items-center py-3.5 border-b border-[#E8E6E1] dark:border-[#2C2C32] -mx-2 px-2 transition-colors duration-100
                          ${res.revokedCount > 0
                            ? 'hover:bg-orange-50/60 dark:hover:bg-orange-950/10'
                            : 'hover:bg-[#F6F5F3] dark:hover:bg-[#1C1C1F]'}`}
                      >
                        {/* resident identity */}
                        <div className="flex items-center gap-3 min-w-0 pr-4">
                          {res.avatar_base64 ? (
                            <img
                              src={res.avatar_base64}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-[#E8E6E1] dark:border-[#2C2C32]"
                            />
                          ) : (
                            <div className="w-8 h-8 flex-shrink-0 bg-orange-500 flex items-center justify-center">
                              <span className="mono text-[10px] font-bold text-white leading-none">
                                {getInitials(res.firstName, res.lastName)}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-[14px] font-medium text-[#1A1A1C] dark:text-[#EAEAEC] truncate leading-none">
                              {res.firstName} {res.lastName}
                            </p>
                            <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0] mt-1.5 truncate">
                              {res.id.slice(0, 8).toUpperCase()}
                            </p>
                          </div>
                        </div>

                        {/* contact */}
                        <div className="pr-3 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Mail className="w-3 h-3 text-[#6C6C74] dark:text-[#9090A0] flex-shrink-0" />
                            <p className="text-[12px] text-[#3A3A3E] dark:text-[#BABABC] truncate">{res.email}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-[#6C6C74] dark:text-[#9090A0] flex-shrink-0" />
                            <p className="text-[12px] text-[#6C6C74] dark:text-[#9090A0] truncate">{res.phone || '—'}</p>
                          </div>
                        </div>

                        {/* registered */}
                        <span className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0]">
                          {fmt(res.created_at)}
                        </span>

                        {/* trust indicator */}
                        <div>
                          <TrustDot revokedCount={res.revokedCount} />
                        </div>

                        {/* request count */}
                        <span className="mono text-[13px] font-bold tabular-nums text-[#1A1A1C] dark:text-[#EAEAEC]">
                          {res.totalRequests ?? 0}
                        </span>

                        {/* actions */}
                        <div className="flex items-center justify-end gap-1.5">
                          {/* kill-switch button */}
                          <button
                            onClick={() => {
                              setKillResults(prev => { const n = { ...prev }; delete n[res.id]; return n; });
                              setKillTarget(res);
                            }}
                            disabled={res.approvedCount === 0}
                            title={
                              res.approvedCount === 0
                                ? 'No active documents to revoke'
                                : `Kill-switch: revoke all ${res.approvedCount} active doc${res.approvedCount !== 1 ? 's' : ''}`
                            }
                            className="flex items-center justify-center w-7 h-7 border border-[#E8E6E1] dark:border-[#2C2C32] hover:bg-red-600 hover:border-red-600 group/ks transition-colors duration-150 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-[#E8E6E1] dark:disabled:hover:border-[#2C2C32]"
                          >
                            <ShieldOff className="w-3.5 h-3.5 text-[#6C6C74] dark:text-[#9090A0] group-hover/ks:text-white transition-colors" />
                          </button>

                          {/* view profile */}
                          <Link href={`/residents/${res.id}`}>
                            <span className="flex items-center justify-center w-7 h-7 border border-[#E8E6E1] dark:border-[#2C2C32] hover:bg-orange-600 hover:border-orange-600 group/btn transition-colors duration-150">
                              <Eye className="w-3.5 h-3.5 text-[#6C6C74] dark:text-[#9090A0] group-hover/btn:text-white transition-colors" />
                            </span>
                          </Link>
                        </div>
                      </motion.div>

                      {/* inline result banner per row */}
                      <AnimatePresence>
                        {result && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className={`flex items-center justify-between gap-4 px-2 py-2 border-b border-[#E8E6E1] dark:border-[#2C2C32]
                              ${result.success
                                ? 'bg-emerald-50 dark:bg-emerald-950/20'
                                : 'bg-red-50 dark:bg-red-950/20'}`}
                            >
                              <p className={`text-[11px] leading-snug ${result.success ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {result.success ? '✓' : '✕'} {result.message}
                              </p>
                              <button
                                onClick={() => setKillResults(prev => { const n = { ...prev }; delete n[res.id]; return n; })}
                                className="mono text-[10px] opacity-50 hover:opacity-100 flex-shrink-0"
                              >
                                ✕
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {filtered.length > 0 && (
              <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0] mt-3">
                Showing {filtered.length} of {residents.length} resident{residents.length !== 1 ? 's' : ''}
              </p>
            )}
          </motion.div>

        </div>
      </div>
    </>
  );
}