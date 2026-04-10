'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle, XCircle, Upload, User, Mail,
  FileText, ShieldCheck, ExternalLink, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

/* ─── types ─────────────────────────────────────────────────────────────── */
interface AuditLogDetail {
  id:              string;
  request_id:      string;
  action:          'approved' | 'rejected' | 'document_uploaded';
  performed_by:    string | null;
  performer_email: string | null;
  performer_name:  string | null;
  notes:           string | null;
  created_at:      string;
  document_type:   string | null;
  resident_name:   string | null;
  resident_email:  string | null;
  file_hash:       string | null;
  chain_tx_hash:   string | null;
  file_url:        string | null;
}

/* ─── helpers ───────────────────────────────────────────────────────────── */
const fmtDocType = (s: string | null) =>
  (s ?? '—').split(/[\s-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const requestDetailHref = (log: AuditLogDetail): string => {
  if (!log.request_id) return '/audit-logs';
  if (log.action === 'approved' || log.action === 'document_uploaded')
    return `/approved-documents/${log.request_id}`;
  if (log.action === 'rejected')
    return `/rejected-requests/${log.request_id}`;
  return `/pending-requests/${log.request_id}`;
};

const ACTION_CFG = {
  approved:          { label: 'Approved',       icon: CheckCircle, cls: 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/30' },
  rejected:          { label: 'Rejected',       icon: XCircle,     cls: 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30'                       },
  document_uploaded: { label: 'Doc Uploaded',   icon: Upload,      cls: 'text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30'                 },
} as const;

/* ─── sub-components ────────────────────────────────────────────────────── */
const SectionLabel = ({ label }: { label: string }) => (
  <p className="mono text-[11px] tracking-[0.2em] uppercase text-[#5c5a54] dark:text-[#9e9b94] border-b border-[#c8c6c0] dark:border-[#2a2a32] pb-2 mb-4">{label}</p>
);

const DetailRow = ({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) => (
  <div>
    <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-1">{label}</p>
    <p className={`text-[13px] font-medium text-[#1a1917] dark:text-[#f0eee8] break-all ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</p>
  </div>
);

const ActionBadge = ({ action }: { action: AuditLogDetail['action'] }) => {
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

  const [log,      setLog]      = useState<AuditLogDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied,   setCopied]   = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      try {
        // Fetch the audit log with joined request data
        const { data: raw, error } = await supabase
          .from('audit_logs')
          .select(`
            id, request_id, action, performed_by,
            performer_email, performer_name, notes, created_at,
            requests (
              document_type, type, user_id,
              file_hash, chain_tx_hash, file_url
            )
          `)
          .eq('id', id)
          .single();

        if (error || !raw) { setNotFound(true); setLoading(false); return; }

        const req = (raw as any).requests;

        // Fetch resident profile
        let residentName  = null;
        let residentEmail = null;
        if (req?.user_id) {
          try {
            const res = await fetch(`/api/profile?id=${req.user_id}`);
            if (res.ok) {
              const j = await res.json();
              const p = j.data;
              if (p) {
                residentName  = `${p.firstName ?? p.first_name ?? ''} ${p.lastName ?? p.last_name ?? ''}`.trim() || null;
                residentEmail = p.email ?? null;
              }
            }
          } catch { /* skip */ }
        }

        setLog({
          id:              raw.id,
          request_id:      raw.request_id,
          action:          raw.action as AuditLogDetail['action'],
          performed_by:    raw.performed_by,
          performer_email: raw.performer_email,
          performer_name:  raw.performer_name,
          notes:           raw.notes,
          created_at:      raw.created_at,
          document_type:   req?.type ?? req?.document_type ?? null,
          file_hash:       req?.file_hash ?? null,
          chain_tx_hash:   req?.chain_tx_hash ?? null,
          file_url:        req?.file_url ?? null,
          resident_name:   residentName,
          resident_email:  residentEmail,
        });
      } catch { setNotFound(true); }
      finally  { setLoading(false); }
    })();
  }, [id, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] dark:bg-[#16161a]">
      <span className="mono text-[12px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase animate-pulse">Loading…</span>
    </div>
  );

  if (notFound || !log) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] dark:bg-[#16161a]">
      <div className="text-center">
        <p className="text-[14px] text-[#3d3b36] dark:text-[#c9c6be] mb-4">Audit log not found.</p>
        <Link href="/audit-logs" className="mono text-[11px] tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 hover:underline">
          ← Back to Audit Logs
        </Link>
      </div>
    </div>
  );

  const cfg = ACTION_CFG[log.action] ?? ACTION_CFG.approved;

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap'); .pg{font-family:'IBM Plex Sans',sans-serif} .mono{font-family:'IBM Plex Mono',monospace}`}</style>

      <div className="pg min-h-screen bg-[#fafaf9] dark:bg-[#16161a] transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* MASTHEAD */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b-2 border-[#1a1917] dark:border-[#f0eee8] pb-5 mb-10">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="mono text-[11px] tracking-[0.25em] text-[#5c5a54] dark:text-[#9e9b94] uppercase">
                    {log.id.slice(0, 8).toUpperCase()}
                  </p>
                  <ActionBadge action={log.action} />
                </div>
                <h1 className="mono text-2xl md:text-3xl font-bold text-[#1a1917] dark:text-[#f0eee8] tracking-tight leading-none">
                  AUDIT LOG DETAIL
                </h1>
              </div>
              <Link href="/audit-logs" className="mono text-[11px] tracking-[0.1em] uppercase text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors flex items-center gap-1">
                <ArrowLeft className="w-3 h-3" /> Audit Logs
              </Link>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

            {/* LEFT COLUMN */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="space-y-10">

              {/* Event Info */}
              <div>
                <SectionLabel label="Event" />
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <DetailRow label="Log ID"       value={log.id} mono />
                  <DetailRow label="Action"       value={cfg.label} />
                  <DetailRow label="Timestamp"    value={new Date(log.created_at).toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} />
                  <DetailRow label="Document Type" value={fmtDocType(log.document_type)} />
                  {log.notes && (
                    <div className="col-span-2">
                      <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-1">Notes</p>
                      <p className="text-[13px] text-[#3d3b36] dark:text-[#c9c6be] leading-relaxed border-l-2 border-[#c8c6c0] dark:border-[#2a2a32] pl-3">{log.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin */}
              <div>
                <SectionLabel label="Performed By" />
                <div className="space-y-0">
                  <div className="flex items-start gap-3 py-3 border-b border-[#e8e5e0] dark:border-[#222228]">
                    <User className="w-4 h-4 text-[#7a7870] dark:text-[#7e7b75] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-0.5">Admin Name</p>
                      <p className="text-[13px] text-[#1a1917] dark:text-[#f0eee8]">{log.performer_name ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 py-3">
                    <Mail className="w-4 h-4 text-[#7a7870] dark:text-[#7e7b75] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-0.5">Admin Email</p>
                      <p className="text-[13px] text-[#1a1917] dark:text-[#f0eee8]">{log.performer_email ?? '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resident */}
              <div>
                <SectionLabel label="Resident" />
                <div className="space-y-0">
                  <div className="flex items-start gap-3 py-3 border-b border-[#e8e5e0] dark:border-[#222228]">
                    <User className="w-4 h-4 text-[#7a7870] dark:text-[#7e7b75] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-0.5">Full Name</p>
                      <p className="text-[13px] text-[#1a1917] dark:text-[#f0eee8]">{log.resident_name ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 py-3">
                    <Mail className="w-4 h-4 text-[#7a7870] dark:text-[#7e7b75] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="mono text-[11px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-0.5">Email</p>
                      <p className="text-[13px] text-[#1a1917] dark:text-[#f0eee8]">{log.resident_email ?? '—'}</p>
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>

            {/* RIGHT COLUMN */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="space-y-8">

              {/* Blockchain */}
              <div>
                <SectionLabel label="Blockchain Record" />
                <div className="space-y-4">
                  {log.file_hash ? (
                    <div className="border-l-2 border-emerald-500 pl-3 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="mono text-[10px] font-bold tracking-[0.1em] uppercase text-emerald-600 dark:text-emerald-400">SHA-256 Hash</span>
                      </div>
                      <p className="mono text-[10px] text-[#5c5a54] dark:text-[#9e9b94] break-all leading-relaxed mb-1">{log.file_hash}</p>
                      <button
                        onClick={() => { navigator.clipboard.writeText(log.file_hash!); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                        className="mono text-[10px] text-orange-600 dark:text-orange-400 hover:underline"
                      >
                        {copied ? '✓ Copied' : 'Copy hash'}
                      </button>
                    </div>
                  ) : (
                    <div className="border-l-2 border-[#c8c6c0] dark:border-[#2a2a32] pl-3 py-1">
                      <p className="text-[12px] text-[#7a7870] dark:text-[#7e7b75] italic">No hash recorded yet.</p>
                    </div>
                  )}

                  {log.chain_tx_hash ? (
                    <div className="border-l-2 border-blue-500 pl-3 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                        <span className="mono text-[10px] font-bold tracking-[0.1em] uppercase text-blue-500">On-Chain (Sepolia)</span>
                      </div>
                      <p className="mono text-[10px] text-[#5c5a54] dark:text-[#9e9b94] break-all leading-relaxed mb-1">{log.chain_tx_hash}</p>
                      <a
                        href={`https://sepolia.etherscan.io/tx/${log.chain_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono text-[10px] text-blue-500 hover:underline inline-flex items-center gap-1"
                      >
                        View on Etherscan <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    <div className="border-l-2 border-[#c8c6c0] dark:border-[#2a2a32] pl-3 py-1">
                      <p className="text-[12px] text-[#7a7870] dark:text-[#7e7b75] italic">Not yet recorded on-chain.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Document */}
              <div>
                <SectionLabel label="Document" />
                {log.file_url ? (
                  <a
                    href={log.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center gap-2 w-full px-4 py-2.5 border border-[#c8c6c0] dark:border-[#2a2a32] text-[12px] font-semibold text-[#3d3b36] dark:text-[#c9c6be] hover:border-[#1a1917] dark:hover:border-[#f0eee8] hover:text-[#1a1917] dark:hover:text-[#f0eee8] transition-colors"
                  >
                    <FileText className="w-4 h-4" /> Download Document
                  </a>
                ) : (
                  <p className="text-[12px] text-[#7a7870] dark:text-[#7e7b75] italic">No document uploaded yet.</p>
                )}
              </div>

              {/* Link to request */}
              <div>
                <SectionLabel label="Request" />
                <div className="space-y-2">
                  <DetailRow label="Request ID" value={log.request_id} mono />
                  {log.request_id && (
                    <Link
                      href={requestDetailHref(log)}
                      className="flex items-center gap-2 w-full px-4 py-2.5 bg-[#1a1917] dark:bg-[#f0eee8] text-white dark:text-[#1a1917] text-[12px] font-semibold hover:bg-[#3d3b36] dark:hover:bg-white transition-colors mt-3"
                    >
                      <ExternalLink className="w-4 h-4" /> View Full Request
                    </Link>
                  )}
                </div>
              </div>

            </motion.div>
          </div>

        </div>
      </div>
    </>
  );
}
