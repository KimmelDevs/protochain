'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params);
  const router   = useRouter();

  const [request,  setRequest]  = useState<RequestDetail | null>(null);
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Sync dark mode from localStorage
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        // ── /api/requests decrypts all sensitive fields server-side ──────────
        const reqRes = await fetch(`/api/requests?id=${id}&user_id=${user.id}`);
        if (!reqRes.ok) { setNotFound(true); return; }
        const reqJson = await reqRes.json();
        const data: RequestDetail | undefined = reqJson.data?.[0];

        // Ownership check — never show another user's request
        if (!data || data.user_id !== user.id) { setNotFound(true); return; }
        setRequest(data);

        // ── /api/profile decrypts firstName, lastName, phone, address, etc. ──
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
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  );

  if (notFound || !request) return (
    <div className="min-h-screen p-4 lg:p-8 flex items-center justify-center">
      <Card><CardContent className="p-8 text-center">
        <p className="text-gray-400 mb-4">Request not found</p>
        <Link href="/my-requests"><Button>Back to Requests</Button></Link>
      </CardContent></Card>
    </div>
  );

  const displayPurpose = request.purpose === 'others' && request.custom_purpose
    ? request.custom_purpose : request.purpose;

  // Build document-specific extra fields
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

  return (
    <div className="min-h-screen p-4 lg:p-8 bg-gray-50 dark:bg-[#0f0f23] text-gray-900 dark:text-white transition-colors duration-300">
      <div className="max-w-5xl mx-auto">

        <Link href="/my-requests">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />Back to Requests
          </Button>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{request.type ?? request.document_type}</h1>
            <Badge variant={request.status as any}>{request.status}</Badge>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-mono text-sm">ID: {request.id.toUpperCase()}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Request details */}
            <Card>
              <CardHeader><CardTitle>Request Details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label="Document Type"  value={request.type ?? request.document_type} />
                  <DetailRow label="Purpose"         value={displayPurpose ?? '—'} />
                  <DetailRow label="Date Requested"  value={new Date(request.created_at).toLocaleDateString()} />
                  <DetailRow label="Date Processed"  value={request.processed_at ? new Date(request.processed_at).toLocaleDateString() : 'Pending'} />
                  {request.additional_info && (
                    <div className="col-span-2">
                      <DetailRow label="Additional Info" value={request.additional_info} />
                    </div>
                  )}
                  {request.notes && (
                    <div className="col-span-2">
                      <DetailRow label="Admin Notes" value={request.notes} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Document-specific submitted info */}
            {extraDetails.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Submitted Information</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {extraDetails.map(d => <DetailRow key={d.label} label={d.label} value={d.value ?? '—'} />)}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Profile */}
            {profile && (
              <Card>
                <CardHeader><CardTitle>Applicant Information</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <IconRow icon={<User  className="w-5 h-5 text-gray-500 dark:text-gray-400" />} label="Name"    value={`${profile.firstName} ${profile.lastName}`} />
                  <IconRow icon={<Mail  className="w-5 h-5 text-gray-500 dark:text-gray-400" />} label="Email"   value={profile.email}   />
                  <IconRow icon={<Phone className="w-5 h-5 text-gray-500 dark:text-gray-400" />} label="Phone"   value={profile.phone}   />
                  <IconRow icon={<MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400" />} label="Address" value={profile.address} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Status</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-white/5 rounded-lg">
                  {request.status === 'approved' && <CheckCircle className="w-6 h-6 text-green-400" />}
                  {request.status === 'pending'  && <Clock       className="w-6 h-6 text-yellow-400" />}
                  {request.status === 'rejected' && <XCircle     className="w-6 h-6 text-red-400"    />}
                  <div>
                    <p className="text-gray-900 dark:text-white font-medium capitalize">{request.status}</p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      {request.status === 'pending'  && 'Your request is being reviewed.'}
                      {request.status === 'approved' && 'Your document is ready.'}
                      {request.status === 'rejected' && 'Your request was not approved.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {request.status === 'approved' && request.file_url && (
            <Card>
              <CardHeader>
                <CardTitle>Your Document</CardTitle>
              </CardHeader>
              <CardContent>
                <a href={request.file_url} target="_blank" rel="noopener noreferrer" download>
                  <Button variant="orange" className="w-full gap-2">
                    <Download className="w-4 h-4" />
                    Download Document
                  </Button>
                </a>
              </CardContent>
            </Card>
          )}

            {request.status === 'approved' && !request.file_url && (
              <Card><CardContent className="p-4">
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
                  Your request is approved. Please visit the barangay office to claim your document.
                </p>
              </CardContent></Card>
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
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-gray-900 dark:text-white font-medium">{value}</p>
    </div>
  );
}

function IconRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}