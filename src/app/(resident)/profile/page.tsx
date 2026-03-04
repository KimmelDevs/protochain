'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import Button from '@/app/components/ui/Button';
import Alert from '@/app/components/ui/Alert';
import { supabase } from '@/app/lib/supabase';
import { Mail, Calendar, Shield, Camera, Save, Key, Loader2 } from 'lucide-react';

interface ProfileData {
  firstName: string; lastName: string; email: string;
  phone: string; address: string; birthday: string;
  civilStatus: string; username: string; avatarBase64: string;
}
interface Stats { total: number; approved: number; pending: number; thisMonth: number; }

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

const getInitials = (f: string, l: string) =>
  `${f?.[0] ?? ''}${l?.[0] ?? ''}`.toUpperCase() || '?';

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [memberSince, setMemberSince] = useState('');
  const [userId, setUserId] = useState('');

  const emptyProfile: ProfileData = {
    firstName: '', lastName: '', email: '', phone: '',
    address: '', birthday: '', civilStatus: '', username: '', avatarBase64: '',
  };
  const [profileData, setProfileData] = useState<ProfileData>(emptyProfile);
  const [originalData, setOriginalData] = useState<ProfileData>(emptyProfile);
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [stats, setStats] = useState<Stats>({ total: 0, approved: 0, pending: 0, thisMonth: 0 });

  const showSuccess = (msg: string) => { setSuccessMessage(msg); setTimeout(() => setSuccessMessage(''), 3500); };
  const showError   = (msg: string) => { setErrorMessage(msg);   setTimeout(() => setErrorMessage(''), 4000); };

  // ── Load profile via API route (decrypts PII server-side) ─────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Not authenticated');

        setUserId(user.id);
        setMemberSince(new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));

        // Fetch profile via server route so PII is decrypted server-side
        const res = await fetch(`/api/profile?id=${user.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        const p = json.data;
        const loaded: ProfileData = {
          firstName:    p.firstName    ?? '',
          lastName:     p.lastName     ?? '',
          email:        p.email        ?? user.email ?? '',
          phone:        p.phone        ?? '',
          address:      p.address      ?? '',
          birthday:     p.birthday     ?? '',
          civilStatus:  p.civilStatus  ?? '',
          username:     p.username     ?? '',
          avatarBase64: p.avatar_base64 ?? '',
        };
        setProfileData(loaded);
        setOriginalData(loaded);

        // Request stats — no PII, safe to fetch directly
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { data: requests } = await supabase
          .from('requests').select('status, created_at').eq('user_id', user.id);
        if (requests) {
          setStats({
            total: requests.length,
            approved: requests.filter(r => r.status === 'approved').length,
            pending:  requests.filter(r => r.status === 'pending').length,
            thisMonth: requests.filter(r => r.created_at >= firstOfMonth).length,
          });
        }
      } catch (err) {
        console.error(err);
        showError('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Avatar — not PII, safe to save directly ───────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showError('Image must be smaller than 2 MB.'); return; }
    try {
      const base64 = await fileToBase64(file);
      setProfileData(prev => ({ ...prev, avatarBase64: base64 }));
      const { error } = await supabase.from('profiles').update({ avatar_base64: base64 }).eq('id', userId);
      if (error) throw error;
      showSuccess('Profile picture updated!');
    } catch { showError('Failed to update profile picture.'); }
  };

  // ── Save profile via API route (encrypts PII server-side) ─────────────────
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/profile?id=${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName:   profileData.firstName,
          lastName:    profileData.lastName,
          phone:       profileData.phone,
          address:     profileData.address,
          birthday:    profileData.birthday || null,
          civilStatus: profileData.civilStatus,
          username:    profileData.username,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setOriginalData(profileData);
      setIsEditing(false);
      showSuccess('Profile updated successfully!');
    } catch (err: any) {
      showError(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  // ── Password — Supabase Auth handles this, no PII involved ────────────────
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) { showError('Passwords do not match.'); return; }
    if (passwordData.newPassword.length < 8) { showError('Password must be at least 8 characters.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;
      setShowPasswordChange(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      showSuccess('Password changed successfully!');
    } catch (err: any) {
      showError(err.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-400 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

      <div className="max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Profile Settings</h1>
          <p className="text-gray-400">Manage your account information and settings</p>
        </motion.div>

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
          {/* Left sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="relative inline-block">
                    {profileData.avatarBase64 ? (
                      <img src={profileData.avatarBase64} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-white/10" />
                    ) : (
                      <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                        {getInitials(profileData.firstName, profileData.lastName)}
                      </div>
                    )}
                    <button onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors">
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-4">{profileData.firstName} {profileData.lastName}</h2>
                  <p className="text-sm text-gray-400">{profileData.email}</p>
                  {profileData.username && <p className="text-xs text-gray-500 mt-1">@{profileData.username}</p>}
                </div>

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

                <div className="mt-6">
                  <Button variant="outline" className="w-full gap-2" onClick={() => setShowPasswordChange(p => !p)}>
                    <Key className="w-4 h-4" />Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right forms */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Personal Information</CardTitle>
                  {!isEditing ? (
                    <Button size="sm" onClick={() => setIsEditing(true)}>Edit Profile</Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setProfileData(originalData); setIsEditing(false); }}>Cancel</Button>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="First Name" name="firstName" value={profileData.firstName} onChange={e => setProfileData(p => ({ ...p, firstName: e.target.value }))} disabled={!isEditing} />
                    <Input label="Last Name" name="lastName" value={profileData.lastName} onChange={e => setProfileData(p => ({ ...p, lastName: e.target.value }))} disabled={!isEditing} />
                  </div>
                  <Input label="Username" name="username" value={profileData.username} onChange={e => setProfileData(p => ({ ...p, username: e.target.value }))} disabled={!isEditing} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Email Address" name="email" type="email" value={profileData.email} onChange={() => {}} disabled />
                    <Input label="Phone Number" name="phone" type="tel" value={profileData.phone} onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))} disabled={!isEditing} />
                  </div>
                  <Input label="Complete Address" name="address" value={profileData.address} onChange={e => setProfileData(p => ({ ...p, address: e.target.value }))} disabled={!isEditing} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Birthday" name="birthday" type="date" value={profileData.birthday} onChange={e => setProfileData(p => ({ ...p, birthday: e.target.value }))} disabled={!isEditing} />
                    <Input label="Civil Status" name="civilStatus" value={profileData.civilStatus} onChange={e => setProfileData(p => ({ ...p, civilStatus: e.target.value }))} disabled={!isEditing} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {showPasswordChange && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Input label="New Password" name="newPassword" type="password" value={passwordData.newPassword} onChange={e => setPasswordData(p => ({ ...p, newPassword: e.target.value }))} placeholder="Enter new password" />
                      <Input label="Confirm New Password" name="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="Confirm new password" />
                      <p className="text-xs text-gray-400">You are already authenticated — Supabase will verify the session.</p>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => setShowPasswordChange(false)}>Cancel</Button>
                        <Button className="flex-1" onClick={handleChangePassword} disabled={saving}>
                          {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}Update Password
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

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

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="text-center p-4 bg-white/5 rounded-lg">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  );
}