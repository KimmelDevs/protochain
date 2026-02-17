'use client';

import Image from "next/image";
import Link from "next/link";
import { useState, useRef } from "react";
import { EyeIcon, EyeSlashIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { useAuthActions } from '@/app/lib/hooks/useAuth';

export default function SignUpPage() {
  const { register } = useAuthActions();
  const dateRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    birthday: '',
    civilStatus: '',
    address: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTips, setShowTips] = useState(false);

  /* ---------------- PHONE LOGIC ---------------- */
  const formatPhone = (digits: string) => {
    const part1 = digits.slice(0, 3);
    const part2 = digits.slice(3, 6);
    const part3 = digits.slice(6, 10);
    let formatted = '';
    if (digits.length > 0) formatted += part1;
    if (digits.length > 3) formatted += ' ' + part2;
    if (digits.length > 6) formatted += ' ' + part3;
    return formatted;
  };

  const handlePhoneFocus = () => {
    if (!formData.phone) {
      setFormData(prev => ({ ...prev, phone: '9' }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '');
    if (digits.length > 0 && digits[0] !== '9') return;
    digits = digits.slice(0, 10);
    setFormData(prev => ({ ...prev, phone: digits }));

    // Clear phone error when typing
    if (fieldErrors.phone) {
      setFieldErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const formattedPhone = formData.phone ? formatPhone(formData.phone) : '';

  /* ------------------------------------------------ */

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const getStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1: return { text: "Weak", color: "bg-red-500" };
      case 2: return { text: "Fair", color: "bg-orange-500" };
      case 3: return { text: "Good", color: "bg-yellow-500" };
      case 4: return { text: "Strong", color: "bg-green-500" };
      case 5: return { text: "Very Strong", color: "bg-emerald-600" };
      default: return { text: "", color: "bg-gray-500" };
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
    setGlobalError('');

    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
      // Live check confirm password match
      if (formData.confirmPassword && value !== formData.confirmPassword) {
        setFieldErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      } else {
        setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
      }
    }

    if (name === 'confirmPassword') {
      if (value !== formData.password) {
        setFieldErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      } else {
        setFieldErrors(prev => ({ ...prev, confirmPassword: '' }));
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) errors.email = 'Email is required';
    if (!formData.username.trim()) errors.username = 'Username is required';
    if (!formData.birthday) errors.birthday = 'Birthday is required';
    if (!formData.civilStatus) errors.civilStatus = 'Civil status is required';
    if (!formData.address.trim()) errors.address = 'Address is required';

    if (formData.phone.length < 10) {
      errors.phone = 'Please enter a valid 10-digit phone number';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');

    if (!validateForm()) return;

    setLoading(true);

    const result = await register(
      formData.email,
      formData.password,
      {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: `+63${formData.phone}`,
        address: formData.address,
        role: 'resident',
      }
    );

    if (!result.success) {
      setGlobalError(result.error || 'Registration failed. Please try again.');
      setLoading(false);
    }
  };

  const strength = getStrengthText();

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 pt-20 pb-8">
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

      <div className="backdrop-blur-md shadow-xl rounded-2xl w-full max-w-md p-8 space-y-6 border border-white/20 bg-white/5">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Create Account</h2>
          <p className="text-gray-400 text-sm">Join our secure community</p>
        </div>

        {/* Global Error */}
        {globalError && (
          <div className="p-3 bg-red-500/10 border border-red-500 rounded text-red-500 text-sm">
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name Row */}
          <div className="grid grid-cols-2 gap-3">
            <FloatingInput
              label="First Name"
              name="firstName"
              value={formData.firstName}
              handleChange={handleChange}
              error={fieldErrors.firstName}
            />
            <FloatingInput
              label="Last Name"
              name="lastName"
              value={formData.lastName}
              handleChange={handleChange}
              error={fieldErrors.lastName}
            />
          </div>

          <FloatingInput
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            handleChange={handleChange}
            error={fieldErrors.email}
          />

          <FloatingInput
            label="Username"
            name="username"
            value={formData.username}
            handleChange={handleChange}
            error={fieldErrors.username}
          />

          {/* Birthday */}
          <div>
            <div className="relative">
              <input
                ref={dateRef}
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
                onClick={() => dateRef.current?.showPicker()}
                className={`w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border text-white focus:outline-none focus:ring-2 focus:ring-primary-500 [&::-webkit-calendar-picker-indicator]:invert
                  ${fieldErrors.birthday ? 'border-red-500' : 'border-white/20'}`}
              />
              <label className="absolute left-4 top-2 text-xs text-gray-400 pointer-events-none">
                Birthday
              </label>
            </div>
            {fieldErrors.birthday && (
              <p className="text-red-400 text-xs mt-1 ml-1">{fieldErrors.birthday}</p>
            )}
          </div>

          {/* Civil Status */}
          <div>
            <div className="relative">
              <select
                name="civilStatus"
                value={formData.civilStatus}
                onChange={handleChange}
                className={`peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border text-white focus:outline-none focus:ring-2 focus:ring-primary-500
                  ${fieldErrors.civilStatus ? 'border-red-500' : 'border-white/20'}`}
              >
                <option value="" disabled hidden></option>
                <option value="Single" className="text-black">Single</option>
                <option value="Married" className="text-black">Married</option>
                <option value="Widowed" className="text-black">Widowed</option>
                <option value="Separated" className="text-black">Separated</option>
              </select>
              <label
                className={`absolute left-4 text-gray-400 text-sm transition-all pointer-events-none
                ${formData.civilStatus ? 'top-2 text-xs -translate-y-1' : 'top-1/2 -translate-y-1/2 text-base'}
                peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1`}
              >
                Civil Status
              </label>
            </div>
            {fieldErrors.civilStatus && (
              <p className="text-red-400 text-xs mt-1 ml-1">{fieldErrors.civilStatus}</p>
            )}
          </div>

          <FloatingInput
            label="Address"
            name="address"
            value={formData.address}
            handleChange={handleChange}
            error={fieldErrors.address}
          />

          {/* Phone */}
          <div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                +63
              </span>
              <input
                type="tel"
                value={formattedPhone}
                onChange={handlePhoneChange}
                onFocus={handlePhoneFocus}
                placeholder=" "
                className={`peer w-full pl-16 pr-4 pt-6 pb-2 rounded-lg bg-white/10 border text-white focus:outline-none focus:ring-2 focus:ring-primary-500
                  ${fieldErrors.phone ? 'border-red-500' : 'border-white/20'}`}
              />
              <label
                className={`absolute left-16 text-gray-400 text-sm transition-all pointer-events-none
                ${formData.phone ? 'top-2 text-xs -translate-y-1' : 'top-1/2 -translate-y-1/2 text-base'}
                peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1`}
              >
                Phone Number
              </label>
            </div>
            {fieldErrors.phone && (
              <p className="text-red-400 text-xs mt-1 ml-1">{fieldErrors.phone}</p>
            )}
          </div>

          {/* Password Tips */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setShowTips(prev => !prev)}
          >
            <div className="w-6 h-6 bg-gray-500/30 rounded-full flex items-center justify-center">
              <QuestionMarkCircleIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs text-gray-400 hover:text-white transition-colors">
              Click here for tips on creating a strong password
            </span>
          </div>

          {showTips && (
            <div className="bg-white/10 border border-white/20 rounded-lg p-3 text-xs text-gray-300">
              <ul className="list-disc list-inside space-y-1">
                <li>Include uppercase and lowercase letters</li>
                <li>Add at least one number (0-9)</li>
                <li>Include a special character (!@#$%^&*)</li>
              </ul>
            </div>
          )}

          {/* Password */}
          <div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder=" "
                className={`peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border text-white focus:outline-none focus:ring-2 focus:ring-primary-500
                  ${fieldErrors.password ? 'border-red-500' : 'border-white/20'}`}
              />
              <label
                className={`absolute left-4 text-gray-400 text-sm transition-all pointer-events-none
                ${formData.password ? 'top-2 text-xs -translate-y-1' : 'top-1/2 -translate-y-1/2 text-base'}
                peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1`}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPassword ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-red-400 text-xs mt-1 ml-1">{fieldErrors.password}</p>
            )}
            {/* Password Strength */}
            {formData.password && !fieldErrors.password && (
              <div className="mt-2 space-y-1">
                <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${(passwordStrength / 5) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-300">
                  Strength: <span className="font-semibold">{strength.text}</span>
                </p>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder=" "
                className={`peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border text-white focus:outline-none focus:ring-2 focus:ring-primary-500
                  ${fieldErrors.confirmPassword ? 'border-red-500' : 'border-white/20'}`}
              />
              <label
                className={`absolute left-4 text-gray-400 text-sm transition-all pointer-events-none
                ${formData.confirmPassword ? 'top-2 text-xs -translate-y-1' : 'top-1/2 -translate-y-1/2 text-base'}
                peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1`}
              >
                Confirm Password
              </label>
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showConfirmPassword ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1 ml-1">{fieldErrors.confirmPassword}</p>
            )}
            {/* Show match checkmark */}
            {formData.confirmPassword && !fieldErrors.confirmPassword && (
              <p className="text-green-400 text-xs mt-1 ml-1">✓ Passwords match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

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

/* Floating Input Component - Updated with error support */
function FloatingInput({ label, name, value, handleChange, type = "text", error }: {
  label: string;
  name: string;
  value: string;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  error?: string;
}) {
  return (
    <div>
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value}
          onChange={handleChange}
          placeholder=" "
          className={`peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border text-white focus:outline-none focus:ring-2 focus:ring-primary-500
            ${error ? 'border-red-500' : 'border-white/20'}`}
        />
        <label
          className={`absolute left-4 text-gray-400 text-sm transition-all pointer-events-none
          ${value ? 'top-2 text-xs -translate-y-1' : 'top-1/2 -translate-y-1/2 text-base'}
          peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1`}
        >
          {label}
        </label>
      </div>
      {error && (
        <p className="text-red-400 text-xs mt-1 ml-1">{error}</p>
      )}
    </div>
  );
}