import Sidebar from "../components/layout/sidebar";

export default function ResidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-[#0f0f23] to-[#1a1a2e]">
      <Sidebar />
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}