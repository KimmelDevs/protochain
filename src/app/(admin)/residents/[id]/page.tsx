'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, MapPin, Calendar, FileText,
  CheckCircle, XCircle, Clock, Eye, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

/* ─────────────────────────── types ─────────────────────────────────────── */
interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  birthday: string | null;
  civilStatus: string | null;
  username: string | null;
  role: string | null;
  avatar_base64: string | null;
  created_at: string;
}

interface Request {
  id: string;
  type: string;
  document_type: string;
  status: string;
  purpose: string;
  custom_purpose: string | null;
  created_at: string;
  file_url: string | null;
}

/* ─────────────────────────── helpers ───────────────────────────────────── */
const fmtDocType = (s: string | null) =>
  (s ?? '—').split(/[\s_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const getInitials = (first: string, last: string) =>
  `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';

const requestLink = (r: Request) => {
  if (r.status === 'approved') return `/approved-documents/${r.id}`;
  if (r.status === 'rejected') return `/rejected-requests/${r.id}`;
  return `/pending-requests/${r.id}`;
};

/* ─────────────────────────── sub-components ────────────────────────────── */
const SectionLabel = ({ label }: { label: string }) => (
  <p className="mono text-[11px] tracking-[0.2em] uppercase text-[#5c5a54] dark:text-[#9e9b94] border-b border-[#c8c6c0] dark:border-[#2a2a32] pb-2 mb-4">
    {label}
  </p>
);

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-1">{label}</p>
    <p className="text-[13px] font-medium text-[#1a1917] dark:text-[#f0eee8]">{value ?? '—'}</p>
  </div>
);

const IconDetail = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) => (
  <div className="flex items-start gap-3 py-3 border-b border-[#e8e5e0] dark:border-[#222228] last:border-0">
    <Icon className="w-4 h-4 text-[#7a7870] dark:text-[#7e7b75] mt-0.5 flex-shrink-0" />
    <div>
      <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-0.5">{label}</p>
      <p className="text-[13px] text-[#1a1917] dark:text-[#f0eee8]">{value ?? '—'}</p>
    </div>
  </div>
);

const STATUS_CFG = {
  approved: { label: 'Approved', icon: CheckCircle, cls: 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' },
  rejected: { label: 'Rejected', icon: XCircle,     cls: 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30'                       },
  pending:  { label: 'Pending',  icon: Clock,        cls: 'text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30'           },
} as const;

const StatusBadge = ({ status }: { status: string }) => {
  const cfg  = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 mono text-[10px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
};

/* ─────────────────────────── page ──────────────────────────────────────── */
export default function ResidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const profileRes = await fetch(`/api/profile?id=${id}`);
        if (!profileRes.ok) { setNotFound(true); return; }
        const profileJson = await profileRes.json();
        if (!profileJson.data) { setNotFound(true); return; }

        const { data: extraData } = await supabase
          .from('profiles').select('id, username, role, avatar_base64, created_at').eq('id', id).single();

        setProfile({
          ...profileJson.data,
          id,
          username:      extraData?.username      ?? null,
          role:          extraData?.role          ?? null,
          avatar_base64: extraData?.avatar_base64 ?? null,
          created_at:    extraData?.created_at    ?? '',
        });

        const { data: requestsData } = await supabase
          .from('requests')
          .select('id, type, document_type, status, purpose, custom_purpose, created_at, file_url')
          .eq('user_id', id)
          .order('created_at', { ascending: false });

        setRequests(requestsData ?? []);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ── loading ────────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] dark:bg-[#16161a]">
      <span className="mono text-[12px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase animate-pulse">Loading…</span>
    </div>
  );

  if (notFound || !profile) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] dark:bg-[#16161a]">
      <div className="text-center">
        <p className="text-[14px] text-[#3d3b36] dark:text-[#c9c6be] mb-4">Resident not found.</p>
        <Link href="/residents" className="mono text-[11px] tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 hover:underline">
          ← Back to Residents
        </Link>
      </div>
    </div>
  );

  const stats = {
    total:    requests.length,
    approved: requests.filter(r => r.status === 'approved').length,
    pending:  requests.filter(r => r.status === 'pending').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
        .pg   { font-family: 'IBM Plex Sans', sans-serif; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
      `}</style>

      <div className="pg min-h-screen bg-[#fafaf9] dark:bg-[#16161a] transition-colors duration-200">
        <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* MASTHEAD */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="border-b-2 border-[#1a1917] dark:border-[#f0eee8] pb-5 mb-10">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <p className="mono text-[11px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase mb-2">
                  {id.slice(0, 8).toUpperCase()} · Resident
                </p>
                <h1 className="mono text-2xl md:text-3xl font-bold text-[#1a1917] dark:text-[#f0eee8] tracking-tight leading-none">
                  {profile.firstName.toUpperCase()} {profile.lastName.toUpperCase()}
                </h1>
              </div>
              <Link href="/residents"
                className="mono text-[11px] tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors">
                ← Residents
              </Link>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* LEFT — main content */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="lg:col-span-2 space-y-10">

              {/* Personal info */}
              <div>
                <SectionLabel label="Personal Information" />
                <IconDetail icon={Mail}   label="Email"        value={profile.email} />
                <IconDetail icon={Phone}  label="Phone"        value={profile.phone || null} />
                <IconDetail icon={MapPin} label="Address"      value={profile.address || null} />
                <IconDetail icon={Calendar} label="Birthday"   value={profile.birthday ? new Date(profile.birthday).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : null} />
                {profile.civilStatus && (
                  <div className="pt-4 grid grid-cols-2 gap-x-8">
                    <DetailRow label="Civil Status" value={profile.civilStatus} />
                    {profile.username && <DetailRow label="Username" value={`@${profile.username}`} />}
                  </div>
                )}
              </div>

              {/* Request history */}
              <div>
                <SectionLabel label={`Request History (${requests.length})`} />

                {requests.length === 0 ? (
                  <div className="border border-[#c8c6c0] dark:border-[#2a2a32] bg-white dark:bg-[#1e1e24] py-12 text-center">
                    <FileText className="w-7 h-7 text-[#c8c6c0] dark:text-[#2a2a32] mx-auto mb-3" />
                    <p className="text-[13px] text-[#7a7870] dark:text-[#7e7b75]">No requests submitted yet.</p>
                  </div>
                ) : (
                  <div className="border border-[#c8c6c0] dark:border-[#2a2a32] bg-white dark:bg-[#1e1e24] overflow-x-auto">

                    {/* Header */}
                    <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.4fr] gap-4 px-5 py-3 border-b border-[#e8e5e0] dark:border-[#222228] bg-[#fafaf9] dark:bg-[#16161a]">
                      {['Document', 'Date', 'Status', ''].map(h => (
                        <p key={h} className="mono text-[10px] font-bold tracking-[0.12em] uppercase text-[#7a7870] dark:text-[#7e7b75]">{h}</p>
                      ))}
                    </div>

                    {/* Rows */}
                    {requests.map((req, i) => {
                      const purpose = req.purpose === 'others' && req.custom_purpose
                        ? req.custom_purpose : req.purpose;
                      return (
                        <div key={req.id}
                          className={`grid grid-cols-[1.6fr_1fr_0.8fr_0.4fr] gap-4 px-5 py-4 border-b border-[#e8e5e0] dark:border-[#222228] last:border-0 transition-colors hover:bg-[#f5f4f0] dark:hover:bg-[#16161a] ${i % 2 !== 0 ? 'bg-[#faf9f7] dark:bg-[#1a1a20]' : ''}`}>

                          {/* Document */}
                          <div>
                            <p className="text-[13px] font-medium text-[#1a1917] dark:text-[#f0eee8]">
                              {fmtDocType(req.type ?? req.document_type)}
                            </p>
                            {purpose && (
                              <p className="text-[11px] text-[#5c5a54] dark:text-[#9e9b94] mt-0.5 capitalize">{purpose}</p>
                            )}
                          </div>

                          {/* Date */}
                          <div className="flex items-center">
                            <div>
                              <p className="mono text-[11px] text-[#1a1917] dark:text-[#f0eee8]">
                                {new Date(req.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                              <p className="mono text-[10px] text-[#7a7870] dark:text-[#7e7b75] mt-0.5">
                                {new Date(req.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>

                          {/* Status */}
                          <div className="flex items-center">
                            <StatusBadge status={req.status} />
                          </div>

                          {/* Action */}
                          <div className="flex items-center justify-end">
                            <Link href={requestLink(req)}
                              className="flex items-center justify-center w-7 h-7 border border-[#c8c6c0] dark:border-[#2a2a32] hover:border-[#1a1917] dark:hover:border-[#f0eee8] hover:bg-[#1a1917] dark:hover:bg-[#f0eee8] group transition-colors duration-150">
                              <Eye className="w-3.5 h-3.5 text-[#5c5a54] dark:text-[#9e9b94] group-hover:text-white dark:group-hover:text-[#1a1917] transition-colors" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>

            {/* RIGHT — sidebar */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
              className="space-y-8">

              {/* Avatar + identity */}
              <div>
                <SectionLabel label="Identity" />
                <div className="flex flex-col items-center text-center py-4 border border-[#c8c6c0] dark:border-[#2a2a32] bg-white dark:bg-[#1e1e24]">
                  {profile.avatar_base64 ? (
                    <img src={profile.avatar_base64} alt=""
                      className="w-20 h-20 rounded-full object-cover border-2 border-[#e8e5e0] dark:border-[#222228] mb-3" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#1a1917] dark:bg-[#f0eee8] flex items-center justify-center mb-3">
                      <span className="mono text-xl font-bold text-white dark:text-[#1a1917]">
                        {getInitials(profile.firstName, profile.lastName)}
                      </span>
                    </div>
                  )}
                  <p className="text-[14px] font-semibold text-[#1a1917] dark:text-[#f0eee8]">
                    {profile.firstName} {profile.lastName}
                  </p>
                  {profile.username && (
                    <p className="mono text-[11px] text-[#7a7870] dark:text-[#7e7b75] mt-0.5">@{profile.username}</p>
                  )}
                  <p className="mono text-[10px] text-[#9e9b94] dark:text-[#5c5a54] mt-1 uppercase tracking-widest">Resident</p>
                </div>
                <div className="mt-3 space-y-2">
                  <DetailRow label="Member Since" value={memberSince} />
                  <DetailRow label="User ID"      value={id} />
                </div>
              </div>

              {/* Request summary */}
              <div>
                <SectionLabel label="Request Summary" />
                {[
                  { label: 'Total',    value: stats.total,    cls: 'text-[#1a1917] dark:text-[#f0eee8]',      border: 'border-[#1a1917] dark:border-[#f0eee8]' },
                  { label: 'Approved', value: stats.approved, cls: 'text-emerald-600 dark:text-emerald-400',  border: 'border-emerald-500' },
                  { label: 'Pending',  value: stats.pending,  cls: 'text-amber-600 dark:text-amber-400',      border: 'border-amber-500' },
                  { label: 'Rejected', value: stats.rejected, cls: 'text-red-600 dark:text-red-400',          border: 'border-red-500' },
                ].map(s => (
                  <div key={s.label} className={`flex items-center justify-between py-2.5 border-b border-[#e8e5e0] dark:border-[#222228] last:border-0`}>
                    <p className="text-[13px] text-[#3d3b36] dark:text-[#c9c6be]">{s.label}</p>
                    <span className={`mono text-[14px] font-bold tabular-nums ${s.cls}`}>{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Quick links */}
              <div>
                <SectionLabel label="Quick Links" />
                <div className="space-y-2">
                  <Link href={`/audit-logs?user_id=${id}`}
                    className="flex items-center gap-2 mono text-[11px] text-orange-600 dark:text-orange-400 hover:underline">
                    <ExternalLink className="w-3.5 h-3.5" />View audit trail →
                  </Link>
                </div>
              </div>

            </motion.div>
          </div>

        </div>
      </div>
    </>
  );
}