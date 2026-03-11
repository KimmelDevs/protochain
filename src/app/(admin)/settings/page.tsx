'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import TextArea from '@/app/components/ui/TextArea';
import Button from '@/app/components/ui/Button';
import Alert from '@/app/components/ui/Alert';
import Tabs from '@/app/components/ui/Tabs';
import {
  Settings as SettingsIcon,
  Building2,
  Bell,
  Shield,
  Mail,
  Save,
  Upload,
  Key,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface BarangayInfo {
  name: string;
  municipality: string;
  province: string;
  captain: string;
  email: string;
  phone: string;
  address: string;
  logo_url: string;
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const logoInputRef = useRef<HTMLInputElement>(null);

  // ── Barangay Info State ─────────────────────────────────────────────────────
  const [barangayInfo, setBarangayInfo] = useState<BarangayInfo>({
    name: '',
    municipality: '',
    province: '',
    captain: '',
    email: '',
    phone: '',
    address: '',
    logo_url: '',
  });
  const [loadingInfo, setLoadingInfo]     = useState(true);
  const [savingInfo, setSavingInfo]       = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // ── Feedback State ──────────────────────────────────────────────────────────
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage]     = useState('');

  // ── Notification State (local only for now) ─────────────────────────────────
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications:    true,
    smsNotifications:      false,
    newRequestAlert:       true,
    approvalNotifications: true,
    reminderNotifications: true,
  });

  // ── System State (local only for now) ──────────────────────────────────────
  const [systemSettings, setSystemSettings] = useState({
    maxFileSize:         '5',
    allowedFileTypes:    '.pdf, .jpg, .png',
    processingDays:      '2',
    autoApproval:        false,
    requireVerification: true,
  });

  // ── Load barangay info from Supabase ────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('barangay_settings')
          .select('*')
          .eq('id', 1)
          .single();

        if (!error && data) {
          setBarangayInfo({
            name:         data.name         ?? '',
            municipality: data.municipality ?? '',
            province:     data.province     ?? '',
            captain:      data.captain      ?? '',
            email:        data.email        ?? '',
            phone:        data.phone        ?? '',
            address:      data.address      ?? '',
            logo_url:     data.logo_url     ?? '',
          });
        }
      } catch {
        // silently fail on load
      } finally {
        setLoadingInfo(false);
      }
    };
    load();
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // ── Save Barangay Info ──────────────────────────────────────────────────────
  const handleSaveBarangayInfo = async () => {
    setSavingInfo(true);
    setErrorMessage('');

    const { error } = await supabase
      .from('barangay_settings')
      .upsert({
        id:           1,
        name:         barangayInfo.name,
        municipality: barangayInfo.municipality,
        province:     barangayInfo.province,
        captain:      barangayInfo.captain,
        email:        barangayInfo.email,
        phone:        barangayInfo.phone,
        address:      barangayInfo.address,
        logo_url:     barangayInfo.logo_url,
        updated_at:   new Date().toISOString(),
      });

    if (error) {
      setErrorMessage('Failed to save: ' + error.message);
    } else {
      showSuccess('Barangay information updated successfully!');
    }

    setSavingInfo(false);
  };

  // ── Upload Logo to documents bucket ────────────────────────────────────────
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    setErrorMessage('');

    try {
      const ext  = file.name.split('.').pop();
      const path = `barangay/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(path);

      // Save logo_url to DB immediately after upload
      const { error: updateError } = await supabase
        .from('barangay_settings')
        .upsert({
          id:         1,
          logo_url:   data.publicUrl,
          updated_at: new Date().toISOString(),
        });

      if (updateError) throw updateError;

      setBarangayInfo(prev => ({ ...prev, logo_url: data.publicUrl }));
      showSuccess('Logo uploaded successfully!');
    } catch (err: unknown) {
      setErrorMessage(
        'Logo upload failed: ' + (err instanceof Error ? err.message : 'Unknown error')
      );
    } finally {
      setUploadingLogo(false);
      // Reset file input so same file can be re-uploaded if needed
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // ── Notification + System save handlers (local only for now) ────────────────
  const handleSaveNotifications = () => {
    showSuccess('Notification settings updated successfully!');
  };

  const handleSaveSystem = () => {
    showSuccess('System settings updated successfully!');
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) => (
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-gray-700 dark:bg-gray-400 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
    </label>
  );

  // ── Tab Contents ────────────────────────────────────────────────────────────

  const generalContent = loadingInfo ? (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-orange-400 dark:text-orange-500" />
    </div>
  ) : (
    <div className="space-y-6">
      <Card className="bg-white/5 dark:bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Building2 className="w-5 h-5" />
            Barangay Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Barangay Name"
              value={barangayInfo.name}
              onChange={e => setBarangayInfo({ ...barangayInfo, name: e.target.value })}
            />
            <Input
              label="Municipality/City"
              value={barangayInfo.municipality}
              onChange={e => setBarangayInfo({ ...barangayInfo, municipality: e.target.value })}
            />
            <Input
              label="Province"
              value={barangayInfo.province}
              onChange={e => setBarangayInfo({ ...barangayInfo, province: e.target.value })}
            />
            <Input
              label="Barangay Captain"
              value={barangayInfo.captain}
              onChange={e => setBarangayInfo({ ...barangayInfo, captain: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              value={barangayInfo.email}
              onChange={e => setBarangayInfo({ ...barangayInfo, email: e.target.value })}
            />
            <Input
              label="Contact Number"
              value={barangayInfo.phone}
              onChange={e => setBarangayInfo({ ...barangayInfo, phone: e.target.value })}
            />
          </div>
          <TextArea
            label="Complete Address"
            value={barangayInfo.address}
            onChange={e => setBarangayInfo({ ...barangayInfo, address: e.target.value })}
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              variant="orange"
              size="sm"
              onClick={handleSaveBarangayInfo}
              disabled={savingInfo}
              className="gap-2 disabled:opacity-50"
            >
              {savingInfo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 dark:bg-white/5">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Barangay Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={logoInputRef}
            type="file"
            accept=".png,.jpg,.jpeg"
            className="hidden"
            onChange={handleLogoUpload}
          />
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 bg-white/5 dark:bg-white/10 rounded-lg flex items-center justify-center border-2 border-dashed border-white/20 dark:border-white/10 overflow-hidden shrink-0">
              {barangayInfo.logo_url ? (
                <img
                  src={barangayInfo.logo_url}
                  alt="Barangay logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-16 h-16 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-400 dark:text-gray-400 mb-1">Upload your barangay logo</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-3">PNG or JPG — stored in documents bucket</p>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Uploading...</>
                ) : (
                  <><Upload className="w-4 h-4" />Upload Logo</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const notificationsContent = (
    <Card className="bg-white/5 dark:bg-white/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
          <Bell className="w-5 h-5" />
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { key: 'emailNotifications',    label: 'Email Notifications',    desc: 'Receive notifications via email' },
          { key: 'smsNotifications',      label: 'SMS Notifications',      desc: 'Receive notifications via SMS' },
          { key: 'newRequestAlert',       label: 'New Request Alerts',     desc: 'Get notified when new requests arrive' },
          { key: 'approvalNotifications', label: 'Approval Notifications', desc: 'Notify residents when documents are approved' },
          { key: 'reminderNotifications', label: 'Reminder Notifications', desc: 'Send reminders for pending requests' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between p-4 bg-white/5 dark:bg-white/10 rounded-lg">
            <div>
              <p className="text-gray-900 dark:text-white font-medium">{label}</p>
              <p className="text-sm text-gray-400 dark:text-gray-400">{desc}</p>
            </div>
            <Toggle
              checked={notificationSettings[key as keyof typeof notificationSettings] as boolean}
              onChange={val => setNotificationSettings({ ...notificationSettings, [key]: val })}
            />
          </div>
        ))}
        <div className="flex justify-end pt-4">
          <Button
            variant="orange"
            size="sm"
            className="gap-2"
            onClick={handleSaveNotifications}
          >
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const systemContent = (
    <div className="space-y-6">
      <Card className="bg-white/5 dark:bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <SettingsIcon className="w-5 h-5" />
            System Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Max File Size (MB)"
              type="number"
              value={systemSettings.maxFileSize}
              onChange={e => setSystemSettings({ ...systemSettings, maxFileSize: e.target.value })}
            />
            <Input
              label="Standard Processing Days"
              type="number"
              value={systemSettings.processingDays}
              onChange={e => setSystemSettings({ ...systemSettings, processingDays: e.target.value })}
            />
          </div>
          <Input
            label="Allowed File Types"
            value={systemSettings.allowedFileTypes}
            onChange={e => setSystemSettings({ ...systemSettings, allowedFileTypes: e.target.value })}
          />
          <div className="flex items-center justify-between p-4 bg-white/5 dark:bg-white/10 rounded-lg">
            <div>
              <p className="text-gray-900 dark:text-white font-medium">Require Email Verification</p>
              <p className="text-sm text-gray-400 dark:text-gray-400">Users must verify email before making requests</p>
            </div>
            <Toggle
              checked={systemSettings.requireVerification}
              onChange={val => setSystemSettings({ ...systemSettings, requireVerification: val })}
            />
          </div>
          <div className="flex justify-end">
            <Button
              variant="orange"
              size="sm"
              onClick={handleSaveBarangayInfo}
              disabled={savingInfo}
              className="gap-2 disabled:opacity-50"
            >
              {savingInfo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/5 dark:bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Shield className="w-5 h-5" />
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alert visible in both light and dark mode */}
          <Alert
            variant="warning"
            className="bg-orange-100 text-orange-900 dark:bg-orange-600 dark:text-white"
          >
            Blockchain settings should only be modified by system administrators.
            Contact your IT department for assistance.
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-400 mb-2">Blockchain Network</p>
              <p className="text-gray-900 dark:text-white font-medium">Ethereum Sepolia Testnet</p>
            </div>
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-400 mb-2">Smart Contract</p>
              <p className="text-gray-900 dark:text-white font-mono text-xs">0x1234...5678</p>
            </div>
          </div>

          <Button
            variant="outline"
            className="gap-2 text-black dark:text-white border-gray-400 dark:border-gray-600 hover:bg-orange-100 dark:hover:bg-orange-700"
          >
            <Key className="w-4 h-4" />
            Manage API Keys
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const tabs = [
    { label: 'General',       value: 'general',       content: generalContent       },
    { label: 'Notifications', value: 'notifications', content: notificationsContent },
    { label: 'System',        value: 'system',        content: systemContent        },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f23] p-4 lg:p-8 transition-colors">
      <div className="max-w-5xl mx-auto">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage system configuration and preferences</p>
        </motion.div>

        {/* Alerts */}
        {successMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Alert variant="success" onClose={() => setSuccessMessage('')}>
              {successMessage}
            </Alert>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Alert variant="error" onClose={() => setErrorMessage('')}>
              {errorMessage}
            </Alert>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Tabs tabs={tabs} defaultValue="general" />
        </motion.div>

      </div>
    </div>
  );
}