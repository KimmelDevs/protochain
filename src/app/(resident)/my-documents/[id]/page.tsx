'use client';

import { use, useEffect, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import Button from '@/app/components/ui/Button';
import {
  ArrowLeft, Download, FileText, CheckCircle, Loader2, Calendar, User, MapPin, ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';
import { useRouter } from 'next/navigation';

interface RequestDoc {
  id: string;
  type: string;
  document_type: string;
  status: string;
  created_at: string;
  file_url: string | null;
  purpose: string;
  custom_purpose: string | null;
  additional_info: string | null;
  notes: string | null;
  purok: string | null;
  ctc_no: string | null;
  ctc_date_issued: string | null;
  ctc_place_issued: string | null;
  business_name: string | null;
  deceased_name: string | null;
  deceased_age: string | null;
  date_of_death: string | null;
  place_of_death: string | null;
  relationship_to_deceased: string | null;
  years_of_residency: string | null;
  bcn_no: string | null;
  user_id: string;
  file_hash: string | null;
  chain_tx_hash: string | null;
}

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  birthday: string | null;
  civilStatus: string | null;
}

/* ─── Variants ───────────────────────────────────────────────── */
const EASE = [0.25, 0.46, 0.45, 0.94] as [number, number, number, number];

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0, y: 20 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: EASE },
});

const staggerContainer: Variants = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const staggerItem: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

const slideIn = (dir: 'left' | 'right' = 'left', delay = 0) => ({
  initial:    { opacity: 0, x: dir === 'left' ? -20 : 20 },
  animate:    { opacity: 1, x: 0 },
  transition: { duration: 0.4, delay, ease: EASE },
});

const HashDisplay = ({ hash, txHash }: { hash: string; txHash?: string | null }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="border-l-2 border-emerald-500 pl-3 py-1 space-y-2">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10px] font-700 tracking-[0.08em] uppercase text-emerald-600 dark:text-emerald-400">
            SHA-256 Hash
          </span>
        </div>
        <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] break-all leading-relaxed mb-1">
          {hash}
        </p>
        <button
          onClick={() => { navigator.clipboard.writeText(hash); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="mono text-[10px] text-orange-600 dark:text-orange-400 hover:underline"
        >
          {copied ? '✓ Copied' : 'Copy hash'}
        </button>
      </div>
      {txHash && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-[10px] font-700 tracking-[0.08em] uppercase text-blue-500">On-Chain (Sepolia)</span>
          </div>
          <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="mono text-[10px] text-blue-500 hover:underline break-all">
            {txHash.slice(0, 20)}…{txHash.slice(-10)} ↗
          </a>
        </div>
      )}
    </div>
  );
};

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params);
  const router   = useRouter();

  const [doc,      setDoc]      = useState<RequestDoc | null>(null);
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

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

        const res = await fetch(`/api/requests?id=${id}`);
        if (!res.ok) { setNotFound(true); return; }
        const json = await res.json();
        const data: RequestDoc | undefined = json.data?.[0];

        if (!data || data.user_id !== user.id || data.status !== 'approved') {
          setNotFound(true);
          return;
        }
        setDoc(data);

        const profileRes = await fetch(`/api/profile?id=${user.id}`);
        if (profileRes.ok) {
          const profileJson = await profileRes.json();
          const p = profileJson.data;
          if (p) {
            setProfile({
              firstName:   p.firstName   ?? p.first_name   ?? '',
              lastName:    p.lastName    ?? p.last_name    ?? '',
              email:       p.email       ?? '',
              phone:       p.phone       ?? '',
              address:     p.address     ?? '',
              birthday:    p.birthday    ?? null,
              civilStatus: p.civilStatus ?? p.civil_status ?? null,
            });
          }
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
      >
        <Loader2 className="w-8 h-8 text-[#0d74ce]" />
      </motion.div>
    </div>
  );

  if (notFound || !doc) return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen p-4 lg:p-8 flex items-center justify-center"
    >
      <div className="text-center">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        >
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        </motion.div>
        <p className="text-[#b0b4ba] mb-4">Document not found</p>
        <Link href="/my-documents">
          <Button>Back to Documents</Button>
        </Link>
      </div>
    </motion.div>
  );

  const displayPurpose = doc.purpose === 'others' && doc.custom_purpose
    ? doc.custom_purpose : doc.purpose;

  const extraDetails: { label: string; value: string | null }[] = [];
  if (doc.document_type === 'barangay-clearance') {
    extraDetails.push(
      { label: 'Purok / Zone',     value: doc.purok },
      { label: 'CTC Number',       value: doc.ctc_no },
      { label: 'CTC Date Issued',  value: doc.ctc_date_issued },
      { label: 'CTC Place Issued', value: doc.ctc_place_issued },
    );
  }
  if (doc.document_type === 'business-clearance') {
    extraDetails.push(
      { label: 'Business Name',    value: doc.business_name },
      { label: 'Location / Purok', value: doc.purok },
    );
  }
  if (doc.document_type === 'certification-of-death') {
    extraDetails.push(
      { label: 'Deceased Name',    value: doc.deceased_name },
      { label: 'Age at Death',     value: doc.deceased_age },
      { label: 'Date of Death',    value: doc.date_of_death },
      { label: 'Place of Death',   value: doc.place_of_death },
      { label: 'Relationship',     value: doc.relationship_to_deceased },
    );
  }
  if (doc.document_type === 'job-seeker') {
    extraDetails.push(
      { label: 'BCN Number',         value: doc.bcn_no },
      { label: 'Purok / Zone',       value: doc.purok },
      { label: 'Years of Residency', value: doc.years_of_residency },
    );
  }
  if (doc.document_type === 'oath-of-undertaking') {
    extraDetails.push(
      { label: 'Purok / Zone',       value: doc.purok },
      { label: 'Years of Residency', value: doc.years_of_residency },
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8 bg-gray-50 dark:bg-[#171717] text-[#1c2024] dark:text-white transition-colors duration-300">
      <div className="max-w-5xl mx-auto">

        {/* Back button */}
        <motion.div {...fadeUp(0)} className="mb-6">
          <Link href="/my-documents">
            <motion.div
              whileHover={{ x: -4 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="inline-block"
            >
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />Back to Documents
              </Button>
            </motion.div>
          </Link>
        </motion.div>

        {/* Title row */}
        <motion.div {...fadeUp(0.08)} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-[#1c2024] dark:text-white">
              {doc.type ?? doc.document_type}
            </h1>
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
            >
              <Badge variant="approved">approved</Badge>
            </motion.div>
          </div>
          <p className="text-[#60646c] dark:text-[#b0b4ba] font-mono text-sm">
            ID: {doc.id.toUpperCase()}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main column */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="lg:col-span-2 space-y-6"
          >
            {/* Document details */}
            <motion.div variants={staggerItem}>
              <Card>
                <CardHeader><CardTitle>Document Details</CardTitle></CardHeader>
                <CardContent>
                  <motion.div
                    variants={staggerContainer}
                    initial="initial"
                    animate="animate"
                    className="grid grid-cols-2 gap-4"
                  >
                    <motion.div variants={staggerItem}><DetailRow label="Document Type"  value={doc.type ?? doc.document_type} /></motion.div>
                    <motion.div variants={staggerItem}><DetailRow label="Purpose"        value={displayPurpose ?? '—'} /></motion.div>
                    <motion.div variants={staggerItem}><DetailRow label="Date Requested" value={new Date(doc.created_at).toLocaleDateString()} /></motion.div>
                    <motion.div variants={staggerItem}><DetailRow label="Status"         value="Approved" /></motion.div>
                    {doc.additional_info && (
                      <motion.div variants={staggerItem} className="col-span-2">
                        <p className="text-sm text-[#60646c] dark:text-[#b0b4ba] mb-2">Additional Information</p>
                        <p className="text-[#1c2024] dark:text-white bg-[#f0f0f3] dark:bg-white/5 p-3 rounded-lg">{doc.additional_info}</p>
                      </motion.div>
                    )}
                    {doc.notes && (
                      <motion.div variants={staggerItem} className="col-span-2">
                        <p className="text-sm text-[#60646c] dark:text-[#b0b4ba] mb-2">Notes from Barangay</p>
                        <p className="text-[#1c2024] dark:text-white bg-[#f0f0f3] dark:bg-white/5 p-3 rounded-lg">{doc.notes}</p>
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

            {/* Profile */}
            {profile && (
              <motion.div variants={staggerItem}>
                <Card>
                  <CardHeader><CardTitle>Your Information</CardTitle></CardHeader>
                  <CardContent>
                    <motion.div
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                      className="space-y-3"
                    >
                      <motion.div variants={staggerItem}>
                        <IconRow
                          icon={<User className="w-4 h-4 text-[#60646c] dark:text-[#b0b4ba]" />}
                          label="Full Name"
                          value={`${profile.firstName} ${profile.lastName}`}
                        />
                      </motion.div>
                      <motion.div variants={staggerItem}>
                        <IconRow
                          icon={<MapPin className="w-4 h-4 text-[#60646c] dark:text-[#b0b4ba]" />}
                          label="Address"
                          value={profile.address || '—'}
                        />
                      </motion.div>
                      {profile.birthday && (
                        <motion.div variants={staggerItem}>
                          <IconRow
                            icon={<Calendar className="w-4 h-4 text-[#60646c] dark:text-[#b0b4ba]" />}
                            label="Birthday"
                            value={new Date(profile.birthday).toLocaleDateString()}
                          />
                        </motion.div>
                      )}
                      {profile.civilStatus && (
                        <motion.div variants={staggerItem}>
                          <DetailRow label="Civil Status" value={profile.civilStatus} />
                        </motion.div>
                      )}
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>

          {/* Sidebar */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-6"
          >
            {/* Download card */}
            <motion.div {...slideIn('right', 0.15)}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: [0, -8, 8, 0] }}
                      transition={{ delay: 0.6, duration: 0.5 }}
                    >
                      <FileText className="w-5 h-5 text-green-500" />
                    </motion.div>
                    Document File
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {doc.file_url ? (
                    <>
                      <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-2 text-green-500 text-sm"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, delay: 0.35 }}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </motion.div>
                        <span>File is ready to download</span>
                      </motion.div>

                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                        <motion.div
                          whileHover={{ scale: 1.02, y: -1 }}
                          whileTap={{ scale: 0.97 }}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                        >
                          <Button variant="default" className="w-full gap-2 mt-2">
                            <motion.div
                              animate={{ y: [0, -2, 0] }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                            >
                              <Download className="w-4 h-4" />
                            </motion.div>
                            Download Document
                          </Button>
                        </motion.div>
                      </a>
                    </>
                  ) : (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-sm text-[#60646c] dark:text-[#b0b4ba] text-center py-2"
                    >
                      The barangay hasn't uploaded your document file yet. Please check back later.
                    </motion.p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Status card */}
            <motion.div {...slideIn('right', 0.25)}>
              <Card>
                <CardHeader><CardTitle>Status</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, delay: 0.35 }}
                    className="flex items-center gap-2 text-green-500"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Approved</span>
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.45 }}
                  >
                    <DetailRow label="Date" value={new Date(doc.created_at).toLocaleString()} />
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
            {/* Blockchain verification card */}
            {doc.file_hash && (
              <motion.div {...slideIn('right', 0.35)}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-500" />
                      Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HashDisplay hash={doc.file_hash} txHash={doc.chain_tx_hash} />
                  </CardContent>
                </Card>
              </motion.div>
            )}

          </motion.div>
        </div>
      </div>
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
      <motion.div
        whileHover={{ scale: 1.2, rotate: 8 }}
        transition={{ type: 'spring', stiffness: 400 }}
        className="mt-0.5 shrink-0"
      >
        {icon}
      </motion.div>
      <div>
        <p className="text-xs text-[#60646c] dark:text-[#b0b4ba]">{label}</p>
        <p className="text-[#1c2024] dark:text-white text-sm">{value}</p>
      </div>
    </div>
  );
}