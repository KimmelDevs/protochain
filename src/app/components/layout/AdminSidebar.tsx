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
  FileText,
  Settings,
  LogOut,
  Shield,
  BarChart3
} from 'lucide-react';
const menuItems = [
  { label: 'Dashboard', href: '/admindashboard', icon: LayoutDashboard },
  { label: 'Pending Requests', href: '/pending-requests', icon: Clock },
  { label: 'Approved Documents', href: '/approved-documents', icon: CheckCircle },
  { label: 'Rejected Requests', href: '/rejected-requests', icon: XCircle },
  { label: 'Residents', href: '/residents', icon: Users },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

interface AdminProfile {
  firstName: string;
  lastName: string;
  role: string;
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initials = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : '?';

  const fullName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : 'Loading...';

  const roleLabel = profile?.role === 'admin' ? 'Administrator' : profile?.role ?? '';

  return (
    <aside className="w-64 h-screen bg-[#0f0f23] border-r border-white/10 flex flex-col sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/10 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white leading-tight">ProtoChain</span>
            <span className="text-[10px] text-gray-400 leading-tight">Admin Portal</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${isActive
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Admin Info & Logout */}
      <div className="p-4 border-t border-white/10 flex-shrink-0 space-y-3">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{fullName}</p>
            <p className="text-xs text-gray-400 capitalize">{roleLabel}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}