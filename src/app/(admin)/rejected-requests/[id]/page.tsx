'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  XCircle, User, Mail, Phone, MapPin, Clock,
  FileText, ExternalLink, Loader2,
} from 'lucide-react';
import Link from 'next/link';

/* ─────────────────────────── types ─────────────────────────────────────── */
interface RequestDetail {
  id: string; type: string; document_type: string; status: string;
  created_at: string; purpose: string; custom_purpose: string | null;
  additional_info: string | null; file_url: string | null; notes: string | null;
  purok: string | null; ctc_no: string | null; ctc_date_issued: string | null;
  ctc_place_issued: string | null; business_name: string | null;
  deceased_name: string | null; deceased_age: string | null;
  date_of_death: string | null; place_of_death: string | null;
  relationship_to_deceased: string | null; years_of_residency: string | null;
  bcn_no: string | null; user_id: string;
}

interface Profile {
  firstName: string; lastName: string; email: string;
  phone: string; address: string; birthday: string | null; civilStatus: string | null;
}

/* ─────────────────────────── helpers ───────────────────────────────────── */
const fmtDocType = (s: string | null) =>
  (s ?? '—').split(/[\s_-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

/* ─────────────────────────── sub-components ────────────────────────────── */
const SectionLabel = ({ label }: { label: string }) => (
  <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#6C6C74] dark:text-[#9090A0] border-b border-[#E8E6E1] dark:border-[#2C2C32] pb-2 mb-4">
    {label}
  </p>
);

const DetailRow = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="text-[11px] font-500 tracking-[0.08em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1">{label}</p>
    <p className="text-[13px] font-medium text-[#1A1A1C] dark:text-[#EAEAEC]">{value ?? '—'}</p>
  </div>
);

const IconDetail = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | null }) => (
  <div className="flex items-start gap-3 py-3 border-b border-[#E8E6E1] dark:border-[#2C2C32] last:border-0">
    <Icon className="w-4 h-4 text-[#6C6C74] dark:text-[#9090A0] mt-0.5 flex-shrink-0" />
    <div>
      <p className="text-[11px] font-500 tracking-[0.08em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-0.5">{label}</p>
      <p className="text-[13px] text-[#1A1A1C] dark:text-[#EAEAEC]">{value ?? '—'}</p>
    </div>
  </div>
);

/* ─────────────────────────── page ──────────────────────────────────────── */
export default function RejectedRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [request,  setRequest]  = useState<RequestDetail | null>(null);
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const reqRes = await fetch(`/api/requests?id=${id}&status=rejected`);
        if (!reqRes.ok) { setNotFound(true); return; }
        const reqJson = await reqRes.json();
        if (!reqJson.data?.[0]) { setNotFound(true); return; }
        setRequest(reqJson.data[0]);

        const profileRes = await fetch(`/api/profile?id=${reqJson.data[0].user_id}`);
        if (profileRes.ok) {
          const profileJson = await profileRes.json();
          setProfile(profileJson.data);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  /* ── loading ────────────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5F3] dark:bg-[#111113]">
      <span className="mono text-[12px] tracking-[0.25em] text-[#6C6C74] dark:text-[#9090A0] uppercase animate-pulse">Loading…</span>
    </div>
  );

  if (notFound || !request) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5F3] dark:bg-[#111113]">
      <div className="text-center">
        <p className="text-[14px] text-[#3A3A3E] dark:text-[#BABABC] mb-4">Request not found.</p>
        <Link href="/rejected-requests" className="text-[11px] font-500 tracking-[0.08em] uppercase text-orange-600 dark:text-orange-400 hover:underline">
          ← Back to Rejected Requests
        </Link>
      </div>
    </div>
  );

  const displayPurpose = request.purpose === 'others' && request.custom_purpose
    ? request.custom_purpose : request.purpose;

  /* ── extra details per document type ──────────────────────────────────── */
  const extraDetails: { label: string; value: string | null }[] = [];
  if (request.document_type === 'barangay-clearance') extraDetails.push(
    { label: 'Purok / Zone',       value: request.purok },
    { label: 'CTC Number',         value: request.ctc_no },
    { label: 'CTC Date Issued',    value: request.ctc_date_issued },
    { label: 'CTC Place Issued',   value: request.ctc_place_issued },
  );
  if (request.document_type === 'business-clearance') extraDetails.push(
    { label: 'Business Name',      value: request.business_name },
    { label: 'Location / Purok',   value: request.purok },
  );
  if (request.document_type === 'certification-of-death') extraDetails.push(
    { label: 'Deceased Name',      value: request.deceased_name },
    { label: 'Age at Death',       value: request.deceased_age },
    { label: 'Date of Death',      value: request.date_of_death },
    { label: 'Place of Death',     value: request.place_of_death },
    { label: 'Relationship',       value: request.relationship_to_deceased },
  );
  if (request.document_type === 'job-seeker') extraDetails.push(
    { label: 'BCN Number',         value: request.bcn_no },
    { label: 'Purok / Zone',       value: request.purok },
    { label: 'Years of Residency', value: request.years_of_residency },
  );
  if (request.document_type === 'oath-of-undertaking') extraDetails.push(
    { label: 'Purok / Zone',       value: request.purok },
    { label: 'Years of Residency', value: request.years_of_residency },
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        .pjs { font-family: 'Plus Jakarta Sans', sans-serif; }
        
      `}</style>

      <div className="pjs min-h-screen bg-[#F6F5F3] dark:bg-[#111113] transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* MASTHEAD */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="border-b-2 border-[#1A1A1C] dark:border-[#EAEAEC] pb-5 mb-10">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <p className="text-[11px] tracking-[0.2em] text-[#6C6C74] dark:text-[#9090A0] uppercase">
                    {request.id.slice(0, 8).toUpperCase()}
                  </p>
                  {/* Rejected badge */}
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-700 tracking-[0.08em] uppercase px-2.5 py-1 border text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30">
                    <XCircle className="w-3 h-3" />Rejected
                  </span>
                </div>
                <h1 className="mono text-[26px] font-bold leading-tight text-[#1A1A1C] dark:text-[#EAEAEC] tracking-tight leading-none">
                  {fmtDocType(request.type ?? request.document_type).toUpperCase()}
                </h1>
              </div>
              <Link href="/rejected-requests"
                className="text-[11px] font-500 tracking-[0.08em] uppercase text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors">
                ← Rejected Requests
              </Link>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

            {/* LEFT */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="lg:col-span-2 space-y-10">

              {/* Rejection reason — prominent */}
              <div>
                <SectionLabel label="Reason for Rejection" />
                <div className="border-l-2 border-red-500 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                    <span className="text-[10px] font-700 tracking-[0.08em] uppercase text-red-600 dark:text-red-400">
                      Admin Note
                    </span>
                  </div>
                  <p className="text-[13px] text-[#3A3A3E] dark:text-[#BABABC] leading-relaxed">
                    {request.notes ?? 'No reason provided.'}
                  </p>
                </div>
              </div>

              {/* Request details */}
              <div>
                <SectionLabel label="Request Details" />
                <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                  <DetailRow label="Document Type"  value={fmtDocType(request.type ?? request.document_type)} />
                  <DetailRow label="Purpose"        value={displayPurpose ?? '—'} />
                  <DetailRow label="Date Submitted" value={new Date(request.created_at).toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} />
                  <DetailRow label="Status"         value="Rejected" />
                  {request.additional_info && (
                    <div className="col-span-2">
                      <p className="text-[11px] font-500 tracking-[0.08em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">Additional Info</p>
                      <p className="text-[13px] text-[#3A3A3E] dark:text-[#BABABC] leading-relaxed border-l-2 border-[#E8E6E1] dark:border-[#2C2C32] pl-3">
                        {request.additional_info}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Extra fields per doc type */}
              {extraDetails.length > 0 && (
                <div>
                  <SectionLabel label="Submitted Information" />
                  <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                    {extraDetails.map(d => (
                      <DetailRow key={d.label} label={d.label} value={d.value} />
                    ))}
                  </div>
                </div>
              )}

              {/* Resident info */}
              {profile && (
                <div>
                  <SectionLabel label="Applicant" />
                  <IconDetail icon={User}   label="Full Name"    value={`${profile.firstName} ${profile.lastName}`} />
                  <IconDetail icon={Mail}   label="Email"        value={profile.email} />
                  <IconDetail icon={Phone}  label="Phone"        value={profile.phone} />
                  <IconDetail icon={MapPin} label="Address"      value={profile.address} />
                  {profile.birthday && (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-5 pt-4">
                      <DetailRow label="Birthday"     value={new Date(profile.birthday).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} />
                      <DetailRow label="Civil Status" value={profile.civilStatus} />
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* RIGHT */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
              className="space-y-8">

              {/* References */}
              <div>
                <SectionLabel label="References" />
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-500 tracking-[0.08em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">Request ID</p>
                    <p className="mono text-[11px] text-[#3A3A3E] dark:text-[#BABABC]">{request.id}</p>
                  </div>
                  {request.file_url && (
                    <div>
                      <p className="text-[11px] font-500 tracking-[0.08em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">Attached File</p>
                      <a href={request.file_url} target="_blank" rel="noopener noreferrer" download
                        className="flex items-center gap-2 mono text-[11px] text-orange-600 dark:text-orange-400 hover:underline">
                        <FileText className="w-3.5 h-3.5" />Download →
                      </a>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-500 tracking-[0.08em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">Audit Trail</p>
                    <Link href={`/audit-logs?request_id=${request.id}`}
                      className="flex items-center gap-2 mono text-[11px] text-orange-600 dark:text-orange-400 hover:underline">
                      <ExternalLink className="w-3.5 h-3.5" />View events →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <SectionLabel label="Timeline" />
                <div className="space-y-4">
                  <DetailRow
                    label="Date Submitted"
                    value={new Date(request.created_at).toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  />
                  <DetailRow
                    label="Time"
                    value={new Date(request.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  />
                </div>
              </div>

              {/* Status card */}
              <div className="border-l-2 border-red-500 pl-4 py-0.5">
                <div className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-700 tracking-[0.08em] uppercase text-red-600 dark:text-red-400 leading-none">
                      Request Rejected
                    </p>
                    <p className="text-[13px] text-[#3A3A3E] dark:text-[#BABABC] mt-2 leading-snug">
                      This request was reviewed and rejected by an admin.
                    </p>
                  </div>
                </div>
              </div>

            </motion.div>
          </div>

        </div>
      </div>
    </>
  );
}