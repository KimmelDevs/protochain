'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Check } from 'lucide-react';

interface Settings {
  name:         string;
  municipality: string;
  province:     string;
  captain:      string;
  email:        string;
  phone:        string;
  address:      string;
  logo_url:     string;
}

const EMPTY: Settings = {
  name: '', municipality: '', province: '', captain: '',
  email: '', phone: '', address: '', logo_url: '',
};

function Toast({ msg, type, onDone }: { msg: string; type: 'success' | 'error'; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg border text-[13px] max-w-xs shadow-lg
        ${type === 'success'
          ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
          : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
        }`}
      style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        animation: 'toastSlideUp 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
      }}
    >
      {msg}
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', placeholder = '',
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      style={{
        transition: 'transform 0.15s ease',
        transform: focused ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      <label
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        className="block text-[10px] tracking-[0.15em] uppercase text-[#7a7870] dark:text-[#7e7b75] font-medium mb-1.5"
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full bg-white dark:bg-[#1a1a20]
          border border-[#dedad4] dark:border-[#2a2a32] rounded
          px-3 py-2 text-[13px] text-[#1a1917] dark:text-[#f0eee8]
          focus:outline-none focus:border-orange-400 dark:focus:border-orange-500
          placeholder-[#a09e98] dark:placeholder-[#5c5a54]"
        style={{
          fontFamily: "'IBM Plex Sans', sans-serif",
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          boxShadow: focused ? '0 0 0 3px rgba(249,115,22,0.10)' : '0 0 0 0px transparent',
        }}
      />
    </div>
  );
}

function Section({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="rounded-lg border border-[#dedad4] dark:border-[#2a2a32] bg-white dark:bg-[#1a1a20] overflow-hidden"
      style={{ animation: `sectionEnter 0.4s ${delay}s ease both`, opacity: 0 }}
    >
      <div className="px-5 py-3 border-b border-[#dedad4] dark:border-[#2a2a32] bg-[#f5f3f0] dark:bg-[#1e1e24]">
        <p
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          className="text-[10px] tracking-[0.18em] uppercase text-[#7a7870] dark:text-[#7e7b75]"
        >
          {title}
        </p>
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

export default function SuperSettingsPage() {
  const [form,    setForm]    = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [toast,   setToast]   = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('barangay_settings')
        .select('*')
        .eq('id', 1)
        .single();
      if (data) {
        setForm({
          name:         data.name         || '',
          municipality: data.municipality || '',
          province:     data.province     || '',
          captain:      data.captain      || '',
          email:        data.email        || '',
          phone:        data.phone        || '',
          address:      data.address      || '',
          logo_url:     data.logo_url     || '',
        });
      }
      setLoading(false);
    })();
  }, []);

  const set = (k: keyof Settings) => (v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { error } = await supabase
        .from('barangay_settings')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) throw error;
      setSaved(true);
      setToast({ msg: 'Settings saved successfully.', type: 'success' });
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setToast({ msg: e.message || 'Failed to save settings.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="p-8 max-w-2xl"
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
    >
      <style>{`
        @keyframes pageEnter {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sectionEnter {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes toastSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes checkPop {
          0%   { transform: scale(0); }
          60%  { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes spinLoop {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .save-btn {
          transition: background-color 0.2s ease, transform 0.1s ease, box-shadow 0.2s ease;
        }
        .save-btn:hover:not(:disabled) {
          box-shadow: 0 2px 8px rgba(249,115,22,0.28);
          transform: translateY(-1px);
        }
        .save-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.97);
        }
        .check-icon-pop {
          animation: checkPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .logo-preview {
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .logo-preview:hover {
          transform: scale(1.05);
        }
      `}</style>

      {/* Header */}
      <div
        className="mb-7"
        style={{ animation: 'pageEnter 0.35s ease both' }}
      >
        <p
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          className="text-[10px] tracking-[0.18em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-1"
        >
          Configuration
        </p>
        <h1 className="text-2xl font-semibold text-[#1a1917] dark:text-[#f0eee8]">
          Barangay Settings
        </h1>
        <p className="text-[13px] text-[#7a7870] dark:text-[#7e7b75] mt-1">
          Update barangay information used across the system.
        </p>
      </div>

      <div className="space-y-5">

        <Section title="Basic information" delay={0.1}>
          <Field label="Barangay name"     value={form.name}         onChange={set('name')}         placeholder="Barangay Salawag" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Municipality"    value={form.municipality} onChange={set('municipality')} placeholder="Dasmariñas" />
            <Field label="Province"        value={form.province}     onChange={set('province')}     placeholder="Cavite" />
          </div>
          <Field label="Barangay Captain"  value={form.captain}      onChange={set('captain')}      placeholder="Hon. Maria Santos" />
        </Section>

        <Section title="Contact details" delay={0.18}>
          <Field label="Email"   value={form.email}   onChange={set('email')}   type="email" placeholder="salawag@dasmarinas.gov.ph" />
          <Field label="Phone"   value={form.phone}   onChange={set('phone')}               placeholder="(046) 123-4567" />
          <Field label="Address" value={form.address} onChange={set('address')}             placeholder="Barangay Hall, Salawag…" />
        </Section>

        <Section title="Branding" delay={0.26}>
          <Field label="Logo URL" value={form.logo_url} onChange={set('logo_url')} placeholder="https://…/logo.png" />
          {form.logo_url && (
            <div
              className="flex items-center gap-3"
              style={{ animation: 'sectionEnter 0.3s ease both' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.logo_url}
                alt="Logo preview"
                className="logo-preview w-14 h-14 rounded object-contain bg-[#f5f3f0] dark:bg-[#1e1e24] border border-[#dedad4] dark:border-[#2a2a32] p-1"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
              <p className="text-[12px] text-[#7a7870] dark:text-[#7e7b75]">Logo preview</p>
            </div>
          )}
        </Section>

        {/* Save */}
        <div
          className="flex justify-end"
          style={{ animation: 'sectionEnter 0.4s 0.32s ease both', opacity: 0 }}
        >
          <button
            onClick={handleSave}
            disabled={saving}
            className="save-btn flex items-center gap-2 px-5 py-2.5 rounded
              bg-orange-500 hover:bg-orange-600 active:bg-orange-700
              text-white text-[13px] font-medium
              disabled:opacity-50"
          >
            {saving ? (
              <>
                <div
                  className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full"
                  style={{ animation: 'spinLoop 0.7s linear infinite' }}
                />
                Saving…
              </>
            ) : saved ? (
              <>
                <Check className="check-icon-pop w-3.5 h-3.5" />
                Saved!
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Save settings
              </>
            )}
          </button>
        </div>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}