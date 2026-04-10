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
  Shield,
  Moon,
  Sun,
  ShieldCheck,
} from 'lucide-react';
import Image from "next/image";

const menuItems = [
  { label: 'Dashboard',        href: '/dashboard',        icon: LayoutDashboard },
  { label: 'Request Document', href: '/request-document', icon: FileText        },
  { label: 'My Requests',      href: '/my-requests',      icon: Clock           },
  { label: 'My Documents',     href: '/my-documents',     icon: CheckCircle     },
  { label: 'Verify Document',  href: '/verify',           icon: ShieldCheck     },
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
    <aside className="w-64 h-screen bg-white dark:bg-[#0f0f23] border-r border-gray-300 dark:border-white/10 flex flex-col sticky top-0">

      {/* Logo */}
      <div className="p-6 border-b border-gray-300 dark:border-white/10 flex-shrink-0">
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
            <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
              ProtoChain
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
              Resident Portal
            </span>
          </div>
        </Link>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${
                      isActive
                        ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-lg'
                        : 'text-gray-900 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Theme Toggle */}
      <div className="px-4 pb-2">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-gray-900 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition"
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
      <div className="p-4 border-t border-gray-300 dark:border-white/10 flex-shrink-0">
        <button
          onClick={() => {
            window.location.href = '/login';
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-gray-900 dark:text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>

    </aside>
  );
}