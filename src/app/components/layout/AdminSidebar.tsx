'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  LayoutDashboard,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Settings,
  LogOut,
  BarChart3,
  Moon,
  Sun,
} from 'lucide-react';
import Image from 'next/image';

const NAV = [
  { label: 'Dashboard',          href: '/admindashboard',     icon: LayoutDashboard },
  { label: 'Pending Requests',   href: '/pending-requests',   icon: Clock },
  { label: 'Approved Documents', href: '/approved-documents', icon: CheckCircle },
  { label: 'Rejected Requests',  href: '/rejected-requests',  icon: XCircle },
  { label: 'Residents',          href: '/residents',          icon: Users },
  { label: 'Reports',            href: '/reports',            icon: BarChart3 },
];

const SECONDARY = [
  { label: 'Settings', href: '/settings', icon: Settings },
];

interface AdminProfile {
  firstName: string;
  lastName: string;
  role: string;
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();

  const [profile,  setProfile]  = useState<AdminProfile | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('firstName, lastName, role')
        .eq('id', user.id)
        .single();
      if (data) setProfile(data);
    };
    load();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initials = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  const fullName  = profile ? `${profile.firstName} ${profile.lastName}` : 'Loading…';
  const roleLabel = profile?.role === 'admin' ? 'Administrator' : (profile?.role ?? '');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Geist:wght@300;400;500&display=swap');
        .sidebar-root { font-family: 'Geist', sans-serif; }
        .font-mono    { font-family: 'Geist Mono', monospace; }
      `}</style>

      <aside className="sidebar-root w-56 h-screen flex flex-col sticky top-0
        bg-[#fafaf9] dark:bg-[#0e0e0e]
        border-r border-gray-200 dark:border-white/[0.06]
        transition-colors duration-200">

        {/* ── LOGO ─────────────────────────────────────────── */}
        <div className="px-5 pt-6 pb-5 border-b border-gray-200 dark:border-white/[0.06]">
          <Link href="/" className="flex items-center gap-2.5 group">
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
              <p className="font-mono text-[13px] font-medium text-gray-900 dark:text-white leading-none tracking-tight">
                ProtoChain
              </p>
              <p className="font-mono text-[9px] tracking-[0.16em] uppercase text-orange-500 leading-none mt-0.5">
                Admin Portal
              </p>
            </div>
          </Link>
        </div>

        {/* ── PRIMARY NAV ──────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 pt-4">
          <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-gray-400 dark:text-gray-600 px-2 mb-2">
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
                      relative flex items-center gap-2.5 px-2 py-2 rounded text-sm
                      transition-colors duration-150
                      ${active
                        ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-white/[0.07]'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.04]'
                      }
                    `}
                  >
                    {/* active indicator — left bar */}
                    {active && (
                      <span className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-orange-500" />
                    )}

                    <Icon className={`w-[15px] h-[15px] flex-shrink-0 ${active ? 'text-orange-500' : ''}`} />
                    <span className={`text-[13px] leading-none ${active ? 'font-medium' : 'font-normal'}`}>
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* secondary group */}
          <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-gray-400 dark:text-gray-600 px-2 mt-5 mb-2">
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
                      relative flex items-center gap-2.5 px-2 py-2 rounded text-sm
                      transition-colors duration-150
                      ${active
                        ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-white/[0.07]'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.04]'
                      }
                    `}
                  >
                    {active && (
                      <span className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-orange-500" />
                    )}
                    <Icon className={`w-[15px] h-[15px] flex-shrink-0 ${active ? 'text-orange-500' : ''}`} />
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
            className="flex items-center gap-2.5 px-2 py-2 w-full rounded text-[13px]
              text-gray-400 dark:text-gray-500
              hover:text-gray-700 dark:hover:text-gray-300
              hover:bg-gray-100 dark:hover:bg-white/[0.04]
              transition-colors duration-150"
          >
            {darkMode
              ? <><Sun  className="w-[15px] h-[15px]" /><span>Light mode</span></>
              : <><Moon className="w-[15px] h-[15px]" /><span>Dark mode</span></>
            }
          </button>
        </div>

        {/* ── PROFILE + LOGOUT ─────────────────────────────── */}
        <div className="px-3 pb-4 pt-3 border-t border-gray-200 dark:border-white/[0.06] space-y-0.5">

          {/* avatar row */}
          <div className="flex items-center gap-2.5 px-2 py-2">
            {/* initials avatar — no gradient, just flat */}
            <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center flex-shrink-0">
              <span className="font-mono text-[9px] font-medium text-white leading-none">
                {initials}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-gray-900 dark:text-white truncate leading-none">
                {fullName}
              </p>
              <p className="font-mono text-[9px] text-gray-400 dark:text-gray-500 leading-none mt-0.5 capitalize">
                {roleLabel}
              </p>
            </div>
          </div>

          {/* logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-2 py-2 w-full rounded text-[13px]
              text-gray-500 dark:text-gray-400
              hover:text-red-500 dark:hover:text-red-400
              hover:bg-red-50 dark:hover:bg-red-500/10
              transition-colors duration-150"
          >
            <LogOut className="w-[15px] h-[15px]" />
            <span>Sign out</span>
          </button>

        </div>
      </aside>
    </>
  );
}