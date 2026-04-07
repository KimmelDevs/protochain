'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

/* ─────────────────────────── types ─────────────────────────────────────── */
interface RequestRow {
  id: string;
  status: string;
  type: string;
  document_type: string;
  created_at: string;
  user_id: string;
}

interface MonthBucket {
  month: string;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
}

type DateRange = 'last-7-days' | 'last-30-days' | 'last-90-days' | 'this-year' | 'all';

/* ─────────────────────────── helpers ───────────────────────────────────── */
const toSentenceCase = (s: string) =>
  (s ?? '—').split(/[\s-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const DATE_LABELS: Record<DateRange, string> = {
  'last-7-days':  'Last 7 days',
  'last-30-days': 'Last 30 days',
  'last-90-days': 'Last 90 days',
  'this-year':    'This year',
  'all':          'All time',
};

/* ─────────────────────────── sub-components ────────────────────────────── */
const SectionLabel = ({ label }: { label: string }) => (
  <p className="mono text-[11px] tracking-[0.2em] uppercase text-[#5c5a54] dark:text-[#9e9b94] border-b border-[#c8c6c0] dark:border-[#2a2a32] pb-2 mb-5">
    {label}
  </p>
);

/* flat ruled progress bar — no border-radius, matches dashboard style */
const RuledBar = ({ pct, cls }: { pct: number; cls: string }) => (
  <div className="relative h-[3px] bg-[#e8e5e0] dark:bg-[#222228] w-full">
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${pct}%` }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className={`absolute inset-y-0 left-0 ${cls}`}
    />
  </div>
);

/* ─────────────────────────── page ──────────────────────────────────────── */
export default function ReportsPage() {
  const router = useRouter();
  const [loading,        setLoading]        = useState(true);
  const [requests,       setRequests]       = useState<RequestRow[]>([]);
  const [residentCount,  setResidentCount]  = useState(0);
  const [dateRange,      setDateRange]      = useState<DateRange>('last-30-days');
  const [exporting,      setExporting]      = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data } = await supabase
          .from('requests')
          .select('id, status, type, document_type, created_at, user_id')
          .order('created_at', { ascending: true });
        setRequests(data ?? []);

        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'resident');
        setResidentCount(count ?? 0);
      } catch (e) { console.error(e); }
      finally     { setLoading(false); }
    })();
  }, [router]);

  /* ── filter ─────────────────────────────────────────────────────────── */
  const filtered = requests.filter(r => {
    const d = new Date(r.created_at);
    if (dateRange === 'last-7-days')  return d >= new Date(Date.now() - 7  * 86_400_000);
    if (dateRange === 'last-30-days') return d >= new Date(Date.now() - 30 * 86_400_000);
    if (dateRange === 'last-90-days') return d >= new Date(Date.now() - 90 * 86_400_000);
    if (dateRange === 'this-year')    return d.getFullYear() === new Date().getFullYear();
    return true;
  });

  const total        = filtered.length;
  const approved     = filtered.filter(r => r.status === 'approved').length;
  const pending      = filtered.filter(r => r.status === 'pending').length;
  const rejected     = filtered.filter(r => r.status === 'rejected').length;
  const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  const rejRate      = total > 0 ? Math.round((rejected / total) * 100) : 0;
  const pendingRate  = total > 0 ? Math.round((pending  / total) * 100) : 0;

  /* document type breakdown */
  const typeCounts: Record<string, number> = {};
  filtered.forEach(r => {
    const t = r.type ?? r.document_type ?? 'Unknown';
    typeCounts[t] = (typeCounts[t] ?? 0) + 1;
  });
  const typeData = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    }));

  /* last 6 months */
  const monthlyData: MonthBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const yr = d.getFullYear(), mo = d.getMonth();
    const bucket = requests.filter(r => {
      const rd = new Date(r.created_at);
      return rd.getFullYear() === yr && rd.getMonth() === mo;
    });
    monthlyData.push({
      month:    label,
      total:    bucket.length,
      approved: bucket.filter(r => r.status === 'approved').length,
      rejected: bucket.filter(r => r.status === 'rejected').length,
      pending:  bucket.filter(r => r.status === 'pending').length,
    });
  }
  const maxMonth = Math.max(...monthlyData.map(m => m.total), 1);

  /* ── export ─────────────────────────────────────────────────────────── */
  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
      const rows = [
        ['ID', 'Type', 'Status', 'Date'].map(h => `"${h}"`).join(','),
        ...filtered.map(r => [
          escape(r.id),
          escape(toSentenceCase(r.type ?? r.document_type ?? '')),
          escape(r.status),
          escape(new Date(r.created_at).toLocaleDateString('en-PH')),
        ].join(',')),
      ].join('\n');
      const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `report_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      setExporting(false);
    }, 80);
  };

  /* ── loading ─────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f4f0] dark:bg-[#16161a]">
      <span className="mono text-[12px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase animate-pulse">
        Loading…
      </span>
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

          {/* ── MASTHEAD ───────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-b-2 border-[#1a1917] dark:border-[#f0eee8] pb-5 mb-10"
          >
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="mono text-[11px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] mb-2 uppercase">
                  Analytics
                </p>
                <h1 className="mono text-2xl md:text-3xl font-bold text-[#1a1917] dark:text-[#f0eee8] tracking-tight leading-none">
                  REPORTS
                </h1>
              </div>
              <div className="flex items-center gap-4">
                {/* date range selector */}
                <select
                  value={dateRange}
                  onChange={e => setDateRange(e.target.value as DateRange)}
                  className="mono text-[12px] px-3 py-2 bg-white dark:bg-[#1e1e24] border border-[#c8c6c0] dark:border-[#2a2a32] text-[#1a1917] dark:text-[#f0eee8] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors"
                >
                  <option value="last-7-days">Last 7 days</option>
                  <option value="last-30-days">Last 30 days</option>
                  <option value="last-90-days">Last 90 days</option>
                  <option value="this-year">This year</option>
                  <option value="all">All time</option>
                </select>

                {/* export */}
                <button
                  onClick={handleExport}
                  disabled={exporting || filtered.length === 0}
                  className="flex items-center gap-2 mono text-[11px] font-bold tracking-[0.1em] uppercase px-4 py-2 border border-orange-600 dark:border-orange-500 text-orange-600 dark:text-orange-400 hover:bg-orange-600 dark:hover:bg-orange-500 hover:text-white dark:hover:text-white transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Download className="w-3.5 h-3.5" />
                  {exporting ? 'Exporting…' : `Export CSV (${filtered.length})`}
                </button>

                <Link
                  href="/admindashboard"
                  className="mono text-[11px] tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors"
                >
                  ← Dashboard
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ── STAT STRIP ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 mb-14"
          >
            {[
              { label: 'Total Requests', value: total,          accent: false },
              { label: 'Approved',       value: approved,       accent: false },
              { label: 'Pending',        value: pending,        accent: pending  > 0 },
              { label: 'Residents',      value: residentCount,  accent: false },
            ].map(({ label, value, accent }) => (
              <div key={label} className={`border-t-2 ${accent ? 'border-amber-500' : 'border-[#1a1917] dark:border-[#f0eee8]'} pt-3 pb-4`}>
                <p className="mono text-[11px] tracking-[0.15em] uppercase text-[#5c5a54] dark:text-[#9e9b94] mb-2">
                  {label}
                </p>
                <p className={`mono text-4xl font-bold tabular-nums leading-none ${accent ? 'text-amber-600 dark:text-amber-400' : 'text-[#1a1917] dark:text-[#f0eee8]'}`}>
                  {value}
                </p>
              </div>
            ))}
          </motion.div>

          {/* ── BODY GRID ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* ── LEFT: charts (2/3) ─────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.13 }}
              className="lg:col-span-2 space-y-12"
            >

              {/* Document type breakdown */}
              <div>
                <SectionLabel label="Document Types" />
                {typeData.length === 0 ? (
                  <div className="py-10 flex flex-col items-center gap-3">
                    <FileText className="w-5 h-5 text-[#c8c6c0] dark:text-[#3a3845]" />
                    <p className="mono text-[12px] tracking-widest uppercase text-[#7a7870] dark:text-[#7e7b75]">
                      No data for {DATE_LABELS[dateRange].toLowerCase()}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {typeData.map(({ type, count, pct }) => (
                      <div key={type}>
                        <div className="flex items-baseline justify-between mb-1.5">
                          <span className="text-[13px] text-[#3d3b36] dark:text-[#c9c6be]">
                            {toSentenceCase(type)}
                          </span>
                          <div className="flex items-baseline gap-4">
                            <span className="mono text-[11px] text-[#5c5a54] dark:text-[#9e9b94]">{pct}%</span>
                            <span className="mono text-[13px] font-bold tabular-nums text-[#1a1917] dark:text-[#f0eee8] w-6 text-right">{count}</span>
                          </div>
                        </div>
                        <RuledBar pct={pct} cls="bg-orange-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Monthly trends */}
              <div>
                <SectionLabel label="Monthly Trends — Last 6 Months" />
                <div className="space-y-5">
                  {monthlyData.map(({ month, total: t, approved: a, rejected: rj, pending: p }) => (
                    <div key={month}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="mono text-[12px] font-semibold text-[#1a1917] dark:text-[#f0eee8] w-14">{month}</span>
                        <div className="flex gap-4 mono text-[11px]">
                          <span className="text-[#5c5a54] dark:text-[#9e9b94]">{t} total</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{a} approved</span>
                          <span className="text-red-600 dark:text-red-400">{rj} rejected</span>
                        </div>
                      </div>
                      {/* stacked bar: approved (green) + pending (amber) + rejected (red) */}
                      <div className="relative h-[3px] bg-[#e8e5e0] dark:bg-[#222228] w-full flex overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: t > 0 ? `${(a / maxMonth) * 100}%` : '0%' }}
                          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full bg-emerald-500 flex-shrink-0"
                        />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: t > 0 ? `${(p / maxMonth) * 100}%` : '0%' }}
                          transition={{ duration: 0.7, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full bg-amber-400 flex-shrink-0"
                        />
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: t > 0 ? `${(rj / maxMonth) * 100}%` : '0%' }}
                          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                          className="h-full bg-red-500 flex-shrink-0"
                        />
                      </div>
                    </div>
                  ))}
                  {/* bar legend */}
                  <div className="flex items-center gap-5 pt-1">
                    {[
                      { cls: 'bg-emerald-500', label: 'Approved' },
                      { cls: 'bg-amber-400',   label: 'Pending'  },
                      { cls: 'bg-red-500',     label: 'Rejected' },
                    ].map(({ cls, label }) => (
                      <div key={label} className="flex items-center gap-1.5">
                        <div className={`w-3 h-[3px] ${cls}`} />
                        <span className="mono text-[10px] text-[#7a7870] dark:text-[#7e7b75] uppercase tracking-wider">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </motion.div>

            {/* ── RIGHT: performance summary (1/3) ───────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.19 }}
              className="space-y-8"
            >
              <div>
                <SectionLabel label="Performance" />
                <p className="mono text-[10px] text-[#7a7870] dark:text-[#7e7b75] uppercase tracking-wider mb-5">
                  {DATE_LABELS[dateRange]}
                </p>

                {/* approval rate with progress bar */}
                <div className="mb-6">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[13px] text-[#3d3b36] dark:text-[#c9c6be]">Approval rate</span>
                    <span className="mono text-[22px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400 leading-none">
                      {approvalRate}<span className="text-sm font-normal text-[#5c5a54] dark:text-[#9e9b94]">%</span>
                    </span>
                  </div>
                  <RuledBar pct={approvalRate} cls="bg-emerald-500" />
                </div>

                {/* rejection rate */}
                <div className="mb-6">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[13px] text-[#3d3b36] dark:text-[#c9c6be]">Rejection rate</span>
                    <span className="mono text-[22px] font-bold tabular-nums text-red-600 dark:text-red-400 leading-none">
                      {rejRate}<span className="text-sm font-normal text-[#5c5a54] dark:text-[#9e9b94]">%</span>
                    </span>
                  </div>
                  <RuledBar pct={rejRate} cls="bg-red-500" />
                </div>

                {/* pending rate */}
                <div className="mb-8">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[13px] text-[#3d3b36] dark:text-[#c9c6be]">Pending rate</span>
                    <span className="mono text-[22px] font-bold tabular-nums text-amber-600 dark:text-amber-400 leading-none">
                      {pendingRate}<span className="text-sm font-normal text-[#5c5a54] dark:text-[#9e9b94]">%</span>
                    </span>
                  </div>
                  <RuledBar pct={pendingRate} cls="bg-amber-400" />
                </div>

                {/* totals ledger */}
                <div className="border-t border-[#c8c6c0] dark:border-[#2a2a32] pt-4 space-y-0">
                  {[
                    { label: 'Total processed', value: approved + rejected,                         cls: 'text-[#1a1917] dark:text-[#f0eee8]'    },
                    { label: 'Approved',         value: approved,                                   cls: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Rejected',         value: rejected,                                   cls: 'text-red-600 dark:text-red-400'         },
                    { label: 'Still pending',    value: pending,                                    cls: 'text-amber-600 dark:text-amber-400'     },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="flex items-baseline justify-between py-2.5 border-b border-[#e8e5e0] dark:border-[#222228] last:border-0">
                      <span className="text-[13px] text-[#3d3b36] dark:text-[#c9c6be]">{label}</span>
                      <span className={`mono text-[14px] font-bold tabular-nums ${cls}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

          </div>

        </div>
      </div>
    </>
  );
}