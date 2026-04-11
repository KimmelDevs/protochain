'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  LayoutDashboard, Clock, CheckCircle, XCircle,
  Users, Settings, LogOut, BarChart3, Moon, Sun, ScrollText, ShieldCheck,
} from 'lucide-react';
import Image from 'next/image';

const NAV = [
  { label: 'Dashboard',          href: '/admindashboard',     icon: LayoutDashboard },
  { label: 'Pending Requests',   href: '/pending-requests',   icon: Clock           },
  { label: 'Approved Documents', href: '/approved-documents', icon: CheckCircle     },
  { label: 'Rejected Requests',  href: '/rejected-requests',  icon: XCircle         },
  { label: 'Residents',          href: '/residents',          icon: Users           },
  { label: 'Reports',            href: '/reports',            icon: BarChart3       },
  { label: 'Audit Logs',         href: '/audit-logs',         icon: ScrollText      },
  { label: 'Verify Document',    href: '/adminverify',        icon: ShieldCheck     },
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

      {/* color-surface (#ffffff) light / color-banner-dark (#171717) dark
          border: color-border (#e0e1e6) */}
      <aside className="sb w-56 h-screen flex flex-col sticky top-0
        bg-[#ffffff]      dark:bg-[#171717]
        border-r border-[#e0e1e6] dark:border-white/10
        transition-colors duration-200">

        {/* ── LOGO ─────────────────────────────────────────── */}
        {/* border: color-border (#e0e1e6) */}
        <div className="px-5 pt-6 pb-5 border-b border-[#e0e1e6] dark:border-white/10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0">
              <Image src="/protochain_logo2.jpg" alt="ProtoChain" width={28} height={28} priority />
            </div>
            <div>
              {/* color-body (#1c2024) */}
              <p className="sb-mono text-[13px] font-medium text-[#1c2024] dark:text-white leading-none tracking-tight">
                ProtoChain
              </p>
              {/* color-cta (#E8500A) — brand accent label */}
              <p className="sb-mono text-[10px] tracking-[0.15em] uppercase text-[#E8500A] leading-none mt-0.5">
                Admin Portal
              </p>
            </div>
          </Link>
        </div>

        {/* ── PRIMARY NAV ──────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 pt-4">

          {/* color-slate (#60646c) section label */}
          <p className="sb-mono text-[10px] tracking-[0.18em] uppercase text-[#60646c] dark:text-[#b0b4ba] px-2 mb-2">
            Main
          </p>

          <ul className="space-y-0.5">
            {NAV.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || (href !== '/admindashboard' && pathname.startsWith(href + '/'));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`
                      relative flex items-center gap-2.5 px-2 py-2.5 rounded-lg
                      transition-colors duration-150
                      ${active
                        // Active bg: color-bg (#f0f0f3) light / color-surface-dark (#1a1a1a) dark
                        ? 'bg-[#f0f0f3] dark:bg-[#1a1a1a] text-[#1c2024] dark:text-white'
                        // Inactive: color-dark-slate text, same hover bg
                        : 'text-[#363a3f] dark:text-[#b0b4ba] hover:bg-[#f0f0f3] dark:hover:bg-[#1a1a1a] hover:text-[#1c2024] dark:hover:text-white'
                      }
                    `}
                  >
                    {/* Active indicator: color-cta (#E8500A) */}
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-[#E8500A] rounded-full" />
                    )}
                    {/* Icon: color-cta when active, inherit otherwise */}
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#E8500A]' : ''}`} />
                    <span className={`text-[13px] leading-none ${active ? 'font-medium' : 'font-normal'}`}>
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* color-slate (#60646c) section label */}
          <p className="sb-mono text-[10px] tracking-[0.18em] uppercase text-[#60646c] dark:text-[#b0b4ba] px-2 mt-5 mb-2">
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
                      relative flex items-center gap-2.5 px-2 py-2.5 rounded-lg
                      transition-colors duration-150
                      ${active
                        ? 'bg-[#f0f0f3] dark:bg-[#1a1a1a] text-[#1c2024] dark:text-white'
                        : 'text-[#363a3f] dark:text-[#b0b4ba] hover:bg-[#f0f0f3] dark:hover:bg-[#1a1a1a] hover:text-[#1c2024] dark:hover:text-white'
                      }
                    `}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-[#E8500A] rounded-full" />
                    )}
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#E8500A]' : ''}`} />
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
        {/* color-slate text, color-bg hover */}
        <div className="px-3 pb-1">
          <button
            onClick={() => setDarkMode(d => !d)}
            className="flex items-center gap-2.5 px-2 py-2.5 w-full rounded-lg text-[13px]
              text-[#60646c] dark:text-[#b0b4ba]
              hover:text-[#1c2024] dark:hover:text-white
              hover:bg-[#f0f0f3] dark:hover:bg-[#1a1a1a]
              transition-colors duration-150"
          >
            {darkMode
              ? <><Sun  className="w-4 h-4 flex-shrink-0" /><span>Light mode</span></>
              : <><Moon className="w-4 h-4 flex-shrink-0" /><span>Dark mode</span></>
            }
          </button>
        </div>

        {/* ── PROFILE + LOGOUT ─────────────────────────────── */}
        {/* border: color-border (#e0e1e6) */}
        <div className="px-3 pb-4 pt-3 border-t border-[#e0e1e6] dark:border-white/10 space-y-0.5">
          <div className="flex items-center gap-2.5 px-2 py-2">
            {/* Avatar: color-cta (#E8500A) bg — brand identity */}
            <div className="w-7 h-7 rounded-lg bg-[#E8500A] flex items-center justify-center flex-shrink-0">
              <span className="sb-mono text-[10px] font-semibold text-white leading-none">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              {/* color-body (#1c2024) */}
              <p className="text-[13px] font-medium text-[#1c2024] dark:text-white truncate leading-none">{fullName}</p>
              {/* color-slate (#60646c) */}
              <p className="sb-mono text-[10px] text-[#60646c] dark:text-[#b0b4ba] leading-none mt-1 capitalize">{roleLabel}</p>
            </div>
          </div>

          {/* Logout: color-destructive (#eb8e90) hover — semantic destructive token */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-2 py-2.5 w-full rounded-lg text-[13px]
              text-[#60646c] dark:text-[#b0b4ba]
              hover:text-[#eb8e90] dark:hover:text-[#eb8e90]
              hover:bg-[#eb8e90]/10
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