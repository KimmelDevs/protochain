'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase'; // ← shared client, not auth-helpers
import Link from 'next/link';
import {
  UsersIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

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
  totalUsers: number;
  superAdmins: number;
  admins: number;
  residents: number;
  totalRequests: number;
  pendingRequests: number;
  recentLogs: AuditLog[];
}

const ACTION_COLOR: Record<string, string> = {
  role_changed:      'bg-violet-900/40 text-violet-300 border-violet-700/40',
  position_changed:  'bg-sky-900/40 text-sky-300 border-sky-700/40',
  user_deleted:      'bg-red-900/40 text-red-300 border-red-700/40',
  approved:          'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
  rejected:          'bg-red-900/40 text-red-300 border-red-700/40',
  document_uploaded: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
};

const ACTION_DOT: Record<string, string> = {
  role_changed:      'bg-violet-400',
  position_changed:  'bg-sky-400',
  user_deleted:      'bg-red-400',
  approved:          'bg-emerald-400',
  rejected:          'bg-red-400',
  document_uploaded: 'bg-amber-400',
};

export default function SuperAdminDashboard() {
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [profile, setProfile] = useState<{ firstName: string; position: string } | null>(null);
  const [loading, setLoading] = useState(true);

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
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total users',
      value: stats?.totalUsers,
      icon: UsersIcon,
      color: 'text-violet-400',
      bg: 'bg-violet-900/20 border-violet-800/30',
      sub: `${stats?.superAdmins} super · ${stats?.admins} admin · ${stats?.residents} residents`,
    },
    {
      label: 'Total requests',
      value: stats?.totalRequests,
      icon: ClipboardDocumentListIcon,
      color: 'text-sky-400',
      bg: 'bg-sky-900/20 border-sky-800/30',
      sub: `${stats?.pendingRequests} pending`,
    },
    {
      label: 'Admins',
      value: stats?.admins,
      icon: ShieldCheckIcon,
      color: 'text-emerald-400',
      bg: 'bg-emerald-900/20 border-emerald-800/30',
      sub: `+ ${stats?.superAdmins} super admin`,
    },
    {
      label: 'Audit entries',
      value: stats?.recentLogs.length,
      icon: ClockIcon,
      color: 'text-amber-400',
      bg: 'bg-amber-900/20 border-amber-800/30',
      sub: 'Recent activity',
    },
  ];

  return (
    <div className="p-8 space-y-8 font-mono">

      {/* Page header */}
      <div>
        <div className="flex items-center gap-2 text-[10px] text-[#374151] tracking-widest uppercase mb-3">
          <ArrowTrendingUpIcon className="w-3 h-3" />
          <span>Overview</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Welcome back, {profile?.firstName || 'Super Admin'}
        </h1>
        {profile?.position && (
          <p className="text-[#4B5563] text-sm mt-1">{profile.position}</p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} className={`rounded-xl border p-5 ${bg}`}>
            <div className="flex items-start justify-between mb-4">
              <p className="text-[10px] tracking-widest uppercase text-[#4B5563]">{label}</p>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className={`text-3xl font-bold ${color}`}>{value ?? '—'}</p>
            <p className="text-[#374151] text-[11px] mt-2">{sub}</p>
          </div>
        ))}
      </div>

      {/* Role distribution bar */}
      <div className="rounded-xl border border-[#13111F] bg-[#0D0D16] p-6">
        <p className="text-[10px] tracking-widest uppercase text-[#4B5563] mb-4">Role distribution</p>
        <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
          {stats && stats.totalUsers > 0 && (
            <>
              <div
                className="bg-violet-500 transition-all"
                style={{ width: `${(stats.superAdmins / stats.totalUsers) * 100}%` }}
                title={`Super Admin: ${stats.superAdmins}`}
              />
              <div
                className="bg-sky-500 transition-all"
                style={{ width: `${(stats.admins / stats.totalUsers) * 100}%` }}
                title={`Admin: ${stats.admins}`}
              />
              <div
                className="bg-[#1E1B2E] flex-1 transition-all"
                title={`Residents: ${stats.residents}`}
              />
            </>
          )}
        </div>
        <div className="flex gap-6 mt-3">
          {[
            { label: 'Super admin', color: 'bg-violet-500',                          count: stats?.superAdmins },
            { label: 'Admin',       color: 'bg-sky-500',                             count: stats?.admins },
            { label: 'Resident',    color: 'bg-[#1E1B2E] border border-[#2D2A40]', count: stats?.residents },
          ].map(({ label, color, count }) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
              <span className="text-[11px] text-[#4B5563]">
                {label}: <span className="text-[#9CA3AF]">{count}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent audit log + quick actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Audit log */}
        <div className="xl:col-span-2 rounded-xl border border-[#13111F] bg-[#0D0D16] p-6">
          <div className="flex items-center justify-between mb-5">
            <p className="text-[10px] tracking-widest uppercase text-[#4B5563]">Recent audit activity</p>
            <Link href="/audit" className="text-[11px] text-violet-400 hover:text-violet-300 flex items-center gap-1">
              View all <ChevronRightIcon className="w-3 h-3" />
            </Link>
          </div>

          {stats?.recentLogs.length === 0 ? (
            <p className="text-[#374151] text-sm text-center py-8">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {stats?.recentLogs.map(log => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${ACTION_DOT[log.action] || 'bg-gray-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full border text-[9px] tracking-widest uppercase font-semibold ${ACTION_COLOR[log.action] || 'bg-gray-900/40 text-gray-400 border-gray-700/40'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      {log.old_role && log.new_role && (
                        <span className="text-[11px] text-[#4B5563]">
                          {log.old_role} → <span className="text-violet-400">{log.new_role}</span>
                        </span>
                      )}
                      {!log.old_role && log.old_position !== undefined && log.new_position !== undefined && (
                        <span className="text-[11px] text-[#4B5563]">
                          "{log.old_position || 'none'}" → "<span className="text-sky-400">{log.new_position || 'none'}</span>"
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#374151] mt-0.5">
                      {log.performer_email || 'System'}
                      {log.notes && ` · ${log.notes}`}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#374151] shrink-0">
                    {new Date(log.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="rounded-xl border border-[#13111F] bg-[#0D0D16] p-6">
          <p className="text-[10px] tracking-widest uppercase text-[#4B5563] mb-5">Quick actions</p>
          <div className="space-y-2">
            {[
              { href: '/users',          label: 'Manage users',      sub: 'Edit roles & positions', color: 'hover:border-violet-700/50 hover:bg-violet-900/10' },
              { href: '/audit',          label: 'View audit log',    sub: 'Full activity history',  color: 'hover:border-sky-700/50 hover:bg-sky-900/10' },
              { href: '/super-settings', label: 'Barangay settings', sub: 'Update info & logo',     color: 'hover:border-emerald-700/50 hover:bg-emerald-900/10' },
            ].map(({ href, label, sub, color }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center justify-between p-3 rounded-lg border border-[#13111F] transition-all group ${color}`}
              >
                <div>
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-[#4B5563] text-[11px] mt-0.5">{sub}</p>
                </div>
                <ChevronRightIcon className="w-4 h-4 text-[#374151] group-hover:text-[#6B7280] transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
