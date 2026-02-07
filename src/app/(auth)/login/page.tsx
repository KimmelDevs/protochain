'use client';

import Image from "next/image";
import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-gradient-dark">
      
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

        <form className="space-y-6">
          {/* Email */}
          <div className="relative">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-dark-light border border-primary-500/20 text-black focus:outline-none focus:ring-2 focus:ring-primary-500"
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
              className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-dark-light border border-primary-500/20 text-black focus:outline-none focus:ring-2 focus:ring-primary-500"
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

          {/* Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl hover:opacity-90 transition-all duration-300 font-semibold text-lg"
          >
            Log In
          </button>
        </form>

        {/* Links */}
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-400">
            Don&apos;t have an account?{" "}
            <a href="/register" className="text-primary-500 hover:underline font-medium">
              Sign up
            </a>
          </p>
          <p className="text-sm">
            <a href="/forgot-password" className="text-primary-500 hover:underline font-medium">
              Forgot password?
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
