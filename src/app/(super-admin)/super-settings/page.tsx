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
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg border text-[13px] max-w-xs shadow-lg
      ${type === 'success'
        ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
        : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
      }`}
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
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
  return (
    <div>
      <label style={{ fontFamily: "'IBM Plex Mono', monospace" }}
             className="block text-[10px] tracking-[0.15em] uppercase text-[#7a7870] dark:text-[#7e7b75] font-medium mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white dark:bg-[#1a1a20]
          border border-[#dedad4] dark:border-[#2a2a32] rounded
          px-3 py-2 text-[13px] text-[#1a1917] dark:text-[#f0eee8]
          focus:outline-none focus:border-orange-400 dark:focus:border-orange-500
          placeholder-[#a09e98] dark:placeholder-[#5c5a54]
          transition-colors"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#dedad4] dark:border-[#2a2a32] bg-white dark:bg-[#1a1a20] overflow-hidden">
      <div className="px-5 py-3 border-b border-[#dedad4] dark:border-[#2a2a32] bg-[#f5f3f0] dark:bg-[#1e1e24]">
        <p style={{ fontFamily: "'IBM Plex Mono', monospace" }}
           className="text-[10px] tracking-[0.18em] uppercase text-[#7a7870] dark:text-[#7e7b75]">
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
    try {
      const { error } = await supabase
        .from('barangay_settings')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) throw error;
      setToast({ msg: 'Settings saved successfully.', type: 'success' });
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
    <div className="p-8 max-w-2xl" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Header */}
      <div className="mb-7">
        <p style={{ fontFamily: "'IBM Plex Mono', monospace" }}
           className="text-[10px] tracking-[0.18em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-1">
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

        {/* Basic info */}
        <Section title="Basic information">
          <Field label="Barangay name"   value={form.name}         onChange={set('name')}         placeholder="Barangay Salawag" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Municipality"  value={form.municipality} onChange={set('municipality')} placeholder="Dasmariñas" />
            <Field label="Province"      value={form.province}     onChange={set('province')}     placeholder="Cavite" />
          </div>
          <Field label="Barangay Captain" value={form.captain}     onChange={set('captain')}      placeholder="Hon. Maria Santos" />
        </Section>

        {/* Contact */}
        <Section title="Contact details">
          <Field label="Email"   value={form.email}   onChange={set('email')}   type="email" placeholder="salawag@dasmarinas.gov.ph" />
          <Field label="Phone"   value={form.phone}   onChange={set('phone')}               placeholder="(046) 123-4567" />
          <Field label="Address" value={form.address} onChange={set('address')}             placeholder="Barangay Hall, Salawag…" />
        </Section>

        {/* Branding */}
        <Section title="Branding">
          <Field label="Logo URL" value={form.logo_url} onChange={set('logo_url')} placeholder="https://…/logo.png" />
          {form.logo_url && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.logo_url}
                alt="Logo preview"
                className="w-14 h-14 rounded object-contain bg-[#f5f3f0] dark:bg-[#1e1e24] border border-[#dedad4] dark:border-[#2a2a32] p-1"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
              <p className="text-[12px] text-[#7a7870] dark:text-[#7e7b75]">Logo preview</p>
            </div>
          )}
        </Section>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded
              bg-orange-500 hover:bg-orange-600 active:bg-orange-700
              text-white text-[13px] font-medium
              transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
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
