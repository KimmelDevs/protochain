'use client';

import { use, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import Button from '@/app/components/ui/Button';
import TextArea from '@/app/components/ui/TextArea';
import Modal from '@/app/components/ui/Modal';
import Alert from '@/app/components/ui/Alert';
import {
  ArrowLeft, CheckCircle, XCircle, User, Mail, Phone,
  MapPin, Clock, AlertCircle, Loader2,
  FileText, Download, Upload, Wand2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

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

async function loadJSZip() {
  // @ts-ignore
  if (typeof window.JSZip === 'undefined') {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load JSZip'));
      document.head.appendChild(s);
    });
  }
  // @ts-ignore
  return window.JSZip;
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

async function generateBrgyClearance(req: RequestDetail, profile: Profile): Promise<Blob> {
  const JSZip = await loadJSZip();
  const response = await fetch('/files/BRGY-CLEARANCE-TEMPLATE.docx');
  if (!response.ok) throw new Error('Could not load template');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const name = `${profile.firstName} ${profile.lastName}`;
  const sex = profile.civilStatus?.toLowerCase().includes('female') ? 'female' : 'male';
  const today = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const purpose = req.purpose === 'others' && req.custom_purpose ? req.custom_purpose : req.purpose;
  let content: string = await zip.file('word/document.xml').async('string');
  content = content.replace(
    /_____________________ of legal age, male\/female, single\/married\/widow\/ widower, Filipino citizen, whose name and signature\/right thumb mark appears below is a BONAFIDE and permanent resident of BRGY\. GUIN-ON, Calbayog City, /g,
    `${xmlEscape(name)} of legal age, ${xmlEscape(sex)}, ${xmlEscape(profile.civilStatus ?? '')}, Filipino citizen, whose name and signature/right thumb mark appears below is a BONAFIDE and permanent resident of ${xmlEscape(req.purok ?? '')}, BRGY. GUIN-ON, Calbayog City, `
  );
  content = content.replace(
    /Issued this ___ day of JANUARY, 2024 at Brgy\. Guin-on, Calbayog City, Samar, Philippines\./g,
    `Issued this ${xmlEscape(today)} at Brgy. Guin-on, Calbayog City, Samar, Philippines.`
  );
  content = content.replace(/CTC #: __________________ /g, `CTC #: ${xmlEscape(req.ctc_no ?? '')} `);
  content = content.replace(/Date Issued: ______________ /g, `Date Issued: ${xmlEscape(req.ctc_date_issued ?? '')} `);
  content = content.replace(/Place Issued: ______________/g, `Place Issued: ${xmlEscape(req.ctc_place_issued ?? '')}`);
  content = content.replace(
    /Further certifies that he\/ she has no derogatory record and has good moral character as per our Barangay record in connected\. /g,
    `Further certifies that he/ she has no derogatory record and has good moral character as per our Barangay record in connected. This clearance is issued upon request for ${xmlEscape(purpose ?? '')} and for whatever legal purpose it may serve. `
  );
  zip.file('word/document.xml', content);
  const out = await zip.generateAsync({ type: 'arraybuffer' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

async function generateBusinessClearance(req: RequestDetail, profile: Profile): Promise<Blob> {
  const JSZip = await loadJSZip();
  const response = await fetch('/files/BUSINESS-CLEARANCE.docx');
  if (!response.ok) throw new Error('Could not load template');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const owner = `${profile.firstName} ${profile.lastName}`;
  const today = new Date();
  const day = today.getDate().toString();
  const suffix = day.endsWith('1') && day !== '11' ? 'st' : day.endsWith('2') && day !== '12' ? 'nd' : day.endsWith('3') && day !== '13' ? 'rd' : 'th';
  const month = today.toLocaleDateString('en-PH', { month: 'long' }).toUpperCase();
  const year = today.getFullYear().toString();
  let content: string = await zip.file('word/document.xml').async('string');
  content = content.replace(/Grante GREGORIO BALDOMARO GOMEZ, /g, `Granted to ${xmlEscape(owner)}, `);
  content = content.replace(/GREGORIO BALDOMARO COMEZ/g, xmlEscape(owner));
  content = content.replace(/of AGRICULTURAL PRODUCTS /g, `of ${xmlEscape(req.business_name ?? '')} `);
  content = content.replace(/(<w:t[^>]*>)PUROK-1 (<\/w:t>)/g, `$1${xmlEscape(req.purok ?? '')} $2`);
  content = content.replace(/(<w:t[^>]*>)04(<\/w:t>)/, `$1${xmlEscape(day)}$2`);
  content = content.replace(/(<w:t[^>]*>)th(<\/w:t>)/, `$1${xmlEscape(suffix)}$2`);
  content = content.replace(/of DECEMBER /g, `of ${xmlEscape(month)} `);
  content = content.replace(/(<w:t[^>]*>)2025(<\/w:t>)/g, `$1${xmlEscape(year)}$2`);
  zip.file('word/document.xml', content);
  const out = await zip.generateAsync({ type: 'arraybuffer' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

async function generateDeathCert(req: RequestDetail, profile: Profile): Promise<Blob> {
  const JSZip = await loadJSZip();
  const response = await fetch('/files/CERTIFICATION-OF-DEATH.docx');
  if (!response.ok) throw new Error('Could not load template');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const requestor = `${profile.firstName} ${profile.lastName}`;
  const today = new Date();
  const day = today.getDate().toString();
  const suffix = day.endsWith('1') && day !== '11' ? 'st' : day.endsWith('2') && day !== '12' ? 'nd' : day.endsWith('3') && day !== '13' ? 'rd' : 'th';
  const month = today.toLocaleDateString('en-PH', { month: 'long' }).toUpperCase();
  const year = today.getFullYear().toString();
  let content: string = await zip.file('word/document.xml').async('string');
  content = content.replace(/ERNESTO VALENZUELA ,/g, `${xmlEscape(req.deceased_name ?? '')},`);
  content = content.replace(/ 72 /g, ` ${xmlEscape(req.deceased_age ?? '')} `);
  content = content.replace(/Purok 5, Brgy\. Guin- on, Calbayog City/g, xmlEscape(req.purok ?? ''));
  content = content.replace(/\. The said aforementioned name died on MAY 8 2025/g,
    `. The said aforementioned name died on ${xmlEscape(req.date_of_death ?? '')}`);
  content = content.replace(/PUROK 5 BRGY\. GUIN- ON  CALBAYOG CITY\./g, `${xmlEscape(req.place_of_death ?? '')}.`);
  content = content.replace(/ ISAGANI ROJAS CANETE/g, ` ${xmlEscape(requestor)}`);
  content = content.replace(/ \(son\) of the deceased/g, ` (${xmlEscape(req.relationship_to_deceased ?? '')}) of the deceased`);
  content = content.replace(/(<w:t[^>]*>)14(<\/w:t>)/g, `$1${xmlEscape(day)}$2`);
  content = content.replace(/(<w:t[^>]*>)th(<\/w:t>)/g, `$1${xmlEscape(suffix)}$2`);
  content = content.replace(/(<w:t[^>]*>)MAY(<\/w:t>)/g, `$1${xmlEscape(month)}$2`);
  content = content.replace(/(<w:t[^>]*>), 2025 (<\/w:t>)/g, `$1, ${xmlEscape(year)} $2`);
  zip.file('word/document.xml', content);
  const out = await zip.generateAsync({ type: 'arraybuffer' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

async function generateJobSeeker(req: RequestDetail, profile: Profile): Promise<Blob> {
  const JSZip = await loadJSZip();
  const response = await fetch('/files/Certification.docx');
  if (!response.ok) throw new Error('Could not load template');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const name = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const today = new Date();
  const day = today.getDate().toString().padStart(2, '0');
  const suffix = day.endsWith('1') && day !== '11' ? 'ST' : day.endsWith('2') && day !== '12' ? 'ND' : day.endsWith('3') && day !== '13' ? 'RD' : 'TH';
  const month = today.toLocaleDateString('en-PH', { month: 'long' }).toUpperCase();
  const year = today.getFullYear().toString();
  let content: string = await zip.file('word/document.xml').async('string');
  content = content.replace(/JIRAH JALAYAJAY ARIMALA/g, xmlEscape(name));
  content = content.replace(/MAIKA DELA CRUZ MERILLES/g, xmlEscape(name));
  content = content.replace(/(<w:t[^>]*>) BCN NO\.: 09(<\/w:t>)/g, `$1 BCN NO.: ${xmlEscape(req.bcn_no ?? '')}$2`);
  content = content.replace(/(<w:t[^>]*>)09(<\/w:t>)/g, `$1${xmlEscape(req.bcn_no ?? '')}$2`);
  content = content.replace(/for 5 years\/month,/g, `for ${xmlEscape(req.years_of_residency ?? '')} years/month,`);
  content = content.replace(/(<w:t[^>]*>)06(<\/w:t>)/g, `$1${xmlEscape(day)}$2`);
  content = content.replace(/(<w:t[^>]*>)TH(<\/w:t>)/g, `$1${xmlEscape(suffix)}$2`);
  content = content.replace(/(<w:t[^>]*>)OCTOBER (<\/w:t>)/g, `$1${xmlEscape(month)} $2`);
  content = content.replace(/2025, in Calbayog City, Samar\./g, `${xmlEscape(year)}, in Calbayog City, Samar.`);
  content = content.replace(/(<w:t[^>]*>)OCTOBER 06(<\/w:t>)/g, `$1${xmlEscape(month)} ${xmlEscape(day)}$2`);
  content = content.replace(/(<w:t[^>]*>), 2025(<\/w:t>)/g, `$1, ${xmlEscape(year)}$2`);
  zip.file('word/document.xml', content);
  const out = await zip.generateAsync({ type: 'arraybuffer' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

async function generateOath(req: RequestDetail, profile: Profile): Promise<Blob> {
  const JSZip = await loadJSZip();
  const response = await fetch('/files/Oath-of-Undertaking-for-First-Time-Jobseeker.docx');
  if (!response.ok) throw new Error('Could not load template');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  const name = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const today = new Date();
  const day = today.getDate().toString();
  const suffix = day.endsWith('1') && day !== '11' ? 'st' : day.endsWith('2') && day !== '12' ? 'nd' : day.endsWith('3') && day !== '13' ? 'rd' : 'th';
  const month = today.toLocaleDateString('en-PH', { month: 'long' }).toUpperCase();
  const year = today.getFullYear().toString();
  let content: string = await zip.file('word/document.xml').async('string');
  content = content.replace(/EGBERT KIA DELA CRUZ/g, xmlEscape(name));
  content = content.replace(/Samar for 5 years,/g, `Samar for ${xmlEscape(req.years_of_residency ?? '')} years,`);
  content = content.replace(
    /(Signed, this<\/w:t><\/w:r><w:r[^>]*><w:rPr>[^<]*(?:<[^<]*>)*<\/w:rPr><w:t xml:space="preserve">) 2(<\/w:t>)/,
    `$1 ${xmlEscape(day)}$2`
  );
  content = content.replace(/(<w:t[^>]*>) SEPTEMBER (<\/w:t>)/g, `$1 ${xmlEscape(month)} $2`);
  content = content.replace(/ 2024, in Barangay Guin-on, Calbayog City, Samar\./g,
    ` ${xmlEscape(year)}, in Barangay Guin-on, Calbayog City, Samar.`);
  zip.file('word/document.xml', content);
  const out = await zip.generateAsync({ type: 'arraybuffer' });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
}

export default function ReviewRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const uploadRef = useRef<HTMLInputElement>(null);

  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [generatedFileName, setGeneratedFileName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        // ✅ Fetch request via API route — decrypts sensitive fields
        const reqRes = await fetch(`/api/requests?id=${id}`);
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

  const handleApprove = async () => {
    setProcessing(true);
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('requests')
        .update({ status: 'approved', notes: approvalNotes || null, processed_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;
      setRequest(prev => prev ? { ...prev, status: 'approved' } : prev);
      setShowApproveModal(false);
      setSuccess('Request approved! Now generate and upload the document below.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve request.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { setError('Please provide a reason for rejection.'); return; }
    setProcessing(true);
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('requests')
        .update({ status: 'rejected', notes: rejectReason, processed_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;
      setShowRejectModal(false);
      router.push('/pending-requests');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject request.');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerate = async () => {
    if (!request || !profile) return;
    setGenerating(true);
    setError('');
    try {
      let blob: Blob;
      const name = `${profile.firstName}_${profile.lastName}`.replace(/\s+/g, '_');
      let fileName = '';
      switch (request.document_type) {
        case 'barangay-clearance': blob = await generateBrgyClearance(request, profile); fileName = `Barangay_Clearance_${name}.docx`; break;
        case 'business-clearance': blob = await generateBusinessClearance(request, profile); fileName = `Business_Clearance_${name}.docx`; break;
        case 'certification-of-death': blob = await generateDeathCert(request, profile); fileName = `Certification_of_Death_${name}.docx`; break;
        case 'job-seeker': blob = await generateJobSeeker(request, profile); fileName = `FTJ_Certification_${name}.docx`; break;
        case 'oath-of-undertaking': blob = await generateOath(request, profile); fileName = `Oath_of_Undertaking_${name}.docx`; break;
        default: throw new Error('No template for this document type.');
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      setGeneratedBlob(blob);
      setGeneratedFileName(fileName);
      setSuccess('Document generated and downloaded! Review it, then click "Upload to Supabase" to make it available to the resident.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate document.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUploadGenerated = async () => {
    if (!generatedBlob || !generatedFileName) return;
    await uploadFile(generatedBlob, generatedFileName);
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file, file.name);
  };

  const uploadFile = async (file: Blob, fileName: string) => {
    setUploading(true);
    setError('');
    try {
      const path = `documents/${id}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
      const { error: updateError } = await supabase.from('requests').update({ file_url: urlData.publicUrl }).eq('id', id);
      if (updateError) throw updateError;
      setRequest(prev => prev ? { ...prev, file_url: urlData.publicUrl } : prev);
      setSuccess('Document uploaded! The resident can now download it from their requests page.');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-400 animate-spin" /></div>;

  if (notFound || !request) return (
    <div className="min-h-screen p-4 lg:p-8 flex items-center justify-center">
      <Card><CardContent className="p-8 text-center">
        <p className="text-gray-400 mb-4">Request not found</p>
        <Link href="/pending-requests"><Button>Back to Pending Requests</Button></Link>
      </CardContent></Card>
    </div>
  );

  const displayPurpose = request.purpose === 'others' && request.custom_purpose ? request.custom_purpose : request.purpose;
  const daysWaiting = Math.floor((Date.now() - new Date(request.created_at).getTime()) / (1000 * 60 * 60 * 24));

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
        <input ref={uploadRef} type="file" accept=".docx,.pdf" className="hidden" onChange={handleManualUpload} />

        <Link href="/pending-requests">
          <Button variant="ghost" className="mb-6 gap-2"><ArrowLeft className="w-4 h-4" />Back to Pending Requests</Button>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">{request.type ?? request.document_type}</h1>
            <Badge variant={request.status as any}>{request.status}</Badge>
          </div>
          <p className="text-gray-400 font-mono text-sm">ID: {request.id.toUpperCase()}</p>
        </motion.div>

        {daysWaiting >= 2 && request.status === 'pending' && (
          <div className="mb-6">
            <Alert variant="error" title="Waiting Too Long">
              This request has been waiting for {daysWaiting} days. Please process it as soon as possible.
            </Alert>
          </div>
        )}
        {error && <div className="mb-6"><Alert variant="error" onClose={() => setError('')}>{error}</Alert></div>}
        {success && <div className="mb-6"><Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert></div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Request Information</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label="Document Type" value={request.type ?? request.document_type} />
                  <DetailRow label="Purpose" value={displayPurpose ?? '—'} />
                  <DetailRow label="Date Requested" value={new Date(request.created_at).toLocaleDateString()} />
                  <DetailRow label="Days Waiting" value={daysWaiting === 0 ? 'Today' : `${daysWaiting} day${daysWaiting > 1 ? 's' : ''}`} />
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

            {request.status === 'approved' && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-blue-400" />Document Generation</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {request.file_url ? (
                    <div className="space-y-3">
                      <Alert variant="success">Document has been uploaded. The resident can now download it.</Alert>
                      <a href={request.file_url} target="_blank" rel="noopener noreferrer" download>
                        <Button variant="outline" className="w-full gap-2"><Download className="w-4 h-4" />Download Uploaded Document</Button>
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-400">Generate the document using the resident's submitted data, then upload it so they can download it.</p>
                      <Button className="w-full gap-2" onClick={handleGenerate} disabled={generating}>
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                        {generating ? 'Generating...' : 'Step 1: Generate & Download .docx'}
                      </Button>
                      {generatedBlob && (
                        <Button variant="outline" className="w-full gap-2" onClick={handleUploadGenerated} disabled={uploading}>
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {uploading ? 'Uploading...' : `Step 2: Upload "${generatedFileName}" to Supabase`}
                        </Button>
                      )}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
                        <div className="relative flex justify-center text-xs"><span className="bg-[#0f0f23] px-2 text-gray-500">or upload manually</span></div>
                      </div>
                      <Button variant="outline" className="w-full gap-2" onClick={() => uploadRef.current?.click()} disabled={uploading}>
                        <Upload className="w-4 h-4" />Upload Existing File (.docx or .pdf)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {request.status === 'pending' ? (
                  <>
                    <Button className="w-full gap-2" onClick={() => setShowApproveModal(true)}>
                      <CheckCircle className="w-4 h-4" />Approve Request
                    </Button>
                    <Button variant="outline" className="w-full gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => setShowRejectModal(true)}>
                      <XCircle className="w-4 h-4" />Reject Request
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-2">
                    {request.status === 'approved' && <div className="flex items-center gap-2 text-green-400 justify-center"><CheckCircle className="w-5 h-5" /><span className="font-medium">Approved</span></div>}
                    {request.status === 'rejected' && <div className="flex items-center gap-2 text-red-400 justify-center"><XCircle className="w-5 h-5" /><span className="font-medium">Rejected</span></div>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="w-5 h-5 text-blue-400" />Processing Info</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <DetailRow label="Standard Processing" value="1-2 business days" />
                <DetailRow label="Date Submitted" value={new Date(request.created_at).toLocaleString()} />
                {request.status !== 'pending' && <DetailRow label="Status" value={request.status.toUpperCase()} />}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-400 font-medium mb-1">Important</p>
                    <p className="text-xs text-gray-400">After approving, generate the document and upload it so the resident can download it from their requests page.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} title="Approve Request">
          <div className="space-y-4">
            <Alert variant="success">You are about to approve this request. After approving you can generate and upload the document.</Alert>
            <TextArea label="Approval Notes (Optional)" value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} rows={4} placeholder="Add any notes for this approval..." />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowApproveModal(false)} disabled={processing}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleApprove} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {processing ? 'Processing...' : 'Confirm Approval'}
              </Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Request">
          <div className="space-y-4">
            <Alert variant="warning">Please provide a clear reason for rejection. This will be visible to the resident.</Alert>
            <TextArea label="Reason for Rejection *" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} placeholder="Explain why this request is being rejected..." />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowRejectModal(false)} disabled={processing}>Cancel</Button>
              <Button className="flex-1 gap-2 bg-red-500 hover:bg-red-600" onClick={handleReject} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {processing ? 'Processing...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
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