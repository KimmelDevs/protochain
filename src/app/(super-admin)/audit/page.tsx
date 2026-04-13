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
  const [logs,      setLogs]      = useState<AuditLog[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filter,    setFilter]    = useState('all');
  const [spinning,  setSpinning]  = useState(false);
  const [mounted,   setMounted]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSpinning(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setLogs(data ?? []);
    setLoading(false);
    setTimeout(() => setSpinning(false), 600);
  }, []);

  useEffect(() => {
    load().then(() => {
      requestAnimationFrame(() => setMounted(true));
    });
  }, [load]);

  const handleFilter = (f: string) => {
    setMounted(false);
    setFilter(f);
    requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)));
  };

  const filtered = filter === 'all' ? logs : logs.filter(l => l.action === filter);

  return (
    <div
      className="p-8"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        animation: 'pageEnter 0.35s ease both',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        
        @keyframes pageEnter {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes logRowIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes spinOnce {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.5); opacity: 0.7; }
        }
        @keyframes pillPop {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.05); }
          100% { transform: scale(1);   opacity: 1; }
        }
        .filter-btn {
          transition: background-color 0.15s ease, border-color 0.15s ease,
                      color 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
        }
        .filter-btn:active { transform: scale(0.94); }
        .filter-btn.active {
          box-shadow: 0 1px 4px rgba(249,115,22,0.18);
        }
        .refresh-btn {
          transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
        }
        .refresh-btn:hover  { transform: rotate(15deg); }
        .refresh-btn:active { transform: rotate(15deg) scale(0.92); }
        .log-row {
          transition: background-color 0.12s ease;
        }
        .log-row:hover .row-dot {
          animation: dotPulse 0.6s ease;
        }
        .row-dot {
          transition: transform 0.15s ease;
        }
        .action-pill {
          animation: pillPop 0.25s ease both;
        }
        .spin-icon {
          animation: spinOnce 0.6s ease;
        }
      `}</style>

      {/* Header */}
      <div className="mb-6" style={{ animation: 'pageEnter 0.35s 0.05s ease both', opacity: 0 }}>
        <p
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          className="text-[10px] tracking-[0.18em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1"
        >
          History
        </p>
        <h1 className="text-2xl font-semibold text-[#1A1A1C] dark:text-[#EAEAEC]">Audit Log</h1>
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap gap-2 mb-5 items-center"
        style={{ animation: 'pageEnter 0.35s 0.1s ease both', opacity: 0 }}
      >
        <Filter className="w-3.5 h-3.5 text-[#6C6C74] dark:text-[#9090A0]" />
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => handleFilter(f)}
            className={`filter-btn px-3 py-1.5 rounded text-[12px] border
              ${filter === f
                ? 'active bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400'
                : 'bg-white dark:bg-[#1C1C1F] border-[#E8E6E1] dark:border-[#2C2C32] text-[#55555F] dark:text-[#9090A0] hover:bg-[#F6F5F3] dark:hover:bg-[#1C1C1F]'
              }`}
          >
            {f === 'all' ? 'All' : (ACTION_STYLE[f]?.label || f)}
          </button>
        ))}
        <button
          onClick={load}
          className="refresh-btn ml-auto p-2 rounded border border-[#E8E6E1] dark:border-[#2C2C32] bg-white dark:bg-[#1C1C1F]
            text-[#55555F] dark:text-[#9090A0] hover:bg-[#F6F5F3] dark:hover:bg-[#1C1C1F]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${spinning ? 'spin-icon' : ''}`} />
        </button>
      </div>

      {/* Log list */}
      <div
        className="rounded-lg border border-[#E8E6E1] dark:border-[#2C2C32] bg-white dark:bg-[#1C1C1F] divide-y divide-[#E8E6E1] dark:divide-[#2C2C32]"
        style={{ animation: 'pageEnter 0.4s 0.15s ease both', opacity: 0 }}
      >
        {loading ? (
          <div className="text-center py-14 text-[#6C6C74] dark:text-[#9090A0] text-sm">
            <div
              className="inline-block w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full mb-3"
              style={{ animation: 'spinOnce 0.8s linear infinite' }}
            />
            <p>Loading…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-14 text-[#6C6C74] dark:text-[#9090A0] text-sm"
            style={{ animation: 'pageEnter 0.3s ease both' }}
          >
            No log entries found.
          </div>
        ) : filtered.map((log, idx) => {
          const style = ACTION_STYLE[log.action] || {
            dot: 'bg-gray-400', label: log.action,
            pill: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
          };
          return (
            <div
              key={log.id}
              className="log-row flex items-start gap-4 px-5 py-4 hover:bg-[#F6F5F3] dark:hover:bg-[#1C1C1F]"
              style={
                mounted
                  ? { animation: `logRowIn 0.3s ${idx * 0.03}s ease both` }
                  : { opacity: 0 }
              }
            >
              <div className={`row-dot w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`action-pill inline-block px-2 py-0.5 rounded text-[9px] tracking-[0.1em] uppercase font-medium ${style.pill}`}
                    style={{ animationDelay: `${idx * 0.03 + 0.05}s` }}
                  >
                    {style.label}
                  </span>

                  {log.old_role && log.new_role && (
                    <span className="text-[11px] text-[#6C6C74] dark:text-[#9090A0]">
                      <span className="text-[#55555F] dark:text-[#9090A0]">{log.old_role.replace('_', ' ')}</span>
                      {' → '}
                      <span className="text-orange-600 dark:text-orange-400">{log.new_role.replace('_', ' ')}</span>
                    </span>
                  )}

                  {!log.old_role && log.old_position !== undefined && log.new_position !== undefined && (
                    <span className="text-[11px] text-[#6C6C74] dark:text-[#9090A0]">
                      "{log.old_position || 'none'}"
                      {' → '}
                      <span className="text-blue-600 dark:text-blue-400">"{log.new_position || 'none'}"</span>
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#6C6C74] dark:text-[#9090A0]">
                  {log.performer_email
                    ? <span>By <span className="text-[#55555F] dark:text-[#9090A0]">{log.performer_email}</span></span>
                    : 'System'}
                  {log.target_user && (
                    <span
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      className="ml-2 text-[#B0B0B8] dark:text-[#55555F]"
                    >
                      {log.target_user.slice(0, 8)}…
                    </span>
                  )}
                  {log.notes && <span className="ml-2">· {log.notes}</span>}
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-[11px] text-[#6C6C74] dark:text-[#9090A0]">
                  {new Date(log.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  className="text-[10px] text-[#B0B0B8] dark:text-[#55555F]"
                >
                  {new Date(log.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <p
        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", animation: 'pageEnter 0.4s 0.2s ease both', opacity: 0 }}
        className="text-[10px] text-[#B0B0B8] dark:text-[#55555F] mt-3"
      >
        {filtered.length} entries
      </p>
    </div>
  );
}