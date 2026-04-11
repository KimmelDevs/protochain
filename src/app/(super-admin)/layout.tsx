'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/app/lib/supabase';
import {
  LayoutDashboard,
  Users,
  ScrollText,
  Settings,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  History,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Navigation items
───────────────────────────────────────────────────────────── */
const NAV_MAIN = [
  { label: 'Dashboard',      href: '/superadmindashboard', icon: LayoutDashboard },
  { label: 'Users',          href: '/users',               icon: Users           },
  { label: 'Audit Log',      href: '/audit',               icon: ScrollText      },
  { label: 'Recent Changes', href: '/recent-changes',      icon: History         },
];

const NAV_SYSTEM = [
  { label: 'Settings', href: '/super-settings', icon: Settings },
];

interface Profile {
  firstName: string;
  lastName:  string;
  role:      string;
  position:  string;
  email:     string;
}

/* ─────────────────────────────────────────────────────────────
   Sidebar — identical structure + tokens to AdminSidebar
   Dark/light toggle + Sign-out are ALWAYS rendered here,
   not in individual pages.
───────────────────────────────────────────────────────────── */
function SuperAdminSidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [darkMode, setDarkMode] = useState(false);

  /* Read stored preference on mount */
  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  /* Apply whenever darkMode flips */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initials = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';
  const fullName = profile ? `${profile.firstName} ${profile.lastName}` : 'Loading…';

  /* Shared link style logic */
  const isActive = (href: string) =>
    pathname === href ||
    (href !== '/superadmindashboard' && pathname.startsWith(href));

  const linkCls = (href: string) =>
    `relative flex items-center gap-2.5 px-2 py-2.5 rounded transition-colors duration-150
    ${isActive(href)
      ? 'bg-[#eeecea] dark:bg-[#1e1e24] text-[#1a1917] dark:text-[#f0eee8]'
      : 'text-[#3d3b36] dark:text-[#c9c6be] hover:bg-[#eeecea] dark:hover:bg-[#1e1e24] hover:text-[#1a1917] dark:hover:text-[#f0eee8]'
    }`;

  return (
    <>
      {/* IBM Plex fonts — same as AdminSidebar */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500&display=swap');
        .sb      { font-family: 'IBM Plex Sans', sans-serif; }
        .sb-mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      <aside className="sb w-56 h-screen flex flex-col sticky top-0
        bg-[#fafaf9]  dark:bg-[#16161a]
        border-r border-[#dedad4] dark:border-[#2a2a32]
        transition-colors duration-200">

        {/* ── LOGO ─────────────────────────────────────── */}
        <div className="px-5 pt-6 pb-5 border-b border-[#dedad4] dark:border-[#2a2a32]">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0">
              <Image
                src="/protochain_logo2.jpg"
                alt="ProtoChain"
                width={28}
                height={28}
                priority
              />
            </div>
            <div>
              <p className="sb-mono text-[13px] font-medium text-[#1a1917] dark:text-[#f0eee8] leading-none tracking-tight">
                ProtoChain
              </p>
              <p className="sb-mono text-[10px] tracking-[0.15em] uppercase text-orange-600 dark:text-orange-400 leading-none mt-0.5">
                Super Admin
              </p>
            </div>
          </Link>
        </div>

        {/* ── PRIMARY NAV ──────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 pt-4">

          <p className="sb-mono text-[10px] tracking-[0.18em] uppercase text-[#7a7870] dark:text-[#7e7b75] px-2 mb-2">
            Main
          </p>

          <ul className="space-y-0.5">
            {NAV_MAIN.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className={linkCls(href)}>
                  {isActive(href) && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-orange-500" />
                  )}
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive(href) ? 'text-orange-500' : ''}`} />
                  <span className={`text-[13px] leading-none ${isActive(href) ? 'font-medium' : 'font-normal'}`}>
                    {label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="sb-mono text-[10px] tracking-[0.18em] uppercase text-[#7a7870] dark:text-[#7e7b75] px-2 mt-5 mb-2">
            System
          </p>

          <ul className="space-y-0.5">
            {NAV_SYSTEM.map(({ label, href, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className={linkCls(href)}>
                  {isActive(href) && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-orange-500" />
                  )}
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive(href) ? 'text-orange-500' : ''}`} />
                  <span className={`text-[13px] leading-none ${isActive(href) ? 'font-medium' : 'font-normal'}`}>
                    {label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── THEME TOGGLE — always visible ────────────── */}
        <div className="px-3 pb-1">
          <button
            onClick={() => setDarkMode(d => !d)}
            className="flex items-center gap-2.5 px-2 py-2.5 w-full rounded text-[13px]
              text-[#5c5a54] dark:text-[#9e9b94]
              hover:text-[#1a1917] dark:hover:text-[#f0eee8]
              hover:bg-[#eeecea] dark:hover:bg-[#1e1e24]
              transition-colors duration-150"
          >
            {darkMode
              ? <><Sun  className="w-4 h-4 flex-shrink-0" /><span>Light mode</span></>
              : <><Moon className="w-4 h-4 flex-shrink-0" /><span>Dark mode</span></>
            }
          </button>
        </div>

        {/* ── PROFILE + SIGN OUT — always visible ──────── */}
        <div className="px-3 pb-4 pt-3 border-t border-[#dedad4] dark:border-[#2a2a32] space-y-0.5">

          {/* Profile row */}
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded bg-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="sb-mono text-[10px] font-semibold text-white leading-none">
                {initials}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-[#1a1917] dark:text-[#f0eee8] truncate leading-none">
                {fullName}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-2.5 h-2.5 text-orange-500 flex-shrink-0" />
                <p className="sb-mono text-[10px] text-orange-600 dark:text-orange-400 leading-none truncate">
                  {profile?.position || 'Super Admin'}
                </p>
              </div>
            </div>
          </div>

          {/* Sign out — always rendered in the sidebar */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-2 py-2.5 w-full rounded text-[13px]
              text-[#5c5a54] dark:text-[#9e9b94]
              hover:text-red-600 dark:hover:text-red-400
              hover:bg-red-50 dark:hover:bg-red-500/10
              transition-colors duration-150"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Layout wrapper — guards route, fetches profile, renders shell
───────────────────────────────────────────────────────────── */
export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          if (mounted) router.replace('/login');
          return;
        }

        const { data: prof, error } = await supabase
          .from('profiles')
          .select('email, firstName, lastName, role, position')
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
            lastName:  prof.lastName  ?? '',
            role:      prof.role      ?? '',
            position:  prof.position  ?? '',
          });
          setChecking(false);
        }
      } catch (err) {
        console.error('Super-admin auth error:', err);
        if (mounted) router.replace('/login');
      }
    };

    /* Re-guard on auth state change (e.g. sign-out from another tab) */
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && mounted) router.replace('/login');
    });

    verify();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  /* Loading screen — matches admin portal style */
  if (checking) {
    return (
      <div className="min-h-screen bg-[#fafaf9] dark:bg-[#16161a] flex items-center justify-center transition-colors duration-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <p style={{ fontFamily: "'IBM Plex Mono', monospace" }}
             className="text-[11px] tracking-[0.18em] uppercase text-[#7a7870] dark:text-[#7e7b75]">
            Verifying access…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#fafaf9] dark:bg-[#16161a] transition-colors duration-200">
      <SuperAdminSidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
