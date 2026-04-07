'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Filter, RefreshCw } from 'lucide-react';

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
  role_changed:      { dot: 'bg-orange-500', label: 'Role changed',      pill: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  position_changed:  { dot: 'bg-blue-500',   label: 'Position changed',  pill: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  user_deleted:      { dot: 'bg-red-500',     label: 'User deleted',      pill: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  approved:          { dot: 'bg-green-500',   label: 'Approved',          pill: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rejected:          { dot: 'bg-red-500',     label: 'Rejected',          pill: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  document_uploaded: { dot: 'bg-yellow-500',  label: 'Document uploaded', pill: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
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
    <div className="p-8" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Header */}
      <div className="mb-6">
        <p style={{ fontFamily: "'IBM Plex Mono', monospace" }}
           className="text-[10px] tracking-[0.18em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-1">
          History
        </p>
        <h1 className="text-2xl font-semibold text-[#1a1917] dark:text-[#f0eee8]">Audit Log</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5 items-center">
        <Filter className="w-3.5 h-3.5 text-[#7a7870] dark:text-[#7e7b75]" />
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-[12px] border transition-colors
              ${filter === f
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400'
                : 'bg-white dark:bg-[#1a1a20] border-[#dedad4] dark:border-[#2a2a32] text-[#5c5a54] dark:text-[#9e9b94] hover:bg-[#eeecea] dark:hover:bg-[#1e1e24]'
              }`}>
            {f === 'all' ? 'All' : (ACTION_STYLE[f]?.label || f)}
          </button>
        ))}
        <button onClick={load}
          className="ml-auto p-2 rounded border border-[#dedad4] dark:border-[#2a2a32] bg-white dark:bg-[#1a1a20]
            text-[#5c5a54] dark:text-[#9e9b94] hover:bg-[#eeecea] dark:hover:bg-[#1e1e24] transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Log list */}
      <div className="rounded-lg border border-[#dedad4] dark:border-[#2a2a32] bg-white dark:bg-[#1a1a20] divide-y divide-[#f0ede8] dark:divide-[#22222a]">
        {loading ? (
          <div className="text-center py-14 text-[#7a7870] dark:text-[#7e7b75] text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-[#7a7870] dark:text-[#7e7b75] text-sm">No log entries found.</div>
        ) : filtered.map(log => {
          const style = ACTION_STYLE[log.action] || {
            dot: 'bg-gray-400', label: log.action,
            pill: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
          };
          return (
            <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-[#fafaf9] dark:hover:bg-[#1e1e24] transition-colors">
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`inline-block px-2 py-0.5 rounded text-[9px] tracking-[0.1em] uppercase font-medium ${style.pill}`}>
                    {style.label}
                  </span>

                  {log.old_role && log.new_role && (
                    <span className="text-[11px] text-[#7a7870] dark:text-[#7e7b75]">
                      <span className="text-[#5c5a54] dark:text-[#9e9b94]">{log.old_role.replace('_', ' ')}</span>
                      {' → '}
                      <span className="text-orange-600 dark:text-orange-400">{log.new_role.replace('_', ' ')}</span>
                    </span>
                  )}

                  {!log.old_role && log.old_position !== undefined && log.new_position !== undefined && (
                    <span className="text-[11px] text-[#7a7870] dark:text-[#7e7b75]">
                      "{log.old_position || 'none'}"
                      {' → '}
                      <span className="text-blue-600 dark:text-blue-400">"{log.new_position || 'none'}"</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#7a7870] dark:text-[#7e7b75]">
                  {log.performer_email
                    ? <span>By <span className="text-[#5c5a54] dark:text-[#9e9b94]">{log.performer_email}</span></span>
                    : 'System'}
                  {log.target_user && (
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                          className="ml-2 text-[#a09e98] dark:text-[#5c5a54]">
                      {log.target_user.slice(0, 8)}…
                    </span>
                  )}
                  {log.notes && <span className="ml-2">· {log.notes}</span>}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-[11px] text-[#7a7870] dark:text-[#7e7b75]">
                  {new Date(log.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                   className="text-[10px] text-[#a09e98] dark:text-[#5c5a54]">
                  {new Date(log.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontFamily: "'IBM Plex Mono', monospace" }}
         className="text-[10px] text-[#a09e98] dark:text-[#5c5a54] mt-3">
        {filtered.length} entries
      </p>
    </div>
  );
}
