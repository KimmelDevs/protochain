'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Bell, Shield, Save, Upload,
  Key, Loader2, Settings as SettingsIcon, Check, X, PenTool,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { SignaturePad, type SignatureRecord } from '@/app/components/SignaturePad';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BarangayInfo {
  name:         string;
  municipality: string;
  province:     string;
  captain:      string;
  email:        string;
  phone:        string;
  address:      string;
  logo_url:     string;
}

// ─── Shared field components ─────────────────────────────────────────────────

function Field({
  label, value, onChange, type = 'text', placeholder = '', rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  rows?: number;
}) {
  const base = `
    w-full bg-white dark:bg-[#1e1e24]
    border border-[#c8c6c0] dark:border-[#2a2a32]
    text-[#1a1917] dark:text-[#f0eee8]
    placeholder-[#7a7870] dark:placeholder-[#7e7b75]
    text-[13px] px-3 py-2.5
    focus:outline-none focus:border-orange-500 dark:focus:border-orange-400
    transition-colors duration-150
  `;

  return (
    <div>
      <label
        className="block mono text-[10px] tracking-[0.18em] uppercase
          text-[#5c5a54] dark:text-[#9e9b94] mb-1.5"
      >
        {label}
      </label>
      {rows ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={base + ' resize-none'}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={base}
        />
      )}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 items-center
        border-2 focus:outline-none
        transition-colors duration-300 ease-in-out
        ${checked
          ? 'bg-orange-500 border-orange-500'
          : 'bg-[#e8e5e0] dark:bg-[#2a2a32] border-[#c8c6c0] dark:border-[#3a3a42]'
        }
      `}
      role="switch"
      aria-checked={checked}
    >
      <span
        style={{
          transform: checked ? 'translateX(20px)' : 'translateX(2px)',
          transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className={`
          inline-block h-3.5 w-3.5 flex-shrink-0
          shadow-sm
          ${checked
            ? 'bg-white'
            : 'bg-[#5c5a54] dark:bg-[#9e9b94]'
          }
        `}
      />
    </button>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="mono text-[11px] tracking-[0.2em] uppercase text-[#5c5a54] dark:text-[#9e9b94] border-b border-[#c8c6c0] dark:border-[#2a2a32] pb-2 mb-5">
      {label}
    </p>
  );
}

function SaveButton({
  onClick,
  loading,
  label = 'Save changes',
}: {
  onClick: () => void;
  loading: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="
        mono text-[11px] font-bold tracking-[0.1em] uppercase
        text-white bg-orange-600 dark:bg-orange-500
        hover:bg-orange-700 dark:hover:bg-orange-600
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors px-4 py-2 flex items-center gap-2
      "
    >
      {loading ? (
        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
      ) : (
        <><Save className="w-3.5 h-3.5" /> {label}</>
      )}
    </button>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({
  msg, type, onClose,
}: {
  msg: string; type: 'success' | 'error'; onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`
        fixed bottom-6 right-6 z-50 flex items-center gap-3
        px-4 py-3 border text-[13px] shadow-lg max-w-xs
        ${type === 'success'
          ? 'bg-[#fafaf9] dark:bg-[#1e1e24] border-emerald-400 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
          : 'bg-[#fafaf9] dark:bg-[#1e1e24] border-red-400 dark:border-red-700 text-red-600 dark:text-red-400'
        }
      `}
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      {type === 'success'
        ? <Check className="w-4 h-4 flex-shrink-0" />
        : <X className="w-4 h-4 flex-shrink-0" />
      }
      <span>{msg}</span>
      <button onClick={onClose} className="ml-auto opacity-50 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabKey = 'general' | 'notifications' | 'system' | 'signatures';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'general',       label: 'General'       },
  { key: 'notifications', label: 'Notifications' },
  { key: 'system',        label: 'System'        },
  { key: 'signatures',    label: 'Signatures'    },
];

export default function SettingsPage() {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('general');

  // ── Barangay info ──────────────────────────────────────────────────────────
  const [barangayInfo, setBarangayInfo] = useState<BarangayInfo>({
    name: '', municipality: '', province: '', captain: '',
    email: '', phone: '', address: '', logo_url: '',
  });
  const [loadingInfo,   setLoadingInfo]   = useState(true);
  const [savingInfo,    setSavingInfo]    = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // ── Notification state ─────────────────────────────────────────────────────
  const [notifSettings, setNotifSettings] = useState({
    emailNotifications:    true,
    smsNotifications:      false,
    newRequestAlert:       true,
    approvalNotifications: true,
    reminderNotifications: true,
  });

  // ── System state ───────────────────────────────────────────────────────────
  const [sysSettings, setSysSettings] = useState({
    maxFileSize:           '5',
    allowedFileTypes:      '.pdf, .jpg, .png',
    processingDays:        '2',
    requireVerification:   true,
    bypassTwoStepApproval: false,
  });
  const [loadingBypass, setLoadingBypass] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('barangay_settings').select('bypass_two_step_approval').eq('id', 1).single();
        if (data) {
          setSysSettings(p => ({ ...p, bypassTwoStepApproval: data.bypass_two_step_approval ?? false }));
        }
      } catch { /* column may not exist yet */ }
      finally { setLoadingBypass(false); }
    })();
  }, []);

  const handleSaveBypass = async (val: boolean) => {
    setSysSettings(p => ({ ...p, bypassTwoStepApproval: val }));
    await supabase.from('barangay_settings').upsert({
      id: 1, bypass_two_step_approval: val, updated_at: new Date().toISOString(),
    });
    showToast(val
      ? 'Bypass enabled — Captain can approve without Secretary.'
      : 'Bypass disabled — 2-step approval enforced.');
  };

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') =>
    setToast({ msg, type });

  // ── Load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('barangay_settings').select('*').eq('id', 1).single();
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
      } finally {
        setLoadingInfo(false);
      }
    })();
  }, []);

  // ── Save barangay info ─────────────────────────────────────────────────────
  const handleSaveBarangayInfo = async () => {
    setSavingInfo(true);
    const { error } = await supabase.from('barangay_settings').upsert({
      id: 1, ...barangayInfo, updated_at: new Date().toISOString(),
    });
    error
      ? showToast('Failed to save: ' + error.message, 'error')
      : showToast('Barangay information updated successfully!');
    setSavingInfo(false);
  };

  // ── Upload logo ────────────────────────────────────────────────────────────
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const ext  = file.name.split('.').pop();
      const path = `barangay/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('documents').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('documents').getPublicUrl(path);
      const { error: updateError } = await supabase.from('barangay_settings').upsert({
        id: 1, logo_url: data.publicUrl, updated_at: new Date().toISOString(),
      });
      if (updateError) throw updateError;
      setBarangayInfo(prev => ({ ...prev, logo_url: data.publicUrl }));
      showToast('Logo uploaded successfully!');
    } catch (err: unknown) {
      showToast('Upload failed: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  // ── Signature state ────────────────────────────────────────────────────────
  const [captainSig,    setCaptainSig]    = useState<SignatureRecord | null>(null);
  const [secretarySig,  setSecretarySig]  = useState<SignatureRecord | null>(null);
  const [loadingSigs,   setLoadingSigs]   = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('admin_signatures')
          .select('*');
        if (data) {
          const cap = data.find((r: any) => r.role === 'captain');
          const sec = data.find((r: any) => r.role === 'secretary');
          if (cap) setCaptainSig(cap.record_json as SignatureRecord);
          if (sec) setSecretarySig(sec.record_json as SignatureRecord);
        }
      } catch { /* table may not exist yet */ }
      finally { setLoadingSigs(false); }
    })();
  }, []);

  const handleSaveSignature = async (record: SignatureRecord) => {
    const { error } = await supabase
      .from('admin_signatures')
      .upsert(
        { role: record.role, record_json: record, updated_at: new Date().toISOString() },
        { onConflict: 'role' },
      );
    if (error) throw new Error('Failed to save: ' + error.message);
    if (record.role === 'captain')   setCaptainSig(record);
    if (record.role === 'secretary') setSecretarySig(record);
    showToast('Signature saved and ECDSA-signed successfully!');
  };

  // ── Tab: Signatures ────────────────────────────────────────────────────────
  const generalTab = loadingInfo ? (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
    </div>
  ) : (
    <div className="space-y-10">

      {/* Barangay Information */}
      <div>
        <SectionLabel label="Barangay Information" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          <Field label="Barangay Name"    value={barangayInfo.name}         onChange={v => setBarangayInfo(p => ({ ...p, name: v }))} />
          <Field label="Municipality / City" value={barangayInfo.municipality} onChange={v => setBarangayInfo(p => ({ ...p, municipality: v }))} />
          <Field label="Province"         value={barangayInfo.province}     onChange={v => setBarangayInfo(p => ({ ...p, province: v }))} />
          <Field label="Barangay Captain" value={barangayInfo.captain}      onChange={v => setBarangayInfo(p => ({ ...p, captain: v }))} />
          <Field label="Email Address"    value={barangayInfo.email}        onChange={v => setBarangayInfo(p => ({ ...p, email: v }))}   type="email" />
          <Field label="Contact Number"   value={barangayInfo.phone}        onChange={v => setBarangayInfo(p => ({ ...p, phone: v }))} />
        </div>
        <div className="mt-5">
          <Field label="Complete Address" value={barangayInfo.address} onChange={v => setBarangayInfo(p => ({ ...p, address: v }))} rows={3} />
        </div>
        <div className="flex justify-end mt-5">
          <SaveButton onClick={handleSaveBarangayInfo} loading={savingInfo} />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#e8e5e0] dark:border-[#222228]" />

      {/* Logo */}
      <div>
        <SectionLabel label="Barangay Logo" />
        <input
          ref={logoInputRef}
          type="file"
          accept=".png,.jpg,.jpeg"
          className="hidden"
          onChange={handleLogoUpload}
        />
        <div className="flex items-center gap-6">
          {/* Preview box */}
          <div className="w-24 h-24 flex-shrink-0 border-2 border-dashed border-[#c8c6c0] dark:border-[#2a2a32] flex items-center justify-center overflow-hidden bg-[#f5f4f0] dark:bg-[#1e1e24]">
            {barangayInfo.logo_url ? (
              <img src={barangayInfo.logo_url} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-10 h-10 text-[#c8c6c0] dark:text-[#2a2a32]" />
            )}
          </div>
          <div>
            <p className="text-[13px] text-[#3d3b36] dark:text-[#c9c6be] mb-1">
              Upload your barangay logo
            </p>
            <p className="mono text-[11px] text-[#7a7870] dark:text-[#7e7b75] mb-3">
              PNG or JPG — stored in documents bucket
            </p>
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="
                mono text-[11px] font-bold tracking-[0.1em] uppercase
                border border-[#c8c6c0] dark:border-[#2a2a32]
                text-[#3d3b36] dark:text-[#c9c6be]
                hover:border-[#1a1917] dark:hover:border-[#f0eee8]
                hover:text-[#1a1917] dark:hover:text-[#f0eee8]
                disabled:opacity-50 disabled:cursor-not-allowed
                px-4 py-2 flex items-center gap-2 transition-colors
              "
            >
              {uploadingLogo
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                : <><Upload className="w-3.5 h-3.5" /> Upload Logo</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Tab: Notifications ─────────────────────────────────────────────────────
  const NOTIF_ITEMS = [
    { key: 'emailNotifications',    label: 'Email Notifications',    desc: 'Receive notifications via email'                      },
    { key: 'smsNotifications',      label: 'SMS Notifications',      desc: 'Receive notifications via SMS'                        },
    { key: 'newRequestAlert',       label: 'New Request Alerts',     desc: 'Get notified when new requests arrive'                },
    { key: 'approvalNotifications', label: 'Approval Notifications', desc: 'Notify residents when documents are approved'         },
    { key: 'reminderNotifications', label: 'Reminder Notifications', desc: 'Send reminders for pending requests'                  },
  ] as const;

  const notificationsTab = (
    <div>
      <SectionLabel label="Notification Preferences" />
      <div className="space-y-0.5">
        {NOTIF_ITEMS.map(({ key, label, desc }) => (
          <div
            key={key}
            className="flex items-center justify-between py-3.5 border-b border-[#e8e5e0] dark:border-[#222228] last:border-0"
          >
            <div>
              <p className="text-[14px] font-medium text-[#1a1917] dark:text-[#f0eee8] leading-none">
                {label}
              </p>
              <p className="text-[12px] text-[#5c5a54] dark:text-[#9e9b94] mt-1.5">{desc}</p>
            </div>
            <Toggle
              checked={notifSettings[key]}
              onChange={val => setNotifSettings(p => ({ ...p, [key]: val }))}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-6">
        <SaveButton
          onClick={() => showToast('Notification settings updated successfully!')}
          loading={false}
        />
      </div>
    </div>
  );

  // ── Tab: System ────────────────────────────────────────────────────────────
  const systemTab = (
    <div className="space-y-10">

      {/* System Configuration */}
      <div>
        <SectionLabel label="System Configuration" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mb-5">
          <Field
            label="Max File Size (MB)"
            type="number"
            value={sysSettings.maxFileSize}
            onChange={v => setSysSettings(p => ({ ...p, maxFileSize: v }))}
          />
          <Field
            label="Standard Processing Days"
            type="number"
            value={sysSettings.processingDays}
            onChange={v => setSysSettings(p => ({ ...p, processingDays: v }))}
          />
        </div>
        <Field
          label="Allowed File Types"
          value={sysSettings.allowedFileTypes}
          onChange={v => setSysSettings(p => ({ ...p, allowedFileTypes: v }))}
        />

        {/* Require verification toggle */}
        <div className="flex items-center justify-between py-3.5 mt-5 border-y border-[#e8e5e0] dark:border-[#222228]">
          <div>
            <p className="text-[14px] font-medium text-[#1a1917] dark:text-[#f0eee8] leading-none">
              Require Email Verification
            </p>
            <p className="text-[12px] text-[#5c5a54] dark:text-[#9e9b94] mt-1.5">
              Users must verify email before making requests
            </p>
          </div>
          <Toggle
            checked={sysSettings.requireVerification}
            onChange={val => setSysSettings(p => ({ ...p, requireVerification: val }))}
          />
        </div>

        {/* 2-step approval bypass toggle */}
        <div className={`flex items-center justify-between py-3.5 border-b border-[#e8e5e0] dark:border-[#222228] ${sysSettings.bypassTwoStepApproval ? 'bg-amber-50/50 dark:bg-amber-950/10 px-3 -mx-3' : ''}`}>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-medium text-[#1a1917] dark:text-[#f0eee8] leading-none">
                Bypass 2-Step Approval
              </p>
              {sysSettings.bypassTwoStepApproval && (
                <span className="mono text-[9px] font-bold tracking-[0.1em] uppercase px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[12px] text-[#5c5a54] dark:text-[#9e9b94] mt-1.5 leading-snug">
              When ON, the Captain can approve documents without waiting for the Secretary.
              Use this for testing or emergency approvals only.
            </p>
          </div>
          <Toggle
            checked={sysSettings.bypassTwoStepApproval}
            onChange={handleSaveBypass}
          />
        </div>

        <div className="flex justify-end mt-5">
          <SaveButton
            onClick={() => showToast('System settings updated successfully!')}
            loading={false}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#e8e5e0] dark:border-[#222228]" />

      {/* Security */}
      <div>
        <SectionLabel label="Security Settings" />

        {/* Warning banner */}
        <div className="border-l-2 border-orange-500 pl-4 py-0.5 mb-6">
          <p className="mono text-[11px] font-bold tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 leading-none mb-1">
            Caution
          </p>
          <p className="text-[13px] text-[#3d3b36] dark:text-[#c9c6be]">
            Blockchain settings should only be modified by system administrators.
            Contact your IT department for assistance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mb-6">
          <div>
            <p className="mono text-[10px] tracking-[0.18em] uppercase text-[#5c5a54] dark:text-[#9e9b94] mb-1.5">
              Blockchain Network
            </p>
            <p className="text-[14px] font-medium text-[#1a1917] dark:text-[#f0eee8]">
              Ethereum Sepolia Testnet
            </p>
          </div>
          <div>
            <p className="mono text-[10px] tracking-[0.18em] uppercase text-[#5c5a54] dark:text-[#9e9b94] mb-1.5">
              Smart Contract
            </p>
            <p className="mono text-[13px] text-[#1a1917] dark:text-[#f0eee8]">
              0x1234…5678
            </p>
          </div>
        </div>

        <button className="
          mono text-[11px] font-bold tracking-[0.1em] uppercase
          border border-[#c8c6c0] dark:border-[#2a2a32]
          text-[#3d3b36] dark:text-[#c9c6be]
          hover:border-[#1a1917] dark:hover:border-[#f0eee8]
          hover:text-[#1a1917] dark:hover:text-[#f0eee8]
          px-4 py-2 flex items-center gap-2 transition-colors
        ">
          <Key className="w-3.5 h-3.5" />
          Manage API Keys
        </button>
      </div>
    </div>
  );

  // ── Tab: Signatures ────────────────────────────────────────────────────────
  const signaturesTab = loadingSigs ? (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
    </div>
  ) : (
    <div className="space-y-10">

      {/* Info banner */}
      <div className="border-l-2 border-orange-500 pl-4 py-0.5">
        <p className="mono text-[11px] font-bold tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 leading-none mb-1">
          ECDSA Digital Signatures
        </p>
        <p className="text-[13px] text-[#3d3b36] dark:text-[#c9c6be]">
          Draw and save official signatures for the Barangay Captain and Secretary. Each signature
          is cryptographically signed using <strong>ECDSA P-256</strong> and will be automatically
          embedded into generated documents. The public key is stored for verification; the private
          key is never persisted.
        </p>
      </div>

      {/* Captain Signature */}
      <div className="border border-[#e8e5e0] dark:border-[#222228] p-6">
        <SectionLabel label="Barangay Captain / Punong Barangay" />
        <SignaturePad
          role="captain"
          label="Captain's Official Signature"
          existingRecord={captainSig}
          onSave={handleSaveSignature}
        />
      </div>

      {/* Divider */}
      <div className="border-t border-[#e8e5e0] dark:border-[#222228]" />

      {/* Secretary Signature */}
      <div className="border border-[#e8e5e0] dark:border-[#222228] p-6">
        <SectionLabel label="Barangay Secretary" />
        <SignaturePad
          role="secretary"
          label="Secretary's Official Signature"
          existingRecord={secretarySig}
          onSave={handleSaveSignature}
        />
      </div>

    </div>
  );

  const TAB_CONTENT: Record<TabKey, React.ReactNode> = {
    general:       generalTab,
    notifications: notificationsTab,
    system:        systemTab,
    signatures:    signaturesTab,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        .pg   { font-family: 'IBM Plex Sans', sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      <div className="pg min-h-screen bg-[#fafaf9] dark:bg-[#16161a] transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* ── Masthead ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="border-b-2 border-[#1a1917] dark:border-[#f0eee8] pb-5 mb-10"
          >
            <p className="mono text-[11px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] mb-2 uppercase">
              System
            </p>
            <h1 className="mono text-2xl md:text-3xl font-bold text-[#1a1917] dark:text-[#f0eee8] tracking-tight leading-none">
              Settings
            </h1>
          </motion.div>

          {/* ── Tab bar ──────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="flex items-center gap-1 mb-10 flex-wrap"
          >
            {TABS.map(({ key, label }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`
                    px-4 py-2 text-[12px] font-medium border transition-colors duration-150
                    ${active
                      ? 'bg-orange-600 dark:bg-orange-500 text-white border-orange-600 dark:border-orange-500'
                      : 'bg-transparent text-[#5c5a54] dark:text-[#9e9b94] border-[#c8c6c0] dark:border-[#2a2a32] hover:border-orange-500 dark:hover:border-orange-400 hover:text-orange-600 dark:hover:text-orange-400'
                    }
                  `}
                >
                  {label}
                </button>
              );
            })}
          </motion.div>

          {/* ── Tab content ──────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {TAB_CONTENT[activeTab]}
            </motion.div>
          </AnimatePresence>

        </div>
      </div>

      {/* ── Toast ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
