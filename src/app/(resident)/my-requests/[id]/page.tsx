'use client';

import { use, useState, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import Button from '@/app/components/ui/Button';
import {
  ArrowLeft, User, MapPin, Phone, Mail,
  CheckCircle, Clock, XCircle, Download, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

interface RequestDetail {
  id: string; type: string; document_type: string; status: string;
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
  firstName: string; lastName: string; email: string;
  phone: string; address: string;
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

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params);
  const router   = useRouter();

  const [request,  setRequest]  = useState<RequestDetail | null>(null);
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
              firstName: p.firstName ?? p.first_name ?? '',
              lastName:  p.lastName  ?? p.last_name  ?? '',
              email:     p.email     ?? '',
              phone:     p.phone     ?? '',
              address:   p.address   ?? '',
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
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
      >
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
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="text-[#b0b4ba] mb-4"
          >
            Request not found
          </motion.p>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link href="/my-requests"><Button>Back to Requests</Button></Link>
          </motion.div>
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
      { label: 'Deceased Name',    value: request.deceased_name },
      { label: 'Age at Death',     value: request.deceased_age },
      { label: 'Date of Death',    value: request.date_of_death },
      { label: 'Place of Death',   value: request.place_of_death },
      { label: 'Relationship',     value: request.relationship_to_deceased },
    );
  }
  if (request.document_type === 'job-seeker') {
    extraDetails.push(
      { label: 'BCN Number',         value: request.bcn_no },
      { label: 'Purok / Zone',       value: request.purok },
      { label: 'Years of Residency', value: request.years_of_residency },
    );
  }
  if (request.document_type === 'oath-of-undertaking') {
    extraDetails.push(
      { label: 'Purok / Zone',       value: request.purok },
      { label: 'Years of Residency', value: request.years_of_residency },
    );
  }

  const statusIcon = {
    approved: <CheckCircle className="w-6 h-6 text-green-500" />,
    pending:  <Clock       className="w-6 h-6 text-[#ab6400]" />,
    rejected: <XCircle     className="w-6 h-6 text-[#eb8e90]"    />,
  }[request.status] ?? <Clock className="w-6 h-6 text-[#b0b4ba]" />;

  const statusMsg = {
    pending:  'Your request is being reviewed.',
    approved: 'Your document is ready.',
    rejected: 'Your request was not approved.',
  }[request.status] ?? '';

  return (
    <div className="min-h-screen p-4 lg:p-8 bg-gray-50 dark:bg-[#171717] text-[#1c2024] dark:text-white transition-colors duration-300">
      <div className="max-w-5xl mx-auto">

        {/* Back button */}
        <motion.div {...fadeUp(0)} className="mb-6">
          <Link href="/my-requests">
            <motion.div
              whileHover={{ x: -4 }}
              transition={{ type: 'spring', stiffness: 400 }}
              className="inline-block"
            >
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />Back to Requests
              </Button>
            </motion.div>
          </Link>
        </motion.div>

        {/* Title row */}
        <motion.div {...fadeUp(0.08)} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-[#1c2024] dark:text-white">
              {request.type ?? request.document_type}
            </h1>
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, delay: 0.2 }}
            >
              <Badge variant={request.status as any}>{request.status}</Badge>
            </motion.div>
          </div>
          <p className="text-[#60646c] dark:text-[#b0b4ba] font-mono text-sm">
            ID: {request.id.toUpperCase()}
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
                    <motion.div variants={staggerItem}><DetailRow label="Document Type"  value={request.type ?? request.document_type} /></motion.div>
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
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, delay: 0.35 }}
                    >
                      {statusIcon}
                    </motion.div>
                    <div>
                      <p className="text-[#1c2024] dark:text-white font-medium capitalize">{request.status}</p>
                      <p className="text-[#60646c] dark:text-[#b0b4ba] text-xs">{statusMsg}</p>
                    </div>
                  </motion.div>
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
                      <motion.div
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Button variant="default" className="w-full gap-2">
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
        whileHover={{ scale: 1.2, rotate: 6 }}
        transition={{ type: 'spring', stiffness: 400 }}
        className="mt-0.5 shrink-0"
      >
        {icon}
      </motion.div>
      <div>
        <p className="text-sm text-[#60646c] dark:text-[#b0b4ba]">{label}</p>
        <p className="text-[#1c2024] dark:text-white">{value}</p>
      </div>
    </div>
  );
}