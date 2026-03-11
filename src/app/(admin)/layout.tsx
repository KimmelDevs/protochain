import AdminSidebar from '@/app/components/layout/AdminSidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white dark:bg-gradient-to-br dark:from-[#0f0f23] dark:via-[#1a1a2e] dark:to-[#0f0f23]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}