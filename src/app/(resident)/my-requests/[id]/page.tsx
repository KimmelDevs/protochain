'use client';

import { use, useState, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import Button from '@/app/components/ui/Button';
import {
  ArrowLeft, User, MapPin, Phone, Mail,
  CheckCircle, Clock, XCircle, Download, Loader2,
  Pencil, X, Save, History,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

interface RequestDetail {
  id: string; document_type: string; status: string;
  created_at: string; processed_at: string | null; purpose: string;
  custom_purpose: string | null; additional_info: string | null;
  notes: string | null; file_url: string | null;
  purok: string | null; ctc_no: string | null; ctc_date_issued: string | null;
  ctc_place_issued: string | null; business_name: string | null;
  deceased_name: string | null; deceased_age: string | null;
  date_of_death: string | null; place_of_death: string | null;
  relationship_to_deceased: string | null; years_of_residency: string | null;
  bcn_no: string | null; user_id: string;
}

interface Profile {
  id: string;
  firstName: string; lastName: string; email: string;
  phone: string; address: string; username: string;
}

interface EditHistory {
  id: string;
  field_label: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

/* ─── Variants ───────────────────────────────────────────────── */
const EASE = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 20 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: EASE },
});

const slideInRight = (delay = 0) => ({
  initial:    { opacity: 0, x: 24 },
  animate:    { opacity: 1, x: 0 },
  transition: { duration: 0.4, delay, ease: EASE },
});

const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const staggerItem: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
};

/* ─── Field configs by doc type ─────────────────────────────── */
type EditableField = {
  key: keyof RequestDetail;
  label: string;
  type?: 'text' | 'date' | 'textarea';
};

function getEditableFields(docType: string): EditableField[] {
  const common: EditableField[] = [
    { key: 'additional_info', label: 'Additional Info', type: 'textarea' },
  ];
  switch (docType) {
    case 'barangay-clearance':
      return [
        { key: 'purok', label: 'Purok / Zone' },
        { key: 'ctc_no', label: 'CTC Number' },
        { key: 'ctc_date_issued', label: 'CTC Date Issued', type: 'date' },
        { key: 'ctc_place_issued', label: 'CTC Place Issued' },
        ...common,
      ];
    case 'business-clearance':
      return [
        { key: 'business_name', label: 'Business Name' },
        { key: 'purok', label: 'Location / Purok' },
        ...common,
      ];
    case 'certification-of-death':
      return [
        { key: 'deceased_name', label: 'Deceased Name' },
        { key: 'deceased_age', label: 'Age at Death' },
        { key: 'date_of_death', label: 'Date of Death', type: 'date' },
        { key: 'place_of_death', label: 'Place of Death' },
        { key: 'relationship_to_deceased', label: 'Relationship' },
        ...common,
      ];
    default:
      return [
        { key: 'purok', label: 'Purok / Zone' },
        { key: 'years_of_residency', label: 'Years of Residency' },
        ...common,
      ];
  }
}

/* ─── Edit Modal ─────────────────────────────────────────────── */
function EditModal({
  request,
  profile,
  onClose,
  onSaved,
}: {
  request: RequestDetail;
  profile: Profile;
  onClose: () => void;
  onSaved: (updated: RequestDetail) => void;
}) {
  const fields = getEditableFields(request.document_type ?? '');
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) init[f.key] = (request[f.key] as string) ?? '';
    return init;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/requests?id=${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          resident_id:    profile.id,
          resident_email: profile.email,
          resident_name:  profile.username || `${profile.firstName} ${profile.lastName}`,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Save failed');
      onSaved(json.data);
      toast.success('Changes saved successfully.');
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="w-full max-w-lg bg-white dark:bg-[#1a1a20] rounded-xl border border-[#dedad4] dark:border-[#2a2a32] shadow-2xl overflow-hidden"
        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#dedad4] dark:border-[#2a2a32]">
          <div className="flex items-center gap-2">
            <Pencil className="w-4 h-4 text-orange-500" />
            <h2 className="text-[14px] font-semibold text-[#1a1917] dark:text-[#f0eee8]">
              Edit Request
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#a09e98] hover:text-[#3d3b36] dark:hover:text-[#f0eee8] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-[12px] text-[#7a7870] dark:text-[#7e7b75]">
            You can only edit pending requests. Changes are logged and visible to admins.
          </p>
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-1"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {f.label}
              </label>
              {f.type === 'textarea' ? (
                <textarea
                  value={form[f.key] ?? ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] bg-white dark:bg-[#16161a]
                    border border-[#dedad4] dark:border-[#2a2a32] rounded
                    text-[#1a1917] dark:text-[#f0eee8]
                    focus:outline-none focus:border-orange-400 dark:focus:border-orange-500
                    resize-none transition-colors"
                />
              ) : (
                <input
                  type={f.type ?? 'text'}
                  value={form[f.key] ?? ''}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 text-[13px] bg-white dark:bg-[#16161a]
                    border border-[#dedad4] dark:border-[#2a2a32] rounded
                    text-[#1a1917] dark:text-[#f0eee8]
                    focus:outline-none focus:border-orange-400 dark:focus:border-orange-500
                    transition-colors"
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#dedad4] dark:border-[#2a2a32]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] rounded border border-[#dedad4] dark:border-[#2a2a32]
              text-[#7a7870] dark:text-[#7e7b75]
              hover:bg-[#f0eee8] dark:hover:bg-[#1e1e24]
              transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-[13px] rounded
              bg-orange-500 text-white hover:bg-orange-600
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-colors duration-150"
          >
            {saving
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
              : <><Save className="w-3.5 h-3.5" /> Save Changes</>
            }
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Edit History Panel ─────────────────────────────────────── */
function EditHistoryPanel({ requestId }: { requestId: string }) {
  const [history, setHistory] = useState<EditHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/request-edits?requestId=${requestId}`)
      .then(r => r.json())
      .then(j => setHistory(j.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [requestId]);

  if (loading) return null;
  if (history.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-4 h-4" />
          Edit History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.map((h) => (
            <div key={h.id} className="flex items-start gap-3 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-2 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[#60646c] dark:text-[#b0b4ba] text-xs uppercase tracking-wide mb-0.5">
                  {h.field_label}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[#1c2024] dark:text-white line-through opacity-60 text-[12px]">
                    {h.old_value || '(empty)'}
                  </span>
                  <span className="text-[10px] text-[#a09e98]">→</span>
                  <span className="text-[#1c2024] dark:text-white font-medium text-[12px]">
                    {h.new_value || '(empty)'}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-[#a09e98] flex-shrink-0">
                {new Date(h.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params);
  const router   = useRouter();

  const [request,  setRequest]  = useState<RequestDetail | null>(null);
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const reqRes = await fetch(`/api/requests?id=${id}&user_id=${user.id}`);
        if (!reqRes.ok) { setNotFound(true); return; }
        const reqJson = await reqRes.json();
        const data: RequestDetail | undefined = reqJson.data?.[0];

        if (!data || data.user_id !== user.id) { setNotFound(true); return; }
        setRequest(data);

        const profileRes = await fetch(`/api/profile?id=${user.id}`);
        if (profileRes.ok) {
          const profileJson = await profileRes.json();
          const p = profileJson.data;
          if (p) {
            setProfile({
              id:        user.id,
              firstName: p.firstName ?? '',
              lastName:  p.lastName  ?? '',
              email:     p.email     ?? user.email ?? '',
              phone:     p.phone     ?? '',
              address:   p.address   ?? '',
              username:  p.username  ?? '',
            });
          }
        }
      } catch (err) {
        console.error('Error:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
        <Loader2 className="w-8 h-8 text-[#0d74ce]" />
      </motion.div>
    </div>
  );

  if (notFound || !request) return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen p-4 lg:p-8 flex items-center justify-center"
    >
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-[#b0b4ba] mb-4">Request not found</p>
          <Link href="/my-requests"><Button>Back to Requests</Button></Link>
        </CardContent>
      </Card>
    </motion.div>
  );

  const displayPurpose = request.purpose === 'others' && request.custom_purpose
    ? request.custom_purpose : request.purpose;

  const extraDetails: { label: string; value: string | null }[] = [];
  if (request.document_type === 'barangay-clearance') {
    extraDetails.push(
      { label: 'Purok / Zone',     value: request.purok },
      { label: 'CTC Number',       value: request.ctc_no },
      { label: 'CTC Date Issued',  value: request.ctc_date_issued },
      { label: 'CTC Place Issued', value: request.ctc_place_issued },
    );
  }
  if (request.document_type === 'business-clearance') {
    extraDetails.push(
      { label: 'Business Name',    value: request.business_name },
      { label: 'Location / Purok', value: request.purok },
    );
  }
  if (request.document_type === 'certification-of-death') {
    extraDetails.push(
      { label: 'Deceased Name',  value: request.deceased_name },
      { label: 'Age at Death',   value: request.deceased_age },
      { label: 'Date of Death',  value: request.date_of_death },
      { label: 'Place of Death', value: request.place_of_death },
      { label: 'Relationship',   value: request.relationship_to_deceased },
    );
  }
  if (['job-seeker', 'oath-of-undertaking', 'barangay-residency'].includes(request.document_type ?? '')) {
    extraDetails.push(
      { label: 'BCN Number',         value: request.bcn_no },
      { label: 'Purok / Zone',       value: request.purok },
      { label: 'Years of Residency', value: request.years_of_residency },
    );
  }

  const statusIcon =
    request.status === 'approved' ? <CheckCircle className="w-6 h-6 text-green-500" /> :
    request.status === 'rejected' ? <XCircle     className="w-6 h-6 text-red-500"   /> :
                                    <Clock       className="w-6 h-6 text-amber-500" />;
  const statusMsg =
    request.status === 'approved' ? 'Your request has been approved.' :
    request.status === 'rejected' ? 'Your request was rejected.'      :
                                    'Waiting for admin review.';

  const canEdit = request.status === 'pending' || request.status === 'secretary_approved';

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#111113] p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Back + Header */}
        <motion.div {...fadeUp(0)}>
          <Link
            href="/my-requests"
            className="inline-flex items-center gap-2 text-sm text-[#60646c] dark:text-[#b0b4ba]
              hover:text-[#1c2024] dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Requests
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-[#1c2024] dark:text-white">
                {request.document_type}
              </h1>
              <p className="text-[#60646c] dark:text-[#b0b4ba] font-mono text-sm">
                ID: {request.id.toUpperCase()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={request.status as any}>{request.status}</Badge>
              {canEdit && profile && (
                <button
                  onClick={() => setShowEdit(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border
                    border-orange-300 dark:border-orange-700
                    text-orange-600 dark:text-orange-400
                    bg-orange-50 dark:bg-orange-950/30
                    hover:bg-orange-100 dark:hover:bg-orange-950/50
                    text-[12px] font-medium transition-colors duration-150"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit Request
                </button>
              )}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main column */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="lg:col-span-2 space-y-6"
          >
            {/* Request details */}
            <motion.div variants={staggerItem}>
              <Card>
                <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
                <CardContent>
                  <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="grid grid-cols-2 gap-4"
                  >
                    <motion.div variants={staggerItem}><DetailRow label="Document Type"  value={request.document_type} /></motion.div>
                    <motion.div variants={staggerItem}><DetailRow label="Purpose"        value={displayPurpose ?? '—'} /></motion.div>
                    <motion.div variants={staggerItem}><DetailRow label="Date Requested" value={new Date(request.created_at).toLocaleDateString()} /></motion.div>
                    <motion.div variants={staggerItem}><DetailRow label="Date Processed" value={request.processed_at ? new Date(request.processed_at).toLocaleDateString() : 'Pending'} /></motion.div>
                    {request.additional_info && (
                      <motion.div variants={staggerItem} className="col-span-2">
                        <DetailRow label="Additional Info" value={request.additional_info} />
                      </motion.div>
                    )}
                    {request.notes && (
                      <motion.div variants={staggerItem} className="col-span-2">
                        <DetailRow label="Admin Notes" value={request.notes} />
                      </motion.div>
                    )}
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Extra fields */}
            {extraDetails.length > 0 && (
              <motion.div variants={staggerItem}>
                <Card>
                  <CardHeader><CardTitle>Submitted Information</CardTitle></CardHeader>
                  <CardContent>
                    <motion.div
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                      className="grid grid-cols-2 gap-4"
                    >
                      {extraDetails.map(d => (
                        <motion.div key={d.label} variants={staggerItem}>
                          <DetailRow label={d.label} value={d.value ?? '—'} />
                        </motion.div>
                      ))}
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Edit history */}
            <motion.div variants={staggerItem}>
              <EditHistoryPanel requestId={request.id} />
            </motion.div>

            {/* Profile */}
            {profile && (
              <motion.div variants={staggerItem}>
                <Card>
                  <CardHeader><CardTitle>Applicant Information</CardTitle></CardHeader>
                  <CardContent>
                    <motion.div
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                      className="space-y-3"
                    >
                      {[
                        { icon: <User   className="w-5 h-5 text-[#60646c] dark:text-[#b0b4ba]" />, label: 'Name',    value: `${profile.firstName} ${profile.lastName}` },
                        { icon: <Mail   className="w-5 h-5 text-[#60646c] dark:text-[#b0b4ba]" />, label: 'Email',   value: profile.email   },
                        { icon: <Phone  className="w-5 h-5 text-[#60646c] dark:text-[#b0b4ba]" />, label: 'Phone',   value: profile.phone   },
                        { icon: <MapPin className="w-5 h-5 text-[#60646c] dark:text-[#b0b4ba]" />, label: 'Address', value: profile.address },
                      ].map(row => (
                        <motion.div key={row.label} variants={staggerItem}>
                          <IconRow icon={row.icon} label={row.label} value={row.value} />
                        </motion.div>
                      ))}
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Status card */}
            <motion.div {...slideInRight(0.18)}>
              <Card>
                <CardHeader><CardTitle>Status</CardTitle></CardHeader>
                <CardContent>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.28, duration: 0.3 }}
                    className="flex items-center gap-3 p-3 bg-[#f0f0f3] dark:bg-white/5 rounded-lg"
                  >
                    {statusIcon}
                    <div>
                      <p className="text-[#1c2024] dark:text-white font-medium capitalize">{request.status}</p>
                      <p className="text-[#60646c] dark:text-[#b0b4ba] text-xs">{statusMsg}</p>
                    </div>
                  </motion.div>
                  {canEdit && (
                    <p className="text-[11px] text-[#a09e98] mt-3 text-center">
                      You can still edit this request while it's pending.
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Download card */}
            {request.status === 'approved' && request.file_url && (
              <motion.div {...slideInRight(0.26)}>
                <Card>
                  <CardHeader><CardTitle>Your Document</CardTitle></CardHeader>
                  <CardContent>
                    <a href={request.file_url} target="_blank" rel="noopener noreferrer" download>
                      <Button variant="default" className="w-full gap-2">
                        <Download className="w-4 h-4" />
                        Download Document
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {request.status === 'approved' && !request.file_url && (
              <motion.div {...slideInRight(0.26)}>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-[#60646c] dark:text-[#b0b4ba] text-sm text-center">
                      Your request is approved. Please visit the barangay office to claim your document.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && profile && (
        <EditModal
          request={request}
          profile={profile}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setRequest(updated);
            setShowEdit(false);
          }}
        />
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-[#60646c] dark:text-[#b0b4ba] mb-1">{label}</p>
      <p className="text-[#1c2024] dark:text-white font-medium">{value}</p>
    </div>
  );
}

function IconRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-sm text-[#60646c] dark:text-[#b0b4ba]">{label}</p>
        <p className="text-[#1c2024] dark:text-white">{value}</p>
      </div>
    </div>
  );
}