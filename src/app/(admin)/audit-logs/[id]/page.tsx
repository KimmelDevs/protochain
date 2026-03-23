'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Upload, User, Mail, FileText, Clock, ShieldCheck, ExternalLink, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

/* ─── types ─────────────────────────────────────────────────────────────── */
interface AuditDetail {
  id:              string;
  request_id:      string;
  action:          'approved' | 'rejected' | 'document_uploaded';
  performed_by:    string | null;
  performer_email: string | null;
  performer_name:  string | null;
  notes:           string | null;
  created_at:      string;
  document_type:   string | null;
  request_status:  string | null;
  file_url:        string | null;
  file_hash:       string | null;
  resident_name:   string | null;
  resident_email:  string | null;
  resident_phone:  string | null;
}

/* ─── helpers ───────────────────────────────────────────────────────────── */
const fmtDocType = (s: string | null) =>
  (s ?? '—').split(/[\s-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const ACTION_CFG = {
  approved:          { label: 'Approved',     icon: CheckCircle, cls: 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' },
  rejected:          { label: 'Rejected',     icon: XCircle,     cls: 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30'                       },
  document_uploaded: { label: 'Doc Uploaded', icon: Upload,      cls: 'text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30'                 },
} as const;

/* ─── sub-components ────────────────────────────────────────────────────── */
const SectionLabel = ({ label }: { label: string }) => (
  <p className="mono text-[11px] tracking-[0.2em] uppercase text-[#5c5a54] dark:text-[#9e9b94] border-b border-[#c8c6c0] dark:border-[#2a2a32] pb-2 mb-4">{label}</p>
);
const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-1">{label}</p>
    <p className="text-[13px] font-medium text-[#1a1917] dark:text-[#f0eee8]">{value ?? '—'}</p>
  </div>
);
const IconDetail = ({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value?: string | null; sub?: string | null }) => (
  <div className="flex items-start gap-3 py-3 border-b border-[#e8e5e0] dark:border-[#222228] last:border-0">
    <Icon className="w-4 h-4 text-[#7a7870] dark:text-[#7e7b75] mt-0.5 flex-shrink-0" />
    <div>
      <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-0.5">{label}</p>
      <p className="text-[13px] text-[#1a1917] dark:text-[#f0eee8]">{value ?? '—'}</p>
      {sub && <p className="mono text-[10px] text-[#7a7870] dark:text-[#7e7b75] mt-0.5">{sub}</p>}
    </div>
  </div>
);
const ActionBadge = ({ action }: { action: AuditDetail['action'] }) => {
  const cfg  = ACTION_CFG[action] ?? ACTION_CFG.approved;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 mono text-[10px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </span>
  );
};

/* ─── page ──────────────────────────────────────────────────────────────── */
export default function AuditLogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [log,      setLog]      = useState<AuditDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied,   setCopied]   = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: logRow, error } = await supabase
        .from('audit_logs')
        .select(`id, request_id, action, performed_by, performer_email, performer_name, notes, created_at, requests ( document_type, type, status, file_url, file_hash, user_id )`)
        .eq('id', id)
        .single();

      if (error || !logRow) { setNotFound(true); setLoading(false); return; }

      // Resolve resident profile via decrypting API
      const userId = (logRow as any).requests?.user_id ?? null;
      let residentName = null, residentEmail = null, residentPhone = null;
      if (userId) {
        try {
          const res = await fetch(`/api/profile?id=${userId}`);
          if (res.ok) {
            const j = await res.json();
            const p = j.data;
            if (p) {
              residentName  = `${p.firstName ?? p.first_name ?? ''} ${p.lastName ?? p.last_name ?? ''}`.trim() || null;
              residentEmail = p.email ?? null;
              residentPhone = p.phone ?? null;
            }
          }
        } catch { /* skip */ }
      }

      const r = (logRow as any).requests;
      setLog({
        id:              logRow.id,
        request_id:      logRow.request_id,
        action:          logRow.action as AuditDetail['action'],
        performed_by:    logRow.performed_by,
        performer_email: logRow.performer_email,
        performer_name:  (logRow as any).performer_name ?? null,
        notes:           logRow.notes,
        created_at:      logRow.created_at,
        document_type:   r?.type ?? r?.document_type ?? null,
        request_status:  r?.status ?? null,
        file_url:        r?.file_url ?? null,
        file_hash:       r?.file_hash ?? null,
        resident_name:   residentName,
        resident_email:  residentEmail,
        resident_phone:  residentPhone,
      });
      setLoading(false);
    })();
  }, [id, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f4f0] dark:bg-[#16161a]">
      <span className="mono text-[12px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase animate-pulse">Loading…</span>
    </div>
  );

  if (notFound || !log) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f4f0] dark:bg-[#16161a]">
      <div className="text-center">
        <p className="text-[14px] text-[#3d3b36] dark:text-[#c9c6be] mb-4">Audit log not found.</p>
        <Link href="/audit-logs" className="mono text-[11px] tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 hover:underline">← Back to Audit Logs</Link>
      </div>
    </div>
  );

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap'); .pg{font-family:'IBM Plex Sans',sans-serif} .mono{font-family:'IBM Plex Mono',monospace}`}</style>

      <div className="pg min-h-screen bg-[#f5f4f0] dark:bg-[#16161a] transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* MASTHEAD */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b-2 border-[#1a1917] dark:border-[#f0eee8] pb-5 mb-10">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="mono text-[11px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase">{log.id.slice(0, 8).toUpperCase()}</p>
                  <ActionBadge action={log.action} />
                </div>
                <h1 className="mono text-2xl md:text-3xl font-bold text-[#1a1917] dark:text-[#f0eee8] tracking-tight leading-none">AUDIT LOG</h1>
              </div>
              <Link href="/audit-logs" className="mono text-[11px] tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors flex items-center gap-1">← Audit Logs</Link>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* LEFT */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="lg:col-span-2 space-y-10">

              {/* Event details */}
              <div>
                <SectionLabel label="Event Details" />
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <DetailRow label="Action"         value={ACTION_CFG[log.action]?.label ?? log.action} />
                  <DetailRow label="Timestamp"      value={new Date(log.created_at).toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} />
                  <DetailRow label="Document Type"  value={fmtDocType(log.document_type)} />
                  <DetailRow label="Request Status" value={log.request_status ? log.request_status.charAt(0).toUpperCase() + log.request_status.slice(1) : '—'} />
                  {log.notes && (
                    <div className="col-span-2">
                      <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-2">
                        {log.action === 'rejected' ? 'Rejection Reason' : log.action === 'document_uploaded' ? 'File Info' : 'Notes'}
                      </p>
                      <p className="text-[13px] text-[#3d3b36] dark:text-[#c9c6be] leading-relaxed border-l-2 border-[#c8c6c0] dark:border-[#2a2a32] pl-3">{log.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Performed by — name primary, email as subtitle */}
              <div>
                <SectionLabel label="Performed By" />
                <IconDetail
                  icon={User}
                  label="Admin"
                  value={log.performer_name ?? log.performer_email ?? 'Unknown'}
                  sub={log.performer_name ? (log.performer_email ?? undefined) : undefined}
                />
                <IconDetail icon={Mail} label="Admin ID" value={log.performed_by ?? '—'} />
              </div>

              {/* Resident */}
              <div>
                <SectionLabel label="Resident" />
                <IconDetail icon={User} label="Full Name" value={log.resident_name} />
                <IconDetail icon={Mail} label="Email"     value={log.resident_email} />
                <IconDetail icon={User} label="Phone"     value={log.resident_phone} />
              </div>

              {/* Document hash */}
              {log.file_hash && (
                <div>
                  <SectionLabel label="Document Integrity" />
                  <div className="border-l-2 border-emerald-500 pl-3 py-1">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="mono text-[10px] font-bold tracking-[0.1em] uppercase text-emerald-600 dark:text-emerald-400">SHA-256 Hash</span>
                    </div>
                    <p className="mono text-[10px] text-[#5c5a54] dark:text-[#9e9b94] break-all leading-relaxed mb-1">{log.file_hash}</p>
                    <button onClick={() => { navigator.clipboard.writeText(log.file_hash!); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="mono text-[10px] text-orange-600 dark:text-orange-400 hover:underline">
                      {copied ? '✓ Copied' : 'Copy hash'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* RIGHT */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="space-y-8">

              <div>
                <SectionLabel label="References" />
                <div className="space-y-4">
                  <div>
                    <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-2">Request</p>
                    <Link href={`/approved-documents/${log.request_id}`} className="flex items-center gap-2 mono text-[11px] text-orange-600 dark:text-orange-400 hover:underline">
                      <ExternalLink className="w-3.5 h-3.5" />{log.request_id.slice(0, 8).toUpperCase()} →
                    </Link>
                  </div>
                  <div>
                    <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-2">All Events for This Request</p>
                    <Link href={`/audit-logs?request_id=${log.request_id}`} className="flex items-center gap-2 mono text-[11px] text-orange-600 dark:text-orange-400 hover:underline">
                      <ExternalLink className="w-3.5 h-3.5" />View all events →
                    </Link>
                  </div>
                  {log.file_url && (
                    <div>
                      <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-2">Document File</p>
                      <a href={log.file_url} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-2 mono text-[11px] text-orange-600 dark:text-orange-400 hover:underline">
                        <FileText className="w-3.5 h-3.5" />Download →
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <SectionLabel label="Timing" />
                <div className="space-y-4">
                  <DetailRow label="Date"   value={new Date(log.created_at).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
                  <DetailRow label="Time"   value={new Date(log.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} />
                  <DetailRow label="Log ID" value={log.id} />
                </div>
              </div>

            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
}