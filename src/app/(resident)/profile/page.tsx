'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import Button from '@/app/components/ui/Button';
import { supabase } from '@/app/lib/supabase';
import { Calendar, Shield, Camera, Save, Key, Loader2, Check } from 'lucide-react';

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

/* ─── Variants ───────────────────────────────────────────────── */
const EASE = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 20 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: EASE },
});

const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.06 } },
};

const staggerItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE } },
};

const statVariants: Variants = {
  initial: { opacity: 0, scale: 0.85 },
  animate: { opacity: 1, scale: 1,    transition: { type: 'spring', stiffness: 300 } },
};

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing,          setIsEditing]          = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [loading,            setLoading]            = useState(true);
  const [saving,             setSaving]             = useState(false);
  const [justSaved,          setJustSaved]          = useState(false);
  const [memberSince,        setMemberSince]        = useState('');
  const [userId,             setUserId]             = useState('');

  const emptyProfile: ProfileData = {
    firstName: '', lastName: '', email: '', phone: '',
    address: '', birthday: '', civilStatus: '', username: '', avatarBase64: '',
  };
  const [profileData,   setProfileData]   = useState<ProfileData>(emptyProfile);
  const [originalData,  setOriginalData]  = useState<ProfileData>(emptyProfile);
  const [passwordData,  setPasswordData]  = useState({ newPassword: '', confirmPassword: '' });
  const [stats,         setStats]         = useState<Stats>({ total: 0, approved: 0, pending: 0, thisMonth: 0 });


  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error('Not authenticated');

        setUserId(user.id);
        setMemberSince(new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));

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

        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { data: requests } = await supabase
          .from('requests').select('status, created_at').eq('user_id', user.id);
        if (requests) {
          setStats({
            total:     requests.length,
            approved:  requests.filter(r => r.status === 'approved').length,
            pending:   requests.filter(r => r.status === 'pending').length,
            thisMonth: requests.filter(r => r.created_at >= firstOfMonth).length,
          });
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be smaller than 2 MB.'); return; }
    try {
      const base64 = await fileToBase64(file);
      setProfileData(prev => ({ ...prev, avatarBase64: base64 }));
      const { error } = await supabase.from('profiles').update({ avatar_base64: base64 }).eq('id', userId);
      if (error) throw error;
      toast.success('Profile picture updated!');
    } catch { toast.error('Failed to update profile picture.'); }
  };

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
      setJustSaved(true);
      toast.success('Profile updated successfully!');
      setTimeout(() => setJustSaved(false), 2000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) { toast.error('Passwords do not match.'); return; }
    if (passwordData.newPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;
      setShowPasswordChange(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
      toast.success('Password changed successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#171717]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 text-[#0d74ce]" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8 bg-gray-50 dark:bg-[#171717] text-black dark:text-white">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div {...fadeUp(0)} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Profile Settings</h1>
          <p className="text-gray-700 dark:text-[#b0b4ba]">Manage your account information and settings</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left sidebar */}
          <motion.div {...fadeUp(0.1)} className="lg:col-span-1">
            <Card className="bg-white dark:bg-[#1a1a1a] border border-[#e0e1e6] dark:border-white/10">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="relative inline-block">

                    {/* Avatar */}
                    <motion.div
                      whileHover={{ scale: 1.04 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      {profileData.avatarBase64 ? (
                        <motion.img
                          key={profileData.avatarBase64.slice(-20)}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                          src={profileData.avatarBase64}
                          alt="Profile"
                          className="w-32 h-32 rounded-full object-cover border-4 border-[#e0e1e6] dark:border-white/10"
                        />
                      ) : (
                        <div className="w-32 h-32 bg-[#E8500A] rounded-full flex items-center justify-center text-white text-4xl font-bold">
                          {getInitials(profileData.firstName, profileData.lastName)}
                        </div>
                      )}
                    </motion.div>

                    {/* Camera button */}
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-10 h-10 bg-[#0d74ce] rounded-full flex items-center justify-center text-white hover:opacity-80 transition-colors"
                    >
                      <Camera className="w-5 h-5" />
                    </motion.button>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="text-xl font-bold mt-4">{profileData.firstName} {profileData.lastName}</h2>
                    <p className="text-sm text-gray-700 dark:text-[#b0b4ba]">{profileData.email}</p>
                    {profileData.username && (
                      <p className="text-xs text-gray-500 mt-1">@{profileData.username}</p>
                    )}
                  </motion.div>
                </div>

                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="space-y-3 pt-4 border-t border-[#e0e1e6] dark:border-white/10"
                >
                  <motion.div variants={staggerItem} className="flex items-center gap-3 text-sm">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span className="text-gray-700 dark:text-[#b0b4ba]">Account Verified</span>
                  </motion.div>
                  {memberSince && (
                    <motion.div variants={staggerItem} className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-[#0d74ce] dark:text-white" />
                      <span className="text-gray-700 dark:text-[#b0b4ba]">Member since {memberSince}</span>
                    </motion.div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="mt-6"
                >
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      variant="outline"
                      className="w-full gap-2 border-[#e0e1e6] text-[#1c2024] hover:bg-[#f0f0f3] transition-colors"
                      onClick={() => setShowPasswordChange(p => !p)}
                    >
                      <Key className="w-4 h-4" />Change Password
                    </Button>
                  </motion.div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Right forms */}
          <motion.div {...fadeUp(0.15)} className="lg:col-span-2 space-y-6">

            {/* Personal info card */}
            <Card className="bg-white dark:bg-[#1a1a1a] border border-[#e0e1e6] dark:border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Personal Information</CardTitle>

                  <AnimatePresence mode="wait">
                    {!isEditing ? (
                      <motion.button
                        key="edit"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{    opacity: 0, scale: 0.9 }}
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        className="bg-[#E8500A] hover:opacity-90 text-white px-4 py-2 rounded-[9999px] font-semibold transition"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit Profile
                      </motion.button>
                    ) : (
                      <motion.div
                        key="actions"
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{    opacity: 0, x: 8 }}
                        className="flex gap-2"
                      >
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="bg-transparent border border-gray-400 dark:border-gray-600 text-black dark:text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                          onClick={() => { setProfileData(originalData); setIsEditing(false); }}
                        >
                          Cancel
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.03, y: -1 }}
                          whileTap={{ scale: 0.97 }}
                          className="bg-[#E8500A] hover:opacity-90 text-white px-4 py-2 rounded-[9999px] font-semibold flex items-center gap-2 transition"
                          onClick={handleSaveProfile}
                          disabled={saving}
                        >
                          {saving ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}>
                              <Loader2 className="w-4 h-4" />
                            </motion.div>
                          ) : justSaved ? (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400 }}>
                              <Check className="w-4 h-4" />
                            </motion.div>
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          {justSaved ? 'Saved!' : 'Save Changes'}
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </CardHeader>
              <CardContent>
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="space-y-4"
                >
                  <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="First Name"  name="firstName" value={profileData.firstName} onChange={e => setProfileData(p => ({ ...p, firstName: e.target.value }))} disabled={!isEditing} />
                    <Input label="Last Name"   name="lastName"  value={profileData.lastName}  onChange={e => setProfileData(p => ({ ...p, lastName:  e.target.value }))} disabled={!isEditing} />
                  </motion.div>
                  <motion.div variants={staggerItem}>
                    <Input label="Username" name="username" value={profileData.username} onChange={e => setProfileData(p => ({ ...p, username: e.target.value }))} disabled={!isEditing} />
                  </motion.div>
                  <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Email Address" name="email" type="email" value={profileData.email} onChange={() => {}} disabled />
                    <Input label="Phone Number"  name="phone" type="tel"   value={profileData.phone}  onChange={e => setProfileData(p => ({ ...p, phone: e.target.value }))} disabled={!isEditing} />
                  </motion.div>
                  <motion.div variants={staggerItem}>
                    <Input label="Complete Address" name="address" value={profileData.address} onChange={e => setProfileData(p => ({ ...p, address: e.target.value }))} disabled={!isEditing} />
                  </motion.div>
                  <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input label="Birthday"     name="birthday"     type="date" value={profileData.birthday}    onChange={e => setProfileData(p => ({ ...p, birthday:    e.target.value }))} disabled={!isEditing} />
                    <Input label="Civil Status" name="civilStatus"              value={profileData.civilStatus}  onChange={e => setProfileData(p => ({ ...p, civilStatus: e.target.value }))} disabled={!isEditing} />
                  </motion.div>
                </motion.div>
              </CardContent>
            </Card>

            {/* Password change */}
            <AnimatePresence>
              {showPasswordChange && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{    opacity: 0, height: 0,      y: -10 }}
                  transition={{ duration: 0.3, ease: EASE }}
                  style={{ overflow: 'hidden' }}
                >
                  <Card className="bg-white dark:bg-[#1a1a1a] border border-[#e0e1e6] dark:border-white/10">
                    <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Input label="New Password"     name="newPassword"     type="password" value={passwordData.newPassword}     onChange={e => setPasswordData(p => ({ ...p, newPassword:     e.target.value }))} placeholder="Enter new password" />
                        <Input label="Confirm Password" name="confirmPassword" type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))} placeholder="Confirm new password" />
                        <p className="text-xs text-[#b0b4ba]">You are already authenticated — Supabase will verify the session.</p>
                        <div className="flex gap-2 pt-2">
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="flex-1">
                            <Button variant="outline" className="w-full" onClick={() => setShowPasswordChange(false)}>Cancel</Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="flex-1">
                            <Button className="w-full" onClick={handleChangePassword} disabled={saving}>
                              {saving && (
                                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }} className="mr-2">
                                  <Loader2 className="w-4 h-4" />
                                </motion.div>
                              )}
                              Update Password
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats */}
            <motion.div {...fadeUp(0.25)}>
              <Card className="bg-white dark:bg-[#1a1a1a] border border-[#e0e1e6] dark:border-white/10">
                <CardHeader><CardTitle>Account Statistics</CardTitle></CardHeader>
                <CardContent>
                  <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                  >
                    {[
                      { value: stats.total,     label: 'Total Requests', color: 'text-[#0d74ce]'   },
                      { value: stats.approved,  label: 'Approved',       color: 'text-green-500'  },
                      { value: stats.pending,   label: 'Pending',        color: 'text-[#ab6400]' },
                      { value: stats.thisMonth, label: 'This Month',     color: 'text-[#8145b5]' },
                    ].map(s => (
                      <motion.div
                        key={s.label}
                        variants={statVariants}
                        whileHover={{ y: -3, transition: { duration: 0.15 } }}
                        className="text-center p-4 bg-[#f0f0f3] dark:bg-white/5 rounded-lg cursor-default"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300, delay: 0.3 }}
                          className={`text-2xl font-bold ${s.color}`}
                        >
                          {s.value}
                        </motion.div>
                        <div className="text-sm text-gray-700 dark:text-[#b0b4ba]">{s.label}</div>
                      </motion.div>
                    ))}
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}