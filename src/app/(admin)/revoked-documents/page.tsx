'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, FileText, ShieldOff } from 'lucide-react';
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
  processed_at: string | null;
  file_url: string | null;
  notes: string | null;
  user_id: string;
  revoke_tx_hash: string | null;
  profiles: Profile | null;
}

/* ─────────────────────────── helpers ───────────────────────────────────── */
const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

const toSentenceCase = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '—';

const fmtDocType = (s: string) =>
  (s ?? '—').split(/[\s-]/).map(toSentenceCase).join(' ');

const displayPurpose = (r: Request) =>
  r.purpose === 'others' && r.custom_purpose ? r.custom_purpose : (r.purpose ?? '—');

const isThisWeek = (d: string) => {
  const dt = new Date(d), now = new Date();
  const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0);
  return dt >= start;
};
const isThisMonth = (d: string) => {
  const dt = new Date(d), now = new Date();
  return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
};
const isThisYear = (d: string) =>
  new Date(d).getFullYear() === new Date().getFullYear();

/* ─────────────────────────── page ──────────────────────────────────────── */
export default function RevokedDocumentsPage() {
  const router = useRouter();
  const [requests,   setRequests]   = useState<Request[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const res = await fetch('/api/requests?status=revoked');
        if (!res.ok) throw new Error('Failed to fetch');
        const j = await res.json();
        const revoked: any[] = j.data ?? [];
        if (!revoked.length) { setRequests([]); return; }

        const uids = [...new Set(revoked.map((r: any) => r.user_id))];
        const entries = await Promise.all(uids.map(async (uid) => {
          try {
            const r = await fetch(`/api/profile?id=${uid}`);
            if (!r.ok) return null;
            const pj = await r.json();
            const p = pj.data;
            if (!p) return null;
            return [uid, {
              id: uid,
              firstName: p.firstName ?? p.first_name ?? '',
              lastName:  p.lastName  ?? p.last_name  ?? '',
              email:     p.email ?? '',
            }] as [string, Profile];
          } catch { return null; }
        }));
        const pm = Object.fromEntries((entries.filter(Boolean) as [string, Profile][]));
        setRequests(revoked.map((r: any) => ({ ...r, profiles: pm[r.user_id] ?? null })));
      } catch (e) { console.error(e); }
      finally     { setLoading(false); }
    })();
  }, [router]);

  const uniqueTypes = ['all', ...Array.from(new Set(requests.map(r => r.type).filter(Boolean)))];

  const filtered = requests.filter(r => {
    const name = r.profiles ? `${r.profiles.firstName} ${r.profiles.lastName}` : '';
    const q = search.toLowerCase();
    const matchSearch =
      (r.id   ?? '').toLowerCase().includes(q) ||
      (name   ?? '').toLowerCase().includes(q) ||
      (r.type ?? '').toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || r.type === typeFilter;
    const ref = r.processed_at ?? r.created_at;
    const matchDate =
      dateFilter === 'all'   ||
      (dateFilter === 'week'  && isThisWeek(ref))  ||
      (dateFilter === 'month' && isThisMonth(ref)) ||
      (dateFilter === 'year'  && isThisYear(ref));
    return matchSearch && matchType && matchDate;
  });

  const stats = [
    { label: 'Total Revoked', value: requests.length },
    { label: 'This Week',     value: requests.filter(r => isThisWeek(r.processed_at ?? r.created_at)).length },
    { label: 'This Month',    value: requests.filter(r => isThisMonth(r.processed_at ?? r.created_at)).length },
    { label: 'On-Chain',      value: requests.filter(r => !!r.revoke_tx_hash).length },
  ];

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
        .pjs { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      <div className="pjs min-h-screen bg-[#F6F5F3] dark:bg-[#111113] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* ── MASTHEAD ───────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-b-2 border-[#1A1A1C] dark:border-[#EAEAEC] pb-5 mb-10"
          >
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] tracking-[0.2em] text-[#6C6C74] dark:text-[#9090A0] mb-2 uppercase">
                  Documents
                </p>
                <h1 className="mono text-[26px] font-bold leading-tight text-[#1A1A1C] dark:text-[#EAEAEC] tracking-tight leading-none">
                  REVOKED DOCUMENTS
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

          {/* ── STAT STRIP ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 mb-12"
          >
            {stats.map(({ label, value }) => (
              <div key={label} className="border-t-2 border-[#1A1A1C] dark:border-[#EAEAEC] pt-3 pb-4">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">
                  {label}
                </p>
                <p className="mono text-4xl font-bold tabular-nums text-[#1A1A1C] dark:text-[#EAEAEC] leading-none">
                  {value}
                </p>
              </div>
            ))}
          </motion.div>

          {/* ── SEARCH + FILTERS ───────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-3 mb-6"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C74] dark:text-[#9090A0]" />
              <input
                type="text"
                placeholder="Search by name, ID, or document type…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] rounded-xl text-[#1A1A1C] dark:text-[#EAEAEC] placeholder-[#B0B0B8] dark:placeholder-[#55555F] focus:outline-none focus:border-[#E8500A] transition-colors"
              />
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="mono text-[12px] px-3 py-2.5 bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] rounded-xl text-[#1A1A1C] dark:text-[#EAEAEC] focus:outline-none focus:border-[#E8500A] transition-colors sm:w-48"
            >
              {uniqueTypes.map(t => (
                <option key={t} value={t}>{t === 'all' ? 'All Types' : fmtDocType(t)}</option>
              ))}
            </select>
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="mono text-[12px] px-3 py-2.5 bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] rounded-xl text-[#1A1A1C] dark:text-[#EAEAEC] focus:outline-none focus:border-[#E8500A] transition-colors sm:w-36"
            >
              {[['all','All Time'],['week','This Week'],['month','This Month'],['year','This Year']].map(([v,l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </motion.div>

          {/* ── TABLE ──────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
          >
            {/* col headers */}
            <div className="grid grid-cols-[1fr_160px_100px_110px_52px] py-2 border-b border-[#E8E6E1] dark:border-[#2C2C32]">
              {['Resident','Document Type','Purpose','Revoked On',''].map(h => (
                <span key={h} className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#6C6C74] dark:text-[#9090A0]">
                  {h}
                </span>
              ))}
            </div>

            {requests.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <ShieldOff className="w-6 h-6 text-[#c8c6c0] dark:text-[#3a3845]" />
                <p className="mono text-[12px] tracking-widest uppercase text-[#6C6C74] dark:text-[#9090A0]">
                  No revoked documents yet
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
                {filtered.map((req, i) => {
                  const name = req.profiles
                    ? `${req.profiles.firstName} ${req.profiles.lastName}`
                    : 'Unknown';
                  const revokedDate = req.processed_at ?? req.created_at;

                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.025 * i }}
                      className="group grid grid-cols-[1fr_160px_100px_110px_52px] items-center py-3.5 border-b border-[#E8E6E1] dark:border-[#2C2C32] last:border-0 hover:bg-[#F6F5F3] dark:hover:bg-[#1C1C1F] -mx-2 px-2 transition-colors duration-100"
                    >
                      {/* resident */}
                      <div className="min-w-0 pr-4">
                        <p className="text-[14px] font-medium text-[#1A1A1C] dark:text-[#EAEAEC] truncate leading-none">
                          {name}
                        </p>
                        <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0] mt-1.5 truncate">
                          {req.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>

                      {/* doc type */}
                      <p className="text-[13px] text-[#3A3A3E] dark:text-[#BABABC] truncate pr-3">
                        {fmtDocType(req.type ?? req.document_type)}
                      </p>

                      {/* purpose */}
                      <p className="text-[12px] text-[#6C6C74] dark:text-[#9090A0] capitalize truncate pr-3">
                        {displayPurpose(req)}
                      </p>

                      {/* revoked date */}
                      <span className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0]">
                        {fmt(revokedDate)}
                      </span>

                      {/* view */}
                      <Link href={`/revoked-documents/${req.id}`} className="flex justify-end">
                        <span className="flex items-center justify-center w-7 h-7 border border-[#E8E6E1] dark:border-[#2C2C32] hover:bg-orange-600 hover:border-orange-600 group/btn transition-colors duration-150">
                          <Eye className="w-3.5 h-3.5 text-[#6C6C74] dark:text-[#9090A0] group-hover/btn:text-white transition-colors" />
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {filtered.length > 0 && (
              <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0] mt-3">
                Showing {filtered.length} of {requests.length} revoked document{requests.length !== 1 ? 's' : ''}
              </p>
            )}
          </motion.div>

        </div>
      </div>
    </>
  );
}