'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuthActions } from '@/app/lib/hooks/useAuth';
import Button from "@/app/components/ui/Button";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid email or password'))
      return 'Invalid email or password. Please try again.';
    if (msg.includes('email not confirmed'))
      return 'Please verify your email before logging in.';
    if (msg.includes('too many requests'))
      return 'Too many failed attempts. Please wait a few minutes and try again.';
    if (msg.includes('user not found'))
      return 'No account found with this email address.';
    if (msg.includes('network'))
      return 'Network error. Please check your connection and try again.';
    return error.message || 'An unexpected error occurred.';
  }
  return 'An unexpected error occurred. Please try again.';
}

export default function SignInPage() {
  const { login } = useAuthActions();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(
          typeof result.error === 'string'
            ? result.error
            : getErrorMessage(result.error)
        );
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 pt-20 pb-8">
      <div className="absolute inset-0 -z-10">
        <Image src="/loginback.jpg" alt="Login background" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      </div>

      <div className="backdrop-blur-md shadow-xl rounded-2xl w-full max-w-md p-8 space-y-6 border border-white/20 bg-white/5">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
          <p className="text-gray-400 text-sm">Log in to continue to ProtoChain</p>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/60 rounded-lg text-red-400 text-sm">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type="email" id="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" " required
              className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <label htmlFor="email" className={`absolute left-4 top-2 text-gray-400 text-sm transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1 ${email ? 'top-2 text-xs -translate-y-1' : ''}`}>
              Email
            </label>
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'} id="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" " required
              className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <label htmlFor="password" className={`absolute left-4 top-2 text-gray-400 text-sm transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2 peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1 ${password ? 'top-2 text-xs -translate-y-1' : ''}`}>
              Password
            </label>
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-gray-400">
              <input type="checkbox" className="mr-2 rounded bg-white/5 border-white/10" />
              Remember me
            </label>
            <Link href="/forgot-password" className="text-primary-500 hover:underline">Forgot password?</Link>
          </div>

          <Button
            type="submit"
            variant="orange"
            disabled={loading}
            className="w-full px-6 py-3 rounded-lg font-semibold"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Logging in...
              </span>
            ) : (
              'Log In'
            )}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <p className="text-sm text-gray-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary-500 hover:underline font-medium">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}