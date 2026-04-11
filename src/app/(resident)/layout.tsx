import Sidebar from '@/app/components/layout/sidebar';

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
    </div>
  );
}
