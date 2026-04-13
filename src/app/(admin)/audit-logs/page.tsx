'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Upload, Search, FileText, Download } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

/* ─── types ─────────────────────────────────────────────────────────────── */
interface AuditLog {
  id:              string;
  request_id:      string;
  action:          'approved' | 'rejected' | 'document_uploaded';
  performed_by:    string | null;
  performer_email: string | null;
  performer_name:  string | null;
  notes:           string | null;
  created_at:      string;
  document_type:   string | null;
  resident_name:   string | null;
}

/* ─── helpers ───────────────────────────────────────────────────────────── */
const fmtDocType = (s: string | null) =>
  (s ?? '—').split(/[\s-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const ACTION_CFG = {
  approved:          { label: 'Approved',     icon: CheckCircle, cls: 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' },
  rejected:          { label: 'Rejected',     icon: XCircle,     cls: 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30'                       },
  document_uploaded: { label: 'Doc Uploaded', icon: Upload,      cls: 'text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30'                 },
} as const;

/* ─── csv export ─────────────────────────────────────────────────────────── */
function exportCSV(logs: AuditLog[]) {
  const headers = ['Log ID', 'Timestamp', 'Action', 'Admin Name', 'Admin Email', 'Document Type', 'Resident', 'Notes', 'Request ID'];

  const escape = (v: string | null | undefined) => {
    const s = (v ?? '').replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = logs.map(l => [
    escape(l.id),
    escape(new Date(l.created_at).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })),
    escape(ACTION_CFG[l.action]?.label ?? l.action),
    escape(l.performer_name),
    escape(l.performer_email),
    escape(fmtDocType(l.document_type)),
    escape(l.resident_name),
    escape(l.notes),
    escape(l.request_id),
  ].join(','));

  const csv  = [headers.map(h => `"${h}"`).join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `audit-logs-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── sub-components ────────────────────────────────────────────────────── */
const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#6C6C74] dark:text-[#9090A0] border-b border-[#E8E6E1] dark:border-[#2C2C32] pb-2 mb-4">{label}</p>
);

const ActionBadge = ({ action }: { action: AuditLog['action'] }) => {
  const cfg  = ACTION_CFG[action] ?? ACTION_CFG.approved;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-700 tracking-[0.08em] uppercase px-2.5 py-1 border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
};

/* ─── truncate helper ───────────────────────────────────────────────────── */
const Truncated = ({ text, className = '' }: { text: string | null; className?: string }) => {
  if (!text) return <span className="text-[#6C6C74] dark:text-[#9090A0] italic">—</span>;
  const short = text.length > 40 ? text.slice(0, 40) + '…' : text;
  return <span className={className} title={text}>{short}</span>;
};

/* ─── page ──────────────────────────────────────────────────────────────── */
export default function AuditLogsPage() {
  const router = useRouter();

  const [logs,         setLogs]         = useState<AuditLog[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [exporting,    setExporting]    = useState(false);
  const [search,       setSearch]       = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | AuditLog['action']>('all');
  const [dateFilter,   setDateFilter]   = useState<'all' | 'today' | 'week' | 'month'>('all');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: rawLogs, error } = await supabase
        .from('audit_logs')
        .select(`id, request_id, action, performed_by, performer_email, performer_name, notes, created_at, requests ( document_type, type, user_id )`)
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) { console.error('[audit]', error.message); setLoading(false); return; }

      const userIds = [...new Set((rawLogs ?? []).map((l: any) => l.requests?.user_id).filter(Boolean))];
      const profileMap: Record<string, string> = {};
      await Promise.all(userIds.map(async (uid: string) => {
        try {
          const res = await fetch(`/api/profile?id=${uid}`);
          if (!res.ok) return;
          const j = await res.json();
          const p = j.data;
          if (p) profileMap[uid] = `${p.firstName ?? p.first_name ?? ''} ${p.lastName ?? p.last_name ?? ''}`.trim();
        } catch { /* skip */ }
      }));

      setLogs((rawLogs ?? []).map((l: any) => ({
        id:              l.id,
        request_id:      l.request_id,
        action:          l.action,
        performed_by:    l.performed_by,
        performer_email: l.performer_email,
        performer_name:  l.performer_name ?? null,
        notes:           l.notes,
        created_at:      l.created_at,
        document_type:   l.requests?.type ?? l.requests?.document_type ?? null,
        resident_name:   l.requests?.user_id ? (profileMap[l.requests.user_id] ?? null) : null,
      })));
      setLoading(false);
    })();
  }, [router]);

  /* ── filtering ─────────────────────────────────────────────────────────── */
  const isToday = (d: string) => new Date(d).toDateString() === new Date().toDateString();
  const isWeek  = (d: string) => { const now = new Date(); const s = new Date(now); s.setDate(now.getDate() - now.getDay()); s.setHours(0,0,0,0); return new Date(d) >= s; };
  const isMonth = (d: string) => { const n = new Date(); const d2 = new Date(d); return d2.getMonth() === n.getMonth() && d2.getFullYear() === n.getFullYear(); };

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch =
      (l.performer_name  ?? '').toLowerCase().includes(q) ||
      (l.performer_email ?? '').toLowerCase().includes(q) ||
      (l.resident_name   ?? '').toLowerCase().includes(q) ||
      (l.document_type   ?? '').toLowerCase().includes(q) ||
      (l.request_id ?? '').toLowerCase().includes(q);
    const matchAction = actionFilter === 'all' || l.action === actionFilter;
    const matchDate   = dateFilter === 'all' ? true : dateFilter === 'today' ? isToday(l.created_at) : dateFilter === 'week' ? isWeek(l.created_at) : isMonth(l.created_at);
    return matchSearch && matchAction && matchDate;
  });

  const countAction = (a: AuditLog['action']) => logs.filter(l => l.action === a).length;

  /* ── export handler ─────────────────────────────────────────────────────── */
  const handleExport = () => {
    setExporting(true);
    setTimeout(() => { exportCSV(filtered); setExporting(false); }, 80);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5F3] dark:bg-[#111113]">
      <span className="mono text-[12px] tracking-[0.25em] text-[#6C6C74] dark:text-[#9090A0] uppercase animate-pulse">Loading…</span>
    </div>
  );

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap'); .pjs{font-family:'Plus Jakarta Sans',sans-serif} `}</style>

      <div className="pjs min-h-screen bg-[#F6F5F3] dark:bg-[#111113] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* ── MASTHEAD ───────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b-2 border-[#1A1A1C] dark:border-[#EAEAEC] pb-5 mb-10">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="text-[11px] tracking-[0.2em] text-[#6C6C74] dark:text-[#9090A0] uppercase mb-2">Admin Panel</p>
                <h1 className="mono text-[26px] font-bold leading-tight text-[#1A1A1C] dark:text-[#EAEAEC] tracking-tight leading-none">AUDIT LOGS</h1>
              </div>
              <Link href="/admindashboard" className="text-[11px] font-500 tracking-[0.08em] uppercase text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors">
                ← Dashboard
              </Link>
            </div>
          </motion.div>

          {/* ── STAT STRIP ─────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 mb-12">
            {[
              { label: 'Total Events',  value: logs.length,                     accent: false },
              { label: 'Approvals',     value: countAction('approved'),          accent: false },
              { label: 'Rejections',    value: countAction('rejected'),          accent: countAction('rejected') > 0 },
              { label: 'Docs Uploaded', value: countAction('document_uploaded'), accent: false },
            ].map(({ label, value, accent }) => (
              <div key={label} className={`border-t-2 ${accent ? 'border-red-500' : 'border-[#1A1A1C] dark:border-[#EAEAEC]'} pt-3 pb-4`}>
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">{label}</p>
                <p className={`mono text-4xl font-bold tabular-nums leading-none ${accent ? 'text-red-600 dark:text-red-400' : 'text-[#1A1A1C] dark:text-[#EAEAEC]'}`}>{value}</p>
              </div>
            ))}
          </motion.div>

          {/* ── FILTERS + EXPORT ───────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <SectionLabel label="Filters" />
              <button
                onClick={handleExport}
                disabled={exporting || filtered.length === 0}
                className="ml-6 mb-4 flex items-center gap-2 text-[11px] font-700 tracking-[0.08em] uppercase px-4 py-2 border border-orange-600 dark:border-orange-500 text-orange-600 dark:text-orange-400 hover:bg-orange-600 dark:hover:bg-orange-500 hover:text-white dark:hover:text-white transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Export CSV
                {filtered.length > 0 && !exporting && (
                  <span className="ml-1 text-[#6C6C74] dark:text-[#9090A0] font-normal">({filtered.length})</span>
                )}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C74] dark:text-[#9090A0]" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by admin, resident, doc type…"
                  className="w-full pl-9 pr-3 py-2.5 text-[12px] bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] text-[#1A1A1C] dark:text-[#EAEAEC] placeholder-[#B0B0B8] dark:placeholder-[#55555F] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors mono"
                />
              </div>
              <select value={actionFilter} onChange={e => setActionFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 text-[12px] bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] text-[#1A1A1C] dark:text-[#EAEAEC] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors mono">
                <option value="all">All Actions</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="document_uploaded">Document Uploaded</option>
              </select>
              <select value={dateFilter} onChange={e => setDateFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 text-[12px] bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] text-[#1A1A1C] dark:text-[#EAEAEC] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors mono">
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </motion.div>

          {/* ── TABLE ──────────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <SectionLabel label={`Events (${filtered.length})`} />

            {filtered.length === 0 ? (
              <div className="border border-[#E8E6E1] dark:border-[#2C2C32] bg-white dark:bg-[#1C1C1F] py-16 text-center">
                <FileText className="w-6 h-6 text-[#c8c6c0] dark:text-[#3a3845] mx-auto mb-3" />
                <p className="mono text-[12px] tracking-widest uppercase text-[#6C6C74] dark:text-[#9090A0]">
                  {logs.length === 0 ? 'No audit events yet' : 'No events match your filters'}
                </p>
              </div>
            ) : (
              <div className="border border-[#E8E6E1] dark:border-[#2C2C32] bg-white dark:bg-[#1C1C1F] overflow-x-auto">

                {/* col headers */}
                <div className="grid grid-cols-[1fr_1.6fr_1.2fr_1fr_1.2fr_0.7fr] gap-4 px-5 py-3 border-b border-[#E8E6E1] dark:border-[#2C2C32] bg-[#F6F5F3] dark:bg-[#111113]">
                  {['Timestamp', 'Admin', 'Action', 'Document Type', 'Resident', 'View'].map(h => (
                    <p key={h} className="text-[10px] font-700 tracking-[0.1em] uppercase text-[#6C6C74] dark:text-[#9090A0]">{h}</p>
                  ))}
                </div>

                {/* rows */}
                {filtered.map((log, i) => (
                  <div
                    key={log.id}
                    className={`grid grid-cols-[1fr_1.6fr_1.2fr_1fr_1.2fr_0.7fr] gap-4 px-5 py-4 border-b border-[#E8E6E1] dark:border-[#2C2C32] last:border-0 hover:bg-[#F6F5F3] dark:hover:bg-[#16161a] transition-colors ${i % 2 !== 0 ? 'bg-[#F6F5F3] dark:bg-[#1C1C1F]' : ''}`}
                  >
                    {/* timestamp */}
                    <div>
                      <p className="mono text-[11px] text-[#1A1A1C] dark:text-[#EAEAEC]">
                        {new Date(log.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] mt-0.5">
                        {new Date(log.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* admin */}
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-[#1A1A1C] dark:text-[#EAEAEC] truncate" title={log.performer_name ?? log.performer_email ?? ''}>
                        {log.performer_name ?? <span className="italic text-[#6C6C74] dark:text-[#9090A0]">Unknown</span>}
                      </p>
                      {log.performer_email && (
                        <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] mt-0.5 truncate" title={log.performer_email}>
                          {log.performer_email}
                        </p>
                      )}
                    </div>

                    {/* action */}
                    <div className="min-w-0">
                      <ActionBadge action={log.action} />
                      {log.notes && (
                        <p className="text-[11px] text-[#6C6C74] dark:text-[#9090A0] mt-1.5 leading-snug line-clamp-1 truncate" title={log.notes}>
                          {log.notes}
                        </p>
                      )}
                    </div>

                    {/* document type */}
                    <div className="min-w-0">
                      <p className="text-[12px] text-[#3A3A3E] dark:text-[#BABABC] truncate" title={fmtDocType(log.document_type)}>
                        {fmtDocType(log.document_type)}
                      </p>
                    </div>

                    {/* resident */}
                    <div className="min-w-0">
                      <p className="text-[12px] text-[#3A3A3E] dark:text-[#BABABC] truncate" title={log.resident_name ?? ''}>
                        {log.resident_name || <span className="text-[#6C6C74] dark:text-[#9090A0] italic">—</span>}
                      </p>
                    </div>

                    {/* view link */}
                    <div>
                      <Link href={`/audit-logs/${log.id}`} className="mono text-[10px] tracking-[0.08em] uppercase text-orange-600 dark:text-orange-400 hover:underline">
                        {log.id.slice(0, 8).toUpperCase()} →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filtered.length > 0 && (
              <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0] mt-3">
                Showing {filtered.length} of {logs.length} event{logs.length !== 1 ? 's' : ''}
              </p>
            )}
          </motion.div>

        </div>
      </div>
    </>
  );
}