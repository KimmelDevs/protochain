'use client';

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      const cleaned = value.replace(/^(\+63)?/, '');
      setFormData({ ...formData, phone: cleaned });
    } else {
      setFormData({ ...formData, [name]: value });
    }

    setError('');
    if (name === 'password') setPasswordStrength(calculatePasswordStrength(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!/^09\d{9}$/.test(formData.phone)) {
      setError('Please enter a valid Philippine phone number (09XXXXXXXXX)');
      return;
    }

    setLoading(true);
    console.log('Register:', formData);

    setTimeout(() => {
      setLoading(false);
      window.location.href = '/login';
    }, 1500);
  };

  const getStrengthText = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 3) return 'Medium';
    return 'Strong';
  };

  const getStrengthDescription = () => {
    if (passwordStrength <= 1) return 'Add more characters and complexity';
    if (passwordStrength <= 3) return 'Good, but could be stronger';
    return 'Excellent password strength';
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 pt-20 pb-8 bg-gradient-dark">
      {/* ☝️ ADDED pt-20 to push content below fixed header */}

      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/loginback.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      </div>

      {/* Card */}
      <div className="card-gradient backdrop-blur-md shadow-xl rounded-2xl w-full max-w-md p-8 space-y-6 border border-primary-500/30">

        {/* Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold gradient-text">Create Account</h2>
          <p className="text-gray-400 text-sm">Join our secure community</p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500 rounded text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-3">
            {['firstName', 'lastName'].map((name) => (
              <div key={name} className="relative">
                <input
                  type="text"
                  id={name}
                  name={name}
                  value={formData[name as keyof typeof formData]}
                  onChange={handleChange}
                  placeholder=" "
                  required
                  className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <label
                  htmlFor={name}
                  className={`absolute left-4 top-2 text-gray-400 text-sm transition-all
                    peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
                    peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1
                    ${formData[name as keyof typeof formData] ? 'top-2 text-xs -translate-y-1' : ''}`}
                >
                  {name === 'firstName' ? 'First Name' : 'Last Name'}
                </label>
              </div>
            ))}
          </div>

          {/* Email */}
          <div className="relative">
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder=" "
              required
              className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <label
              htmlFor="email"
              className={`absolute left-4 top-2 text-gray-400 text-sm transition-all
                peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
                peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1
                ${formData.email ? 'top-2 text-xs -translate-y-1' : ''}`}
            >
              Email
            </label>
          </div>

          {/* Phone */}
          <div className="relative">
            <span className="absolute left-4 top-2 text-gray-400 text-sm select-none">+63</span>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={(e) => {
                const onlyNumbers = e.target.value.replace(/\D/g, '');
                setFormData({ ...formData, phone: onlyNumbers });
              }}
              placeholder=" "
              required
              maxLength={10}
              className="peer w-full pl-14 px-4 pt-6 pb-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <label
              htmlFor="phone"
              className={`absolute left-14 top-2 text-gray-400 text-sm transition-all
                peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
                peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1
                ${formData.phone ? 'top-2 text-xs -translate-y-1' : ''}`}
            >
              Phone Number
            </label>
          </div>

          {/* Password & Confirm Password */}
          {['password', 'confirmPassword'].map((name) => {
            const isPassword = name === 'password';
            const value = formData[name as keyof typeof formData];
            const show = isPassword ? showPassword : showConfirmPassword;
            const setShow = isPassword ? setShowPassword : setShowConfirmPassword;

            return (
              <div key={name} className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  id={name}
                  name={name}
                  value={value}
                  onChange={handleChange}
                  placeholder=" "
                  required
                  className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <label
                  htmlFor={name}
                  className={`absolute left-4 top-2 text-gray-400 text-sm transition-all
                    peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:-translate-y-1/2
                    peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1
                    ${value ? 'top-2 text-xs -translate-y-1' : ''}`}
                >
                  {isPassword ? 'Password' : 'Confirm Password'}
                </label>
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  {show ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                </button>
              </div>
            );
          })}

          {/* Password Strength */}
          {formData.password && (
            <div className="text-xs text-gray-400">
              <span className={`font-medium ${passwordStrength <= 1 ? 'text-red-500' : passwordStrength <= 3 ? 'text-yellow-500' : 'text-green-500'}`}>
                {getStrengthText()}:
              </span> {getStrengthDescription()}
            </div>
          )}

          {/* Terms */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="w-4 h-4 rounded border-primary-500 text-primary-500 focus:ring-2 focus:ring-primary-500"
            />
            I agree to the{' '}
            <Link href="/terms" className="text-primary-500 hover:underline">Terms</Link> and{' '}
            <Link href="/privacy" className="text-primary-500 hover:underline">Privacy Policy</Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl hover:opacity-90 transition-all duration-300 font-semibold"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center text-sm text-gray-400">
          Already have an account?{" "}
          <Link href="/login" className="text-primary-500 hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}