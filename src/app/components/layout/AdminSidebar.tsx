'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  LayoutDashboard, Clock, CheckCircle, XCircle,
  Users, Settings, LogOut, BarChart3, Moon, Sun,
} from 'lucide-react';
import Image from 'next/image';

/*
 * Same contrast tokens as DashboardPage — applied consistently:
 *
 * Light (#fafaf9 bg):
 *   primary  #1a1917  — nav label active, name
 *   body     #3d3b36  — nav label inactive
 *   muted    #5c5a54  — section headers, role, theme toggle
 *   subtle   #7a7870  — lowest tier, still AA
 *
 * Dark (#16161a bg):
 *   primary  #f0eee8  — nav label active, name
 *   body     #c9c6be  — nav label inactive
 *   muted    #9e9b94  — section headers, role, theme toggle
 *   subtle   #7e7b75  — lowest tier, still AA
 */

const NAV = [
  { label: 'Dashboard',          href: '/admindashboard',     icon: LayoutDashboard },
  { label: 'Pending Requests',   href: '/pending-requests',   icon: Clock           },
  { label: 'Approved Documents', href: '/approved-documents', icon: CheckCircle     },
  { label: 'Rejected Requests',  href: '/rejected-requests',  icon: XCircle         },
  { label: 'Residents',          href: '/residents',          icon: Users           },
  { label: 'Reports',            href: '/reports',            icon: BarChart3       },
];

const SECONDARY = [
  { label: 'Settings', href: '/settings', icon: Settings },
];

interface AdminProfile { firstName: string; lastName: string; role: string; }

export default function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  const [profile,  setProfile]  = useState<AdminProfile | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles').select('firstName, lastName, role').eq('id', user.id).single();
      if (data) setProfile(data);
    })();
  }, []);

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initials  = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';
  const fullName  = profile ? `${profile.firstName} ${profile.lastName}` : 'Loading…';
  const roleLabel = profile?.role === 'admin' ? 'Administrator' : (profile?.role ?? '');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500&display=swap');
        .sb      { font-family: 'IBM Plex Sans', sans-serif; }
        .sb-mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      <aside className="sb w-56 h-screen flex flex-col sticky top-0
        bg-[#fafaf9]      dark:bg-[#16161a]
        border-r border-[#dedad4] dark:border-[#2a2a32]
        transition-colors duration-200">

        {/* ── LOGO ─────────────────────────────────────────── */}
        <div className="px-5 pt-6 pb-5 border-b border-[#dedad4] dark:border-[#2a2a32]">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0">
              <Image src="/protochain_logo2.jpg" alt="ProtoChain" width={28} height={28} priority />
            </div>
            <div>
              {/* brand name — primary */}
              <p className="sb-mono text-[13px] font-medium text-[#1a1917] dark:text-[#f0eee8] leading-none tracking-tight">
                ProtoChain
              </p>
              {/* tagline — orange, always readable */}
              <p className="sb-mono text-[10px] tracking-[0.15em] uppercase text-orange-600 dark:text-orange-400 leading-none mt-0.5">
                Admin Portal
              </p>
            </div>
          </Link>
        </div>

        {/* ── PRIMARY NAV ──────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 pt-4">

          {/* section header — muted tier */}
          <p className="sb-mono text-[10px] tracking-[0.18em] uppercase text-[#7a7870] dark:text-[#7e7b75] px-2 mb-2">
            Main
          </p>

          <ul className="space-y-0.5">
            {NAV.map(({ label, href, icon: Icon }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`
                      relative flex items-center gap-2.5 px-2 py-2.5 rounded
                      transition-colors duration-150
                      ${active
                        ? 'bg-[#eeecea] dark:bg-[#1e1e24] text-[#1a1917] dark:text-[#f0eee8]'
                        : 'text-[#3d3b36] dark:text-[#c9c6be] hover:bg-[#eeecea] dark:hover:bg-[#1e1e24] hover:text-[#1a1917] dark:hover:text-[#f0eee8]'
                      }
                    `}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-orange-500" />
                    )}
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-orange-500' : ''}`} />
                    {/* nav label — 13px minimum, body tier inactive / primary active */}
                    <span className={`text-[13px] leading-none ${active ? 'font-medium' : 'font-normal'}`}>
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* secondary group */}
          <p className="sb-mono text-[10px] tracking-[0.18em] uppercase text-[#7a7870] dark:text-[#7e7b75] px-2 mt-5 mb-2">
            System
          </p>

          <ul className="space-y-0.5">
            {SECONDARY.map(({ label, href, icon: Icon }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`
                      relative flex items-center gap-2.5 px-2 py-2.5 rounded
                      transition-colors duration-150
                      ${active
                        ? 'bg-[#eeecea] dark:bg-[#1e1e24] text-[#1a1917] dark:text-[#f0eee8]'
                        : 'text-[#3d3b36] dark:text-[#c9c6be] hover:bg-[#eeecea] dark:hover:bg-[#1e1e24] hover:text-[#1a1917] dark:hover:text-[#f0eee8]'
                      }
                    `}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-orange-500" />
                    )}
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-orange-500' : ''}`} />
                    <span className={`text-[13px] leading-none ${active ? 'font-medium' : 'font-normal'}`}>
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── THEME TOGGLE ─────────────────────────────────── */}
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

        {/* ── PROFILE + LOGOUT ─────────────────────────────── */}
        <div className="px-3 pb-4 pt-3 border-t border-[#dedad4] dark:border-[#2a2a32] space-y-0.5">

          <div className="flex items-center gap-2.5 px-2 py-2">
            {/* avatar */}
            <div className="w-7 h-7 rounded bg-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="sb-mono text-[10px] font-semibold text-white leading-none">
                {initials}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              {/* name — primary tier */}
              <p className="text-[13px] font-medium text-[#1a1917] dark:text-[#f0eee8] truncate leading-none">
                {fullName}
              </p>
              {/* role — muted tier */}
              <p className="sb-mono text-[10px] text-[#5c5a54] dark:text-[#9e9b94] leading-none mt-1 capitalize">
                {roleLabel}
              </p>
            </div>
          </div>

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