'use client';

import { useEffect, useState, useCallback } from 'react';
import { History, RefreshCw, Search, X, User, ChevronDown, ChevronUp } from 'lucide-react';

interface ChangeRecord {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  field_name: string;
  field_label: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

interface GroupedRecord {
  key: string; // user_id + timestamp bucket
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  timestamp: string;
  changes: ChangeRecord[];
}

const FIELD_COLORS: Record<string, { pill: string; dot: string }> = {
  firstName:   { dot: 'bg-blue-500',   pill: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  lastName:    { dot: 'bg-blue-500',   pill: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  username:    { dot: 'bg-orange-500', pill: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  email:       { dot: 'bg-purple-500', pill: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  phone:       { dot: 'bg-green-500',  pill: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  address:     { dot: 'bg-teal-500',   pill: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  birthday:    { dot: 'bg-pink-500',   pill: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
  civilStatus: { dot: 'bg-yellow-500', pill: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
};

const DEFAULT_STYLE = { dot: 'bg-gray-400', pill: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' };

function maskValue(fieldName: string, value: string): string {
  if (!value) return '(empty)';
  if (fieldName === 'email') {
    const [local, domain] = value.split('@');
    if (!domain) return value;
    return `${local[0]}${'*'.repeat(Math.max(local.length - 2, 1))}${local.slice(-1)}@${domain}`;
  }
  if (fieldName === 'phone') {
    return value.slice(0, 3) + '*'.repeat(Math.max(value.length - 5, 3)) + value.slice(-2);
  }
  return value;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatTimeShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7)    return `${diffD}d ago`;
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

// Group records that happened within 30s of each other by the same user
function groupRecords(records: ChangeRecord[]): GroupedRecord[] {
  const groups: GroupedRecord[] = [];

  for (const rec of records) {
    const ts = new Date(rec.created_at).getTime();
    const existing = groups.find(g =>
      g.user_id === rec.user_id &&
      Math.abs(new Date(g.timestamp).getTime() - ts) < 30_000
    );
    if (existing) {
      existing.changes.push(rec);
    } else {
      groups.push({
        key:        `${rec.user_id}-${rec.created_at}`,
        user_id:    rec.user_id,
        user_email: rec.user_email,
        user_name:  rec.user_name,
        timestamp:  rec.created_at,
        changes:    [rec],
      });
    }
  }

  return groups;
}

function Toast({ msg, type, onDone }: { msg: string; type: 'success' | 'error'; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg border text-[13px] max-w-xs shadow-lg
        ${type === 'success'
          ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
          : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
        }`}
      style={{ fontFamily: "'IBM Plex Sans', sans-serif", animation: 'toastIn 0.3s ease both' }}
    >
      {msg}
    </div>
  );
}

function GroupCard({ group, index, mounted }: { group: GroupedRecord; index: number; mounted: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const displayName = group.user_name ?? group.user_email ?? group.user_id.slice(0, 8);
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div
      className={`
        rounded-lg border border-[#dedad4] dark:border-[#2a2a32]
        bg-white dark:bg-[#1a1a20]
        transition-all duration-400 ease-out
        ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
      `}
      style={{ transitionDelay: `${index * 45}ms` }}
    >
      {/* Header row */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer select-none
          hover:bg-[#fafaf9] dark:hover:bg-[#1e1e24] rounded-lg transition-colors duration-150"
        onClick={() => setExpanded(e => !e)}
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded bg-orange-500 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-[11px] font-semibold text-white leading-none">{initials}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium text-[#1a1917] dark:text-[#f0eee8]">
              {displayName}
            </span>
            {group.user_email && group.user_name && (
              <span className="text-[11px] text-[#7a7870] dark:text-[#7e7b75]">
                {group.user_email}
              </span>
            )}
          </div>

          {/* Change pills summary */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {group.changes.map(c => {
              const style = FIELD_COLORS[c.field_name] ?? DEFAULT_STYLE;
              return (
                <span
                  key={c.id}
                  className={`inline-block px-2 py-0.5 rounded text-[9px] tracking-[0.08em] uppercase font-medium ${style.pill}`}
                >
                  {c.field_label}
                </span>
              );
            })}
            {group.changes.length === 1 && (
              <span className="text-[11px] text-[#7a7870] dark:text-[#7e7b75] ml-0.5">
                changed
              </span>
            )}
            {group.changes.length > 1 && (
              <span className="text-[11px] text-[#7a7870] dark:text-[#7e7b75] ml-0.5">
                · {group.changes.length} fields changed
              </span>
            )}
          </div>
        </div>

        {/* Time + expand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            className="text-[10px] text-[#a09e98] dark:text-[#5c5a54]"
            title={formatTime(group.timestamp)}
          >
            {formatTimeShort(group.timestamp)}
          </span>
          {expanded
            ? <ChevronUp className="w-3.5 h-3.5 text-[#a09e98]" />
            : <ChevronDown className="w-3.5 h-3.5 text-[#a09e98]" />
          }
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[#dedad4] dark:border-[#2a2a32] px-4 py-3 space-y-2.5">
          {group.changes.map(c => {
            const style = FIELD_COLORS[c.field_name] ?? DEFAULT_STYLE;
            return (
              <div key={c.id} className="flex items-start gap-3">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                <div className="flex-1 min-w-0">
                  <p
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                    className="text-[10px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-1"
                  >
                    {c.field_label}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] text-[#7a7870] dark:text-[#7e7b75] line-through">
                      {maskValue(c.field_name, c.old_value)}
                    </span>
                    <span className="text-[10px] text-[#a09e98]">→</span>
                    <span className="text-[12px] font-medium text-[#1a1917] dark:text-[#f0eee8]">
                      {maskValue(c.field_name, c.new_value)}
                    </span>
                  </div>
                </div>
                <span
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  className="text-[10px] text-[#a09e98] dark:text-[#5c5a54] flex-shrink-0"
                >
                  {formatTime(c.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RecentChangesPage() {
  const [records,   setRecords]   = useState<ChangeRecord[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [spinning,  setSpinning]  = useState(false);
  const [search,    setSearch]    = useState('');
  const [fieldFilter, setFieldFilter] = useState('all');
  const [mounted,   setMounted]   = useState(false);
  const [toast,     setToast]     = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setSpinning(true);
    try {
      const res  = await fetch('/api/profile-history?limit=200');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRecords(json.data ?? []);
    } catch (err: any) {
      setToast({ msg: err.message ?? 'Failed to load history', type: 'error' });
    } finally {
      setLoading(false);
      setTimeout(() => setSpinning(false), 600);
    }
  }, []);

  useEffect(() => {
    load().then(() => {
      requestAnimationFrame(() => setMounted(true));
    });
  }, [load]);

  const handleRefresh = () => {
    setMounted(false);
    load().then(() => requestAnimationFrame(() => setMounted(true)));
  };

  // All unique field names present
  const allFields = Array.from(new Set(records.map(r => r.field_name)));

  // Filter records
  const filtered = records.filter(r => {
    const matchField = fieldFilter === 'all' || r.field_name === fieldFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.user_email?.toLowerCase().includes(q) ||
      r.user_name?.toLowerCase().includes(q) ||
      r.field_label.toLowerCase().includes(q) ||
      r.new_value.toLowerCase().includes(q) ||
      r.old_value.toLowerCase().includes(q);
    return matchField && matchSearch;
  });

  const groups = groupRecords(filtered);

  const FIELD_LABELS: Record<string, string> = {
    firstName: 'First name', lastName: 'Last name', username: 'Username',
    email: 'Email', phone: 'Phone', address: 'Address',
    birthday: 'Birthday', civilStatus: 'Civil status',
  };

  return (
    <div className="p-8" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{`
        @keyframes pageEnter {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Page header ─────────────────────────────── */}
      <div
        className="mb-6"
        style={{ animation: 'pageEnter 0.35s ease both' }}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <History className="w-3.5 h-3.5 text-[#7a7870] dark:text-[#7e7b75]" />
          <p
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            className="text-[10px] tracking-[0.18em] uppercase text-[#7a7870] dark:text-[#7e7b75]"
          >
            Super Admin
          </p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#1a1917] dark:text-[#f0eee8] tracking-tight">
              Recent Changes
            </h1>
            <p className="text-[13px] text-[#7a7870] dark:text-[#7e7b75] mt-0.5">
              Profile edits made by residents and admins
            </p>
          </div>
          <button
            onClick={handleRefresh}
            title="Refresh"
            className="p-2 rounded border border-[#dedad4] dark:border-[#2a2a32]
              bg-white dark:bg-[#1a1a20]
              text-[#7a7870] dark:text-[#7e7b75]
              hover:border-[#c9c6be] dark:hover:border-[#3a3a42]
              hover:text-[#1a1917] dark:hover:text-[#f0eee8]
              transition-all duration-150 active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Summary chips ────────────────────────────── */}
      <div
        className="flex gap-3 mb-5 flex-wrap"
        style={{ animation: 'pageEnter 0.35s 0.08s ease both' }}
      >
        {[
          { label: 'Total changes', value: records.length },
          { label: 'Unique users',  value: new Set(records.map(r => r.user_id)).size },
          { label: 'Sessions',      value: groups.length },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="px-4 py-2.5 rounded-lg border border-[#dedad4] dark:border-[#2a2a32]
              bg-white dark:bg-[#1a1a20]"
          >
            <p
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              className="text-[10px] tracking-[0.15em] uppercase text-[#7a7870] dark:text-[#7e7b75]"
            >
              {label}
            </p>
            <p className="text-xl font-semibold text-orange-600 dark:text-orange-400 mt-0.5">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────── */}
      <div
        className="flex items-center gap-3 mb-5 flex-wrap"
        style={{ animation: 'pageEnter 0.35s 0.12s ease both' }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a09e98]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by user, field, value…"
            className="w-full pl-9 pr-8 py-2 rounded border border-[#dedad4] dark:border-[#2a2a32]
              bg-white dark:bg-[#1a1a20]
              text-[13px] text-[#1a1917] dark:text-[#f0eee8]
              placeholder-[#a09e98]
              focus:outline-none focus:border-orange-400 dark:focus:border-orange-500
              transition-colors duration-150"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#a09e98] hover:text-[#3d3b36]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Field filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['all', ...allFields].map(f => (
            <button
              key={f}
              onClick={() => setFieldFilter(f)}
              className={`
                px-3 py-1.5 rounded text-[11px] border transition-all duration-150
                ${fieldFilter === f
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'border-[#dedad4] dark:border-[#2a2a32] text-[#7a7870] dark:text-[#7e7b75] bg-white dark:bg-[#1a1a20] hover:border-[#c9c6be]'
                }
              `}
            >
              {f === 'all' ? 'All fields' : (FIELD_LABELS[f] ?? f)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <User className="w-8 h-8 text-[#a09e98]" />
          <p className="text-[13px] text-[#7a7870] dark:text-[#7e7b75]">
            {search || fieldFilter !== 'all'
              ? 'No changes match your filters.'
              : 'No profile changes recorded yet.'}
          </p>
          {(search || fieldFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setFieldFilter('all'); }}
              className="text-[12px] text-orange-600 dark:text-orange-400 hover:opacity-70 transition-opacity"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group, i) => (
            <GroupCard
              key={group.key}
              group={group}
              index={i}
              mounted={mounted}
            />
          ))}
        </div>
      )}

      {/* ── Toast ────────────────────────────────────── */}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}
    </div>
  );
}
