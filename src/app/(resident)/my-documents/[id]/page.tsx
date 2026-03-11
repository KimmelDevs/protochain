'use client';

import { use, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import Button from '@/app/components/ui/Button';
import {
  ArrowLeft, Download, FileText, CheckCircle, Loader2, Calendar, User, MapPin,
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

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [doc, setDoc] = useState<RequestDoc | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data, error } = await supabase
          .from('requests')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .single();

        if (error || !data) { setNotFound(true); return; }
        setDoc(data);

        const { data: profileData } = await supabase
          .from('profiles')
          .select('firstName, lastName, email, phone, address, birthday, civilStatus')
          .eq('id', user.id)
          .single();

        if (profileData) setProfile(profileData);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (notFound || !doc) {
    return (
      <div className="min-h-screen p-4 lg:p-8 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">Document not found</p>
          <Link href="/my-documents"><Button>Back to Documents</Button></Link>
        </div>
      </div>
    );
  }

  const displayPurpose = doc.purpose === 'others' && doc.custom_purpose
    ? doc.custom_purpose : doc.purpose;

  // Build document-specific extra fields
  const extraDetails: { label: string; value: string | null }[] = [];
  if (doc.document_type === 'barangay-clearance') {
    extraDetails.push(
      { label: 'Purok / Zone', value: doc.purok },
      { label: 'CTC Number', value: doc.ctc_no },
      { label: 'CTC Date Issued', value: doc.ctc_date_issued },
      { label: 'CTC Place Issued', value: doc.ctc_place_issued },
    );
  }
  if (doc.document_type === 'business-clearance') {
    extraDetails.push(
      { label: 'Business Name', value: doc.business_name },
      { label: 'Location / Purok', value: doc.purok },
    );
  }
  if (doc.document_type === 'certification-of-death') {
    extraDetails.push(
      { label: 'Deceased Name', value: doc.deceased_name },
      { label: 'Age at Death', value: doc.deceased_age },
      { label: 'Date of Death', value: doc.date_of_death },
      { label: 'Place of Death', value: doc.place_of_death },
      { label: 'Relationship', value: doc.relationship_to_deceased },
    );
  }
  if (doc.document_type === 'job-seeker') {
    extraDetails.push(
      { label: 'BCN Number', value: doc.bcn_no },
      { label: 'Purok / Zone', value: doc.purok },
      { label: 'Years of Residency', value: doc.years_of_residency },
    );
  }
  if (doc.document_type === 'oath-of-undertaking') {
    extraDetails.push(
      { label: 'Purok / Zone', value: doc.purok },
      { label: 'Years of Residency', value: doc.years_of_residency },
    );
  }

  return (
    <div className="min-h-screen p-4 lg:p-8">
      <div className="max-w-5xl mx-auto">

        <Link href="/my-documents">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />Back to Documents
          </Button>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">{doc.type ?? doc.document_type}</h1>
            <Badge variant="approved">approved</Badge>
          </div>
          <p className="text-gray-400 font-mono text-sm">ID: {doc.id.toUpperCase()}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Request details */}
            <Card>
              <CardHeader><CardTitle>Document Details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label="Document Type" value={doc.type ?? doc.document_type} />
                  <DetailRow label="Purpose" value={displayPurpose ?? '—'} />
                  <DetailRow label="Date Requested" value={new Date(doc.created_at).toLocaleDateString()} />
                  <DetailRow label="Status" value="Approved" />
                  {doc.additional_info && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-400 mb-2">Additional Information</p>
                      <p className="text-white bg-white/5 p-3 rounded-lg">{doc.additional_info}</p>
                    </div>
                  )}
                  {doc.notes && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-400 mb-2">Notes from Barangay</p>
                      <p className="text-white bg-white/5 p-3 rounded-lg">{doc.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Extra fields */}
            {extraDetails.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Submitted Information</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {extraDetails.map(d => (
                      <DetailRow key={d.label} label={d.label} value={d.value ?? '—'} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Profile */}
            {profile && (
              <Card>
                <CardHeader><CardTitle>Your Information</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <IconRow icon={<User className="w-4 h-4 text-gray-400" />} label="Full Name"
                    value={`${profile.firstName} ${profile.lastName}`} />
                  <IconRow icon={<MapPin className="w-4 h-4 text-gray-400" />} label="Address"
                    value={profile.address || '—'} />
                  {profile.birthday && (
                    <IconRow icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Birthday"
                      value={new Date(profile.birthday).toLocaleDateString()} />
                  )}
                  {profile.civilStatus && (
                    <DetailRow label="Civil Status" value={profile.civilStatus} />
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Download */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-400" />Document File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {doc.file_url ? (
                  <>
                    <div className="flex items-center gap-2 text-green-400 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>File is ready to download</span>
                    </div>
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                      <Button className="w-full gap-2">
                        <Download className="w-4 h-4" />Download Document
                      </Button>
                    </a>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-2">
                    The barangay hasn't uploaded your document file yet. Please check back later.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Status timeline */}
            <Card>
              <CardHeader><CardTitle>Status</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Approved</span>
                </div>
                <DetailRow label="Date" value={new Date(doc.created_at).toLocaleString()} />
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
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-white text-sm">{value}</p>
      </div>
    </div>
  );
}