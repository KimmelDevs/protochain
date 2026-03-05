// app/lib/utils/docGenerators.ts
// Shared between review-request and approved-documents detail pages.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RequestDetail {
  id: string; type: string; document_type: string; status: string;
  created_at: string; processed_at?: string | null; purpose: string;
  custom_purpose: string | null; additional_info: string | null;
  file_url: string | null; notes: string | null; file_hash: string | null;
  purok: string | null; ctc_no: string | null; ctc_date_issued: string | null;
  ctc_place_issued: string | null; business_name: string | null;
  deceased_name: string | null; deceased_age: string | null;
  date_of_death: string | null; place_of_death: string | null;
  relationship_to_deceased: string | null; years_of_residency: string | null;
  bcn_no: string | null; user_id: string;
}

/** Normalised profile — always camelCase, always decrypted. */
export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  birthday: string | null;
  civilStatus: string | null;
}

// ─── Profile normaliser ───────────────────────────────────────────────────────
// Supabase returns snake_case columns.  The API may or may not remap them.
// This function handles BOTH shapes so generators always receive camelCase.

export function normaliseProfile(raw: Record<string, any>): Profile {
  return {
    firstName:   raw.firstName   ?? raw.first_name   ?? '',
    lastName:    raw.lastName    ?? raw.last_name     ?? '',
    email:       raw.email       ?? '',
    phone:       raw.phone       ?? '',
    address:     raw.address     ?? '',
    birthday:    raw.birthday    ?? null,
    civilStatus: raw.civilStatus ?? raw.civil_status  ?? null,
  };
}

// ─── SHA-256 hasher ───────────────────────────────────────────────────────────

export async function sha256Hex(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ─── JSZip loader ─────────────────────────────────────────────────────────────

export async function loadJSZip(): Promise<any> {
  if (typeof window === 'undefined') throw new Error('JSZip is browser-only');
  // @ts-ignore
  if (typeof window.JSZip === 'undefined') {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload  = () => resolve();
      s.onerror = () => reject(new Error('Failed to load JSZip'));
      document.head.appendChild(s);
    });
  }
  // @ts-ignore
  return window.JSZip;
}

export const xmlEscape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

// ─── Ordinal suffix helper ────────────────────────────────────────────────────

function ordinal(day: string): string {
  if (day.endsWith('1') && day !== '11') return 'st';
  if (day.endsWith('2') && day !== '12') return 'nd';
  if (day.endsWith('3') && day !== '13') return 'rd';
  return 'th';
}

// ─── Document generators ──────────────────────────────────────────────────────

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export async function generateBrgyClearance(req: RequestDetail, profile: Profile): Promise<Blob> {
  const JSZip = await loadJSZip();
  const response = await fetch('/files/BRGY-CLEARANCE-TEMPLATE.docx');
  if (!response.ok) throw new Error('Could not load Barangay Clearance template');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());

  const name    = `${profile.firstName} ${profile.lastName}`;
  const sex     = profile.civilStatus?.toLowerCase().includes('female') ? 'female' : 'male';
  const today   = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
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
  content = content.replace(/CTC #: __________________ /g,    `CTC #: ${xmlEscape(req.ctc_no ?? '')} `);
  content = content.replace(/Date Issued: ______________ /g,  `Date Issued: ${xmlEscape(req.ctc_date_issued ?? '')} `);
  content = content.replace(/Place Issued: ______________/g,  `Place Issued: ${xmlEscape(req.ctc_place_issued ?? '')}`);
  content = content.replace(
    /Further certifies that he\/ she has no derogatory record and has good moral character as per our Barangay record in connected\. /g,
    `Further certifies that he/ she has no derogatory record and has good moral character as per our Barangay record in connected. This clearance is issued upon request for ${xmlEscape(purpose ?? '')} and for whatever legal purpose it may serve. `
  );

  zip.file('word/document.xml', content);
  return new Blob([await zip.generateAsync({ type: 'arraybuffer' })], { type: DOCX_MIME });
}

export async function generateBusinessClearance(req: RequestDetail, profile: Profile): Promise<Blob> {
  const JSZip = await loadJSZip();
  const response = await fetch('/files/BUSINESS-CLEARANCE.docx');
  if (!response.ok) throw new Error('Could not load Business Clearance template');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());

  const owner  = `${profile.firstName} ${profile.lastName}`;
  const today  = new Date();
  const day    = today.getDate().toString();
  const suffix = ordinal(day);
  const month  = today.toLocaleDateString('en-PH', { month: 'long' }).toUpperCase();
  const year   = today.getFullYear().toString();

  let content: string = await zip.file('word/document.xml').async('string');

  content = content.replace(/Grante GREGORIO BALDOMARO GOMEZ, /g, `Granted to ${xmlEscape(owner)}, `);
  content = content.replace(/GREGORIO BALDOMARO COMEZ/g,          xmlEscape(owner));
  content = content.replace(/of AGRICULTURAL PRODUCTS /g,         `of ${xmlEscape(req.business_name ?? '')} `);
  content = content.replace(/(<w:t[^>]*>)PUROK-1 (<\/w:t>)/g,     `$1${xmlEscape(req.purok ?? '')} $2`);
  content = content.replace(/(<w:t[^>]*>)04(<\/w:t>)/,            `$1${xmlEscape(day)}$2`);
  content = content.replace(/(<w:t[^>]*>)th(<\/w:t>)/,            `$1${xmlEscape(suffix)}$2`);
  content = content.replace(/of DECEMBER /g,                      `of ${xmlEscape(month)} `);
  content = content.replace(/(<w:t[^>]*>)2025(<\/w:t>)/g,         `$1${xmlEscape(year)}$2`);

  zip.file('word/document.xml', content);
  return new Blob([await zip.generateAsync({ type: 'arraybuffer' })], { type: DOCX_MIME });
}

export async function generateDeathCert(req: RequestDetail, profile: Profile): Promise<Blob> {
  const JSZip = await loadJSZip();
  const response = await fetch('/files/CERTIFICATION-OF-DEATH.docx');
  if (!response.ok) throw new Error('Could not load Death Certification template');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());

  const requestor = `${profile.firstName} ${profile.lastName}`;
  const today     = new Date();
  const day       = today.getDate().toString();
  const suffix    = ordinal(day);
  const month     = today.toLocaleDateString('en-PH', { month: 'long' }).toUpperCase();
  const year      = today.getFullYear().toString();

  let content: string = await zip.file('word/document.xml').async('string');

  content = content.replace(/ERNESTO VALENZUELA ,/g,                                 `${xmlEscape(req.deceased_name ?? '')},`);
  content = content.replace(/ 72 /g,                                                 ` ${xmlEscape(req.deceased_age ?? '')} `);
  content = content.replace(/Purok 5, Brgy\. Guin- on, Calbayog City/g,             xmlEscape(req.purok ?? ''));
  content = content.replace(/\. The said aforementioned name died on MAY 8 2025/g,   `. The said aforementioned name died on ${xmlEscape(req.date_of_death ?? '')}`);
  content = content.replace(/PUROK 5 BRGY\. GUIN- ON  CALBAYOG CITY\./g,            `${xmlEscape(req.place_of_death ?? '')}.`);
  content = content.replace(/ ISAGANI ROJAS CANETE/g,                               ` ${xmlEscape(requestor)}`);
  content = content.replace(/ \(son\) of the deceased/g,                            ` (${xmlEscape(req.relationship_to_deceased ?? '')}) of the deceased`);
  content = content.replace(/(<w:t[^>]*>)14(<\/w:t>)/g,                             `$1${xmlEscape(day)}$2`);
  content = content.replace(/(<w:t[^>]*>)th(<\/w:t>)/g,                             `$1${xmlEscape(suffix)}$2`);
  content = content.replace(/(<w:t[^>]*>)MAY(<\/w:t>)/g,                            `$1${xmlEscape(month)}$2`);
  content = content.replace(/(<w:t[^>]*>), 2025 (<\/w:t>)/g,                        `$1, ${xmlEscape(year)} $2`);

  zip.file('word/document.xml', content);
  return new Blob([await zip.generateAsync({ type: 'arraybuffer' })], { type: DOCX_MIME });
}

export async function generateJobSeeker(req: RequestDetail, profile: Profile): Promise<Blob> {
  const JSZip = await loadJSZip();
  const response = await fetch('/files/Certification.docx');
  if (!response.ok) throw new Error('Could not load Job Seeker Certification template');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());

  const name   = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const today  = new Date();
  const day    = today.getDate().toString().padStart(2, '0');
  const suffix = ordinal(day).toUpperCase();
  const month  = today.toLocaleDateString('en-PH', { month: 'long' }).toUpperCase();
  const year   = today.getFullYear().toString();

  let content: string = await zip.file('word/document.xml').async('string');

  content = content.replace(/JIRAH JALAYAJAY ARIMALA/g,                   xmlEscape(name));
  content = content.replace(/MAIKA DELA CRUZ MERILLES/g,                  xmlEscape(name));
  content = content.replace(/(<w:t[^>]*>) BCN NO\.: 09(<\/w:t>)/g,        `$1 BCN NO.: ${xmlEscape(req.bcn_no ?? '')}$2`);
  content = content.replace(/(<w:t[^>]*>)09(<\/w:t>)/g,                   `$1${xmlEscape(req.bcn_no ?? '')}$2`);
  content = content.replace(/for 5 years\/month,/g,                       `for ${xmlEscape(req.years_of_residency ?? '')} years/month,`);
  content = content.replace(/(<w:t[^>]*>)06(<\/w:t>)/g,                   `$1${xmlEscape(day)}$2`);
  content = content.replace(/(<w:t[^>]*>)TH(<\/w:t>)/g,                   `$1${xmlEscape(suffix)}$2`);
  content = content.replace(/(<w:t[^>]*>)OCTOBER (<\/w:t>)/g,             `$1${xmlEscape(month)} $2`);
  content = content.replace(/2025, in Calbayog City, Samar\./g,           `${xmlEscape(year)}, in Calbayog City, Samar.`);
  content = content.replace(/(<w:t[^>]*>)OCTOBER 06(<\/w:t>)/g,           `$1${xmlEscape(month)} ${xmlEscape(day)}$2`);
  content = content.replace(/(<w:t[^>]*>), 2025(<\/w:t>)/g,               `$1, ${xmlEscape(year)}$2`);

  zip.file('word/document.xml', content);
  return new Blob([await zip.generateAsync({ type: 'arraybuffer' })], { type: DOCX_MIME });
}

export async function generateOath(req: RequestDetail, profile: Profile): Promise<Blob> {
  const JSZip = await loadJSZip();
  const response = await fetch('/files/Oath-of-Undertaking-for-First-Time-Jobseeker.docx');
  if (!response.ok) throw new Error('Could not load Oath of Undertaking template');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());

  const name   = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const today  = new Date();
  const day    = today.getDate().toString();
  const suffix = ordinal(day);
  const month  = today.toLocaleDateString('en-PH', { month: 'long' }).toUpperCase();
  const year   = today.getFullYear().toString();

  let content: string = await zip.file('word/document.xml').async('string');

  content = content.replace(/EGBERT KIA DELA CRUZ/g,      xmlEscape(name));
  content = content.replace(/Samar for 5 years,/g,        `Samar for ${xmlEscape(req.years_of_residency ?? '')} years,`);
  content = content.replace(
    /(Signed, this<\/w:t><\/w:r><w:r[^>]*><w:rPr>[^<]*(?:<[^<]*>)*<\/w:rPr><w:t xml:space="preserve">) 2(<\/w:t>)/,
    `$1 ${xmlEscape(day)}$2`
  );
  content = content.replace(/(<w:t[^>]*>) SEPTEMBER (<\/w:t>)/g,                      `$1 ${xmlEscape(month)} $2`);
  content = content.replace(/ 2024, in Barangay Guin-on, Calbayog City, Samar\./g,    ` ${xmlEscape(year)}, in Barangay Guin-on, Calbayog City, Samar.`);

  zip.file('word/document.xml', content);
  return new Blob([await zip.generateAsync({ type: 'arraybuffer' })], { type: DOCX_MIME });
}

// ─── Generate dispatch ────────────────────────────────────────────────────────

export async function generateDocument(
  req: RequestDetail,
  profile: Profile,
): Promise<{ blob: Blob; fileName: string }> {
  const safeName = `${profile.firstName}_${profile.lastName}`.replace(/\s+/g, '_');

  switch (req.document_type) {
    case 'barangay-clearance':
      return { blob: await generateBrgyClearance(req, profile),    fileName: `Barangay_Clearance_${safeName}.docx` };
    case 'business-clearance':
      return { blob: await generateBusinessClearance(req, profile), fileName: `Business_Clearance_${safeName}.docx` };
    case 'certification-of-death':
      return { blob: await generateDeathCert(req, profile),        fileName: `Certification_of_Death_${safeName}.docx` };
    case 'job-seeker':
      return { blob: await generateJobSeeker(req, profile),        fileName: `FTJ_Certification_${safeName}.docx` };
    case 'oath-of-undertaking':
      return { blob: await generateOath(req, profile),             fileName: `Oath_of_Undertaking_${safeName}.docx` };
    default:
      throw new Error(`No template available for document type: ${req.document_type}`);
  }
}