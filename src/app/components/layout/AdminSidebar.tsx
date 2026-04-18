'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import {
  LayoutDashboard, Clock, CheckCircle, XCircle,
  Users, Settings, LogOut, BarChart3, Moon, Sun, ScrollText, ShieldCheck, ShieldOff,
} from 'lucide-react';
import Image from 'next/image';

const NAV = [
  { label: 'Dashboard',          href: '/admindashboard',     icon: LayoutDashboard },
  { label: 'Pending Requests',   href: '/pending-requests',   icon: Clock           },
  { label: 'Approved Documents', href: '/approved-documents', icon: CheckCircle     },
  { label: 'Rejected Requests',  href: '/rejected-requests',  icon: XCircle         },
  { label: 'Revoked Documents',  href: '/revoked-documents',  icon: ShieldOff       },
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
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

        .pjs, .pjs * { font-family: 'Plus Jakarta Sans', sans-serif; }

        .sb-nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 12px;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--sb-slate);
          text-decoration: none;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .sb-nav-link:hover {
          background: var(--sb-bg);
        }
        .sb-nav-link.active {
          background: var(--sb-orange-pale);
          color: var(--sb-body);
          font-weight: 600;
        }
        .sb-nav-link .active-bar {
          display: none;
          position: absolute;
          left: 0; top: 8px; bottom: 8px;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: var(--sb-orange);
        }
        .sb-nav-link.active .active-bar { display: block; }

        .sb-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          width: 100%;
          border-radius: 12px;
          font-size: 13.5px;
          font-weight: 500;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .sb-btn:hover { background: var(--sb-bg); }
        .sb-btn.logout:hover { background: #FEF0F1; color: #B8172A !important; }

        /* light */
        .pjs {
          --sb-orange:      #E8500A;
          --sb-orange-pale: #FFF3EE;
          --sb-bg:          #F6F5F3;
          --sb-surface:     #FFFFFF;
          --sb-border:      #E8E6E1;
          --sb-body:        #1A1A1C;
          --sb-slate:       #6C6C74;
          --sb-silver:      #B0B0B8;
        }

        /* dark */
        .dark .pjs {
          --sb-bg:      #111113;
          --sb-surface: #1C1C1F;
          --sb-border:  #2C2C32;
          --sb-body:    #EAEAEC;
          --sb-slate:   #9090A0;
          --sb-silver:  #55555F;
          --sb-orange-pale: rgba(232,80,10,0.12);
        }

        /* dark mode scrollbar */
        .dark .pjs nav::-webkit-scrollbar {
          width: 4px;
        }
        .dark .pjs nav::-webkit-scrollbar-track {
          background: transparent;
        }
        .dark .pjs nav::-webkit-scrollbar-thumb {
          background: #2C2C32;
          border-radius: 999px;
        }
        .dark .pjs nav::-webkit-scrollbar-thumb:hover {
          background: #3C3C44;
        }
      `}</style>

      <aside
        className="pjs w-60 h-screen flex flex-col sticky top-0 transition-colors duration-200"
        style={{
          background: 'var(--sb-surface)',
          borderRight: '1px solid var(--sb-border)',
        }}
      >

        {/* ── LOGO ──────────────────────────────────────────── */}
        <div className="px-4 pt-5 pb-4" style={{ borderBottom: '1px solid var(--sb-border)' }}>
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"
              style={{ boxShadow: '0 2px 8px rgba(232,80,10,0.25)' }}>
              <Image src="/protochain_logo2.jpg" alt="ProtoChain" width={36} height={36} priority />
            </div>
            <div>
              <p className="text-[14.5px] leading-none tracking-tight"
                style={{ color: 'var(--sb-body)', fontWeight: 700 }}>
                ProtoChain
              </p>
              <p className="text-[10px] tracking-[0.16em] uppercase leading-none mt-[5px]"
                style={{ color: 'var(--sb-orange)', fontWeight: 600 }}>
                Admin Portal
              </p>
            </div>
          </Link>
        </div>

        {/* ── PRIMARY NAV ───────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 pt-4 pb-2">

          <p className="text-[10px] tracking-[0.2em] uppercase px-2 mb-2"
            style={{ color: 'var(--sb-silver)', fontWeight: 600 }}>
            Main
          </p>

          <ul className="space-y-[2px] list-none p-0 m-0">
            {NAV.map(({ label, href, icon: Icon }) => {
              const active = pathname === href ||
                (href !== '/admindashboard' && pathname.startsWith(href + '/'));
              return (
                <li key={href}>
                  <Link href={href} className={`sb-nav-link${active ? ' active' : ''}`}
                    style={{ color: active ? 'var(--sb-body)' : 'var(--sb-slate)' }}>
                    <span className="active-bar" />
                    <Icon
                      style={{
                        width: 16, height: 16, flexShrink: 0,
                        color: active ? 'var(--sb-orange)' : 'currentColor',
                      }}
                    />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="text-[10px] tracking-[0.2em] uppercase px-2 mt-5 mb-2"
            style={{ color: 'var(--sb-silver)', fontWeight: 600 }}>
            System
          </p>

          <ul className="space-y-[2px] list-none p-0 m-0">
            {SECONDARY.map(({ label, href, icon: Icon }) => {
              const active = pathname === href;
              return (
                <li key={href}>
                  <Link href={href} className={`sb-nav-link${active ? ' active' : ''}`}
                    style={{ color: active ? 'var(--sb-body)' : 'var(--sb-slate)' }}>
                    <span className="active-bar" />
                    <Icon
                      style={{
                        width: 16, height: 16, flexShrink: 0,
                        color: active ? 'var(--sb-orange)' : 'currentColor',
                      }}
                    />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── THEME TOGGLE ──────────────────────────────────── */}
        <div className="px-3 pb-2">
          <button
            onClick={() => setDarkMode(d => !d)}
            className="sb-btn"
            style={{ color: 'var(--sb-slate)' }}
          >
            {darkMode
              ? <><Sun  style={{ width: 16, height: 16, flexShrink: 0 }} /><span>Light mode</span></>
              : <><Moon style={{ width: 16, height: 16, flexShrink: 0 }} /><span>Dark mode</span></>
            }
          </button>
        </div>

        {/* ── PROFILE + LOGOUT ──────────────────────────────── */}
        <div className="px-3 pt-3 pb-4" style={{ borderTop: '1px solid var(--sb-border)' }}>

          {/* avatar row */}
          <div className="flex items-center gap-2.5 px-2.5 py-2 mb-0.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--sb-orange)' }}
            >
              <span className="text-[11px] text-white leading-none" style={{ fontWeight: 700 }}>
                {initials}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] truncate leading-none"
                style={{ color: 'var(--sb-body)', fontWeight: 600 }}>
                {fullName}
              </p>
              <p className="text-[11px] leading-none mt-[5px] capitalize"
                style={{ color: 'var(--sb-slate)', fontWeight: 400 }}>
                {roleLabel}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="sb-btn logout"
            style={{ color: 'var(--sb-slate)' }}
          >
            <LogOut style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span>Sign out</span>
          </button>

        </div>
      </aside>
    </>
  );
}
