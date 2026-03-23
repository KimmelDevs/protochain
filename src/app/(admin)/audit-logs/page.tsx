'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, Upload, Search, FileText } from 'lucide-react';
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

/* ─── sub-components ────────────────────────────────────────────────────── */
const SectionLabel = ({ label }: { label: string }) => (
  <p className="mono text-[11px] tracking-[0.2em] uppercase text-[#5c5a54] dark:text-[#9e9b94] border-b border-[#c8c6c0] dark:border-[#2a2a32] pb-2 mb-4">{label}</p>
);

const ActionBadge = ({ action }: { action: AuditLog['action'] }) => {
  const cfg  = ACTION_CFG[action] ?? ACTION_CFG.approved;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 mono text-[10px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
};

/* ─── page ──────────────────────────────────────────────────────────────── */
export default function AuditLogsPage() {
  const router = useRouter();

  const [logs,         setLogs]         = useState<AuditLog[]>([]);
  const [loading,      setLoading]      = useState(true);
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

      // Resolve resident names via decrypting API
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
      l.request_id.toLowerCase().includes(q);
    const matchAction = actionFilter === 'all' || l.action === actionFilter;
    const matchDate   = dateFilter === 'all' ? true : dateFilter === 'today' ? isToday(l.created_at) : dateFilter === 'week' ? isWeek(l.created_at) : isMonth(l.created_at);
    return matchSearch && matchAction && matchDate;
  });

  const countAction = (a: AuditLog['action']) => logs.filter(l => l.action === a).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f4f0] dark:bg-[#16161a]">
      <span className="mono text-[12px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase animate-pulse">Loading…</span>
    </div>
  );

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap'); .pg{font-family:'IBM Plex Sans',sans-serif} .mono{font-family:'IBM Plex Mono',monospace}`}</style>

      <div className="pg min-h-screen bg-[#f5f4f0] dark:bg-[#16161a] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* MASTHEAD */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b-2 border-[#1a1917] dark:border-[#f0eee8] pb-5 mb-10">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="mono text-[11px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase mb-2">Admin Panel</p>
                <h1 className="mono text-2xl md:text-3xl font-bold text-[#1a1917] dark:text-[#f0eee8] tracking-tight leading-none">AUDIT LOGS</h1>
              </div>
              <p className="mono text-[11px] text-[#7a7870] dark:text-[#7e7b75]">{logs.length} total events</p>
            </div>
          </motion.div>

          {/* STATS */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: 'Total Events',  value: logs.length,                    color: 'text-[#1a1917] dark:text-[#f0eee8]'      },
              { label: 'Approvals',     value: countAction('approved'),         color: 'text-emerald-600 dark:text-emerald-400'  },
              { label: 'Rejections',    value: countAction('rejected'),         color: 'text-red-600 dark:text-red-400'          },
              { label: 'Docs Uploaded', value: countAction('document_uploaded'), color: 'text-blue-600 dark:text-blue-400'       },
            ].map(s => (
              <div key={s.label} className="border border-[#c8c6c0] dark:border-[#2a2a32] bg-white dark:bg-[#1e1e24] p-4">
                <p className={`mono text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="mono text-[11px] text-[#7a7870] dark:text-[#7e7b75] uppercase tracking-wider mt-1">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* FILTERS */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
            <SectionLabel label="Filters" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a7870] dark:text-[#7e7b75]" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by admin, resident, doc type…"
                  className="w-full pl-9 pr-3 py-2.5 text-[12px] bg-white dark:bg-[#1e1e24] border border-[#c8c6c0] dark:border-[#2a2a32] text-[#1a1917] dark:text-[#f0eee8] placeholder-[#7a7870] dark:placeholder-[#7e7b75] focus:outline-none focus:border-[#1a1917] dark:focus:border-[#f0eee8] transition-colors mono" />
              </div>
              <select value={actionFilter} onChange={e => setActionFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 text-[12px] bg-white dark:bg-[#1e1e24] border border-[#c8c6c0] dark:border-[#2a2a32] text-[#1a1917] dark:text-[#f0eee8] focus:outline-none focus:border-[#1a1917] dark:focus:border-[#f0eee8] transition-colors mono">
                <option value="all">All Actions</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="document_uploaded">Document Uploaded</option>
              </select>
              <select value={dateFilter} onChange={e => setDateFilter(e.target.value as any)}
                className="w-full px-3 py-2.5 text-[12px] bg-white dark:bg-[#1e1e24] border border-[#c8c6c0] dark:border-[#2a2a32] text-[#1a1917] dark:text-[#f0eee8] focus:outline-none focus:border-[#1a1917] dark:focus:border-[#f0eee8] transition-colors mono">
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </motion.div>

          {/* TABLE */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <SectionLabel label={`Events (${filtered.length})`} />

            {filtered.length === 0 ? (
              <div className="border border-[#c8c6c0] dark:border-[#2a2a32] bg-white dark:bg-[#1e1e24] py-16 text-center">
                <FileText className="w-8 h-8 text-[#c8c6c0] dark:text-[#2a2a32] mx-auto mb-3" />
                <p className="text-[13px] text-[#7a7870] dark:text-[#7e7b75]">
                  {logs.length === 0 ? 'No audit events yet.' : 'No events match your filters.'}
                </p>
              </div>
            ) : (
              <div className="border border-[#c8c6c0] dark:border-[#2a2a32] bg-white dark:bg-[#1e1e24] overflow-x-auto">

                {/* Header */}
                <div className="grid grid-cols-[1fr_1.6fr_1.2fr_1fr_1.2fr_0.7fr] gap-4 px-5 py-3 border-b border-[#e8e5e0] dark:border-[#222228] bg-[#f5f4f0] dark:bg-[#16161a]">
                  {['Timestamp', 'Admin', 'Action', 'Document Type', 'Resident', 'View'].map(h => (
                    <p key={h} className="mono text-[10px] font-bold tracking-[0.12em] uppercase text-[#7a7870] dark:text-[#7e7b75]">{h}</p>
                  ))}
                </div>

                {/* Rows */}
                {filtered.map((log, i) => (
                  <div key={log.id}
                    className={`grid grid-cols-[1fr_1.6fr_1.2fr_1fr_1.2fr_0.7fr] gap-4 px-5 py-4 border-b border-[#e8e5e0] dark:border-[#222228] last:border-0 hover:bg-[#f5f4f0] dark:hover:bg-[#16161a] transition-colors ${i % 2 !== 0 ? 'bg-[#faf9f7] dark:bg-[#1a1a20]' : ''}`}>

                    {/* Timestamp */}
                    <div>
                      <p className="mono text-[11px] text-[#1a1917] dark:text-[#f0eee8]">
                        {new Date(log.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="mono text-[10px] text-[#7a7870] dark:text-[#7e7b75] mt-0.5">
                        {new Date(log.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Admin — show name primarily, email as subtitle */}
                    <div>
                      <p className="text-[12px] font-medium text-[#1a1917] dark:text-[#f0eee8] truncate" title={log.performer_name ?? log.performer_email ?? ''}>
                        {log.performer_name ?? <span className="italic text-[#7a7870] dark:text-[#7e7b75]">Unknown</span>}
                      </p>
                      {log.performer_name && log.performer_email && (
                        <p className="mono text-[10px] text-[#7a7870] dark:text-[#7e7b75] mt-0.5 truncate" title={log.performer_email}>
                          {log.performer_email}
                        </p>
                      )}
                    </div>

                    {/* Action */}
                    <div>
                      <ActionBadge action={log.action} />
                      {log.notes && (
                        <p className="text-[11px] text-[#5c5a54] dark:text-[#9e9b94] mt-1.5 leading-snug line-clamp-2" title={log.notes}>
                          {log.notes}
                        </p>
                      )}
                    </div>

                    {/* Document type */}
                    <div>
                      <p className="text-[12px] text-[#3d3b36] dark:text-[#c9c6be]">{fmtDocType(log.document_type)}</p>
                    </div>

                    {/* Resident */}
                    <div>
                      <p className="text-[12px] text-[#3d3b36] dark:text-[#c9c6be]">
                        {log.resident_name || <span className="text-[#7a7870] dark:text-[#7e7b75] italic">—</span>}
                      </p>
                    </div>

                    {/* View detail */}
                    <div>
                      <Link href={`/audit-logs/${log.id}`} className="mono text-[10px] tracking-[0.08em] uppercase text-orange-600 dark:text-orange-400 hover:underline">
                        {log.id.slice(0, 8).toUpperCase()} →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </>
  );
}