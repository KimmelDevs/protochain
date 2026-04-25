'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, CheckCircle, XCircle, Upload, Search,
  FileText, Download, ShieldOff, ChevronDown, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

/* ─── types ─────────────────────────────────────────────────────────────── */
interface AuditLog {
  id:              string;
  request_id:      string;
  action:          'approved' | 'rejected' | 'document_uploaded' | 'revoked';
  performed_by:    string | null;
  performer_email: string | null;
  performer_name:  string | null;
  notes:           string | null;
  batch_id:        string | null;
  created_at:      string;
  document_type:   string | null;
  resident_name:   string | null;
}

/** A kill-switch batch: multiple revoked logs collapsed into one row */
interface KillSwitchBatch {
  kind:            'kill_switch';
  batchKey:        string;
  batch_id:        string | null;
  created_at:      string;
  performer_name:  string | null;
  performer_email: string | null;
  reason:          string;
  resident_name:   string | null;
  logs:            AuditLog[];
}

/** A regular single-log display row */
interface SingleLogRow {
  kind: 'single';
  log:  AuditLog;
}

type DisplayRow = KillSwitchBatch | SingleLogRow;

/* ─── kill-switch detection ─────────────────────────────────────────────── */
/**
 * A log is a kill-switch entry when its action is 'revoked' AND its notes
 * start with the sentinel prefix written by handleKillSwitch().
 */
const KILL_SWITCH_PREFIX = 'ASH Kill-Switch applied to ';

function isKillSwitchLog(log: AuditLog): boolean {
  return log.action === 'revoked' && (log.notes ?? '').startsWith(KILL_SWITCH_PREFIX);
}

/**
 * Extract just the human-readable reason from a kill-switch notes string.
 * Notes format: "ASH Kill-Switch applied to {name}. Reason: {reason}[ | TX: ...]"
 */
function extractKillSwitchReason(notes: string | null): string {
  if (!notes) return '—';
  const reasonMatch = notes.match(/Reason:\s*([^|]+)/);
  return reasonMatch ? reasonMatch[1].trim() : notes;
}

/**
 * Group kill-switch logs into batches using two-tier strategy:
 * 1. PRIMARY  — group by batch_id UUID (reliable, from new kill-switch code)
 * 2. FALLBACK — group consecutive kill-switch logs sharing same performer + reason
 *               (handles legacy rows written before batch_id existed)
 * Non-kill-switch logs pass through as SingleLogRow.
 */
function buildDisplayRows(logs: AuditLog[]): DisplayRow[] {
  // Pass 1: collect all logs that belong to a real batch_id
  const batchMap = new Map<string, AuditLog[]>();
  const inBatch  = new Set<string>(); // log ids already claimed by a batch_id

  for (const log of logs) {
    if (log.batch_id && isKillSwitchLog(log)) {
      if (!batchMap.has(log.batch_id)) batchMap.set(log.batch_id, []);
      batchMap.get(log.batch_id)!.push(log);
      inBatch.add(log.id);
    }
  }

  // Pass 2: walk the log list in order, emit rows
  const rows: DisplayRow[] = [];
  const emittedBatches = new Set<string>();

  let i = 0;
  while (i < logs.length) {
    const log = logs[i];

    // Already consumed by a batch_id group
    if (inBatch.has(log.id)) {
      if (log.batch_id && !emittedBatches.has(log.batch_id)) {
        emittedBatches.add(log.batch_id);
        const batchLogs = [...batchMap.get(log.batch_id)!].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        rows.push({
          kind:            'kill_switch',
          batchKey:        `batch-${log.batch_id}`,
          batch_id:        log.batch_id,
          created_at:      log.created_at,
          performer_name:  log.performer_name,
          performer_email: log.performer_email,
          reason:          extractKillSwitchReason(log.notes),
          resident_name:   log.resident_name,
          logs:            batchLogs,
        });
      }
      i++;
      continue;
    }

    // Legacy kill-switch log with no batch_id → fallback consecutive grouping
    if (isKillSwitchLog(log) && !log.batch_id) {
      const reason    = extractKillSwitchReason(log.notes);
      const performer = log.performed_by;
      const batchLogs: AuditLog[] = [log];
      let j = i + 1;

      while (j < logs.length) {
        const next = logs[j];
        if (
          isKillSwitchLog(next) &&
          !next.batch_id &&
          next.performed_by === performer &&
          extractKillSwitchReason(next.notes) === reason
        ) {
          batchLogs.push(next);
          j++;
        } else {
          break;
        }
      }

      rows.push({
        kind:            'kill_switch',
        batchKey:        `ks-legacy-${log.id}`,
        batch_id:        null,
        created_at:      log.created_at,
        performer_name:  log.performer_name,
        performer_email: log.performer_email,
        reason,
        resident_name:   log.resident_name,
        logs:            batchLogs,
      });

      i = j;
      continue;
    }

    // Regular single log
    rows.push({ kind: 'single', log });
    i++;
  }

  return rows;
}

/* ─── helpers ───────────────────────────────────────────────────────────── */
const fmtDocType = (s: string | null) =>
  (s ?? '—').split(/[\s-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const ACTION_CFG = {
  approved:          { label: 'Approved',     icon: CheckCircle, cls: 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' },
  rejected:          { label: 'Rejected',     icon: XCircle,     cls: 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30'                       },
  document_uploaded: { label: 'Doc Uploaded', icon: Upload,      cls: 'text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30'                 },
  revoked:           { label: 'Revoked',      icon: ShieldOff,   cls: 'text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30'     },
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

/* ─── Kill-Switch Batch Row ─────────────────────────────────────────────── */
function KillSwitchRow({ batch }: { batch: KillSwitchBatch }) {
  const [expanded, setExpanded] = useState(false);
  const isLegacy = batch.batch_id === null;

  return (
    <>
      {/* Summary row — clickable to expand */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded(v => !v)}
        onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setExpanded(v => !v)}
        className="grid grid-cols-[1fr_1.6fr_1.2fr_1fr_1.2fr_0.7fr] gap-4 px-5 py-4 border-b border-[#E8E6E1] dark:border-[#2C2C32] bg-orange-50/60 dark:bg-orange-950/10 hover:bg-orange-100/60 dark:hover:bg-orange-950/20 transition-colors cursor-pointer select-none"
        aria-expanded={expanded}
      >
        {/* timestamp */}
        <div className="flex items-start gap-2 min-w-0">
          <span className="mt-0.5 flex-shrink-0 text-orange-500 dark:text-orange-400">
            {expanded
              ? <ChevronDown className="w-3.5 h-3.5" />
              : <ChevronRight className="w-3.5 h-3.5" />
            }
          </span>
          <div>
            <p className="mono text-[11px] text-[#1A1A1C] dark:text-[#EAEAEC]">
              {new Date(batch.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] mt-0.5">
              {new Date(batch.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* admin */}
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-[#1A1A1C] dark:text-[#EAEAEC] truncate" title={batch.performer_name ?? batch.performer_email ?? ''}>
            {batch.performer_name ?? <span className="italic text-[#6C6C74] dark:text-[#9090A0]">Unknown</span>}
          </p>
          {batch.performer_email && (
            <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] mt-0.5 truncate" title={batch.performer_email}>
              {batch.performer_email}
            </p>
          )}
        </div>

        {/* kill-switch badge + doc count */}
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-700 tracking-[0.08em] uppercase px-2.5 py-1 border text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30">
            <ShieldOff className="w-3 h-3" />Kill-Switch Event
          </span>
          <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] mt-1.5">
            {batch.logs.length} document{batch.logs.length !== 1 ? 's' : ''} revoked
          </p>
          <p className="mono text-[9px] text-[#9090A0] dark:text-[#6C6C74] mt-1 truncate" title={batch.batch_id ?? 'legacy'}>
            {isLegacy
              ? <span className="text-amber-500/70">legacy batch</span>
              : `Batch ${batch.batch_id!.slice(0, 8).toUpperCase()}`
            }
          </p>
        </div>

        {/* reason */}
        <div className="min-w-0 col-span-2">
          <p className="text-[12px] text-[#3A3A3E] dark:text-[#BABABC] truncate" title={batch.reason}>
            {batch.reason}
          </p>
          {batch.resident_name && (
            <p className="text-[11px] text-[#6C6C74] dark:text-[#9090A0] mt-0.5 truncate">
              {batch.resident_name}
            </p>
          )}
        </div>

        {/* expand hint */}
        <div className="flex items-center justify-end">
          <span className="mono text-[10px] tracking-[0.06em] uppercase text-orange-600 dark:text-orange-400">
            {expanded ? 'Collapse' : 'Expand'}
          </span>
        </div>
      </div>

      {/* Expanded detail rows — one per document */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            {/* batch_id reference bar */}
            {batch.batch_id && (
              <div className="px-5 py-2 border-b border-orange-200/60 dark:border-orange-900/40 bg-orange-50/40 dark:bg-orange-950/5 flex items-center gap-3">
                <ShieldOff className="w-3 h-3 text-orange-400 flex-shrink-0" />
                <p className="mono text-[10px] text-orange-600/80 dark:text-orange-400/70 tracking-[0.1em]">
                  BATCH ID: <span className="font-bold text-orange-700 dark:text-orange-400">{batch.batch_id}</span>
                </p>
              </div>
            )}

            {/* Sub-header */}
            <div className="grid grid-cols-[2fr_1.6fr_1fr_1fr] gap-4 px-5 py-2 border-b border-[#E8E6E1] dark:border-[#2C2C32] bg-orange-50/30 dark:bg-orange-950/5">
              {['Document Type', 'Resident', 'Time', 'Links'].map(h => (
                <p key={h} className="text-[10px] font-700 tracking-[0.1em] uppercase text-orange-600/70 dark:text-orange-400/60">{h}</p>
              ))}
            </div>

            {batch.logs.map((log, idx) => (
              <div
                key={log.id}
                className={`grid grid-cols-[2fr_1.6fr_1fr_1fr] gap-4 px-5 py-3 border-b border-[#E8E6E1] dark:border-[#2C2C32] last:border-0 bg-orange-50/20 dark:bg-orange-950/5 ${idx % 2 !== 0 ? 'bg-orange-50/40 dark:bg-orange-950/10' : ''}`}
              >
                {/* doc type */}
                <div className="min-w-0 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-orange-400 dark:text-orange-500 flex-shrink-0" />
                  <p className="text-[12px] text-[#3A3A3E] dark:text-[#BABABC] truncate">
                    {fmtDocType(log.document_type)}
                  </p>
                </div>

                {/* resident */}
                <div className="min-w-0">
                  <p className="text-[12px] text-[#3A3A3E] dark:text-[#BABABC] truncate">
                    {log.resident_name || <span className="text-[#6C6C74] dark:text-[#9090A0] italic">—</span>}
                  </p>
                </div>

                {/* time */}
                <div>
                  <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0]">
                    {new Date(log.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </p>
                </div>

                {/* links */}
                <div className="flex items-center gap-3">
                  <Link
                    href={`/audit-logs/${log.id}`}
                    onClick={e => e.stopPropagation()}
                    className="mono text-[10px] tracking-[0.06em] uppercase text-orange-600 dark:text-orange-400 hover:underline whitespace-nowrap"
                  >
                    Log →
                  </Link>
                  <Link
                    href={`/revoked-documents/${log.request_id}`}
                    onClick={e => e.stopPropagation()}
                    className="mono text-[10px] tracking-[0.06em] uppercase text-[#6C6C74] dark:text-[#9090A0] hover:text-[#1A1A1C] dark:hover:text-[#EAEAEC] hover:underline whitespace-nowrap transition-colors"
                  >
                    Doc →
                  </Link>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

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
        .select(`id, request_id, action, performed_by, performer_email, performer_name, notes, batch_id, created_at, requests ( document_type, type, user_id )`)
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
        batch_id:        l.batch_id ?? null,
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
      (l.request_id ?? '').toLowerCase().includes(q) ||
      (l.batch_id   ?? '').toLowerCase().includes(q) ||
      (l.notes ?? '').toLowerCase().includes(q);
    const matchAction = actionFilter === 'all' || l.action === actionFilter;
    const matchDate   = dateFilter === 'all' ? true : dateFilter === 'today' ? isToday(l.created_at) : dateFilter === 'week' ? isWeek(l.created_at) : isMonth(l.created_at);
    return matchSearch && matchAction && matchDate;
  });

  /** Build display rows from filtered logs, collapsing kill-switch batches */
  const displayRows: DisplayRow[] = buildDisplayRows(filtered);

  const countAction = (a: AuditLog['action']) => logs.filter(l => l.action === a).length;
  const killSwitchBatches   = displayRows.filter(r => r.kind === 'kill_switch') as KillSwitchBatch[];
  const killSwitchBatchCount = killSwitchBatches.length;
  const killSwitchDocCount   = logs.filter(isKillSwitchLog).length;
  const legacyBatchCount     = killSwitchBatches.filter(b => b.batch_id === null).length;

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
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-6 mb-12">
            {[
              { label: 'Total Events',    value: logs.length,                     accent: false },
              { label: 'Approvals',       value: countAction('approved'),          accent: false },
              { label: 'Rejections',      value: countAction('rejected'),          accent: countAction('rejected') > 0 },
              { label: 'Docs Uploaded',   value: countAction('document_uploaded'), accent: false },
              { label: 'Kill-Switch',     value: killSwitchDocCount,              accent: killSwitchDocCount > 0 },
            ].map(({ label, value, accent }) => (
              <div key={label} className={`border-t-2 ${accent ? 'border-red-500' : 'border-[#1A1A1C] dark:border-[#EAEAEC]'} pt-3 pb-4`}>
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">{label}</p>
                <p className={`mono text-4xl font-bold tabular-nums leading-none ${accent ? 'text-red-600 dark:text-red-400' : 'text-[#1A1A1C] dark:text-[#EAEAEC]'}`}>{value}</p>
              </div>
            ))}
          </motion.div>

          {/* ── FILTERS + EXPORT ───────────────────────────────────────── */}
          {/* legacy batch notice — only shown if old-format rows exist */}
          {legacyBatchCount > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}
              className="mb-6 flex items-start gap-3 border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
              <ShieldOff className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-800 dark:text-amber-300 leading-snug">
                <strong>{legacyBatchCount} legacy kill-switch batch{legacyBatchCount !== 1 ? 'es' : ''}</strong> detected — these were created before
                the <code className="mono text-[11px]">batch_id</code> column existed and are grouped by notes-string matching.
                New batches are grouped reliably by UUID.
              </p>
            </motion.div>
          )}
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
                  placeholder="Search by admin, resident, doc type, reason…"
                  className="w-full pl-9 pr-3 py-2.5 text-[12px] bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] text-[#1A1A1C] dark:text-[#EAEAEC] placeholder-[#B0B0B8] dark:placeholder-[#55555F] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors mono"
                />
              </div>
              <select value={actionFilter} onChange={e => setActionFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 text-[12px] bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] text-[#1A1A1C] dark:text-[#EAEAEC] focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors mono">
                <option value="all">All Actions</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="document_uploaded">Document Uploaded</option>
                <option value="revoked">Revoked / Kill-Switch</option>
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
            <SectionLabel label={`Events (${displayRows.length} row${displayRows.length !== 1 ? 's' : ''}${killSwitchBatchCount > 0 ? `, ${killSwitchBatchCount} kill-switch batch${killSwitchBatchCount !== 1 ? 'es' : ''}` : ''})`} />

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
                {displayRows.map((row, i) => {
                  if (row.kind === 'kill_switch') {
                    return <KillSwitchRow key={row.batchKey} batch={row} />;
                  }

                  const log = row.log;
                  return (
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
                  );
                })}
              </div>
            )}

            {filtered.length > 0 && (
              <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0] mt-3">
                Showing {filtered.length} event{filtered.length !== 1 ? 's' : ''} across {displayRows.length} row{displayRows.length !== 1 ? 's' : ''} ({killSwitchBatchCount} kill-switch batch{killSwitchBatchCount !== 1 ? 'es' : ''} collapsed)
              </p>
            )}
          </motion.div>

        </div>
      </div>
    </>
  );
}