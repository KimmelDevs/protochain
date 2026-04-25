'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, MapPin, ShieldOff,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import {
  type RequestDetail, type Profile,
  normaliseProfile,
} from '@/app/lib/utils/Docgenerators';

/* ─────────────────────────── helpers ───────────────────────────────────── */
const toSentenceCase = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '—';

const fmtDocType = (s: string) =>
  (s ?? '—').split(/[\s-]/).map(toSentenceCase).join(' ');

/* ─────────────────────────── sub-components ────────────────────────────── */
const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#6C6C74] dark:text-[#9090A0] border-b border-[#E8E6E1] dark:border-[#2C2C32] pb-2 mb-4">
    {label}
  </p>
);

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="text-[11px] font-500 tracking-[0.08em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1">
      {label}
    </p>
    <p className="text-[13px] font-medium text-[#1A1A1C] dark:text-[#EAEAEC]">
      {value ?? '—'}
    </p>
  </div>
);

const IconDetail = ({
  icon: Icon, label, value,
}: { icon: React.ElementType; label: string; value?: string }) => (
  <div className="flex items-start gap-3 py-3 border-b border-[#E8E6E1] dark:border-[#2C2C32] last:border-0">
    <Icon className="w-4 h-4 text-[#6C6C74] dark:text-[#9090A0] mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-[11px] font-500 tracking-[0.08em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-0.5">
        {label}
      </p>
      <p className="text-[13px] text-[#1A1A1C] dark:text-[#EAEAEC]">{value ?? '—'}</p>
    </div>
  </div>
);

/* ─────────────────────────── buildExtraDetails ─────────────────────────── */
function buildExtraDetails(req: RequestDetail) {
  switch (req.document_type) {
    case 'barangay-clearance':
      return [
        { label: 'Purok / Zone',      value: req.purok },
        { label: 'CTC Number',        value: req.ctc_no },
        { label: 'CTC Date Issued',   value: req.ctc_date_issued },
        { label: 'CTC Place Issued',  value: req.ctc_place_issued },
      ];
    case 'business-clearance':
      return [
        { label: 'Business Name',    value: req.business_name },
        { label: 'Location / Purok', value: req.purok },
        { label: 'CTC Number',       value: req.ctc_no },
        { label: 'CTC Date Issued',  value: req.ctc_date_issued },
        { label: 'CTC Place Issued', value: req.ctc_place_issued },
      ];
    case 'certification-of-death':
      return [
        { label: 'Deceased Name',     value: req.deceased_name },
        { label: 'Age at Death',      value: req.deceased_age },
        { label: 'Date of Death',     value: req.date_of_death },
        { label: 'Place of Death',    value: req.place_of_death },
        { label: "Deceased's Home Address", value: req.deceased_address },
        { label: 'Relationship',      value: req.relationship_to_deceased },
      ];
    case 'job-seeker':
      return [
        { label: 'BCN Number',         value: req.bcn_no },
        { label: 'Purok / Zone',       value: req.purok },
        { label: 'Years of Residency', value: req.years_of_residency },
      ];
    case 'oath-of-undertaking':
      return [
        { label: 'Purok / Zone',       value: req.purok },
        { label: 'Years of Residency', value: req.years_of_residency },
      ];
    case 'certificate-of-indigency':
      return [
        { label: 'Purok / Zone',      value: req.purok },
        { label: 'CTC Number',        value: req.ctc_no },
        { label: 'CTC Date Issued',   value: req.ctc_date_issued },
        { label: 'CTC Place Issued',  value: req.ctc_place_issued },
      ];
    case 'certificate-of-residency':
      return [
        { label: 'Purok / Zone',      value: req.purok },
        { label: 'CTC Number',        value: req.ctc_no },
        { label: 'CTC Date Issued',   value: req.ctc_date_issued },
        { label: 'CTC Place Issued',  value: req.ctc_place_issued },
        { label: 'Years Lived',       value: req.years_lived },
        { label: 'Months Lived',      value: req.months_lived },
      ];
    case 'barangay-certification':
      return [
        { label: 'Purok / Zone',      value: req.purok },
        { label: 'CTC Number',        value: req.ctc_no },
        { label: 'CTC Date Issued',   value: req.ctc_date_issued },
        { label: 'CTC Place Issued',  value: req.ctc_place_issued },
      ];
    default:
      return [];
  }
}

/* ─────────────────────────── page ──────────────────────────────────────── */
export default function RevokedDocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [request,  setRequest]  = useState<RequestDetail | null>(null);
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/login'; return; }

        const r = await fetch(`/api/requests?id=${id}`);
        if (!r.ok) { setNotFound(true); return; }
        const j = await r.json();
        const rd: RequestDetail | undefined = j.data?.[0];
        if (!rd || rd.status !== 'revoked') { setNotFound(true); return; }
        setRequest(rd);

        const pr = await fetch(`/api/profile?id=${rd.user_id}`);
        if (pr.ok) { const pj = await pr.json(); setProfile(normaliseProfile(pj.data)); }
      } catch { setNotFound(true); }
      finally  { setLoading(false); }
    })();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5F3] dark:bg-[#111113]">
      <span className="mono text-[12px] tracking-[0.25em] text-[#6C6C74] dark:text-[#9090A0] uppercase animate-pulse">
        Loading…
      </span>
    </div>
  );

  if (notFound || !request) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5F3] dark:bg-[#111113]">
      <div className="text-center">
        <p className="text-[14px] text-[#3A3A3E] dark:text-[#BABABC] mb-4">Document not found.</p>
        <Link href="/revoked-documents" className="text-[11px] font-500 tracking-[0.08em] uppercase text-orange-600 dark:text-orange-400 hover:underline">
          ← Back to Revoked Documents
        </Link>
      </div>
    </div>
  );

  const displayPurpose = request.purpose === 'others' && request.custom_purpose
    ? request.custom_purpose : request.purpose;
  const revokedDate  = request.processed_at ?? request.created_at;
  const extraDetails = buildExtraDetails(request);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        .pjs { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>

      <div className="pjs min-h-screen bg-[#F6F5F3] dark:bg-[#111113] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* ── MASTHEAD ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-b-2 border-[#1A1A1C] dark:border-[#EAEAEC] pb-5 mb-10"
          >
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-[11px] tracking-[0.2em] text-[#6C6C74] dark:text-[#9090A0] uppercase">
                    {request.id.slice(0, 8).toUpperCase()}
                  </p>
                  <span className="text-[10px] font-700 tracking-[0.1em] uppercase px-2.5 py-1 border text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
                    Revoked
                  </span>
                </div>
                <h1 className="mono text-[26px] font-bold leading-tight text-[#1A1A1C] dark:text-[#EAEAEC] tracking-tight leading-none">
                  {fmtDocType(request.type ?? request.document_type).toUpperCase()}
                </h1>
              </div>
              <Link
                href="/revoked-documents"
                className="text-[11px] font-500 tracking-[0.08em] uppercase text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors"
              >
                ← Revoked Documents
              </Link>
            </div>
          </motion.div>

          {/* ── MAIN GRID ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* ── LEFT: details ──────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="lg:col-span-2 space-y-10"
            >
              {/* Request info */}
              <div>
                <SectionLabel label="Request Information" />
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <DetailRow label="Document Type"  value={fmtDocType(request.type ?? request.document_type)} />
                  <DetailRow label="Purpose"         value={displayPurpose ?? '—'} />
                  <DetailRow label="Date Requested"  value={new Date(request.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} />
                  <DetailRow label="Date Revoked"    value={new Date(revokedDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} />
                  {request.additional_info && (
                    <div className="col-span-2">
                      <p className="text-[11px] font-500 tracking-[0.08em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">
                        Additional Information
                      </p>
                      <p className="text-[13px] text-[#3A3A3E] dark:text-[#BABABC] leading-relaxed border-l-2 border-[#E8E6E1] dark:border-[#2C2C32] pl-3">
                        {request.additional_info}
                      </p>
                    </div>
                  )}
                  {request.notes && (
                    <div className="col-span-2">
                      <p className="text-[11px] font-500 tracking-[0.08em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">
                        Notes
                      </p>
                      <p className="text-[13px] text-[#3A3A3E] dark:text-[#BABABC] leading-relaxed border-l-2 border-amber-400 pl-3">
                        {request.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Extra submitted details */}
              {extraDetails.length > 0 && (
                <div>
                  <SectionLabel label="Submitted Information" />
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    {extraDetails.map(d => (
                      <DetailRow key={d.label} label={d.label} value={d.value ?? undefined} />
                    ))}
                  </div>
                </div>
              )}

              {/* Applicant info */}
              {profile && (
                <div>
                  <SectionLabel label="Applicant Information" />
                  <IconDetail icon={User}   label="Full Name" value={`${profile.firstName} ${profile.lastName}`} />
                  <IconDetail icon={Mail}   label="Email"     value={profile.email} />
                  <IconDetail icon={Phone}  label="Phone"     value={profile.phone} />
                  <IconDetail icon={MapPin} label="Address"   value={profile.address} />
                  {profile.birthday && (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5 pt-4">
                      <DetailRow label="Birthday"     value={new Date(profile.birthday).toLocaleDateString('en-PH')} />
                      <DetailRow label="Civil Status" value={profile.civilStatus ?? undefined} />
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* ── RIGHT: status + on-chain info ─────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="space-y-8"
            >
              {/* Status */}
              <div>
                <SectionLabel label="Status" />
                <div className="flex items-center gap-2">
                  <ShieldOff className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">
                    Revoked
                  </span>
                </div>
                <div className="mt-3 space-y-1">
                  <p className="text-[10px] font-500 tracking-[0.08em] uppercase text-[#6C6C74] dark:text-[#9090A0]">Submitted</p>
                  <p className="text-[12px] text-[#3A3A3E] dark:text-[#BABABC]">
                    {new Date(request.created_at).toLocaleString('en-PH')}
                  </p>
                  <p className="text-[10px] font-500 tracking-[0.08em] uppercase text-[#6C6C74] dark:text-[#9090A0] mt-2">Revoked</p>
                  <p className="text-[12px] text-[#3A3A3E] dark:text-[#BABABC]">
                    {new Date(revokedDate).toLocaleString('en-PH')}
                  </p>
                </div>
              </div>

              {/* On-chain revocation info */}
              {request.revoke_tx_hash && (
                <div>
                  <SectionLabel label="On-Chain Revocation" />
                  <div className="border-l-2 border-amber-500 pl-3 py-1 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-[10px] font-700 tracking-[0.08em] uppercase text-amber-600 dark:text-amber-400">
                        Revoke Tx (Sepolia)
                      </span>
                    </div>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${request.revoke_tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono text-[10px] text-blue-500 hover:underline break-all"
                    >
                      {request.revoke_tx_hash.slice(0, 20)}…{request.revoke_tx_hash.slice(-10)} ↗
                    </a>
                  </div>
                </div>
              )}

              {/* Document file (read-only) */}
              {request.file_url && (
                <div>
                  <SectionLabel label="Document" />
                  <a
                    href={request.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-[#E8E6E1] dark:border-[#2C2C32] text-[12px] font-semibold text-[#3A3A3E] dark:text-[#BABABC] hover:border-[#1a1917] dark:hover:border-[#f0eee8] hover:text-[#1A1A1C] dark:hover:text-[#f0eee8] transition-colors"
                  >
                    Download Original Document
                  </a>
                  <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] mt-2 leading-relaxed">
                    This document has been revoked and is no longer valid.
  </p>
                </div>
              )}
            </motion.div>
          </div>

        </div>
      </div>
    </>
  );
}