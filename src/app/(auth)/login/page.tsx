'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // TODO: Add actual authentication logic here
    // For now, simulate API call
    setTimeout(() => {
      setLoading(false);
      
      // Mock authentication - check if admin or resident
      // In real app, this would come from your backend
      if (email.includes('admin')) {
        // Redirect to admin dashboard
        router.push('/admindashboard');
      } else {
        // Redirect to resident dashboard
        router.push('/dashboard');
      }
    }, 1500);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 pt-20 pb-8 bg-gradient-dark">
      {/* Added pt-20 to avoid header overlap */}
      
      {/* Background image with overlay */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/loginback.jpg"
          alt="Login background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      </div>

      {/* Login Card */}
      <div className="card-gradient backdrop-blur-md shadow-xl rounded-2xl w-full max-w-md p-8 space-y-6 border border-primary-500/30">
        
        <div className="text-center">
          <h2 className="text-3xl font-bold gradient-text">
            Welcome Back
          </h2>
          <p className="text-gray-400 text-sm">
            Log in to continue to ProtoChain
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500 rounded text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div className="relative">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              required
              className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <label
              htmlFor="email"
              className={`absolute left-4 top-2 text-gray-400 text-sm transition-all
                          peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
                          peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1
                          ${email ? 'top-2 text-xs -translate-y-1' : ''}`}
            >
              Email
            </label>
          </div>

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder=" "
              required
              className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <label
              htmlFor="password"
              className={`absolute left-4 top-2 text-gray-400 text-sm transition-all
                          peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
                          peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1
                          ${password ? 'top-2 text-xs -translate-y-1' : ''}`}
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
            >
              {showPassword ? (
                <EyeIcon className="w-5 h-5" />
              ) : (
                <EyeSlashIcon className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-gray-400">
              <input
                type="checkbox"
                className="mr-2 rounded bg-white/5 border-white/10"
              />
              Remember me
            </label>
            <Link
              href="/forgot-password"
              className="text-primary-500 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl hover:opacity-90 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </span>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        {/* Links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary-500 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>

        {/* Demo Credentials (Remove in production) */}
        <div className="border-t border-white/10 pt-4">
          <p className="text-xs text-gray-500 text-center mb-2">Demo credentials:</p>
          <div className="text-xs text-gray-400 space-y-1">
            <p>👤 Resident: <code className="text-purple-400">user@test.com</code></p>
            <p>👨‍💼 Admin: <code className="text-purple-400">admin@test.com</code></p>
          </div>
        </div>
      </div>
    </div>
  );
}