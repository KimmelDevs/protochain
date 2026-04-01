'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase'; // ← shared client
import { FunnelIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface AuditLog {
  id: string;
  action: string;
  performer_email: string;
  old_role: string;
  new_role: string;
  old_position: string;
  new_position: string;
  notes: string;
  created_at: string;
  target_user: string;
}

const ACTION_STYLE: Record<string, { pill: string; dot: string; label: string }> = {
  role_changed:      { pill: 'bg-violet-900/40 text-violet-300 border-violet-700/40', dot: 'bg-violet-400', label: 'Role changed' },
  position_changed:  { pill: 'bg-sky-900/40 text-sky-300 border-sky-700/40',          dot: 'bg-sky-400',    label: 'Position changed' },
  user_deleted:      { pill: 'bg-red-900/40 text-red-300 border-red-700/40',           dot: 'bg-red-400',    label: 'User deleted' },
  approved:          { pill: 'bg-emerald-900/40 text-emerald-300 border-emerald-800/40', dot: 'bg-emerald-400', label: 'Approved' },
  rejected:          { pill: 'bg-red-900/40 text-red-300 border-red-700/40',           dot: 'bg-red-400',    label: 'Rejected' },
  document_uploaded: { pill: 'bg-amber-900/40 text-amber-300 border-amber-700/40',     dot: 'bg-amber-400',  label: 'Document uploaded' },
};

const FILTERS = ['all', 'role_changed', 'position_changed', 'user_deleted', 'approved', 'rejected'];

export default function AuditPage() {
  const [logs,    setLogs]    = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setLogs(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.action === filter);

  return (
    <div className="p-8 font-mono">

      {/* Header */}
      <div className="mb-7">
        <p className="text-[10px] tracking-widest uppercase text-[#374151] mb-2">History</p>
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <FunnelIcon className="w-4 h-4 text-[#374151]" />
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[11px] tracking-wide border transition-all
              ${filter === f
                ? 'bg-violet-600/20 text-violet-300 border-violet-700/50'
                : 'bg-[#0D0D16] text-[#4B5563] border-[#13111F] hover:text-[#9CA3AF]'
              }`}
          >
            {f === 'all' ? 'All' : (ACTION_STYLE[f]?.label || f)}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto p-2 rounded-lg bg-[#0D0D16] border border-[#13111F] text-[#4B5563] hover:text-white transition-all"
        >
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Log list */}
      <div className="rounded-xl border border-[#13111F] bg-[#0D0D16] divide-y divide-[#0A0A12]">
        {loading ? (
          <div className="text-center py-16 text-[#374151] text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-[#374151] text-sm">No log entries found.</div>
        ) : filtered.map(log => {
          const style = ACTION_STYLE[log.action] || {
            pill: 'bg-gray-900/40 text-gray-400 border-gray-700/40',
            dot:  'bg-gray-500',
            label: log.action,
          };
          return (
            <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-[#0A0A12] transition-colors">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full border text-[9px] tracking-widest uppercase font-semibold ${style.pill}`}>
                    {style.label}
                  </span>

                  {/* Role change detail */}
                  {log.old_role && log.new_role && (
                    <span className="text-[11px] text-[#4B5563]">
                      <span className="text-[#6B7280]">{log.old_role.replace('_', ' ')}</span>
                      {' → '}
                      <span className="text-violet-400">{log.new_role.replace('_', ' ')}</span>
                    </span>
                  )}

                  {/* Position change detail */}
                  {!log.old_role && log.old_position !== undefined && log.new_position !== undefined && (
                    <span className="text-[11px] text-[#4B5563]">
                      "{log.old_position || 'none'}"
                      {' → '}
                      <span className="text-sky-400">"{log.new_position || 'none'}"</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#374151]">
                  {log.performer_email
                    ? <span>By <span className="text-[#4B5563]">{log.performer_email}</span></span>
                    : 'System'}
                  {log.target_user && (
                    <span className="ml-2 text-[#2D2A40]">
                      target: {log.target_user.slice(0, 8)}…
                    </span>
                  )}
                  {log.notes && <span className="ml-2">· {log.notes}</span>}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-[11px] text-[#374151]">
                  {new Date(log.created_at).toLocaleDateString('en-PH', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </p>
                <p className="text-[10px] text-[#2D2A40]">
                  {new Date(log.created_at).toLocaleTimeString('en-PH', {
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[#374151] text-xs mt-3">{filtered.length} entries</p>
    </div>
  );
}
