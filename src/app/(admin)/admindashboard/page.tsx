'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Eye, ArrowRight, AlertTriangle,
  Clock, CheckCircle, XCircle, Users, ChevronRight,
} from 'lucide-react';
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

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

/* ─────────────────────────── helpers ───────────────────────────────────── */
const isToday = (d: string) =>
  new Date(d).toDateString() === new Date().toDateString();

const isThisMonth = (d: string) => {
  const dt = new Date(d), now = new Date();
  return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
};

const isLastMonth = (d: string) => {
  const dt = new Date(d), now = new Date();
  const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return dt.getMonth() === lm.getMonth() && dt.getFullYear() === lm.getFullYear();
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

const requestLink = (r: RequestRow) => {
  if (r.status === 'approved') return `/approved-documents/${r.id}`;
  if (r.status === 'rejected') return `/rejected-requests/${r.id}`;
  return `/pending-requests/${r.id}`;
};

const toSentenceCase = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '—';

/* ─────────────────────────── sub-components ────────────────────────────── */

const StatusTag = ({ status }: { status: string }) => {
  const cfg: Record<string, { label: string; cls: string }> = {
    approved: { label: 'Approved', cls: 'text-emerald-700 dark:text-emerald-400' },
    rejected: { label: 'Rejected', cls: 'text-red-600    dark:text-red-400'      },
    pending:  { label: 'Pending',  cls: 'text-amber-600  dark:text-amber-400'    },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span className={`text-[12px] font-semibold ${c.cls}`}>
      {c.label}
    </span>
  );
};

const StatCell = ({
  label, value, href, accent,
}: {
  label: string; value: number; href: string; accent?: 'orange' | 'red';
}) => {
  const borderCls = accent === 'orange'
    ? 'border-orange-500'
    : accent === 'red'
    ? 'border-red-500'
    : 'border-[#1A1A1C] dark:border-[#EAEAEC]';
  const valCls = accent === 'orange'
    ? 'text-orange-600 dark:text-orange-400'
    : accent === 'red'
    ? 'text-red-600 dark:text-red-400'
    : 'text-[#1A1A1C] dark:text-[#EAEAEC]';

  return (
    <Link href={href} className="group block">
      <div className={`border-t-2 ${borderCls} pt-3 pb-4`}>
        <p className="mono text-[11px] tracking-[0.15em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">
          {label}
        </p>
        <p className={`mono text-4xl font-bold tabular-nums leading-none group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-150 ${valCls}`}>
          {value.toLocaleString()}
        </p>
      </div>
    </Link>
  );
};

/* ─────────────────────────── page ──────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading]             = useState(true);
  const [allReqs,  setAllReqs]            = useState<RequestRow[]>([]);
  const [profileMap, setProfileMap]       = useState<Record<string, { firstName: string; lastName: string }>>({});
  const [residentCount, setResidentCount] = useState(0);
  const [adminName, setAdminName]         = useState('');
  const [now]                             = useState(new Date());
  const [activeTab, setActiveTab]         = useState<FilterTab>('all');

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const profileRes = await fetch(`/api/profile?id=${user.id}`);
        if (profileRes.ok) {
          const { data: profile } = await profileRes.json();
          if (profile) setAdminName(`${profile.firstName} ${profile.lastName}`);
        }

        const { data: reqData } = await supabase
          .from('requests')
          .select('id, type, document_type, status, created_at, user_id')
          .order('created_at', { ascending: false });

        const all = (reqData ?? []) as RequestRow[];
        setAllReqs(all);

        // fetch profiles for ALL unique user_ids via /api/profile (handles decryption)
        const uniqueIds = [...new Set(all.map((r) => r.user_id))];
        if (uniqueIds.length) {
          const profiles = await Promise.all(
            uniqueIds.map(async (id) => {
              const res = await fetch(`/api/profile?id=${id}`);
              if (!res.ok) return null;
              const { data } = await res.json();
              return data ? { id, ...data } : null;
            })
          );
          setProfileMap(Object.fromEntries(
            profiles.filter(Boolean).map((p: any) => [p.id, p])
          ));
        }

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

  /* ── derived data ──────────────────────────────────────────────────────── */
  const stats = {
    total:        allReqs.length,
    pending:      allReqs.filter(r => r.status === 'pending').length,
    approved:     allReqs.filter(r => r.status === 'approved').length,
    rejected:     allReqs.filter(r => r.status === 'rejected').length,
    today:        allReqs.filter(r => isToday(r.created_at)).length,
    thisMonth:    allReqs.filter(r => isThisMonth(r.created_at)).length,
    lastMonth:    allReqs.filter(r => isLastMonth(r.created_at)).length,
    approvedThisMonth: allReqs.filter(r => r.status === 'approved' && isThisMonth(r.created_at)).length,
    approvedLastMonth: allReqs.filter(r => r.status === 'approved' && isLastMonth(r.created_at)).length,
  };

  const approvalRateThis = stats.thisMonth > 0
    ? Math.round((stats.approvedThisMonth / stats.thisMonth) * 100) : 0;
  const approvalRateLast = stats.lastMonth > 0
    ? Math.round((stats.approvedLastMonth / stats.lastMonth) * 100) : 0;
  const rateDelta = approvalRateThis - approvalRateLast;

  // filtered + capped at 10 rows, hydrated with profiles
  const filteredReqs = allReqs
    .filter(r => activeTab === 'all' || r.status === activeTab)
    .slice(0, 10)
    .map(r => ({ ...r, profiles: profileMap[r.user_id] ?? null }));

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all',      label: 'All',      count: stats.total    },
    { key: 'pending',  label: 'Pending',  count: stats.pending  },
    { key: 'approved', label: 'Approved', count: stats.approved },
    { key: 'rejected', label: 'Rejected', count: stats.rejected },
  ];

  const dateStr = now.toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const firstName = adminName ? adminName.split(' ')[0].toUpperCase() : '';

  const quickActions = [
    { label: 'Review pending requests', href: '/pending-requests',   icon: Clock,         count: stats.pending,  urgent: true  },
    { label: 'View approved documents', href: '/approved-documents', icon: CheckCircle,   count: stats.approved, urgent: false },
    { label: 'View rejected requests',  href: '/rejected-requests',  icon: XCircle,       count: stats.rejected, urgent: stats.rejected > 0 },
    { label: 'Manage residents',        href: '/residents',          icon: Users,         count: residentCount,  urgent: false },
  ];

  /* ── loading ─────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F6F5F3] dark:bg-[#111113]">
        <span className="mono text-[12px] tracking-[0.25em] text-[#6C6C74] dark:text-[#9090A0] uppercase animate-pulse">
          Loading…
        </span>
      </div>
    );
  }

  /* ── page ────────────────────────────────────────────────────────────── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        .dash { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      <div className="dash min-h-screen bg-[#F6F5F3] dark:bg-[#111113] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-6 pb-10 lg:pb-14">

          {/* ── MASTHEAD ───────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="border-b-2 border-[#1A1A1C] dark:border-[#EAEAEC] pb-5 mb-10"
          >
            <p className="mono text-[11px] tracking-[0.25em] text-[#6C6C74] dark:text-[#9090A0] mb-2">
              {dateStr}
            </p>
            <h1 className="mono text-2xl md:text-3xl font-bold text-[#1A1A1C] dark:text-[#EAEAEC] tracking-tight leading-none">
              {firstName ? `Good day, ${firstName} 👋` : 'Admin Dashboard'}
            </h1>
          </motion.div>

          {/* ── STAT STRIP ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 mb-12"
          >
            <StatCell label="Total Requests" value={stats.total}    href="/pending-requests"   />
            <StatCell label="Pending"         value={stats.pending}  href="/pending-requests"   accent="orange" />
            <StatCell label="Approved"        value={stats.approved} href="/approved-documents" />
            <StatCell label="Rejected"        value={stats.rejected} href="/rejected-requests"  accent="red" />
          </motion.div>

          {/* ── BODY ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* ── REQUESTS TABLE ─────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.13 }}
              className="lg:col-span-2"
            >

              {/* section header */}
              <div className="flex items-baseline justify-between border-b border-[#E8E6E1] dark:border-[#2C2C32] pb-2 mb-4">
                <span className="mono text-[11px] tracking-[0.2em] uppercase text-[#6C6C74] dark:text-[#9090A0]">
                  Recent Requests
                </span>
                <Link
                  href="/pending-requests"
                  className="mono text-[11px] tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors flex items-center gap-1"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {/* ── FILTER TABS ────────────────────────────────────── */}
              <div className="flex items-center gap-1 mb-4 flex-wrap">
                {tabs.map(({ key, label, count }) => {
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className={`
                        flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-semibold
                        rounded-full border transition-colors duration-150
                        ${isActive
                          ? 'bg-[#E8500A] text-white border-[#E8500A] rounded-full'
                          : 'bg-transparent text-[#6C6C74] dark:text-[#9090A0] border-[#E8E6E1] dark:border-[#2C2C32] rounded-full hover:border-[#E8500A] hover:text-[#E8500A]'
                        }
                      `}
                    >
                      {label}
                      <span className={`mono text-[10px] font-bold ${
                        isActive
                          ? 'text-white/70 dark:text-[#1a1917]/60'
                          : key === 'pending'
                          ? 'text-amber-600 dark:text-amber-400'
                          : key === 'rejected'
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-[#6C6C74] dark:text-[#9090A0]'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* col headers */}
              <div className="grid grid-cols-[1fr_100px_56px_36px] py-2 border-b border-[#E8E6E1] dark:border-[#2C2C32]">
                <span className="mono text-[11px] tracking-[0.15em] uppercase text-[#6C6C74] dark:text-[#9090A0]">Resident</span>
                <span className="mono text-[11px] tracking-[0.15em] uppercase text-[#6C6C74] dark:text-[#9090A0]">Status</span>
                <span className="mono text-[11px] tracking-[0.15em] uppercase text-[#6C6C74] dark:text-[#9090A0] text-right">Date</span>
                <span />
              </div>

              {/* rows */}
              {filteredReqs.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3">
                  <FileText className="w-6 h-6 text-[#B0B0B8] dark:text-[#3A3A44]" />
                  <span className="mono text-[12px] tracking-widest uppercase text-[#6C6C74] dark:text-[#9090A0]">
                    No {activeTab === 'all' ? '' : activeTab} records
                  </span>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {filteredReqs.map((req, i) => {
                      const name    = req.profiles
                        ? `${req.profiles.firstName} ${req.profiles.lastName}`
                        : 'Unknown';
                      const rawType = req.type ?? req.document_type ?? '—';
                      // sentence case, not all-caps
                      const docType = rawType.split(' ').map(toSentenceCase).join(' ');

                      return (
                        <div
                          key={req.id}
                          className="grid grid-cols-[1fr_100px_56px_36px] items-center py-3.5 border-b border-[#E8E6E1] dark:border-[#2C2C32] last:border-0 hover:bg-[#F0EFED] dark:hover:bg-[#1C1C1F] -mx-2 px-2 transition-colors duration-100"
                        >
                          <div className="min-w-0 pr-4">
                            <p className="text-[14px] font-medium text-[#1A1A1C] dark:text-[#EAEAEC] truncate leading-none">
                              {name}
                            </p>
                            {/* sentence case, regular weight, not mono */}
                            <p className="text-[12px] text-[#6C6C74] dark:text-[#9090A0] mt-1.5 truncate">
                              {docType}
                            </p>
                          </div>

                          <StatusTag status={req.status} />

                          <span className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0] text-right">
                            {fmt(req.created_at)}
                          </span>

                          {/* always-visible open button */}
                          <Link href={requestLink(req)} className="flex justify-end">
                            <span className="flex items-center justify-center w-8 h-8 border border-[#E8E6E1] dark:border-[#2C2C32] rounded-lg hover:bg-[#E8500A] hover:border-[#E8500A] group/btn transition-colors duration-150">
                              <Eye className="w-3.5 h-3.5 text-[#6C6C74] dark:text-[#9090A0] group-hover/btn:text-white transition-colors" />
                            </span>
                          </Link>
                        </div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              )}

              {/* show count footer */}
              {filteredReqs.length > 0 && (
                <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0] mt-3">
                  Showing {filteredReqs.length} of {
                    activeTab === 'all' ? stats.total :
                    activeTab === 'pending' ? stats.pending :
                    activeTab === 'approved' ? stats.approved :
                    stats.rejected
                  } — <Link href={
                    activeTab === 'approved' ? '/approved-documents' :
                    activeTab === 'rejected' ? '/rejected-requests' :
                    '/pending-requests'
                  } className="text-orange-600 dark:text-orange-400 hover:underline">view all</Link>
                </p>
              )}

            </motion.div>

            {/* ── RIGHT SIDEBAR ──────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.19 }}
              className="space-y-8"
            >

              {/* ── QUICK ACTIONS ──────────────────────────────────── */}
              <div>
                <p className="mono text-[11px] tracking-[0.2em] uppercase text-[#6C6C74] dark:text-[#9090A0] border-b border-[#E8E6E1] dark:border-[#2C2C32] pb-2 mb-1">
                  Quick Actions
                </p>
                {quickActions.map(({ label, href, icon: Icon, count, urgent }) => (
                  <Link key={href} href={href}>
                    <div className="flex items-center justify-between py-3 border-b border-[#E8E6E1] dark:border-[#2C2C32] last:border-0 hover:bg-[#F0EFED] dark:hover:bg-[#1C1C1F] -mx-2 px-2 transition-colors duration-100 group">
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 flex-shrink-0 ${urgent ? 'text-orange-500' : 'text-[#6C6C74] dark:text-[#9090A0]'}`} />
                        <span className="text-[13px] text-[#3A3A3E] dark:text-[#BABABC] group-hover:text-[#1a1917] dark:group-hover:text-[#f0eee8] transition-colors">
                          {label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`mono text-[12px] font-bold tabular-nums ${urgent ? 'text-orange-600 dark:text-orange-400' : 'text-[#6C6C74] dark:text-[#9090A0]'}`}>
                          {count}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-[#B0B0B8] dark:text-[#44444C] group-hover:text-[#5c5a54] dark:group-hover:text-[#9e9b94] transition-colors" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* ── APPROVAL RATE (THIS MONTH) ──────────────────────── */}
              {stats.thisMonth > 0 && (
                <div>
                  <div className="flex items-baseline justify-between border-b border-[#E8E6E1] dark:border-[#2C2C32] pb-2 mb-3">
                    <p className="mono text-[11px] tracking-[0.2em] uppercase text-[#6C6C74] dark:text-[#9090A0]">
                      Approval Rate
                    </p>
                    <span className="text-[11px] text-[#6C6C74] dark:text-[#9090A0]">
                      This month
                    </span>
                  </div>

                  <div className="relative h-[6px] bg-[#E8E6E1] dark:bg-[#2C2C32] mb-4 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${approvalRateThis}%` }}
                      transition={{ delay: 0.5, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                    />
                  </div>

                  <div className="flex items-baseline justify-between">
                    <p className="mono text-3xl font-bold tabular-nums text-[#1A1A1C] dark:text-[#EAEAEC] leading-none">
                      {approvalRateThis}
                      <span className="text-lg font-normal text-[#6C6C74] dark:text-[#9090A0]">%</span>
                    </p>
                    {/* month-over-month delta */}
                    {stats.lastMonth > 0 && (
                      <span className={`text-[12px] font-semibold ${
                        rateDelta > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : rateDelta < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-[#6C6C74] dark:text-[#9090A0]'
                      }`}>
                        {rateDelta > 0 ? '+' : ''}{rateDelta}% vs last month
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ── PENDING ALERT ───────────────────────────────────── */}
              {stats.pending > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="border-l-2 border-orange-500 pl-4 py-0.5"
                >
                  <div className="flex items-start gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="mono text-[11px] font-bold tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 leading-none">
                        Action Required
                      </p>
                      <p className="text-[13px] text-[#3A3A3E] dark:text-[#BABABC] mt-2 leading-snug">
                        {stats.pending} request{stats.pending > 1 ? 's' : ''} awaiting review.
                      </p>
                    </div>
                  </div>
                  <Link href="/pending-requests">
                    <button className="text-[12px] font-semibold text-white bg-[#E8500A] hover:bg-[#C44008] transition-colors px-4 py-2 rounded-xl">
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