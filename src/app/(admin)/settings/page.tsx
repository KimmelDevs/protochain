'use client';

import { useState } from 'react';
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
  Key
} from 'lucide-react';

export default function SettingsPage() {
  const [barangayInfo, setBarangayInfo] = useState({
    name: 'Barangay Salawag',
    municipality: 'Dasmariñas',
    province: 'Cavite',
    captain: 'Hon. Maria Santos',
    email: 'salawag@dasmarinas.gov.ph',
    phone: '(046) 123-4567',
    address: 'Barangay Hall, Salawag, Dasmariñas City, Cavite',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    newRequestAlert: true,
    approvalNotifications: true,
    reminderNotifications: true,
  });

  const [systemSettings, setSystemSettings] = useState({
    maxFileSize: '5',
    allowedFileTypes: '.pdf, .jpg, .png',
    processingDays: '2',
    autoApproval: false,
    requireVerification: true,
  });

  const [successMessage, setSuccessMessage] = useState('');

  const handleSaveBarangayInfo = () => {
    console.log('Saving barangay info:', barangayInfo);
    setSuccessMessage('Barangay information updated successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSaveNotifications = () => {
    console.log('Saving notification settings:', notificationSettings);
    setSuccessMessage('Notification settings updated successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSaveSystem = () => {
    console.log('Saving system settings:', systemSettings);
    setSuccessMessage('System settings updated successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const tabs = [
    {
      label: 'General',
      value: 'general',
      content: (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Barangay Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Barangay Name"
                  value={barangayInfo.name}
                  onChange={(e) => setBarangayInfo({ ...barangayInfo, name: e.target.value })}
                />
                <Input
                  label="Municipality/City"
                  value={barangayInfo.municipality}
                  onChange={(e) => setBarangayInfo({ ...barangayInfo, municipality: e.target.value })}
                />
                <Input
                  label="Province"
                  value={barangayInfo.province}
                  onChange={(e) => setBarangayInfo({ ...barangayInfo, province: e.target.value })}
                />
                <Input
                  label="Barangay Captain"
                  value={barangayInfo.captain}
                  onChange={(e) => setBarangayInfo({ ...barangayInfo, captain: e.target.value })}
                />
                <Input
                  label="Email Address"
                  type="email"
                  value={barangayInfo.email}
                  onChange={(e) => setBarangayInfo({ ...barangayInfo, email: e.target.value })}
                />
                <Input
                  label="Contact Number"
                  value={barangayInfo.phone}
                  onChange={(e) => setBarangayInfo({ ...barangayInfo, phone: e.target.value })}
                />
              </div>
              <TextArea
                label="Complete Address"
                value={barangayInfo.address}
                onChange={(e) => setBarangayInfo({ ...barangayInfo, address: e.target.value })}
                rows={3}
              />
              <div className="flex justify-end">
                <Button onClick={handleSaveBarangayInfo} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Logo Upload */}
          <Card>
            <CardHeader>
              <CardTitle>Barangay Logo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="w-32 h-32 bg-white/5 rounded-lg flex items-center justify-center border-2 border-dashed border-white/20">
                  <Building2 className="w-16 h-16 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-3">Upload your barangay logo (PNG, JPG)</p>
                  <Button variant="outline" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Logo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ),
    },
    {
      label: 'Notifications',
      value: 'notifications',
      content: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">Email Notifications</p>
                <p className="text-sm text-gray-400">Receive notifications via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.emailNotifications}
                  onChange={(e) => setNotificationSettings({ 
                    ...notificationSettings, 
                    emailNotifications: e.target.checked 
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">SMS Notifications</p>
                <p className="text-sm text-gray-400">Receive notifications via SMS</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.smsNotifications}
                  onChange={(e) => setNotificationSettings({ 
                    ...notificationSettings, 
                    smsNotifications: e.target.checked 
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">New Request Alerts</p>
                <p className="text-sm text-gray-400">Get notified when new requests arrive</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.newRequestAlert}
                  onChange={(e) => setNotificationSettings({ 
                    ...notificationSettings, 
                    newRequestAlert: e.target.checked 
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div>
                <p className="text-white font-medium">Approval Notifications</p>
                <p className="text-sm text-gray-400">Notify residents when documents are approved</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.approvalNotifications}
                  onChange={(e) => setNotificationSettings({ 
                    ...notificationSettings, 
                    approvalNotifications: e.target.checked 
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSaveNotifications} className="gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      ),
    },
    {
      label: 'System',
      value: 'system',
      content: (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
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
                  onChange={(e) => setSystemSettings({ 
                    ...systemSettings, 
                    maxFileSize: e.target.value 
                  })}
                />
                <Input
                  label="Standard Processing Days"
                  type="number"
                  value={systemSettings.processingDays}
                  onChange={(e) => setSystemSettings({ 
                    ...systemSettings, 
                    processingDays: e.target.value 
                  })}
                />
              </div>
              <Input
                label="Allowed File Types"
                value={systemSettings.allowedFileTypes}
                onChange={(e) => setSystemSettings({ 
                  ...systemSettings, 
                  allowedFileTypes: e.target.value 
                })}
              />
              
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="text-white font-medium">Require Email Verification</p>
                  <p className="text-sm text-gray-400">Users must verify email before making requests</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={systemSettings.requireVerification}
                    onChange={(e) => setSystemSettings({ 
                      ...systemSettings, 
                      requireVerification: e.target.checked 
                    })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSystem} className="gap-2">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="warning" title="Blockchain Configuration">
                Blockchain settings should only be modified by system administrators. 
                Contact your IT department for assistance.
              </Alert>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400 mb-2">Blockchain Network</p>
                  <p className="text-white font-medium">Polygon Mumbai Testnet</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">Smart Contract</p>
                  <p className="text-white font-mono text-xs">0x1234...5678</p>
                </div>
              </div>
              <Button variant="outline" className="gap-2">
                <Key className="w-4 h-4" />
                Manage API Keys
              </Button>
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Settings
          </h1>
          <p className="text-gray-400">
            Manage system configuration and preferences
          </p>
        </motion.div>

        {/* Success Message */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Alert variant="success" onClose={() => setSuccessMessage('')}>
              {successMessage}
            </Alert>
          </motion.div>
        )}

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs tabs={tabs} defaultValue="general" />
        </motion.div>
      </div>
    </div>
  );
}