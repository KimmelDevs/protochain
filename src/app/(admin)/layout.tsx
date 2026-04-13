import AdminSidebar from '@/app/components/layout/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen" style={{ background: 'var(--pc-bg, #F6F5F3)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
