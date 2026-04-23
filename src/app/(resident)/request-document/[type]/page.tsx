'use client';

import { use, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import TextArea from '@/app/components/ui/TextArea';
import Select from '@/app/components/ui/Select';
import Button from '@/app/components/ui/Button';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

const documentConfig: Record<string, {
  title: string;
  description: string;
  purposes: { value: string; label: string }[];
}> = {
  'barangay-clearance': {
    title: 'Barangay Clearance',
    description: 'General-purpose clearance for employment, business, and other transactions.',
    purposes: [
      { value: 'employment', label: 'Employment' },
      { value: 'business', label: 'Business' },
      { value: 'travel', label: 'Travel' },
      { value: 'loan', label: 'Loan Application' },
      { value: 'others', label: 'Others' },
    ],
  },
  'business-clearance': {
    title: 'Business Clearance',
    description: 'Required for business permit applications within the barangay.',
    purposes: [
      { value: 'new-business', label: 'New Business' },
      { value: 'renewal', label: 'Business Renewal' },
      { value: 'expansion', label: 'Business Expansion' },
    ],
  },
  'certification-of-death': {
    title: 'Certification of Death',
    description: 'Official barangay certification for the death of a resident.',
    purposes: [
      { value: 'legal', label: 'Legal Purpose' },
      { value: 'insurance', label: 'Insurance' },
      { value: 'government', label: 'Government Transaction' },
      { value: 'others', label: 'Others' },
    ],
  },
  'job-seeker': {
    title: 'First Time Jobseeker Certification',
    description: 'Certification for first-time job seekers under RA 11261.',
    purposes: [{ value: 'job-application', label: 'Job Application' }],
  },
  'oath-of-undertaking': {
    title: 'Oath of Undertaking',
    description: 'Oath of undertaking for first-time job seekers under RA 11261.',
    purposes: [{ value: 'job-application', label: 'Job Application' }],
  },
};

function FloatInput({ label, value, onChange, type = 'text', required = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div className="relative">
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder=" " required={required}
        className={`peer w-full px-4 pt-6 pb-2 rounded-lg bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/10 text-black dark:text-white
          focus:outline-none focus:ring-2 focus:ring-[#0d74ce] focus:border-[#0d74ce]`}
      />
      <label className={`absolute left-4 text-[#60646c] dark:text-[#b0b4ba] text-sm transition-all pointer-events-none
        ${value ? 'top-2 text-xs' : 'top-1/2 -translate-y-1/2'}
        peer-focus:top-2 peer-focus:text-xs peer-focus:translate-y-0`}>
        {label}{required ? ' *' : ''}
      </label>
    </div>
  );
}

// Dedicated date picker input that:
// 1. Hides the browser's dd/mm/yyyy mask when unfocused and empty
// 2. Opens the calendar picker on click/focus
// 3. Keeps the floating label behaviour
function FloatDateInput({ label, value, onChange, required = false }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasValue = value !== '';
  const isFloated = hasValue || focused;

  const handleFocus = () => {
    setFocused(true);
    // Delay showPicker slightly so the type switch from 'text' → 'date' is committed first
    setTimeout(() => {
      try { inputRef.current?.showPicker(); } catch { /* some browsers block programmatic picker */ }
    }, 50);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        // Use 'text' type when empty + unfocused so the browser hides the dd/mm/yyyy mask
        type={focused || hasValue ? 'date' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={() => setFocused(false)}
        placeholder=" "
        required={required}
        className="peer w-full px-4 pt-6 pb-2 rounded-lg bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/10 text-black dark:text-white
          focus:outline-none focus:ring-2 focus:ring-[#0d74ce] focus:border-[#0d74ce]
          [&::-webkit-calendar-picker-indicator]:opacity-60 dark:[&::-webkit-calendar-picker-indicator]:invert
          [&::-webkit-calendar-picker-indicator]:cursor-pointer"
      />
      <label
        className={`absolute left-4 text-[#60646c] dark:text-[#b0b4ba] transition-all duration-150 pointer-events-none
          ${isFloated ? 'top-2 text-xs' : 'top-1/2 -translate-y-1/2 text-sm'}`}
      >
        {label}{required ? ' *' : ''}
      </label>
    </div>
  );
}

export default function RequestDocumentFormPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params);
  const router = useRouter();
  const config = documentConfig[type];

  const [profile, setProfile] = useState<Record<string, string> | null>(null);
  const [purpose, setPurpose] = useState('');
  const [customPurpose, setCustomPurpose] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [purok, setPurok] = useState('');
  const [ctcNo, setCtcNo] = useState('');
  const [ctcDateIssued, setCtcDateIssued] = useState('');
  const [ctcPlaceIssued, setCtcPlaceIssued] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [deceasedName, setDeceasedName] = useState('');
  const [deceasedAge, setDeceasedAge] = useState('');
  const [dateOfDeath, setDateOfDeath] = useState('');
  const [placeOfDeath, setPlaceOfDeath] = useState('');
  const [deceasedAddress, setDeceasedAddress] = useState('');
  const [relationship, setRelationship] = useState('');
  const [yearsOfResidency, setYearsOfResidency] = useState('');
  const [bcnNo, setBcnNo] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const res = await fetch(`/api/profile?id=${user.id}`);
        if (!res.ok) throw new Error('Failed to load profile');
        const json = await res.json();
        setProfile({ ...json.data, id: user.id });
      } catch {
        toast.error('Failed to load your profile. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  const validate = (): boolean => {
    if (!purpose) { toast.error('Please select a purpose.'); return false; }
    if (purpose === 'others' && !customPurpose.trim()) { toast.error('Please specify your purpose.'); return false; }
    if (type === 'barangay-clearance' && (!purok.trim() || !ctcNo.trim() || !ctcDateIssued || !ctcPlaceIssued.trim())) { toast.error('Please fill in all required fields.'); return false; }
    if (type === 'business-clearance' && (!businessName.trim() || !purok.trim() || !ctcNo.trim() || !ctcDateIssued || !ctcPlaceIssued.trim())) { toast.error('Please fill in all required fields.'); return false; }
    if (type === 'certification-of-death' && (!deceasedName.trim() || !deceasedAge.trim() || !dateOfDeath || !placeOfDeath.trim() || !deceasedAddress.trim() || !relationship.trim())) { toast.error('Please fill in all deceased person details.'); return false; }
    if (type === 'job-seeker' && (!purok.trim() || !yearsOfResidency.trim() || !bcnNo.trim())) { toast.error('Please fill in all required fields.'); return false; }
    if (type === 'oath-of-undertaking' && (!purok.trim() || !yearsOfResidency.trim())) { toast.error('Please fill in all required fields.'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!profile) { toast.error('Profile not loaded. Please refresh.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile.id,
          document_type: type,
          type: config.title,
          purpose,
          custom_purpose: customPurpose || null,
          additional_info: additionalInfo || null,
          status: 'pending',
          ...(type === 'barangay-clearance' && { purok, ctc_no: ctcNo, ctc_date_issued: ctcDateIssued, ctc_place_issued: ctcPlaceIssued }),
          ...(type === 'business-clearance' && { business_name: businessName, purok, ctc_no: ctcNo, ctc_date_issued: ctcDateIssued, ctc_place_issued: ctcPlaceIssued }),
          ...(type === 'certification-of-death' && { deceased_name: deceasedName, deceased_age: deceasedAge, date_of_death: dateOfDeath, place_of_death: placeOfDeath, deceased_address: deceasedAddress, relationship_to_deceased: relationship }),
          ...(type === 'job-seeker' && { purok, years_of_residency: yearsOfResidency, bcn_no: bcnNo }),
          ...(type === 'oath-of-undertaking' && { purok, years_of_residency: yearsOfResidency }),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to submit request.');
      setSubmitted(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!config) return (
    <div className="min-h-screen p-4 lg:p-8 flex items-center justify-center bg-gray-50 dark:bg-[#171717]">
      <Card className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/10">
        <CardContent className="p-8 text-center">
          <p className="text-lg font-semibold text-black dark:text-white mb-2">Not Found</p>
          <p className="text-[#60646c] dark:text-[#b0b4ba] mb-6">This document type does not exist.</p>
          <Link href="/request-document"><Button>Back to Document Types</Button></Link>
        </CardContent>
      </Card>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen p-4 lg:p-8 flex items-center justify-center bg-gray-50 dark:bg-[#171717]">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/10">
          <CardContent className="p-10 text-center max-w-md">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-black dark:text-white mb-2">Request Submitted!</h2>
            <p className="text-[#60646c] dark:text-[#b0b4ba] mb-6">
              Your <span className="text-black dark:text-white font-medium">{config.title}</span> request has been received.
              You'll be notified once it's ready.
            </p>
            <div className="flex flex-col gap-3">
              <Link href="/my-requests"><Button variant='orange' className="w-full">View My Requests</Button></Link>
              <Link href="/request-document"><Button variant="outline" className="w-full">Request Another</Button></Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#171717]">
      <Loader2 className="w-8 h-8 text-[#0d74ce] animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen p-4 lg:p-8 bg-gray-50 dark:bg-[#171717]">
      <div className="max-w-2xl mx-auto">
        <Link href="/request-document">
          <Button variant="ghost" className="mb-6 gap-2 text-black dark:text-white"><ArrowLeft className="w-4 h-4" />Back</Button>
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-3xl font-bold text-black dark:text-white mb-2">{config.title}</h1>
          <p className="text-gray-700 dark:text-[#b0b4ba]">{config.description}</p>
        </motion.div>


        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/10">
            <CardHeader><CardTitle className="text-black dark:text-white">Your Information</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-[#60646c] dark:text-[#b0b4ba] mb-4">
                Pulled from your profile. If anything is wrong,{' '}
                <Link href="/profile" className="text-[#0d74ce] hover:underline">update your profile</Link> first.
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <InfoRow label="Name" value={`${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim()} />
                <InfoRow label="Email" value={profile?.email ?? ''} />
                <InfoRow label="Phone" value={profile?.phone ?? ''} />
                <InfoRow label="Civil Status" value={profile?.civilStatus ?? ''} />
                <div className="col-span-2"><InfoRow label="Address" value={profile?.address ?? ''} /></div>
              </div>
            </CardContent>
          </Card>

          {type === 'barangay-clearance' && (
            <Card className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/10">
              <CardHeader><CardTitle className="text-black dark:text-white">Additional Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FloatInput label="Purok" value={purok} onChange={setPurok} required />
                <FloatInput label="CTC Number" value={ctcNo} onChange={setCtcNo} required />
                {/* FloatDateInput: calendar picker, hides dd/mm/yyyy mask when empty + unfocused */}
                <FloatDateInput label="CTC Date Issued" value={ctcDateIssued} onChange={setCtcDateIssued} required />
                <FloatInput label="CTC Place Issued" value={ctcPlaceIssued} onChange={setCtcPlaceIssued} required />
              </CardContent>
            </Card>
          )}

          {type === 'business-clearance' && (
            <Card className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/10">
              <CardHeader><CardTitle className="text-black dark:text-white">Business Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FloatInput label="Business Name" value={businessName} onChange={setBusinessName} required />
                <FloatInput label="Purok" value={purok} onChange={setPurok} required />
                <FloatInput label="CTC Number" value={ctcNo} onChange={setCtcNo} required />
                <FloatDateInput label="CTC Date Issued" value={ctcDateIssued} onChange={setCtcDateIssued} required />
                <FloatInput label="CTC Place Issued" value={ctcPlaceIssued} onChange={setCtcPlaceIssued} required />
              </CardContent>
            </Card>
          )}

          {type === 'certification-of-death' && (
            <Card className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/10">
              <CardHeader><CardTitle className="text-black dark:text-white">Deceased Person's Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FloatInput label="Full Name of Deceased" value={deceasedName} onChange={setDeceasedName} required />
                <FloatInput label="Age at Time of Death" value={deceasedAge} onChange={setDeceasedAge} required />
                {/* FloatDateInput: calendar picker, hides dd/mm/yyyy mask when empty + unfocused */}
                <FloatDateInput label="Date of Death" value={dateOfDeath} onChange={setDateOfDeath} required />
                <FloatInput label="Place of Death" value={placeOfDeath} onChange={setPlaceOfDeath} required />
                <FloatInput label="Deceased's Home Address" value={deceasedAddress} onChange={setDeceasedAddress} required />
                <FloatInput label="Your Relationship to Deceased" value={relationship} onChange={setRelationship} required />
              </CardContent>
            </Card>
          )}

          {type === 'job-seeker' && (
            <Card className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/10">
              <CardHeader><CardTitle className="text-black dark:text-white">Additional Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FloatInput label="BCN Number" value={bcnNo} onChange={setBcnNo} required />
                <FloatInput label="Purok" value={purok} onChange={setPurok} required />
                <FloatInput label="Years of Residency in Barangay" value={yearsOfResidency} onChange={setYearsOfResidency} required />
              </CardContent>
            </Card>
          )}

          {type === 'oath-of-undertaking' && (
            <Card className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/10">
              <CardHeader><CardTitle className="text-black dark:text-white">Additional Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FloatInput label="Purok" value={purok} onChange={setPurok} required />
                <FloatInput label="Years of Residency in Barangay" value={yearsOfResidency} onChange={setYearsOfResidency} required />
              </CardContent>
            </Card>
          )}

          <Card className="bg-white dark:bg-[#1a1a1a] border border-gray-300 dark:border-white/10">
            <CardHeader><CardTitle className="text-black dark:text-white">Request Details</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <Select label="Purpose *" name="purpose" value={purpose}
                onChange={(e) => { setPurpose(e.target.value); }}
                options={[{ value: '', label: 'Select a purpose...' }, ...config.purposes]} required
              />
              {purpose === 'others' && (
                <FloatInput label="Specify Purpose" value={customPurpose} onChange={setCustomPurpose} required />
              )}
              <TextArea label="Additional Information (Optional)" name="additionalInfo"
                value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)}
                rows={3} placeholder="Any extra details that may help process your request..."
                className="bg-white dark:bg-[#1a1a1a] text-black dark:text-white border border-gray-300 dark:border-white/10"
              />
              <div className="flex gap-3 pt-2">
                <Link href="/request-document" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">Cancel</Button>
                </Link>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 gap-2 text-white"
                  variant='orange'
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[#60646c] dark:text-[#b0b4ba] text-xs mb-0.5">{label}</p>
      <p className="text-black dark:text-white">{value || <span className="text-[#b0b4ba] dark:text-gray-500 italic text-xs">Not set</span>}</p>
    </div>
  );
}
