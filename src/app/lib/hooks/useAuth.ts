'use client';

import { useRouter } from 'next/navigation';
import { registerUser, loginUser, logoutUser, resetPassword } from '@/app/firebase/auth';
import { getAuthErrorMessage } from '@/app/lib/utils/helpers';


export const useAuthActions = () => {
  const router = useRouter();

  const register = async (
    email: string,
    password: string,
    userData: {
      firstName: string;
      lastName: string;
      phone: string;
      address?: string;
      role?: 'resident' | 'admin';
    }
  ) => {
    const result = await registerUser(email, password, userData);

    if (result.success) {
      router.push('/login');
    } else {
      return { 
        success: false, 
        error: getAuthErrorMessage(result.error || '') 
      };
    }

    return result;
  };

  const login = async (email: string, password: string) => {
    const result = await loginUser(email, password);

    if (result.success && result.userData) {
      // Redirect based on role
      if (result.userData.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/resident/dashboard');
      }
    } else {
      return { 
        success: false, 
        error: getAuthErrorMessage(result.error || '') 
      };
    }

    return result;
  };

  const logout = async () => {
    const result = await logoutUser();
    if (result.success) {
      router.push('/login');
    }
    return result;
  };

  const forgotPassword = async (email: string) => {
    const result = await resetPassword(email);
    if (!result.success) {
      return { 
        success: false, 
        error: getAuthErrorMessage(result.error || '') 
      };
    }
    return result;
  };

  return {
    register,
    login,
    logout,
    forgotPassword,
  };
};