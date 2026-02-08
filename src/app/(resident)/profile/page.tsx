'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Input from '@/app/components/ui/Input';
import Button from '@/app/components/ui/Button';
import Alert from '@/app/components/ui/Alert';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Shield,
  Camera,
  Save,
  Key,
  CheckCircle
} from 'lucide-react';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [profileData, setProfileData] = useState({
    firstName: 'Juan',
    middleName: 'Santos',
    lastName: 'Dela Cruz',
    email: 'juan.delacruz@email.com',
    phone: '+63 912 345 6789',
    address: 'Block 5 Lot 10, Barangay Salawag, Dasmariñas, Cavite',
    birthdate: '1990-05-15',
    civilStatus: 'Single',
    occupation: 'Software Engineer',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProfile = () => {
    // TODO: Save to backend
    console.log('Saving profile:', profileData);
    setIsEditing(false);
    setSuccessMessage('Profile updated successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleChangePassword = () => {
    // TODO: Change password
    console.log('Changing password');
    setShowPasswordChange(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setSuccessMessage('Password changed successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

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
            Profile Settings
          </h1>
          <p className="text-gray-400">
            Manage your account information and settings
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Picture Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                {/* Profile Picture */}
                <div className="text-center mb-6">
                  <div className="relative inline-block">
                    <div className="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                      JD
                    </div>
                    <button className="absolute bottom-0 right-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors">
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-4">
                    {profileData.firstName} {profileData.lastName}
                  </h2>
                  <p className="text-sm text-gray-400">{profileData.email}</p>
                </div>

                {/* Account Info */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-3 text-sm">
                    <Shield className="w-4 h-4 text-green-400" />
                    <span className="text-gray-400">Account Verified</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-gray-400">Member since Jan 2024</span>
                  </div>
                </div>

                {/* Change Password Button */}
                <div className="mt-6">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setShowPasswordChange(!showPasswordChange)}
                  >
                    <Key className="w-4 h-4" />
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Profile Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Personal Information</CardTitle>
                  {!isEditing ? (
                    <Button size="sm" onClick={() => setIsEditing(true)}>
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSaveProfile} className="gap-2">
                        <Save className="w-4 h-4" />
                        Save Changes
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="First Name"
                      name="firstName"
                      value={profileData.firstName}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                    <Input
                      label="Middle Name"
                      name="middleName"
                      value={profileData.middleName}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                    <Input
                      label="Last Name"
                      name="lastName"
                      value={profileData.lastName}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Email Address"
                      name="email"
                      type="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                    <Input
                      label="Phone Number"
                      name="phone"
                      type="tel"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                  </div>

                  {/* Address */}
                  <Input
                    label="Complete Address"
                    name="address"
                    value={profileData.address}
                    onChange={handleProfileChange}
                    disabled={!isEditing}
                  />

                  {/* Additional Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Birthdate"
                      name="birthdate"
                      type="date"
                      value={profileData.birthdate}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                    <Input
                      label="Civil Status"
                      name="civilStatus"
                      value={profileData.civilStatus}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                    <Input
                      label="Occupation"
                      name="occupation"
                      value={profileData.occupation}
                      onChange={handleProfileChange}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Change Password Section */}
            {showPasswordChange && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Input
                        label="Current Password"
                        name="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter current password"
                      />
                      <Input
                        label="New Password"
                        name="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Enter new password"
                      />
                      <Input
                        label="Confirm New Password"
                        name="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Confirm new password"
                      />
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowPasswordChange(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="flex-1"
                          onClick={handleChangePassword}
                        >
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
              <CardHeader>
                <CardTitle>Account Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">12</div>
                    <div className="text-sm text-gray-400">Total Requests</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">8</div>
                    <div className="text-sm text-gray-400">Approved</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-400">3</div>
                    <div className="text-sm text-gray-400">Pending</div>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">5</div>
                    <div className="text-sm text-gray-400">This Month</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Privacy & Security */}
            <Card>
              <CardHeader>
                <CardTitle>Privacy & Security</CardTitle>
              </CardHeader>
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
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
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
                    <Button size="sm" variant="outline">
                      Enable
                    </Button>
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