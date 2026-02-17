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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
    setError('');
    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

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
      setError(result.error || 'Registration failed. Please try again.');
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

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500 rounded text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <FloatingInput label="First Name" name="firstName" value={formData.firstName} handleChange={handleChange} />
            <FloatingInput label="Last Name" name="lastName" value={formData.lastName} handleChange={handleChange} />
          </div>

          <FloatingInput label="Email" name="email" type="email" value={formData.email} handleChange={handleChange} />
          <FloatingInput label="Username" name="username" value={formData.username} handleChange={handleChange} />

          {/* Birthday */}
          <div className="relative">
            <input
              ref={dateRef}
              type="date"
              name="birthday"
              value={formData.birthday}
              onChange={handleChange}
              required
              onClick={() => dateRef.current?.showPicker()}
              className="w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-primary-500 [&::-webkit-calendar-picker-indicator]:invert"
            />
            <label className="absolute left-4 top-2 text-xs text-gray-400 pointer-events-none">
              Birthday
            </label>
          </div>

          {/* Civil Status */}
          <div className="relative">
            <select
              name="civilStatus"
              value={formData.civilStatus}
              onChange={handleChange}
              required
              className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
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

          <FloatingInput label="Address" name="address" value={formData.address} handleChange={handleChange} />

          {/* Phone */}
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
              className="peer w-full pl-16 pr-4 pt-6 pb-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <label
              className={`absolute left-16 text-gray-400 text-sm transition-all pointer-events-none
              ${formData.phone ? 'top-2 text-xs -translate-y-1' : 'top-1/2 -translate-y-1/2 text-base'}
              peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1`}
            >
              Phone Number
            </label>
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

          {/* Passwords */}
          {['password', 'confirmPassword'].map((name) => {
            const isPassword = name === 'password';
            const value = formData[name as keyof typeof formData];
            const show = isPassword ? showPassword : showConfirmPassword;
            const setShow = isPassword ? setShowPassword : setShowConfirmPassword;

            return (
              <div key={name} className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  name={name}
                  value={value}
                  onChange={handleChange}
                  required
                  placeholder=" "
                  className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <label
                  className={`absolute left-4 text-gray-400 text-sm transition-all pointer-events-none
                  ${value ? 'top-2 text-xs -translate-y-1' : 'top-1/2 -translate-y-1/2 text-base'}
                  peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1`}
                >
                  {isPassword ? 'Password' : 'Confirm Password'}
                </label>

                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {show ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
                </button>

                {/* Password Strength */}
                {isPassword && formData.password && (
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
            );
          })}

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

/* Floating Input Component */
function FloatingInput({ label, name, value, handleChange, type = "text" }: any) {
  return (
    <div className="relative">
      <input
        type={type}
        name={name}
        value={value}
        onChange={handleChange}
        placeholder=" "
        required
        className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <label
        className={`absolute left-4 text-gray-400 text-sm transition-all pointer-events-none
        ${value ? 'top-2 text-xs -translate-y-1' : 'top-1/2 -translate-y-1/2 text-base'}
        peer-focus:top-2 peer-focus:text-xs peer-focus:-translate-y-1`}
      >
        {label}
      </label>
    </div>
  );
}