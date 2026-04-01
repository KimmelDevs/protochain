'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase'; // ← shared client
import { CheckIcon } from '@heroicons/react/24/outline';

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
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border text-sm font-mono max-w-xs shadow-2xl
      ${type === 'success'
        ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
        : 'bg-red-950 border-red-800 text-red-300'}`}>
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
      <label className="block text-[10px] tracking-widest uppercase text-[#4B5563] font-semibold mb-2">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#0A0A12] border border-[#13111F] rounded-lg px-4 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-violet-700/60 focus:ring-1 focus:ring-violet-700/30 placeholder-[#2D2A40]"
      />
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
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 font-mono max-w-2xl">

      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] tracking-widest uppercase text-[#374151] mb-2">Configuration</p>
        <h1 className="text-2xl font-bold text-white">Barangay Settings</h1>
        <p className="text-[#4B5563] text-sm mt-1">
          Update barangay information used across the system.
        </p>
      </div>

      <div className="space-y-6">

        {/* Basic info */}
        <div className="rounded-xl border border-[#13111F] bg-[#0D0D16] p-6 space-y-5">
          <p className="text-[10px] tracking-widest uppercase text-[#4B5563] border-b border-[#13111F] pb-3">
            Basic information
          </p>
          <Field label="Barangay name"    value={form.name}         onChange={set('name')}         placeholder="Barangay Salawag" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Municipality"   value={form.municipality} onChange={set('municipality')} placeholder="Dasmariñas" />
            <Field label="Province"       value={form.province}     onChange={set('province')}     placeholder="Cavite" />
          </div>
          <Field label="Barangay Captain" value={form.captain}      onChange={set('captain')}      placeholder="Hon. Maria Santos" />
        </div>

        {/* Contact */}
        <div className="rounded-xl border border-[#13111F] bg-[#0D0D16] p-6 space-y-5">
          <p className="text-[10px] tracking-widest uppercase text-[#4B5563] border-b border-[#13111F] pb-3">
            Contact details
          </p>
          <Field label="Email"   value={form.email}   onChange={set('email')}   type="email" placeholder="salawag@dasmarinas.gov.ph" />
          <Field label="Phone"   value={form.phone}   onChange={set('phone')}               placeholder="(046) 123-4567" />
          <Field label="Address" value={form.address} onChange={set('address')}             placeholder="Barangay Hall, Salawag…" />
        </div>

        {/* Branding */}
        <div className="rounded-xl border border-[#13111F] bg-[#0D0D16] p-6 space-y-5">
          <p className="text-[10px] tracking-widest uppercase text-[#4B5563] border-b border-[#13111F] pb-3">
            Branding
          </p>
          <Field label="Logo URL" value={form.logo_url} onChange={set('logo_url')} placeholder="https://…/logo.png" />
          {form.logo_url && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.logo_url}
                alt="Logo preview"
                className="w-16 h-16 rounded-xl object-contain bg-[#0A0A12] border border-[#13111F] p-1"
                onError={e => (e.currentTarget.style.display = 'none')}
              />
              <p className="text-[11px] text-[#374151]">Logo preview</p>
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4" />
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
