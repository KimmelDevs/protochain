import Sidebar from '@/app/components/layout/sidebar';

export default function ResidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#0f0f23]">
      <Sidebar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}