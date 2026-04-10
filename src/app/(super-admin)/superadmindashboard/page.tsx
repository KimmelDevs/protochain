'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import Link from 'next/link';
import {
  Users,
  ClipboardList,
  ShieldCheck,
  Clock,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';

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

interface Stats {
  totalUsers:      number;
  superAdmins:     number;
  admins:          number;
  residents:       number;
  totalRequests:   number;
  pendingRequests: number;
  recentLogs:      AuditLog[];
}

const ACTION_PILL: Record<string, string> = {
  role_changed:      'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  position_changed:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  user_deleted:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  approved:          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected:          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  document_uploaded: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
};

const ACTION_DOT: Record<string, string> = {
  role_changed:      'bg-orange-500',
  position_changed:  'bg-blue-500',
  user_deleted:      'bg-red-500',
  approved:          'bg-green-500 animate-pulse',
  rejected:          'bg-red-500',
  document_uploaded: 'bg-yellow-500',
};

export default function SuperAdminDashboard() {
  const [stats,      setStats]      = useState<Stats | null>(null);
  const [profile,    setProfile]    = useState<{ firstName: string; position: string } | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [barReady,   setBarReady]   = useState(false);
  const [visible,    setVisible]    = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const [{ data: prof }, { data: users }, { data: requests }, { data: logs }] =
        await Promise.all([
          supabase.from('profiles').select('firstName, position').eq('id', session.user.id).single(),
          supabase.from('profiles').select('role'),
          supabase.from('requests').select('status'),
          supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(8),
        ]);

      setProfile(prof);
      setStats({
        totalUsers:      users?.length ?? 0,
        superAdmins:     users?.filter(u => u.role === 'super_admin').length ?? 0,
        admins:          users?.filter(u => u.role === 'admin').length ?? 0,
        residents:       users?.filter(u => u.role === 'resident').length ?? 0,
        totalRequests:   requests?.length ?? 0,
        pendingRequests: requests?.filter(r => r.status === 'pending').length ?? 0,
        recentLogs:      logs ?? [],
      });
      setLoading(false);

      // Trigger entrance animation after data loads
      requestAnimationFrame(() => {
        setVisible(true);
        // Bar grows slightly after the cards appear
        setTimeout(() => setBarReady(true), 600);
      });
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      label:  'Total Users',
      value:  stats?.totalUsers,
      icon:   Users,
      sub:    `${stats?.superAdmins} super · ${stats?.admins} admin · ${stats?.residents} residents`,
      accent: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-900/50',
      bg:     'bg-orange-50 dark:bg-orange-900/10',
      delay:  'delay-[100ms]',
    },
    {
      label:  'Total Requests',
      value:  stats?.totalRequests,
      icon:   ClipboardList,
      sub:    `${stats?.pendingRequests} pending`,
      accent: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-900/50',
      bg:     'bg-blue-50 dark:bg-blue-900/10',
      delay:  'delay-[180ms]',
    },
    {
      label:  'Admins',
      value:  stats?.admins,
      icon:   ShieldCheck,
      sub:    `+ ${stats?.superAdmins} super admin`,
      accent: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-900/50',
      bg:     'bg-green-50 dark:bg-green-900/10',
      delay:  'delay-[260ms]',
    },
    {
      label:  'Audit Entries',
      value:  stats?.recentLogs.length,
      icon:   Clock,
      sub:    'Recent activity',
      accent: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-900/50',
      bg:     'bg-yellow-50 dark:bg-yellow-900/10',
      delay:  'delay-[340ms]',
    },
  ];

  return (
    <div className="p-8 space-y-7" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* ── Page header ──────────────────────────────── */}
      <div
        className={`transition-all duration-500 ease-out
          ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp className="w-3.5 h-3.5 text-[#7a7870] dark:text-[#7e7b75]" />
          <p
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            className="text-[10px] tracking-[0.18em] uppercase text-[#7a7870] dark:text-[#7e7b75]"
          >
            Overview
          </p>
        </div>
        <h1 className="text-2xl font-semibold text-[#1a1917] dark:text-[#f0eee8] tracking-tight">
          Welcome back, {profile?.firstName || 'Super Admin'}
        </h1>
        {profile?.position && (
          <p className="text-sm text-[#7a7870] dark:text-[#7e7b75] mt-1">{profile.position}</p>
        )}
      </div>

      {/* ── Stat cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, sub, accent, border, bg, delay }) => (
          <div
            key={label}
            className={`
              rounded-lg border ${border} ${bg} p-5
              transition-all duration-500 ease-out ${delay}
              hover:-translate-y-1 hover:shadow-md
              ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}
          >
            <div className="flex items-start justify-between mb-3">
              <p
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                className="text-[10px] tracking-[0.15em] uppercase text-[#7a7870] dark:text-[#7e7b75]"
              >
                {label}
              </p>
              <Icon className={`w-4 h-4 ${accent} transition-transform duration-200 group-hover:scale-110`} />
            </div>
            <p className={`text-3xl font-semibold ${accent}`}>{value ?? '—'}</p>
            <p className="text-[11px] text-[#7a7870] dark:text-[#7e7b75] mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Role distribution bar ────────────────────── */}
      <div
        className={`
          rounded-lg border border-[#dedad4] dark:border-[#2a2a32] bg-white dark:bg-[#1a1a20] p-5
          transition-all duration-500 ease-out delay-[420ms]
          ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        `}
      >
        <p
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          className="text-[10px] tracking-[0.18em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-3"
        >
          Role distribution
        </p>
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
          {stats && stats.totalUsers > 0 && (
            <>
              <div
                className="bg-orange-500 rounded-full transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
                style={{ width: barReady ? `${(stats.superAdmins / stats.totalUsers) * 100}%` : '0%' }}
                title={`Super Admin: ${stats.superAdmins}`}
              />
              <div
                className="bg-blue-500 rounded-full transition-[width] duration-700 ease-[cubic-bezier(.22,1,.36,1)] delay-75"
                style={{ width: barReady ? `${(stats.admins / stats.totalUsers) * 100}%` : '0%' }}
                title={`Admin: ${stats.admins}`}
              />
              <div
                className="bg-[#dedad4] dark:bg-[#2a2a32] flex-1 rounded-full"
                title={`Residents: ${stats.residents}`}
              />
            </>
          )}
        </div>
        <div className="flex gap-5 mt-2.5">
          {[
            { label: 'Super admin', color: 'bg-orange-500',              count: stats?.superAdmins },
            { label: 'Admin',       color: 'bg-blue-500',                count: stats?.admins },
            { label: 'Resident',    color: 'bg-[#dedad4] dark:bg-[#2a2a32]', count: stats?.residents },
          ].map(({ label, color, count }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-[11px] text-[#7a7870] dark:text-[#7e7b75]">
                {label}:{' '}
                <span className="text-[#3d3b36] dark:text-[#c9c6be] font-medium">{count}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Audit log + Quick actions ─────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Recent audit */}
        <div
          className={`
            xl:col-span-2 rounded-lg border border-[#dedad4] dark:border-[#2a2a32] bg-white dark:bg-[#1a1a20] p-5
            transition-all duration-500 ease-out delay-[500ms]
            ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          <div className="flex items-center justify-between mb-4">
            <p
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              className="text-[10px] tracking-[0.18em] uppercase text-[#7a7870] dark:text-[#7e7b75]"
            >
              Recent audit activity
            </p>
            <Link
              href="/audit"
              className="flex items-center gap-0.5 text-[11px] text-orange-600 dark:text-orange-400
                hover:opacity-70 transition-opacity duration-150"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {stats?.recentLogs.length === 0 ? (
            <p className="text-sm text-[#7a7870] dark:text-[#7e7b75] text-center py-8">
              No activity yet.
            </p>
          ) : (
            <div className="space-y-3">
              {stats?.recentLogs.map((log, i) => (
                <div
                  key={log.id}
                  className={`
                    flex items-start gap-3
                    transition-all duration-400 ease-out
                    ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
                  `}
                  style={{ transitionDelay: `${560 + i * 60}ms` }}
                >
                  <div
                    className={`
                      w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0
                      ${ACTION_DOT[log.action] || 'bg-gray-400'}
                    `}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[9px] tracking-[0.1em] uppercase font-medium
                          ${ACTION_PILL[log.action] || 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}
                      >
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      {log.old_role && log.new_role && (
                        <span className="text-[11px] text-[#7a7870] dark:text-[#7e7b75]">
                          {log.old_role.replace('_', ' ')}
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
                    <p className="text-[11px] text-[#7a7870] dark:text-[#7e7b75] mt-0.5">
                      {log.performer_email || 'System'}
                      {log.notes && ` · ${log.notes}`}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#a09e98] dark:text-[#5c5a54] flex-shrink-0">
                    {new Date(log.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div
          className={`
            rounded-lg border border-[#dedad4] dark:border-[#2a2a32] bg-white dark:bg-[#1a1a20] p-5
            transition-all duration-500 ease-out delay-[580ms]
            ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}
        >
          <p
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            className="text-[10px] tracking-[0.18em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-4"
          >
            Quick actions
          </p>
          <div className="space-y-1.5">
            {[
              { href: '/users',          label: 'Manage users',      sub: 'Edit roles & positions' },
              { href: '/audit',          label: 'View audit log',    sub: 'Full activity history'  },
              { href: '/super-settings', label: 'Barangay settings', sub: 'Update info & logo'     },
            ].map(({ href, label, sub }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between p-3 rounded
                  border border-[#dedad4] dark:border-[#2a2a32]
                  hover:bg-[#eeecea] dark:hover:bg-[#1e1e24]
                  hover:border-[#c9c6be] dark:hover:border-[#3a3a42]
                  hover:translate-x-0.5
                  active:scale-[0.99]
                  transition-all duration-150 group"
              >
                <div>
                  <p className="text-[13px] font-medium text-[#1a1917] dark:text-[#f0eee8]">{label}</p>
                  <p className="text-[11px] text-[#7a7870] dark:text-[#7e7b75] mt-0.5">{sub}</p>
                </div>
                <ChevronRight
                  className="w-4 h-4 text-[#a09e98] dark:text-[#5c5a54]
                    group-hover:text-[#3d3b36] dark:group-hover:text-[#c9c6be]
                    group-hover:translate-x-0.5
                    transition-all duration-150"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}