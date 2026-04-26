'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import AdminSidebar from '@/app/components/layout/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        if (mounted) router.replace('/');
        return;
      }
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (!prof || prof.role !== 'admin') {
        if (mounted) router.replace('/');
        return;
      }
      if (mounted) setAuthed(true);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && mounted) router.replace('/');
    });

    verify();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (!authed) return null;

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--pc-bg, #F6F5F3)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
