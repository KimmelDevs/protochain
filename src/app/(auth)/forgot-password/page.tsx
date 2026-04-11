'use client';

import Button from "@/app/components/ui/Button";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/app/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setLoading(false);
    setSent(true);
  };

  const handleResend = async () => {
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 pt-20 pb-8">

      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <Image src="/loginback.jpg" alt="Background" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      </div>

      {/* Card */}
      <div className="backdrop-blur-md shadow-[0_10px_25px_rgba(0,0,0,0.12),0_4px_10px_rgba(0,0,0,0.08)] rounded-2xl w-full max-w-md p-8 space-y-6 border border-white/20 bg-white/5">

        {!sent ? (
          <>
            {/* Header */}
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white">Forgot Password</h2>
              <p className="text-[#b0b4ba] text-sm mt-1">Enter your email to receive reset instructions</p>
            </div>

            {/* Error — color-destructive (#eb8e90) */}
            {error && (
              <div className="p-3 bg-[#eb8e90]/10 border border-[#eb8e90] rounded-lg text-[#eb8e90] text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email — focus:ring color-cta (#E8500A) */}
              <div className="relative">
                <input
                  type="email" id="email" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" " required
                  className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-[#E8500A]"
                />
                <label htmlFor="email" className={`absolute left-4 top-2 text-[#b0b4ba] text-sm transition-all
                  peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
                  peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1
                  ${email ? 'top-2 text-xs -translate-y-1' : ''}`}>
                  Email
                </label>
              </div>

              {/* Submit — variant="default" = color-cta (#E8500A) */}
              <Button type="submit" variant="default" disabled={loading}
                className="w-full py-3 rounded-lg shadow-[0_4px_6px_rgba(0,0,0,0.07)] font-semibold">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Sending...
                  </span>
                ) : 'Send Reset Link'}
              </Button>
            </form>

            {/* Back link — color-cta (#E8500A) */}
            <div className="text-center">
              <Link href="/login" className="text-[#E8500A] hover:opacity-80 transition-opacity text-sm font-medium">
                Back to Login
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Success state */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="bg-green-500/20 border border-green-500/40 p-4 rounded-full">
                  <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white">Check Your Email</h2>
              <p className="text-[#b0b4ba] text-sm">We sent a password reset link to</p>
              <p className="text-white font-medium break-all">{email}</p>

              {/* Resend error */}
              {error && (
                <div className="p-3 bg-[#eb8e90]/10 border border-[#eb8e90] rounded-lg text-[#eb8e90] text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-3 pt-4">
                {/* Resend — outline variant (Standard White style) */}
                <button
                  onClick={handleResend} disabled={loading}
                  className="w-full border border-white/20 text-white px-6 py-3 rounded-lg hover:bg-white/10 transition disabled:opacity-50 font-semibold"
                >
                  {loading ? 'Sending...' : 'Resend Email'}
                </button>

                {/* Back to Login — color-cta (#E8500A) */}
                <Link
                  href="/login"
                  className="block w-full text-center bg-[#E8500A] hover:opacity-90 text-white px-6 py-3 rounded-[9999px] shadow-[0_4px_6px_rgba(0,0,0,0.07)] transition font-semibold"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}