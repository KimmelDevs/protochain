'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import Button from '@/app/components/ui/Button';
import {
  ArrowLeft, XCircle, User, Mail, Phone,
  MapPin, Clock, Loader2,
} from 'lucide-react';
import Link from 'next/link';

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

export default function RejectedRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // ✅ Fetch request via API route — decrypts sensitive fields
        const reqRes = await fetch(`/api/requests?id=${id}&status=rejected`);
        if (!reqRes.ok) { setNotFound(true); return; }
        const reqJson = await reqRes.json();
        if (!reqJson.data?.[0]) { setNotFound(true); return; }
        setRequest(reqJson.data[0]);

        // ✅ Fetch profile via API route — decrypts phone, address, birthday
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
    };
    load();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
    </div>
  );

  if (notFound || !request) return (
    <div className="min-h-screen p-4 lg:p-8 flex items-center justify-center">
      <Card><CardContent className="p-8 text-center">
        <p className="text-gray-400 mb-4">Request not found</p>
        <Link href="/rejected-requests"><Button>Back to Rejected Requests</Button></Link>
      </CardContent></Card>
    </div>
  );

  const displayPurpose = request.purpose === 'others' && request.custom_purpose ? request.custom_purpose : request.purpose;

  const extraDetails: { label: string; value: string | null }[] = [];
  if (request.document_type === 'barangay-clearance') extraDetails.push(
    { label: 'Purok / Zone', value: request.purok }, { label: 'CTC Number', value: request.ctc_no },
    { label: 'CTC Date Issued', value: request.ctc_date_issued }, { label: 'CTC Place Issued', value: request.ctc_place_issued },
  );
  if (request.document_type === 'business-clearance') extraDetails.push(
    { label: 'Business Name', value: request.business_name }, { label: 'Location / Purok', value: request.purok },
  );
  if (request.document_type === 'certification-of-death') extraDetails.push(
    { label: 'Deceased Name', value: request.deceased_name }, { label: 'Age at Death', value: request.deceased_age },
    { label: 'Date of Death', value: request.date_of_death }, { label: 'Place of Death', value: request.place_of_death },
    { label: 'Relationship', value: request.relationship_to_deceased },
  );
  if (request.document_type === 'job-seeker') extraDetails.push(
    { label: 'BCN Number', value: request.bcn_no }, { label: 'Purok / Zone', value: request.purok },
    { label: 'Years of Residency', value: request.years_of_residency },
  );
  if (request.document_type === 'oath-of-undertaking') extraDetails.push(
    { label: 'Purok / Zone', value: request.purok }, { label: 'Years of Residency', value: request.years_of_residency },
  );

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">

        <Link href="/rejected-requests">
          <Button variant="ghost" className="mb-6 gap-2"><ArrowLeft className="w-4 h-4" />Back to Rejected Requests</Button>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">{request.type ?? request.document_type}</h1>
            <Badge variant="rejected">rejected</Badge>
          </div>
          <p className="text-gray-400 font-mono text-sm">ID: {request.id.toUpperCase()}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Rejection Reason */}
            <Card className="border border-red-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-400">
                  <XCircle className="w-5 h-5" />Reason for Rejection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white bg-red-500/10 p-4 rounded-lg">
                  {request.notes ?? 'No reason provided.'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Request Information</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label="Document Type" value={request.type ?? request.document_type} />
                  <DetailRow label="Purpose" value={displayPurpose ?? '—'} />
                  <DetailRow label="Date Requested" value={new Date(request.created_at).toLocaleDateString()} />
                  {request.additional_info && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-400 mb-2">Additional Information</p>
                      <p className="text-white bg-white/5 p-3 rounded-lg">{request.additional_info}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

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

            {profile && (
              <Card>
                <CardHeader><CardTitle>Applicant Information</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <IconRow icon={<User className="w-5 h-5 text-gray-400" />} label="Full Name" value={`${profile.firstName} ${profile.lastName}`} />
                  <IconRow icon={<Mail className="w-5 h-5 text-gray-400" />} label="Email" value={profile.email} />
                  <IconRow icon={<Phone className="w-5 h-5 text-gray-400" />} label="Phone" value={profile.phone} />
                  <IconRow icon={<MapPin className="w-5 h-5 text-gray-400" />} label="Address" value={profile.address} />
                  {profile.birthday && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <DetailRow label="Birthday" value={new Date(profile.birthday).toLocaleDateString()} />
                      <DetailRow label="Civil Status" value={profile.civilStatus ?? '—'} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><XCircle className="w-5 h-5 text-red-400" />Status</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-red-400">
                  <XCircle className="w-5 h-5" /><span className="font-medium">Rejected</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-blue-400" />Timeline</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Date Submitted" value={new Date(request.created_at).toLocaleString()} />
                <DetailRow label="Date Rejected" value={new Date(request.created_at).toLocaleString()} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-white font-medium">{value}</p>
    </div>
  );
}

function IconRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-white">{value}</p>
      </div>
    </div>
  );
}