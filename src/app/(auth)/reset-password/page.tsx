'use client';

import Button from "@/app/components/ui/Button";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { createClient } from "@/app/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setValidSession(true);
        setCheckingSession(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValidSession(true);
      setCheckingSession(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  const calcStrength = (pwd: string) => {
    let s = 0;
    if (pwd.length >= 8) s++;
    if (pwd.length >= 12) s++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
    if (/\d/.test(pwd)) s++;
    if (/[^a-zA-Z0-9]/.test(pwd)) s++;
    return s;
  };

  const strengthLabel = () => {
    switch (passwordStrength) {
      case 0: case 1: return { text: 'Weak',        color: 'bg-[#eb8e90]'  };
      case 2:         return { text: 'Fair',        color: 'bg-[#ab6400]'  };
      case 3:         return { text: 'Good',        color: 'bg-yellow-400' };
      case 4:         return { text: 'Strong',      color: 'bg-green-500'  };
      case 5:         return { text: 'Very Strong', color: 'bg-emerald-600'};
      default:        return { text: '',            color: 'bg-[#b0b4ba]'  };
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    setPasswordStrength(calcStrength(val));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    setSuccess(true);
    setLoading(false);
    setTimeout(() => router.push('/login'), 2000);
  };

  const strength = strengthLabel();

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 pt-20 pb-8">

      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <Image src="/loginback.jpg" alt="Background" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      </div>

      {/* Card */}
      <div className="backdrop-blur-md shadow-[0_10px_25px_rgba(0,0,0,0.12),0_4px_10px_rgba(0,0,0,0.08)] rounded-2xl w-full max-w-md p-8 space-y-6 border border-white/20 bg-white/5">

        {/* Checking session — spinner color-cta (#E8500A) */}
        {checkingSession && (
          <div className="text-center space-y-4 py-4">
            <svg className="animate-spin h-8 w-8 text-[#E8500A] mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-[#b0b4ba] text-sm">Verifying your reset link...</p>
          </div>
        )}

        {/* Expired link */}
        {!checkingSession && !validSession && !success && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-[#eb8e90]/20 border border-[#eb8e90]/40 p-4 rounded-full">
                <svg className="w-8 h-8 text-[#eb8e90]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">Link Expired</h2>
            <p className="text-[#b0b4ba] text-sm">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            {/* color-cta (#E8500A) CTA */}
            <Link
              href="/forgot-password"
              className="block w-full text-center bg-[#E8500A] hover:opacity-90 text-white px-6 py-3 rounded-[9999px] font-semibold transition"
            >
              Request New Link
            </Link>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="bg-green-500/20 border border-green-500/40 p-4 rounded-full">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white">Password Updated</h2>
            <p className="text-[#b0b4ba] text-sm">
              Your password has been reset successfully. Redirecting you to login...
            </p>
          </div>
        )}

        {/* Reset form */}
        {!checkingSession && validSession && !success && (
          <>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white">Reset Password</h2>
              <p className="text-[#b0b4ba] text-sm mt-1">Enter your new password below</p>
            </div>

            {/* Error — color-destructive (#eb8e90) */}
            {error && (
              <div className="p-3 bg-[#eb8e90]/10 border border-[#eb8e90] rounded-lg text-[#eb8e90] text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* New Password — focus:ring color-cta (#E8500A) */}
              <div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password} onChange={handlePasswordChange} placeholder=" "
                    className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#E8500A]"
                  />
                  <label className={`absolute left-4 text-[#b0b4ba] text-sm transition-all pointer-events-none
                    ${password ? 'top-2 text-xs -translate-y-1' : 'top-1/2 -translate-y-1/2 text-base'}
                    peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1`}>
                    New Password
                  </label>
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b0b4ba] hover:text-white transition-colors">
                    {showPassword ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                  </button>
                </div>
                {/* Strength bar */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }} />
                    </div>
                    <p className="text-xs text-[#b0b4ba]">Strength: <span className="font-semibold text-white">{strength.text}</span></p>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder=" "
                    className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#E8500A]"
                  />
                  <label className={`absolute left-4 text-[#b0b4ba] text-sm transition-all pointer-events-none
                    ${confirmPassword ? 'top-2 text-xs -translate-y-1' : 'top-1/2 -translate-y-1/2 text-base'}
                    peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1`}>
                    Confirm Password
                  </label>
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#b0b4ba] hover:text-white transition-colors">
                    {showConfirmPassword ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-[#eb8e90] text-xs mt-1 ml-1">Passwords do not match</p>
                )}
                {confirmPassword && confirmPassword === password && (
                  <p className="text-green-400 text-xs mt-1 ml-1">✓ Passwords match</p>
                )}
              </div>

              {/* Submit — variant="default" = color-cta (#E8500A) */}
              <Button type="submit" variant="default" disabled={loading} className="w-full py-3 rounded-lg font-semibold">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Updating...
                  </span>
                ) : 'Update Password'}
              </Button>
            </form>
          </>
        )}

      </div>
    </div>
  );
}