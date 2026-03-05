import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

export function useAuthActions() {
  const router = useRouter();

  const register = async (
    email: string,
    password: string,
    metadata: {
      firstName: string;
      lastName: string;
      phone: string;
      address: string;
      role: string;
      username: string;
      birthday: string;
      civilStatus: string;
    }
  ) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, profile: metadata }),
      });

      const json = await res.json();
      if (!res.ok) return { success: false, error: json.error || 'Registration failed.' };

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        router.push('/login?registered=true');
        return { success: true };
      }

      router.push(metadata.role === 'admin' ? '/admindashboard' : '/dashboard');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'An unexpected error occurred.' };
    }
  };

  // Login: no PII involved, safe to use Supabase directly
  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };

    // Fetch role — role is not encrypted
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profile?.role === 'admin') {
      router.push('/admindashboard');
    } else {
      router.push('/dashboard');
    }

    return { success: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return { register, login, logout };
}