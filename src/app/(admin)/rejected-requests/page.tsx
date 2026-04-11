'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Eye, FileText, User, XCircle, Loader2 } from 'lucide-react';
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
  created_at: string;
  notes: string | null;
  user_id: string;
  profiles: Profile | null;
}

/* ─────────────────────────── helpers ───────────────────────────────────── */
const fmtDocType = (s: string | null) =>
  (s ?? '—').split(/[\s_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const isToday   = (d: string) => new Date(d).toDateString() === new Date().toDateString();
const isThisWeek = (d: string) => {
  const now = new Date(), start = new Date(now);
  start.setDate(now.getDate() - now.getDay()); start.setHours(0, 0, 0, 0);
  return new Date(d) >= start;
};
const isThisMonth = (d: string) => {
  const n = new Date(), d2 = new Date(d);
  return d2.getMonth() === n.getMonth() && d2.getFullYear() === n.getFullYear();
};

/* ─────────────────────────── sub-components ────────────────────────────── */
const SectionLabel = ({ label }: { label: string }) => (
  <p className="mono text-[11px] tracking-[0.2em] uppercase text-[#5c5a54] dark:text-[#9e9b94] border-b border-[#c8c6c0] dark:border-[#2a2a32] pb-2 mb-4">
    {label}
  </p>
);

/* ─────────────────────────── page ──────────────────────────────────────── */
export default function RejectedRequestsPage() {
  const router = useRouter();
  const [requests,    setRequests]    = useState<Request[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('all');
  const [dateFilter,  setDateFilter]  = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: reqData, error } = await supabase
        .from('requests')
        .select('*')
        .eq('status', 'rejected')
        .order('created_at', { ascending: false });

      if (error || !reqData?.length) { setLoading(false); return; }

      const userIds = [...new Set(reqData.map((r: any) => r.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles').select('id, firstName, lastName, email').in('id', userIds);

      const profileMap = Object.fromEntries((profilesData ?? []).map((p: Profile) => [p.id, p]));

      setRequests(reqData.map((r: any) => ({ ...r, profiles: profileMap[r.user_id] ?? null })));
      setLoading(false);
    })();
  }, [router]);

  /* ── filtering ──────────────────────────────────────────────────────────── */
  const filtered = requests.filter(r => {
    const name = r.profiles ? `${r.profiles.firstName} ${r.profiles.lastName}` : '';
    const q    = search.toLowerCase();
    const matchSearch =
      (r.id   ?? '').toLowerCase().includes(q) ||
      (name   ?? '').toLowerCase().includes(q) ||
      (r.type ?? '').toLowerCase().includes(q) ||
      (r.document_type ?? '').toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || (r.type ?? r.document_type) === typeFilter;
    const matchDate =
      dateFilter === 'all'   ? true :
      dateFilter === 'today' ? isToday(r.created_at) :
      dateFilter === 'week'  ? isThisWeek(r.created_at) :
      isThisMonth(r.created_at);
    return matchSearch && matchType && matchDate;
  });

  const uniqueTypes = [...new Set(requests.map(r => r.type ?? r.document_type).filter(Boolean))];

  /* ── loading ────────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] dark:bg-[#16161a]">
      <span className="mono text-[12px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase animate-pulse">Loading…</span>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        .pg   { font-family: 'IBM Plex Sans', sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      <div className="pg min-h-screen bg-[#fafaf9] dark:bg-[#16161a] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* MASTHEAD */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="border-b-2 border-[#1a1917] dark:border-[#f0eee8] pb-5 mb-10">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="mono text-[11px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase mb-2">Admin Panel</p>
                <h1 className="mono text-2xl md:text-3xl font-bold text-[#1a1917] dark:text-[#f0eee8] tracking-tight leading-none">
                  REJECTED REQUESTS
                </h1>
              </div>
              <p className="mono text-[11px] text-[#7a7870] dark:text-[#7e7b75]">
                {requests.length} total rejected
              </p>
            </div>
          </motion.div>

          {/* STATS */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 mb-12">
            {[
              { label: 'Total Rejected',   value: requests.length,                                     cls: 'text-[#1a1917] dark:text-[#f0eee8]',       border: 'border-[#1a1917] dark:border-[#f0eee8]' },
              { label: 'This Week',        value: requests.filter(r => isThisWeek(r.created_at)).length,  cls: 'text-red-600 dark:text-red-400',            border: 'border-red-500' },
              { label: 'This Month',       value: requests.filter(r => isThisMonth(r.created_at)).length, cls: 'text-orange-600 dark:text-orange-400',      border: 'border-orange-500' },
              { label: 'Document Types',   value: uniqueTypes.length,                                   cls: 'text-[#5c5a54] dark:text-[#9e9b94]',       border: 'border-[#c8c6c0] dark:border-[#2a2a32]' },
            ].map(s => (
              <div key={s.label} className={`border-t-2 ${s.border} pt-3 pb-4`}>
                <p className="mono text-[11px] tracking-[0.15em] uppercase text-[#5c5a54] dark:text-[#9e9b94] mb-2">{s.label}</p>
                <p className={`mono text-4xl font-bold tabular-nums leading-none ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </motion.div>

          {/* FILTERS */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="mb-8">
            <SectionLabel label="Filters" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a7870] dark:text-[#7e7b75]" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, ID, or document type…"
                  className="w-full pl-9 pr-3 py-2.5 text-[12px] bg-white dark:bg-[#1e1e24] border border-[#c8c6c0] dark:border-[#2a2a32] text-[#1a1917] dark:text-[#f0eee8] placeholder-[#7a7870] dark:placeholder-[#7e7b75] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors mono"
                />
              </div>

              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2.5 text-[12px] bg-white dark:bg-[#1e1e24] border border-[#c8c6c0] dark:border-[#2a2a32] text-[#1a1917] dark:text-[#f0eee8] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors mono">
                <option value="all">All Document Types</option>
                {uniqueTypes.map(t => (
                  <option key={t} value={t}>{fmtDocType(t)}</option>
                ))}
              </select>

              <select value={dateFilter} onChange={e => setDateFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 text-[12px] bg-white dark:bg-[#1e1e24] border border-[#c8c6c0] dark:border-[#2a2a32] text-[#1a1917] dark:text-[#f0eee8] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors mono">
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </motion.div>

          {/* TABLE */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <SectionLabel label={`Requests (${filtered.length})`} />

            {filtered.length === 0 ? (
              <div className="border border-[#c8c6c0] dark:border-[#2a2a32] bg-white dark:bg-[#1e1e24] py-16 text-center">
                <FileText className="w-8 h-8 text-[#c8c6c0] dark:text-[#2a2a32] mx-auto mb-3" />
                <p className="text-[13px] text-[#7a7870] dark:text-[#7e7b75]">
                  {requests.length === 0 ? 'No rejected requests yet.' : 'No requests match your filters.'}
                </p>
              </div>
            ) : (
              <div className="border border-[#c8c6c0] dark:border-[#2a2a32] bg-white dark:bg-[#1e1e24] overflow-x-auto">

                {/* Header */}
                <div className="grid grid-cols-[0.6fr_1.4fr_1.2fr_1fr_1.6fr_0.5fr] gap-4 px-5 py-3 border-b border-[#e8e5e0] dark:border-[#222228] bg-[#fafaf9] dark:bg-[#16161a]">
                  {['ID', 'Resident', 'Document Type', 'Date', 'Reason', ''].map(h => (
                    <p key={h} className="mono text-[10px] font-bold tracking-[0.12em] uppercase text-[#7a7870] dark:text-[#7e7b75]">{h}</p>
                  ))}
                </div>

                {/* Rows */}
                {filtered.map((req, i) => {
                  const name = req.profiles ? `${req.profiles.firstName} ${req.profiles.lastName}` : 'Unknown';
                  return (
                    <div key={req.id}
                      className={`grid grid-cols-[0.6fr_1.4fr_1.2fr_1fr_1.6fr_0.5fr] gap-4 px-5 py-4 border-b border-[#e8e5e0] dark:border-[#222228] last:border-0 transition-colors hover:bg-[#f5f4f0] dark:hover:bg-[#16161a] ${i % 2 !== 0 ? 'bg-[#faf9f7] dark:bg-[#1a1a20]' : ''}`}>

                      {/* ID */}
                      <div className="flex items-center">
                        <p className="mono text-[11px] text-[#5c5a54] dark:text-[#9e9b94]">
                          {req.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>

                      {/* Resident */}
                      <div className="flex items-start gap-2">
                        <User className="w-3.5 h-3.5 text-[#7a7870] dark:text-[#7e7b75] mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#1a1917] dark:text-[#f0eee8] truncate">{name}</p>
                          <p className="mono text-[11px] text-[#7a7870] dark:text-[#7e7b75] truncate">{req.profiles?.email ?? ''}</p>
                        </div>
                      </div>

                      {/* Document type */}
                      <div className="flex items-center">
                        <p className="text-[12px] text-[#3d3b36] dark:text-[#c9c6be]">
                          {fmtDocType(req.type ?? req.document_type)}
                        </p>
                      </div>

                      {/* Date */}
                      <div className="flex items-center">
                        <div>
                          <p className="mono text-[11px] text-[#1a1917] dark:text-[#f0eee8]">
                            {new Date(req.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          <p className="mono text-[10px] text-[#7a7870] dark:text-[#7e7b75] mt-0.5">
                            {new Date(req.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="flex items-center">
                        {req.notes ? (
                          <p className="text-[12px] text-[#5c5a54] dark:text-[#9e9b94] line-clamp-2 leading-snug border-l-2 border-red-300 dark:border-red-800 pl-2">
                            {req.notes}
                          </p>
                        ) : (
                          <p className="text-[12px] text-[#7a7870] dark:text-[#7e7b75] italic">No reason provided</p>
                        )}
                      </div>

                      {/* Action */}
                      <div className="flex items-center justify-end">
                        <Link href={`/rejected-requests/${req.id}`}
                          className="group/btn flex items-center justify-center w-7 h-7 border border-[#c8c6c0] dark:border-[#2a2a32] hover:bg-orange-600 hover:border-orange-600 transition-colors duration-150">
                          <Eye className="w-3.5 h-3.5 text-[#5c5a54] dark:text-[#9e9b94] group-hover/btn:text-white transition-colors" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </>
  );
}