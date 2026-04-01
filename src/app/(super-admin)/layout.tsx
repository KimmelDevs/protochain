'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase'; // ← same client the whole app uses
import {
  UsersIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  BellIcon,
} from '@heroicons/react/24/outline';

const NAV = [
  { href: '/superadmindashboard', label: 'Dashboard',        icon: ChartBarIcon },
  { href: '/users',               label: 'Users',            icon: UsersIcon },
  { href: '/audit',               label: 'Audit Log',        icon: ClipboardDocumentListIcon },
  { href: '/super-settings',      label: 'Settings',         icon: Cog6ToothIcon },
];

interface Profile {
  email: string;
  firstName: string;
  position: string;
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();

  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      try {
        // getSession() reads from the cookie/localStorage that the shared
        // supabase client already populated — no cross-client mismatch.
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          if (mounted) router.replace('/login');
          return;
        }

        const { data: prof, error } = await supabase
          .from('profiles')
          .select('email, firstName, role, position')
          .eq('id', session.user.id)
          .single();

        if (error || !prof || prof.role !== 'super_admin') {
          if (mounted) router.replace('/login');
          return;
        }

        if (mounted) {
          setProfile({
            email:     prof.email     ?? '',
            firstName: prof.firstName ?? '',
            position:  prof.position  ?? '',
          });
          setChecking(false);
        }
      } catch (err) {
        console.error('Super-admin auth error:', err);
        if (mounted) router.replace('/login');
      }
    };

    // Also re-verify whenever the Supabase auth state changes
    // (e.g. token refresh, sign-out from another tab)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        if (mounted) router.replace('/login');
      }
    });

    verify();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  /* ── Loading / access-check screen ────────────────────────── */
  if (checking) {
    return (
      <div className="min-h-screen bg-[#07070E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-[#4B5563] text-sm font-mono tracking-widest uppercase">
            Verifying access…
          </p>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  /* ── Shell ─────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#07070E] flex font-mono">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r border-[#13111F] flex flex-col">

        {/* Logo */}
        <div className="px-6 py-7 border-b border-[#13111F]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <ShieldCheckIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-bold tracking-wide">Super Admin</p>
              <p className="text-[#4B5563] text-[10px] tracking-widest uppercase">Barangay System</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group
                  ${active
                    ? 'bg-violet-600/15 text-violet-300 border border-violet-600/30'
                    : 'text-[#4B5563] hover:text-[#9CA3AF] hover:bg-white/5 border border-transparent'
                  }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-violet-400' : 'text-[#374151] group-hover:text-[#6B7280]'
                  }`}
                />
                <span className="tracking-wide">{label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Profile footer */}
        <div className="px-3 pb-4 border-t border-[#13111F] pt-4">
          <div className="px-3 py-3 rounded-lg bg-[#0F0F18] border border-[#13111F] mb-2">
            <p className="text-white text-xs font-semibold truncate">
              {profile?.firstName || 'Super Admin'}
            </p>
            <p className="text-[#4B5563] text-[10px] truncate mt-0.5">{profile?.email}</p>
            {profile?.position && (
              <span className="inline-block mt-1.5 px-2 py-0.5 bg-violet-900/40 border border-violet-700/40 rounded-full text-violet-300 text-[9px] tracking-widest uppercase">
                {profile.position}
              </span>
            )}
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#4B5563] hover:text-red-400 hover:bg-red-950/20 text-sm transition-all border border-transparent hover:border-red-900/40"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="h-14 border-b border-[#13111F] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-2 text-[#4B5563] text-xs tracking-widest uppercase">
            <span>Barangay Salawag</span>
            <span>/</span>
            <span className="text-[#6B7280]">
              {NAV.find(n => pathname === n.href || pathname.startsWith(n.href))?.label || 'Dashboard'}
            </span>
          </div>
          <button className="relative p-2 rounded-lg text-[#4B5563] hover:text-white hover:bg-white/5 transition-all">
            <BellIcon className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
