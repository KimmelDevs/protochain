'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Clock, 
  CheckCircle, 
  User, 
  LogOut,
  Shield
} from 'lucide-react';

const menuItems = [
  {
    label: 'Dashboard',
    href: '/resident/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Request Document',
    href: '/resident/request-document',
    icon: FileText,
  },
  {
    label: 'My Requests',
    href: '/resident/my-requests',
    icon: Clock,
  },
  {
    label: 'My Documents',
    href: '/resident/my-documents',
    icon: CheckCircle,
  },
  {
    label: 'Profile',
    href: '/resident/profile',
    icon: User,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-[#0f0f23] border-r border-white/10 flex flex-col sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-white/10 flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white leading-tight">ProtoChain</span>
            <span className="text-[10px] text-gray-400 leading-tight">Resident Portal</span>
          </div>
        </Link>
      </div>

      {/* Menu Items - Scrollable */}
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
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
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

      {/* Logout - Always Visible */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <button
          onClick={() => {
            // Handle logout
            window.location.href = '/login';
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg w-full text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium text-sm">Logout</span>
        </button>
      </div>
    </aside>
  );
}