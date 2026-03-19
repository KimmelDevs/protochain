'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Eye, ArrowRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

/* ─────────────────────────── types ─────────────────────────────────────── */
interface RequestRow {
  id: string;
  type: string;
  document_type: string;
  status: string;
  created_at: string;
  user_id: string;
  profiles?: { firstName: string; lastName: string } | null;
}

/* ─────────────────────────── helpers ───────────────────────────────────── */
const isToday = (d: string) =>
  new Date(d).toDateString() === new Date().toDateString();

const isThisMonth = (d: string) => {
  const dt = new Date(d), now = new Date();
  return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

const requestLink = (r: RequestRow) => {
  if (r.status === 'approved') return `/approved-documents/${r.id}`;
  if (r.status === 'rejected') return `/rejected-requests/${r.id}`;
  return `/pending-requests/${r.id}`;
};

/* ─────────────────────────── sub-components ────────────────────────────── */

const StatusTag = ({ status }: { status: string }) => {
  const cfg: Record<string, { label: string; cls: string }> = {
    approved: { label: 'APPROVED', cls: 'text-emerald-600 dark:text-emerald-400' },
    rejected: { label: 'REJECTED', cls: 'text-red-500   dark:text-red-400'   },
    pending:  { label: 'PENDING',  cls: 'text-amber-500 dark:text-amber-400' },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span className={`mono text-[10px] font-bold tracking-[0.12em] ${c.cls}`}>
      {c.label}
    </span>
  );
};

const StatCell = ({
  label, value, href, hi,
}: { label: string; value: number; href: string; hi?: boolean }) => (
  <Link href={href} className="group block">
    <div className={`border-t-2 ${hi ? 'border-orange-500' : 'border-gray-900 dark:border-white'} pt-3 pb-4`}>
      <p className="mono text-[9px] tracking-[0.2em] uppercase text-gray-400 dark:text-gray-500 mb-2">
        {label}
      </p>
      <p className="mono text-4xl font-bold tabular-nums text-gray-900 dark:text-white leading-none group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-150">
        {value.toLocaleString()}
      </p>
    </div>
  </Link>
);

/* ─────────────────────────── page ──────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading]             = useState(true);
  const [requests, setRequests]           = useState<RequestRow[]>([]);
  const [allReqs,  setAllReqs]            = useState<RequestRow[]>([]);
  const [residentCount, setResidentCount] = useState(0);
  const [adminName, setAdminName]         = useState('');
  const [now]                             = useState(new Date());

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: profile } = await supabase
          .from('profiles').select('firstName, lastName').eq('id', user.id).single();
        if (profile) setAdminName(`${profile.firstName} ${profile.lastName}`);

        const { data: reqData } = await supabase
          .from('requests')
          .select('id, type, document_type, status, created_at, user_id')
          .order('created_at', { ascending: false });

        const all = reqData ?? [];
        setAllReqs(all as RequestRow[]);

        const uniqueIds = [...new Set(all.slice(0, 5).map((r: any) => r.user_id))];
        let pm: Record<string, { firstName: string; lastName: string }> = {};

        if (uniqueIds.length) {
          const { data: pd } = await supabase
            .from('profiles').select('id, firstName, lastName').in('id', uniqueIds);
          pm = Object.fromEntries((pd ?? []).map((p: any) => [p.id, p]));
        }

        setRequests(all.slice(0, 5).map((r: any) => ({ ...r, profiles: pm[r.user_id] ?? null })));

        const { count } = await supabase
          .from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'resident');
        setResidentCount(count ?? 0);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const stats = {
    total:     allReqs.length,
    pending:   allReqs.filter(r => r.status === 'pending').length,
    approved:  allReqs.filter(r => r.status === 'approved').length,
    rejected:  allReqs.filter(r => r.status === 'rejected').length,
    today:     allReqs.filter(r => isToday(r.created_at)).length,
    thisMonth: allReqs.filter(r => isThisMonth(r.created_at)).length,
  };

  const approvalRate = stats.total > 0
    ? Math.round((stats.approved / stats.total) * 100)
    : 0;

  const dateStr = now.toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).toUpperCase();

  const timeStr = now.toLocaleTimeString('en-PH', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  });

  const firstName = adminName ? adminName.split(' ')[0].toUpperCase() : '';

  /* ── loading ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f4f0] dark:bg-[#0a0a0a]">
        <span className="mono text-[11px] tracking-[0.3em] text-gray-400 dark:text-gray-600 uppercase animate-pulse">
          Loading…
        </span>
      </div>
    );
  }

  /* ── page ────────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500&display=swap');
        .dash { font-family: 'IBM Plex Sans', sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      <div className="dash min-h-screen bg-[#f5f4f0] dark:bg-[#0a0a0a] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10 lg:py-14">

          {/* ── MASTHEAD ───────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="border-b-2 border-gray-900 dark:border-white pb-5 mb-10"
          >
            <div className="flex items-end justify-between">
              <div>
                <p className="mono text-[9px] tracking-[0.3em] text-gray-400 dark:text-gray-500 mb-1.5">
                  {dateStr}
                </p>
                <h1 className="mono text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                  {firstName ? `${firstName} /` : ''} ADMIN DASHBOARD
                </h1>
              </div>
              <p className="mono text-2xl font-bold text-gray-300 dark:text-gray-700 leading-none hidden md:block select-none">
                {timeStr}
              </p>
            </div>
          </motion.div>

          {/* ── STAT STRIP ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 mb-12"
          >
            <StatCell label="Total Requests" value={stats.total}    href="/pending-requests"   />
            <StatCell label="Pending"         value={stats.pending}  href="/pending-requests"   hi />
            <StatCell label="Approved"        value={stats.approved} href="/approved-documents" />
            <StatCell label="Residents"       value={residentCount}  href="/residents"          />
          </motion.div>

          {/* ── BODY ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* Requests table */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.13 }}
              className="lg:col-span-2"
            >
              {/* section label */}
              <div className="flex items-baseline justify-between border-b border-gray-300 dark:border-white/10 pb-2">
                <span className="mono text-[9px] tracking-[0.25em] uppercase text-gray-400 dark:text-gray-500">
                  Recent Requests
                </span>
                <Link href="/pending-requests" className="mono text-[9px] tracking-[0.15em] uppercase text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors flex items-center gap-1">
                  All <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* col headers */}
              <div className="grid grid-cols-[1fr_100px_60px_28px] py-2 border-b border-gray-200 dark:border-white/[0.06]">
                <span className="mono text-[9px] tracking-[0.2em] uppercase text-gray-300 dark:text-gray-600">Resident</span>
                <span className="mono text-[9px] tracking-[0.2em] uppercase text-gray-300 dark:text-gray-600">Status</span>
                <span className="mono text-[9px] tracking-[0.2em] uppercase text-gray-300 dark:text-gray-600 text-right">Date</span>
                <span />
              </div>

              {requests.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-300 dark:text-gray-700" />
                  <span className="mono text-[10px] tracking-widest uppercase text-gray-300 dark:text-gray-600">
                    No records
                  </span>
                </div>
              ) : (
                <AnimatePresence>
                  {requests.map((req, i) => {
                    const name    = req.profiles
                      ? `${req.profiles.firstName} ${req.profiles.lastName}`
                      : 'Unknown';
                    const docType = (req.type ?? req.document_type ?? '—').toUpperCase();

                    return (
                      <motion.div
                        key={req.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.04 * i }}
                        className="group grid grid-cols-[1fr_100px_60px_28px] items-center py-3 border-b border-gray-100 dark:border-white/[0.04] last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] -mx-2 px-2 transition-colors duration-100"
                      >
                        <div className="min-w-0 pr-4">
                          <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate leading-none">
                            {name}
                          </p>
                          <p className="mono text-[10px] text-gray-400 dark:text-gray-500 mt-1 truncate">
                            {docType}
                          </p>
                        </div>

                        <StatusTag status={req.status} />

                        <span className="mono text-[10px] text-gray-400 dark:text-gray-500 text-right">
                          {fmt(req.created_at)}
                        </span>

                        <Link href={requestLink(req)} className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-3.5 h-3.5 text-gray-400 hover:text-orange-500 transition-colors" />
                        </Link>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </motion.div>

            {/* Right column */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.19 }}
              className="space-y-8"
            >

              {/* Activity ledger */}
              <div>
                <p className="mono text-[9px] tracking-[0.25em] uppercase text-gray-400 dark:text-gray-500 border-b border-gray-300 dark:border-white/10 pb-2">
                  Activity
                </p>
                {[
                  { label: 'Today',      value: stats.today,     cls: 'text-gray-900 dark:text-white' },
                  { label: 'This month', value: stats.thisMonth, cls: 'text-gray-900 dark:text-white' },
                  { label: 'Pending',    value: stats.pending,   cls: 'text-amber-500 dark:text-amber-400' },
                  { label: 'Rejected',   value: stats.rejected,  cls: 'text-red-500   dark:text-red-400'   },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="flex items-baseline justify-between py-2.5 border-b border-gray-100 dark:border-white/[0.05] last:border-0">
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">{label}</span>
                    <span className={`mono text-[13px] font-bold tabular-nums ${cls}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Approval rate */}
              {stats.total > 0 && (
                <div>
                  <div className="flex items-baseline justify-between border-b border-gray-300 dark:border-white/10 pb-2 mb-3">
                    <p className="mono text-[9px] tracking-[0.25em] uppercase text-gray-400 dark:text-gray-500">
                      Approval Rate
                    </p>
                    <span className="mono text-[9px] text-gray-400 dark:text-gray-500">
                      {stats.approved}/{stats.total}
                    </span>
                  </div>

                  {/* flat progress bar — no border-radius */}
                  <div className="relative h-[3px] bg-gray-200 dark:bg-white/[0.08] mb-3">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${approvalRate}%` }}
                      transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-y-0 left-0 bg-emerald-500"
                    />
                  </div>

                  <p className="mono text-3xl font-bold tabular-nums text-gray-900 dark:text-white leading-none">
                    {approvalRate}
                    <span className="text-base font-normal text-gray-400">%</span>
                  </p>
                </div>
              )}

              {/* Pending alert */}
              {stats.pending > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="border-l-2 border-orange-500 pl-4 py-0.5"
                >
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="mono text-[10px] font-bold tracking-[0.12em] uppercase text-orange-500 leading-none">
                        Action Required
                      </p>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1.5 leading-snug">
                        {stats.pending} request{stats.pending > 1 ? 's' : ''} awaiting review.
                      </p>
                    </div>
                  </div>
                  <Link href="/pending-requests">
                    <button className="mono text-[10px] font-bold tracking-[0.12em] uppercase text-white bg-orange-500 hover:bg-orange-600 transition-colors px-3 py-1.5">
                      Review now →
                    </button>
                  </Link>
                </motion.div>
              )}

            </motion.div>
          </div>

        </div>
      </div>
    </>
  );
}