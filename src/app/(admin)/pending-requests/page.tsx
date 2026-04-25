'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Eye, FileText, User, Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

/* ─────────────────────────── types ─────────────────────────────────────── */
interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Request {
  id: string;
  type: string;
  document_type: string;
  purpose: string;
  custom_purpose: string | null;
  status: string;
  created_at: string;
  notes: string | null;
  user_id: string;
  profiles: Profile | null;
}

/* ─────────────────────────── helpers ───────────────────────────────────── */
const fmtDocType = (s: string | null) =>
  (s ?? '—').split(/[\s_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const isToday = (d: string) => new Date(d).toDateString() === new Date().toDateString();
const isThisWeek = (d: string) => {
  const now = new Date(), start = new Date(now);
  start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
  return new Date(d) >= start;
};
const isThisMonth = (d: string) => {
  const n = new Date(), d2 = new Date(d);
  return d2.getMonth() === n.getMonth() && d2.getFullYear() === n.getFullYear();
};
const daysWaiting = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);

/* ─────────────────────────── sub-components ────────────────────────────── */
const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#6C6C74] dark:text-[#9090A0] border-b border-[#E8E6E1] dark:border-[#2C2C32] pb-2 mb-4">
    {label}
  </p>
);

const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, string> = {
    pending:            'text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30',
    secretary_approved: 'text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30',
  };
  const labels: Record<string, string> = {
    pending: 'Pending',
    secretary_approved: 'Secretary Approved',
  };
  return (
    <span className={`mono text-[10px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 border ${cfg[status] ?? cfg.pending}`}>
      {labels[status] ?? status}
    </span>
  );
};

/* ─────────────────────────── page ──────────────────────────────────────── */
export default function PendingRequestsPage() {
  const router = useRouter();
  const [requests,   setRequests]   = useState<Request[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'secretary_approved'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Fetch both pending and secretary_approved — these are all "awaiting action"
      const [pendingRes, secRes] = await Promise.all([
        fetch('/api/requests?status=pending'),
        fetch('/api/requests?status=secretary_approved'),
      ]);

      const pendingJson  = pendingRes.ok  ? await pendingRes.json()  : { data: [] };
      const secJson      = secRes.ok      ? await secRes.json()      : { data: [] };
      const reqData: any[] = [...(pendingJson.data ?? []), ...(secJson.data ?? [])];

      // Sort newest first
      reqData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (!reqData.length) { setLoading(false); return; }

      // Fetch profiles for all unique user_ids
      const userIds = [...new Set(reqData.map(r => r.user_id as string))];
      const profileMap: Record<string, Profile> = {};
      await Promise.all(
        userIds.map(async uid => {
          const pr = await fetch(`/api/profile?id=${uid}`);
          if (pr.ok) {
            const pj = await pr.json();
            const p = pj.data;
            if (p) profileMap[uid] = {
              id:        p.id,
              firstName: p.firstName ?? p.first_name  ?? '',
              lastName:  p.lastName  ?? p.last_name   ?? '',
              email:     p.email     ?? '',
            };
          }
        })
      );

      setRequests(reqData.map(r => ({ ...r, profiles: profileMap[r.user_id] ?? null })));
      setLoading(false);
    })();
  }, [router]);

  /* ── filtering ───────────────────────────────────────────────────────── */
  const filtered = requests.filter(r => {
    const name = r.profiles ? `${r.profiles.firstName} ${r.profiles.lastName}` : '';
    const q    = search.toLowerCase();
    const matchSearch =
      (r.id            ?? '').toLowerCase().includes(q) ||
      (name            ?? '').toLowerCase().includes(q) ||
      (r.type          ?? '').toLowerCase().includes(q) ||
      (r.document_type ?? '').toLowerCase().includes(q);
    const matchType   = typeFilter === 'all'   || (r.type ?? r.document_type) === typeFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchDate   =
      dateFilter === 'all'   ? true :
      dateFilter === 'today' ? isToday(r.created_at) :
      dateFilter === 'week'  ? isThisWeek(r.created_at) :
      isThisMonth(r.created_at);
    return matchSearch && matchType && matchStatus && matchDate;
  });

  const uniqueTypes  = [...new Set(requests.map(r => r.type ?? r.document_type).filter(Boolean))];
  const urgentCount  = requests.filter(r => daysWaiting(r.created_at) >= 2).length;
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const secCount     = requests.filter(r => r.status === 'secretary_approved').length;

  /* ── loading ─────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5F3] dark:bg-[#111113]">
      <span className="mono text-[12px] tracking-[0.25em] text-[#6C6C74] dark:text-[#9090A0] uppercase animate-pulse">Loading…</span>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        .pjs { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      <div className="pjs min-h-screen bg-[#F6F5F3] dark:bg-[#111113] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* MASTHEAD */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="border-b-2 border-[#1A1A1C] dark:border-[#EAEAEC] pb-5 mb-10">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="text-[11px] tracking-[0.2em] text-[#6C6C74] dark:text-[#9090A0] uppercase mb-2">Admin Panel</p>
                <h1 className="mono text-[26px] font-bold leading-tight text-[#1A1A1C] dark:text-[#EAEAEC] tracking-tight">
                  PENDING REQUESTS
                </h1>
              </div>
              <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0]">
                {requests.length} awaiting action
              </p>
            </div>
          </motion.div>

          {/* STATS */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 mb-12">
            {[
              { label: 'Total Pending',       value: requests.length,  cls: 'text-[#1A1A1C] dark:text-[#EAEAEC]',      border: 'border-[#1A1A1C] dark:border-[#EAEAEC]' },
              { label: 'Needs Secretary',     value: pendingCount,     cls: 'text-amber-600 dark:text-amber-400',       border: 'border-amber-500' },
              { label: 'Needs Captain',       value: secCount,         cls: 'text-blue-600 dark:text-blue-400',         border: 'border-blue-500' },
              { label: 'Waiting 2+ Days',     value: urgentCount,      cls: 'text-red-600 dark:text-red-400',           border: 'border-red-500' },
            ].map(s => (
              <div key={s.label} className={`border-t-2 ${s.border} pt-3 pb-4`}>
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">{s.label}</p>
                <p className={`mono text-4xl font-bold tabular-nums leading-none ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </motion.div>

          {/* FILTERS */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mb-8">
            <SectionLabel label="Filters" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C74] dark:text-[#9090A0]" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, ID, or document type…"
                  className="w-full pl-9 pr-3 py-2.5 text-[12px] bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] text-[#1A1A1C] dark:text-[#EAEAEC] placeholder-[#B0B0B8] dark:placeholder-[#55555F] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors mono"
                />
              </div>

              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 text-[12px] bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] text-[#1A1A1C] dark:text-[#EAEAEC] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors mono">
                <option value="all">All Statuses</option>
                <option value="pending">Pending (Needs Secretary)</option>
                <option value="secretary_approved">Secretary Approved (Needs Captain)</option>
              </select>

              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-[12px] bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] text-[#1A1A1C] dark:text-[#EAEAEC] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors mono">
                <option value="all">All Document Types</option>
                {uniqueTypes.map(t => (
                  <option key={t} value={t}>{fmtDocType(t)}</option>
                ))}
              </select>

            </div>
          </motion.div>

          {/* TABLE */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <SectionLabel label={`Requests (${filtered.length})`} />

            {filtered.length === 0 ? (
              <div className="border border-[#E8E6E1] dark:border-[#2C2C32] bg-white dark:bg-[#1C1C1F] py-16 text-center">
                <FileText className="w-8 h-8 text-[#c8c6c0] dark:text-[#2a2a32] mx-auto mb-3" />
                <p className="text-[13px] text-[#6C6C74] dark:text-[#9090A0]">
                  {requests.length === 0 ? 'No pending requests.' : 'No requests match your filters.'}
                </p>
              </div>
            ) : (
              <div className="border border-[#E8E6E1] dark:border-[#2C2C32] bg-white dark:bg-[#1C1C1F] overflow-x-auto">

                {/* Header */}
                <div className="grid grid-cols-[0.5fr_1.4fr_1.3fr_0.9fr_1fr_0.5fr] gap-4 px-5 py-3 border-b border-[#E8E6E1] dark:border-[#2C2C32] bg-[#F6F5F3] dark:bg-[#111113]">
                  {['ID', 'Resident', 'Document Type', 'Status', 'Waiting', ''].map(h => (
                    <p key={h} className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#6C6C74] dark:text-[#9090A0]">{h}</p>
                  ))}
                </div>

                {/* Rows */}
                {filtered.map((req, i) => {
                  const name = req.profiles ? `${req.profiles.firstName} ${req.profiles.lastName}` : 'Unknown';
                  const days = daysWaiting(req.created_at);
                  const urgent = days >= 2;
                  return (
                    <div key={req.id}
                      className={`grid grid-cols-[0.5fr_1.4fr_1.3fr_0.9fr_1fr_0.5fr] gap-4 px-5 py-4 border-b border-[#E8E6E1] dark:border-[#2C2C32] last:border-0 transition-colors hover:bg-[#F6F5F3] dark:hover:bg-[#16161a] ${i % 2 !== 0 ? 'bg-[#F6F5F3] dark:bg-[#1C1C1F]' : ''}`}>

                      {/* ID */}
                      <div className="flex items-center">
                        <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0]">
                          {req.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>

                      {/* Resident */}
                      <div className="flex items-start gap-2">
                        <User className="w-3.5 h-3.5 text-[#6C6C74] dark:text-[#9090A0] mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#1A1A1C] dark:text-[#EAEAEC] truncate">{name}</p>
                          <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0] truncate">{req.profiles?.email ?? ''}</p>
                        </div>
                      </div>

                      {/* Document type */}
                      <div className="flex items-center">
                        <p className="text-[12px] text-[#3A3A3E] dark:text-[#BABABC]">
                          {fmtDocType(req.type ?? req.document_type)}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex items-center">
                        <StatusBadge status={req.status} />
                      </div>

                      {/* Waiting */}
                      <div className="flex items-center gap-1.5">
                        {urgent
                          ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          : <Clock className="w-3.5 h-3.5 text-[#6C6C74] dark:text-[#9090A0] flex-shrink-0" />
                        }
                        <div>
                          <p className={`mono text-[11px] font-semibold ${urgent ? 'text-red-600 dark:text-red-400' : 'text-[#1A1A1C] dark:text-[#EAEAEC]'}`}>
                            {days === 0 ? 'Today' : `${days}d`}
                          </p>
                          <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0]">
                            {new Date(req.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="flex items-center justify-end">
                        <Link href={`/pending-requests/${req.id}`}
                          className="group/btn flex items-center justify-center w-7 h-7 border border-[#E8E6E1] dark:border-[#2C2C32] hover:bg-orange-600 hover:border-orange-600 transition-colors duration-150">
                          <Eye className="w-3.5 h-3.5 text-[#6C6C74] dark:text-[#9090A0] group-hover/btn:text-white transition-colors" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {filtered.length > 0 && (
              <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0] mt-4">
                Showing {filtered.length} of {requests.length} pending request{requests.length !== 1 ? 's' : ''}
              </p>
            )}
          </motion.div>

        </div>
      </div>
    </>
  );
}
