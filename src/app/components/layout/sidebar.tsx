'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Clock, 
  CheckCircle, 
  User, 
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react';
import Image from "next/image";

const menuItems = [
  { label: 'Dashboard',        href: '/dashboard',        icon: LayoutDashboard },
  { label: 'Request Document', href: '/request-document', icon: FileText        },
  { label: 'My Requests',      href: '/my-requests',      icon: Clock           },
  { label: 'My Documents',     href: '/my-documents',     icon: CheckCircle     },
  { label: 'Revoked Documents', href: '/my-revoked-documents', icon: ShieldOff    },
  { label: 'Verify Document',  href: '/residentverify',   icon: ShieldCheck     },
  { label: 'Profile',          href: '/profile',          icon: User            },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(false);

  // Load saved theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Apply theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  return (
    // color-surface (#ffffff) light / color-banner-dark (#171717) dark
    <aside className="w-64 h-screen bg-[#ffffff] dark:bg-[#171717] border-r border-[#e0e1e6] dark:border-white/10 flex flex-col sticky top-0 transition-colors duration-200">

      {/* Logo */}
      {/* border-color: color-border (#e0e1e6) */}
      <div className="p-6 border-b border-[#e0e1e6] dark:border-white/10 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center">
            <Image
              src="/protochain_logo2.jpg"
              alt="ProtoChain Logo"
              width={36}
              height={36}
              priority
            />
          </div>
          <div className="flex flex-col">
            {/* color-body (#1c2024) */}
            <span className="text-sm font-bold text-[#1c2024] dark:text-white leading-tight">
              ProtoChain
            </span>
            {/* color-slate (#60646c) */}
            <span className="text-[10px] text-[#60646c] dark:text-[#b0b4ba] leading-tight">
              Resident Portal
            </span>
          </div>
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    relative flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${
                      isActive
                        // Active: color-cta (#E8500A) bg, white text — Primary CTA token
                        ? 'bg-[#E8500A] text-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]'
                        // Inactive: color-body text, color-bg hover bg
                        : 'text-[#1c2024] dark:text-[#b0b4ba] hover:text-[#1c2024] dark:hover:text-white hover:bg-[#f0f0f3] dark:hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Theme Toggle */}
      {/* color-slate text, color-bg hover — matches inactive nav item style */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-[#1c2024] dark:text-[#b0b4ba] hover:text-[#1c2024] dark:hover:text-white hover:bg-[#f0f0f3] dark:hover:bg-white/5 transition-colors duration-200"
        >
          {darkMode ? (
            <>
              <Sun className="w-5 h-5" />
              <span className="text-sm">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-5 h-5" />
              <span className="text-sm">Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Logout */}
      {/* border-color: color-border (#e0e1e6) */}
      <div className="p-4 border-t border-[#e0e1e6] dark:border-white/10 flex-shrink-0">
        <button
          onClick={() => {
            window.location.href = '/login';
          }}
          // color-destructive (#eb8e90) hover text — semantic destructive token
          className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-[#60646c] dark:text-[#b0b4ba] hover:text-[#eb8e90] hover:bg-[#eb8e90]/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>

    </aside>
  );
}