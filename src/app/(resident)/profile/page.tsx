'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import Button from '@/app/components/ui/Button';
import Alert from '@/app/components/ui/Alert';
import { supabase } from '@/app/lib/supabase';
import {
  Mail,
  Calendar,
  Shield,
  Camera,
  Save,
  Key,
  Loader2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  birthday: string;
  civilStatus: string;
  username: string;
  avatarBase64: string; // base64-encoded image (data URL)
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface Stats {
  total: number;
  approved: number;
  pending: number;
  thisMonth: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const getInitials = (first: string, last: string) =>
  `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';

// ─── Component ───────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [memberSince, setMemberSince] = useState('');

  const [profileData, setProfileData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    birthday: '',
    civilStatus: '',
    username: '',
    avatarBase64: '',
  });

  const [originalData, setOriginalData] = useState<ProfileData>(profileData);

  const [passwordData, setPasswordData] = useState<PasswordData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [stats, setStats] = useState<Stats>({
    total: 0,
    approved: 0,
    pending: 0,
    thisMonth: 0,
  });

  // ── Fetch profile on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw userError ?? new Error('Not authenticated');

        // Set member since date
        setMemberSince(
          new Date(user.created_at).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          })
        );

        // Fetch profile row
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        const loaded: ProfileData = {
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
          email: profile.email ?? user.email ?? '',
          phone: profile.phone ?? '',
          address: profile.address ?? '',
          birthday: profile.birthday ?? '',
          civilStatus: profile.civilStatus ?? '',
          username: profile.username ?? '',
          avatarBase64: profile.avatar_base64 ?? '',
        };
        setProfileData(loaded);
        setOriginalData(loaded);

        // Fetch request stats
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { data: requests } = await supabase
          .from('requests')
          .select('status, created_at')
          .eq('user_id', user.id);

        if (requests) {
          setStats({
            total: requests.length,
            approved: requests.filter(r => r.status === 'approved').length,
            pending: requests.filter(r => r.status === 'pending').length,
            thisMonth: requests.filter(r => r.created_at >= firstOfMonth).length,
          });
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
        setErrorMessage('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 4000);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // Avatar: convert picked file → base64 and save immediately
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showError('Image must be smaller than 2 MB.');
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      setProfileData(prev => ({ ...prev, avatarBase64: base64 }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_base64: base64 })
        .eq('id', user.id);

      if (error) throw error;
      showSuccess('Profile picture updated!');
    } catch (err) {
      console.error(err);
      showError('Failed to update profile picture.');
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError ?? new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          phone: profileData.phone,
          address: profileData.address,
          birthday: profileData.birthday || null,
          civilStatus: profileData.civilStatus,
          username: profileData.username,
        })
        .eq('id', user.id);

      if (error) throw error;

      setOriginalData(profileData);
      setIsEditing(false);
      showSuccess('Profile updated successfully!');
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to save profile.';
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileData(originalData);
    setIsEditing(false);
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showError('New passwords do not match.');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      showError('Password must be at least 8 characters.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });
      if (error) throw error;

      setShowPasswordChange(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSuccess('Password changed successfully!');
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to change password.';
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Hidden file input for avatar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarChange}
      />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-gray-400">Manage your account information and settings</p>
        </motion.div>

        {/* Alerts */}
        {successMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Alert variant="success" onClose={() => setSuccessMessage('')}>{successMessage}</Alert>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Alert variant="error" onClose={() => setErrorMessage('')}>{errorMessage}</Alert>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left: Avatar & Quick Info ───────────────────────────────── */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                {/* Avatar */}
                <div className="text-center mb-6">
                  <div className="relative inline-block">
                    {profileData.avatarBase64 ? (
                      <img
                        src={profileData.avatarBase64}
                        alt="Profile"
                        className="w-32 h-32 rounded-full object-cover border-4 border-white/10"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                        {getInitials(profileData.firstName, profileData.lastName)}
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors"
                      title="Change photo (max 2 MB)"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-4">
                    {profileData.firstName} {profileData.lastName}
                  </h2>
                  <p className="text-sm text-gray-400">{profileData.email}</p>
                  {profileData.username && (
                    <p className="text-xs text-gray-500 mt-1">@{profileData.username}</p>
                  )}
                </div>

                {/* Account Info */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-3 text-sm">
                    <Shield className="w-4 h-4 text-green-400" />
                    <span className="text-gray-400">Account Verified</span>
                  </div>
                  {memberSince && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-400">Member since {memberSince}</span>
                    </div>
                  )}
                </div>

                {/* Change Password */}
                <div className="mt-6">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setShowPasswordChange(prev => !prev)}
                  >
                    <Key className="w-4 h-4" />
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Right: Forms ────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Personal Information</CardTitle>
                  {!isEditing ? (
                    <Button size="sm" onClick={() => setIsEditing(true)}>Edit Profile</Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                      <Button size="sm" onClick={handleSaveProfile} className="gap-2" disabled={saving}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Name */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="First Name" name="firstName" value={profileData.firstName} onChange={handleProfileChange} disabled={!isEditing} />
                    <Input label="Last Name" name="lastName" value={profileData.lastName} onChange={handleProfileChange} disabled={!isEditing} />
                  </div>

                  {/* Username */}
                  <Input label="Username" name="username" value={profileData.username} onChange={handleProfileChange} disabled={!isEditing} />

                  {/* Contact */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Email Address" name="email" type="email" value={profileData.email} onChange={handleProfileChange} disabled /* email managed by Supabase Auth */ />
                    <Input label="Phone Number" name="phone" type="tel" value={profileData.phone} onChange={handleProfileChange} disabled={!isEditing} />
                  </div>

                  {/* Address */}
                  <Input label="Complete Address" name="address" value={profileData.address} onChange={handleProfileChange} disabled={!isEditing} />

                  {/* Additional */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Birthday" name="birthday" type="date" value={profileData.birthday} onChange={handleProfileChange} disabled={!isEditing} />
                    <Input label="Civil Status" name="civilStatus" value={profileData.civilStatus} onChange={handleProfileChange} disabled={!isEditing} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Change Password Section */}
            {showPasswordChange && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Input label="New Password" name="newPassword" type="password" value={passwordData.newPassword} onChange={handlePasswordChange} placeholder="Enter new password" />
                      <Input label="Confirm New Password" name="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={handlePasswordChange} placeholder="Confirm new password" />
                      <p className="text-xs text-gray-400">
                        Note: You are already authenticated — no need to enter your current password. Supabase will verify the session.
                      </p>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => setShowPasswordChange(false)}>Cancel</Button>
                        <Button className="flex-1" onClick={handleChangePassword} disabled={saving}>
                          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                          Update Password
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Account Statistics */}
            <Card>
              <CardHeader><CardTitle>Account Statistics</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatBox value={stats.total} label="Total Requests" color="text-blue-400" />
                  <StatBox value={stats.approved} label="Approved" color="text-green-400" />
                  <StatBox value={stats.pending} label="Pending" color="text-yellow-400" />
                  <StatBox value={stats.thisMonth} label="This Month" color="text-purple-400" />
                </div>
              </CardContent>
            </Card>

            {/* Privacy & Security */}
            <Card>
              <CardHeader><CardTitle>Privacy & Security</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-400" />
                      <div>
                        <p className="text-white font-medium">Email Notifications</p>
                        <p className="text-sm text-gray-400">Receive updates via email</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-white font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-gray-400">Add extra security to your account</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">Enable</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small helper component ───────────────────────────────────────────────────
function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="text-center p-4 bg-white/5 rounded-lg">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}