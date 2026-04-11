'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Eye, FileText, AlertCircle, ArrowRight, ChevronRight,
} from 'lucide-react';
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
  user_id: string;
  profiles: Profile | null;
}

/* ─────────────────────────── helpers ───────────────────────────────────── */
const daysWaiting = (d: string) =>
  Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

const displayPurpose = (r: Request) =>
  r.purpose === 'others' && r.custom_purpose
    ? r.custom_purpose
    : (r.purpose ?? '—');

const toSentenceCase = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '—';

const fmtDocType = (s: string) =>
  (s ?? '—').split(/[\s-]/).map(toSentenceCase).join(' ');

/* ─────────────────────────── page ──────────────────────────────────────── */
export default function PendingRequestsPage() {
  const router = useRouter();
  const [requests,    setRequests]    = useState<Request[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('all');

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: reqData, error } = await supabase
          .from('requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (!reqData?.length) { setRequests([]); return; }

        const ids = [...new Set(reqData.map((r: any) => r.user_id))];
        const { data: pd } = await supabase
          .from('profiles').select('id, firstName, lastName, email').in('id', ids);

        const pm = Object.fromEntries((pd ?? []).map((p: Profile) => [p.id, p]));
        setRequests(reqData.map((r: any) => ({ ...r, profiles: pm[r.user_id] ?? null })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
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
    return matchSearch && matchType;
  });

  const overdue   = requests.filter(r => daysWaiting(r.created_at) >= 2).length;
  const today     = requests.filter(r => daysWaiting(r.created_at) === 0).length;
  const docTypes  = new Set(requests.map(r => r.type)).size;

  const stats = [
    { label: 'Total Pending',    value: requests.length, accent: false },
    { label: 'Waiting 2+ Days',  value: overdue,          accent: overdue > 0 },
    { label: 'Received Today',   value: today,            accent: false },
    { label: 'Document Types',   value: docTypes,         accent: false },
  ];

  /* ── loading ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] dark:bg-[#16161a]">
        <span className="mono text-[12px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase animate-pulse">
          Loading…
        </span>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        .pg { font-family: 'IBM Plex Sans', sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      <div className="pg min-h-screen bg-[#fafaf9] dark:bg-[#16161a] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* ── MASTHEAD ───────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-b-2 border-[#1a1917] dark:border-[#f0eee8] pb-5 mb-10"
          >
            <div className="flex items-end justify-between">
              <div>
                <p className="mono text-[11px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] mb-2 uppercase">
                  Requests
                </p>
                <h1 className="mono text-2xl md:text-3xl font-bold text-[#1a1917] dark:text-[#f0eee8] tracking-tight leading-none">
                  PENDING REQUESTS
                </h1>
              </div>
              <Link
                href="/admindashboard"
                className="mono text-[11px] tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors flex items-center gap-1"
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
            {stats.map(({ label, value, accent }) => (
              <div key={label} className={`border-t-2 ${accent ? 'border-red-500' : 'border-[#1a1917] dark:border-[#f0eee8]'} pt-3 pb-4`}>
                <p className="mono text-[11px] tracking-[0.15em] uppercase text-[#5c5a54] dark:text-[#9e9b94] mb-2">
                  {label}
                </p>
                <p className={`mono text-4xl font-bold tabular-nums leading-none ${accent ? 'text-red-600 dark:text-red-400' : 'text-[#1a1917] dark:text-[#f0eee8]'}`}>
                  {value}
                </p>
              </div>
            ))}
          </motion.div>

          {/* ── SEARCH + FILTER ────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col sm:flex-row gap-3 mb-6"
          >
            {/* search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a7870] dark:text-[#7e7b75]" />
              <input
                type="text"
                placeholder="Search by name, ID, or document type…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-white dark:bg-[#1e1e24] border border-[#c8c6c0] dark:border-[#2a2a32] text-[#1a1917] dark:text-[#f0eee8] placeholder-[#7a7870] dark:placeholder-[#7e7b75] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors"
              />
            </div>

            {/* type filter */}
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="mono text-[12px] px-3 py-2.5 bg-white dark:bg-[#1e1e24] border border-[#c8c6c0] dark:border-[#2a2a32] text-[#1a1917] dark:text-[#f0eee8] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors sm:w-56"
            >
              {uniqueTypes.map(t => (
                <option key={t} value={t}>
                  {t === 'all' ? 'All Document Types' : fmtDocType(t)}
                </option>
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
            <div className="grid grid-cols-[1fr_160px_100px_56px_80px_44px] py-2 border-b border-[#e0deda] dark:border-[#222228]">
              {['Resident', 'Document Type', 'Purpose', 'Date', 'Waiting', ''].map(h => (
                <span key={h} className="mono text-[11px] tracking-[0.15em] uppercase text-[#7a7870] dark:text-[#7e7b75]">
                  {h}
                </span>
              ))}
            </div>

            {requests.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <FileText className="w-6 h-6 text-[#c8c6c0] dark:text-[#3a3845]" />
                <p className="mono text-[12px] tracking-widest uppercase text-[#7a7870] dark:text-[#7e7b75]">
                  No pending requests
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <Search className="w-6 h-6 text-[#c8c6c0] dark:text-[#3a3845]" />
                <p className="mono text-[12px] tracking-widest uppercase text-[#7a7870] dark:text-[#7e7b75]">
                  No results match
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {filtered.map((req, i) => {
                  const name = req.profiles
                    ? `${req.profiles.firstName} ${req.profiles.lastName}`
                    : 'Unknown';
                  const days = daysWaiting(req.created_at);
                  const isOverdue = days >= 2;

                  return (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.03 * i }}
                      className="group grid grid-cols-[1fr_160px_100px_56px_80px_44px] items-center py-3.5 border-b border-[#e8e5e0] dark:border-[#222228] last:border-0 hover:bg-black/[0.025] dark:hover:bg-[#1e1e24] -mx-2 px-2 transition-colors duration-100"
                    >
                      {/* resident */}
                      <div className="min-w-0 pr-4">
                        <p className="text-[14px] font-medium text-[#1a1917] dark:text-[#f0eee8] truncate leading-none">
                          {name}
                        </p>
                        <p className="mono text-[11px] text-[#7a7870] dark:text-[#7e7b75] mt-1.5 truncate">
                          {req.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>

                      {/* document type */}
                      <p className="text-[13px] text-[#3d3b36] dark:text-[#c9c6be] truncate pr-3">
                        {fmtDocType(req.type ?? req.document_type)}
                      </p>

                      {/* purpose */}
                      <p className="text-[12px] text-[#5c5a54] dark:text-[#9e9b94] capitalize truncate pr-3">
                        {displayPurpose(req)}
                      </p>

                      {/* date */}
                      <span className="mono text-[11px] text-[#5c5a54] dark:text-[#9e9b94]">
                        {fmt(req.created_at)}
                      </span>

                      {/* waiting */}
                      <div className="flex items-center gap-1">
                        {isOverdue && (
                          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        )}
                        <span className={`mono text-[11px] font-semibold ${
                          days === 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isOverdue
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}>
                          {days === 0 ? 'Today' : `${days}d`}
                        </span>
                      </div>

                      {/* action — always visible */}
                      <Link href={`/pending-requests/${req.id}`} className="flex justify-end">
                        <span className="flex items-center justify-center w-7 h-7 border border-[#c8c6c0] dark:border-[#2a2a32] hover:bg-orange-600 hover:border-orange-600 group/btn transition-colors duration-150">
                          <Eye className="w-3.5 h-3.5 text-[#5c5a54] dark:text-[#9e9b94] group-hover/btn:text-white transition-colors" />
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}

            {/* footer count */}
            {filtered.length > 0 && (
              <p className="mono text-[11px] text-[#7a7870] dark:text-[#7e7b75] mt-3">
                Showing {filtered.length} of {requests.length} pending request{requests.length !== 1 ? 's' : ''}
              </p>
            )}
          </motion.div>

        </div>
      </div>
    </>
  );
}