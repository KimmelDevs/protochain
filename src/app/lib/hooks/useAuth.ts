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
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata }
    });

    if (error) return { success: false, error: error.message };

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        firstName: metadata.firstName,
        lastName: metadata.lastName,
        phone: metadata.phone,
        address: metadata.address,
        role: metadata.role,
        username: metadata.username,
        birthday: metadata.birthday,
        civilStatus: metadata.civilStatus,
      });

      if (profileError) return { success: false, error: profileError.message };
    }

    router.push('/dashboard');
    return { success: true };
  };

  return { register }; // Make sure to return the function if needed
}