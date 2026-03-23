'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Eye, CheckCircle, XCircle, Upload,
  FileText, ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

/* ─────────────────────────── types ─────────────────────────────────────── */
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
  request_status:  string | null;
  file_hash:       string | null;
  resident_name:   string | null;
}

type ActionFilter = 'all' | 'approved' | 'rejected' | 'document_uploaded';

/* ─────────────────────────── helpers ───────────────────────────────────── */
const fmtDocType = (s: string | null) =>
  (s ?? '—').split(/[\s-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

const fmtTime = (d: string) =>
  new Date(d).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: false });

const ACTION_CFG = {
  approved:          { label: 'Approved',     icon: CheckCircle, cls: 'text-emerald-700 dark:text-emerald-400' },
  rejected:          { label: 'Rejected',     icon: XCircle,     cls: 'text-red-600 dark:text-red-400'         },
  document_uploaded: { label: 'Doc Uploaded', icon: Upload,      cls: 'text-blue-600 dark:text-blue-400'       },
} as const;

/* ─────────────────────────── sub-components ────────────────────────────── */
const ActionTag = ({ action }: { action: AuditLog['action'] }) => {
  const cfg  = ACTION_CFG[action] ?? ACTION_CFG.approved;
  const Icon = cfg.icon;
  return (
    <div className={`flex items-center gap-1.5 ${cfg.cls}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="text-[12px] font-semibold">{cfg.label}</span>
    </div>
  );
};

/* ─────────────────────────── page ──────────────────────────────────────── */
export default function AuditLogsPage() {
  const router = useRouter();
  const [logs,         setLogs]         = useState<AuditLog[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data, error } = await supabase
          .from('audit_logs')
          .select(`
            id, request_id, action, performed_by,
            performer_email, performer_name, notes, created_at,
            requests ( document_type, type, status, file_hash, user_id )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Batch-resolve resident names from unique user_ids
        const userIds = [...new Set(
          (data ?? []).map((l: any) => l.requests?.user_id).filter(Boolean)
        )];

        const nameMap: Record<string, string> = {};
        await Promise.all(userIds.map(async (uid) => {
          try {
            const res = await fetch(`/api/profile?id=${uid}`);
            if (res.ok) {
              const j = await res.json();
              const p = j.data;
              if (p) nameMap[uid] = `${p.firstName ?? p.first_name ?? ''} ${p.lastName ?? p.last_name ?? ''}`.trim();
            }
          } catch { /* skip */ }
        }));

        setLogs(
          (data ?? []).map((l: any) => ({
            id:              l.id,
            request_id:      l.request_id,
            action:          l.action,
            performed_by:    l.performed_by,
            performer_email: l.performer_email,
            performer_name:  l.performer_name ?? null,
            notes:           l.notes,
            created_at:      l.created_at,
            document_type:   l.requests?.type ?? l.requests?.document_type ?? null,
            request_status:  l.requests?.status ?? null,
            file_hash:       l.requests?.file_hash ?? null,
            resident_name:   nameMap[l.requests?.user_id] ?? null,
          }))
        );
      } catch (e) { console.error(e); }
      finally     { setLoading(false); }
    })();
  }, [router]);

  /* ── derived ─────────────────────────────────────────────────────────── */
  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch =
      l.id.toLowerCase().includes(q) ||
      l.request_id.toLowerCase().includes(q) ||
      (l.resident_name ?? '').toLowerCase().includes(q) ||
      (l.performer_name ?? l.performer_email ?? '').toLowerCase().includes(q) ||
      fmtDocType(l.document_type).toLowerCase().includes(q);
    const matchAction = actionFilter === 'all' || l.action === actionFilter;
    return matchSearch && matchAction;
  });

  const counts = {
    total:    logs.length,
    approved: logs.filter(l => l.action === 'approved').length,
    rejected: logs.filter(l => l.action === 'rejected').length,
    uploaded: logs.filter(l => l.action === 'document_uploaded').length,
  };

  const tabs: { key: ActionFilter; label: string; count: number }[] = [
    { key: 'all',               label: 'All',         count: counts.total    },
    { key: 'approved',          label: 'Approved',    count: counts.approved },
    { key: 'rejected',          label: 'Rejected',    count: counts.rejected },
    { key: 'document_uploaded', label: 'Uploaded',    count: counts.uploaded },
  ];

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

      <div className="pg min-h-screen bg-[#f5f4f0] dark:bg-[#16161a] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* ── MASTHEAD ───────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-b-2 border-[#1a1917] dark:border-[#f0eee8] pb-5 mb-10"
          >
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="mono text-[11px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase">
                    Security
                  </p>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#5c5a54] dark:text-[#9e9b94]" />
                </div>
                <h1 className="mono text-2xl md:text-3xl font-bold text-[#1a1917] dark:text-[#f0eee8] tracking-tight leading-none">
                  AUDIT LOGS
                </h1>
              </div>
              <Link
                href="/admindashboard"
                className="mono text-[11px] tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors"
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
            {[
              { label: 'Total Events', value: counts.total,    accent: false },
              { label: 'Approved',     value: counts.approved, accent: false },
              { label: 'Rejected',     value: counts.rejected, accent: counts.rejected > 0 },
              { label: 'Doc Uploads',  value: counts.uploaded, accent: false },
            ].map(({ label, value, accent }) => (
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

          {/* ── SEARCH + FILTER TABS ───────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4 mb-6"
          >
            {/* search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7a7870] dark:text-[#7e7b75]" />
              <input
                type="text"
                placeholder="Search by resident, admin, document…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-white dark:bg-[#1e1e24] border border-[#c8c6c0] dark:border-[#2a2a32] text-[#1a1917] dark:text-[#f0eee8] placeholder-[#7a7870] dark:placeholder-[#7e7b75] focus:outline-none focus:border-[#1a1917] dark:focus:border-[#f0eee8] transition-colors"
              />
            </div>

            {/* action filter tabs */}
            <div className="flex items-center gap-1 flex-wrap">
              {tabs.map(({ key, label, count }) => {
                const isActive = actionFilter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActionFilter(key)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium border transition-colors duration-150
                      ${isActive
                        ? 'bg-[#1a1917] dark:bg-[#f0eee8] text-white dark:text-[#1a1917] border-[#1a1917] dark:border-[#f0eee8]'
                        : 'bg-transparent text-[#5c5a54] dark:text-[#9e9b94] border-[#c8c6c0] dark:border-[#2a2a32] hover:border-[#1a1917] dark:hover:border-[#f0eee8] hover:text-[#1a1917] dark:hover:text-[#f0eee8]'
                      }
                    `}
                  >
                    {label}
                    <span className={`mono text-[10px] font-bold ${
                      isActive
                        ? 'text-white/70 dark:text-[#1a1917]/60'
                        : key === 'rejected'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-[#7a7870] dark:text-[#7e7b75]'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* ── TABLE ──────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
          >
            {/* col headers */}
            <div className="grid grid-cols-[1fr_140px_120px_120px_44px] py-2 border-b border-[#e0deda] dark:border-[#222228]">
              {['Event', 'Document', 'Resident', 'Timestamp', ''].map(h => (
                <span key={h} className="mono text-[11px] tracking-[0.15em] uppercase text-[#7a7870] dark:text-[#7e7b75]">
                  {h}
                </span>
              ))}
            </div>

            {logs.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-[#c8c6c0] dark:text-[#3a3845]" />
                <p className="mono text-[12px] tracking-widest uppercase text-[#7a7870] dark:text-[#7e7b75]">
                  No audit events yet
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
                {filtered.map((log, i) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.02 * i }}
                    className="group grid grid-cols-[1fr_140px_120px_120px_44px] items-center py-3.5 border-b border-[#e8e5e0] dark:border-[#222228] last:border-0 hover:bg-black/[0.025] dark:hover:bg-[#1e1e24] -mx-2 px-2 transition-colors duration-100"
                  >
                    {/* event */}
                    <div className="min-w-0 pr-4">
                      <ActionTag action={log.action} />
                      <p className="mono text-[11px] text-[#7a7870] dark:text-[#7e7b75] mt-1.5 truncate">
                        {log.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>

                    {/* document type */}
                    <p className="text-[12px] text-[#3d3b36] dark:text-[#c9c6be] truncate pr-3">
                      {fmtDocType(log.document_type)}
                    </p>

                    {/* resident */}
                    <p className="text-[12px] text-[#5c5a54] dark:text-[#9e9b94] truncate pr-3">
                      {log.resident_name ?? '—'}
                    </p>

                    {/* timestamp */}
                    <div className="pr-2">
                      <p className="mono text-[11px] text-[#5c5a54] dark:text-[#9e9b94]">
                        {fmt(log.created_at)}
                      </p>
                      <p className="mono text-[10px] text-[#7a7870] dark:text-[#7e7b75] mt-0.5">
                        {fmtTime(log.created_at)}
                      </p>
                    </div>

                    {/* view */}
                    <Link href={`/audit-logs/${log.id}`} className="flex justify-end">
                      <span className="flex items-center justify-center w-7 h-7 border border-[#c8c6c0] dark:border-[#2a2a32] hover:bg-[#1a1917] dark:hover:bg-[#f0eee8] hover:border-[#1a1917] dark:hover:border-[#f0eee8] group/btn transition-colors duration-150">
                        <Eye className="w-3.5 h-3.5 text-[#5c5a54] dark:text-[#9e9b94] group-hover/btn:text-white dark:group-hover/btn:text-[#1a1917] transition-colors" />
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {filtered.length > 0 && (
              <p className="mono text-[11px] text-[#7a7870] dark:text-[#7e7b75] mt-3">
                Showing {filtered.length} of {logs.length} event{logs.length !== 1 ? 's' : ''}
              </p>
            )}
          </motion.div>

        </div>
      </div>
    </>
  );
}