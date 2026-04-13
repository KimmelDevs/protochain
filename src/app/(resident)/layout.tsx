import Sidebar from '@/app/components/layout/sidebar';
import { Toaster } from 'sonner';

export default function ResidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // banner-dark (#171717) base bg, surface-dark (#1a1a1a) via dark mode
    <div className="flex min-h-screen bg-[#f0f0f3] dark:bg-[#171717]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
