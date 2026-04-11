/**
 * Docgenerators.ts
 *
 * Generates barangay documents by:
 *  1. Fetching the .docx template from /public/files/
 *  2. Replacing text placeholders with actual data via JSZip XML patching
 *  3. Injecting signature images at {%SIGNATURE_1} and {%SIGNATURE_2} placeholders
 *     — signatures are fetched from the `admin_signatures` Supabase table
 *  4. Generating a Reed-Solomon-encoded QR code at {%QR_CODE} placeholder
 *     — QR encodes a verification URL carrying the RS-protected document hash
 *
 * HOW THE PLACEHOLDERS WORK:
 *  - In your .docx template, type exactly:  {%SIGNATURE_1}
 *    on its own line/paragraph where the Secretary signature should appear.
 *  - Type {%SIGNATURE_2} where the Captain's signature should appear.
 *  - Type {%QR_CODE} where the verification QR code image should appear.
 *  - The code finds those runs in the XML and replaces the entire
 *    surrounding <w:p> paragraph with an inline image drawing.
 */

import { supabase } from '@/app/lib/supabase';
import { rsEncode, hexToBytes, bytesToHex } from '@/app/lib/utils/reedsolomon';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RequestDetail {
  id:                        string;
  user_id:                   string;
  document_type:             string;
  type?:                     string;
  status:                    string;
  purpose?:                  string;
  custom_purpose?:           string;
  notes?:                    string | null;
  additional_info?:          string;
  file_url?:                 string;
  file_hash?:                string;
  chain_tx_hash?:            string;
  created_at:                string;
  processed_at?:             string;
  // Document-specific fields
  purok?:                    string;
  ctc_no?:                   string;
  ctc_date_issued?:          string;
  ctc_place_issued?:         string;
  business_name?:            string;
  deceased_name?:            string;
  deceased_age?:             string;
  date_of_death?:            string;
  place_of_death?:           string;
  relationship_to_deceased?: string;
  bcn_no?:                   string;
  years_of_residency?:       string;
}

export interface Profile {
  id:          string;
  firstName:   string;
  lastName:    string;
  email:       string;
  phone?:      string;
  address?:    string;
  birthday?:   string;
  civilStatus?: string;
  sex?:        string;
  age?:        string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function normaliseProfile(raw: Record<string, string>): Profile {
  return {
    id:          raw.id          ?? '',
    firstName:   raw.first_name  ?? raw.firstName  ?? '',
    lastName:    raw.last_name   ?? raw.lastName   ?? '',
    email:       raw.email       ?? '',
    phone:       raw.phone       ?? raw.contact_number ?? '',
    address:     raw.address     ?? '',
    birthday:    raw.birthday    ?? raw.date_of_birth ?? '',
    civilStatus: raw.civil_status ?? raw.civilStatus ?? '',
    sex:         raw.sex         ?? raw.gender ?? '',
    age:         raw.age         ?? '',
  };
}

export async function sha256Hex(blob: Blob): Promise<string> {
  const buf    = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const xmlEscape = (s: string) =>
  s.replace(/&/g, '&amp;')
   .replace(/</g, '&lt;')
   .replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;')
   .replace(/'/g, '&apos;');

const getToday = () =>
  new Date().toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

// ─── JSZip loader ─────────────────────────────────────────────────────────────

async function loadJSZip(): Promise<any> {
  // @ts-ignore
  if (typeof window.JSZip !== 'undefined') return window.JSZip;
  await new Promise<void>((resolve, reject) => {
    const s    = document.createElement('script');
    s.src      = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload   = () => resolve();
    s.onerror  = () => reject(new Error('Failed to load JSZip'));
    document.head.appendChild(s);
  });
  // @ts-ignore
  return window.JSZip;
}

// ─── Signature fetcher (from admin_signatures table) ─────────────────────────

interface SignatureImages {
  secretary: string | null;  // base64 PNG data URL
  captain:   string | null;  // base64 PNG data URL
}

async function fetchSignatureImages(): Promise<SignatureImages> {
  try {
    const { data, error } = await supabase
      .from('admin_signatures')
      .select('role, record_json');

    if (error || !data || data.length === 0) {
      console.warn('Could not fetch admin_signatures:', error?.message);
      return { secretary: null, captain: null };
    }

    let secretary: string | null = null;
    let captain:   string | null = null;

    for (const row of data) {
      const record = row.record_json as { signatureDataUrl?: string } | null;
      if (!record?.signatureDataUrl) continue;

      if (row.role === 'secretary') secretary = record.signatureDataUrl;
      if (row.role === 'captain')   captain   = record.signatureDataUrl;
    }

    return { secretary, captain };
  } catch (err) {
    console.warn('fetchSignatureImages error:', err);
    return { secretary: null, captain: null };
  }
}

// ─── QR Code generation (Reed-Solomon encoded) ────────────────────────────────

/**
 * Generates a QR code PNG as a base64 data URL.
 *
 * The QR payload is a verification URL that contains a Reed-Solomon
 * encoded version of the document hash, giving ~25% error correction
 * on top of the QR's own ECC. This means the document can still be
 * verified even if the QR is partially damaged.
 *
 * Falls back to encoding just the request ID if no hash is available yet.
 */
async function generateQRCodeDataUrl(
  requestId: string,
  fileHash?: string | null,
): Promise<string | null> {
  try {
    // Build the payload: RS-encode the hash for extra resilience
    let qrPayload: string;

    if (fileHash && /^[0-9a-f]{64}$/i.test(fileHash)) {
      // Encode the 32-byte SHA-256 hash with 32 RS parity bytes (QR level Q equivalent)
      const hashBytes   = hexToBytes(fileHash);
      const rsEncoded   = rsEncode(hashBytes, 32);          // 64 bytes total
      const rsHex       = bytesToHex(rsEncoded);

      // Verification URL — the /verify page accepts a `hash` query param
      const origin      = typeof window !== 'undefined' ? window.location.origin : '';
      qrPayload         = `${origin}/verify?hash=${fileHash}&rs=${rsHex}`;
    } else {
      // Fallback: encode the request ID so the QR is still useful
      const origin  = typeof window !== 'undefined' ? window.location.origin : '';
      qrPayload     = `${origin}/verify?id=${requestId}`;
    }

    // Generate QR using the qrcode library (loaded dynamically)
    const qrDataUrl = await generateQRWithCanvas(qrPayload);
    return qrDataUrl;
  } catch (err) {
    console.warn('QR generation failed:', err);
    return null;
  }
}

/**
 * Renders a QR code to a canvas and returns it as a PNG data URL.
 * Dynamically loads the `qrcode` browser library from CDN.
 */
async function generateQRWithCanvas(text: string): Promise<string> {
  // Load qrcode.js from CDN if not already loaded
  // @ts-ignore
  if (typeof window.QRCode === 'undefined') {
    await new Promise<void>((resolve, reject) => {
      const s    = document.createElement('script');
      s.src      = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload   = () => resolve();
      s.onerror  = () => reject(new Error('Failed to load QRCode library'));
      document.head.appendChild(s);
    });
  }

  return new Promise<string>((resolve, reject) => {
    // Create a temporary off-screen div
    const container       = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:200px;height:200px;';
    document.body.appendChild(container);

    try {
      // @ts-ignore
      const qr = new window.QRCode(container, {
        text,
        width:            256,
        height:           256,
        colorDark:        '#000000',
        colorLight:       '#ffffff',
        correctLevel:     (window as any).QRCode?.CorrectLevel?.H ?? 3, // High error correction
      });

      // QRCode.js renders async via setTimeout internally
      setTimeout(() => {
        try {
          const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
          if (canvas) {
            resolve(canvas.toDataURL('image/png'));
          } else {
            // Fallback: try the img tag src
            const img = container.querySelector('img') as HTMLImageElement | null;
            if (img?.src) {
              resolve(img.src);
            } else {
              reject(new Error('QR canvas/img not found'));
            }
          }
        } finally {
          document.body.removeChild(container);
        }
      }, 200);
    } catch (err) {
      document.body.removeChild(container);
      reject(err);
    }
  });
}

// ─── Image XML builder ────────────────────────────────────────────────────────

/**
 * Builds a <w:p> paragraph containing an inline <wp:inline> image drawing.
 *
 * widthEmu / heightEmu: size in English Metric Units (914400 = 1 inch)
 */
function buildInlineImageParagraph(
  rId:       string,
  widthEmu:  number,
  heightEmu: number,
  descr:     string,
  align:     'left' | 'center' | 'right' = 'left',
): string {
  const jc = align === 'center' ? '<w:jc w:val="center"/>' :
             align === 'right'  ? '<w:jc w:val="right"/>'  : '';

  return `<w:p>` +
    `<w:pPr>${jc}<w:spacing w:before="0" w:after="0"/></w:pPr>` +
    `<w:r>` +
      `<w:drawing>` +
        `<wp:inline distT="0" distB="0" distL="0" distR="0" ` +
          `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">` +
          `<wp:extent cx="${widthEmu}" cy="${heightEmu}"/>` +
          `<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
          `<wp:docPr id="1" name="${xmlEscape(descr)}" descr="${xmlEscape(descr)}"/>` +
          `<wp:cNvGraphicFramePr>` +
            `<a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/>` +
          `</wp:cNvGraphicFramePr>` +
          `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
            `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
              `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
                `<pic:nvPicPr>` +
                  `<pic:cNvPr id="0" name="${xmlEscape(descr)}"/>` +
                  `<pic:cNvPicPr/>` +
                `</pic:nvPicPr>` +
                `<pic:blipFill>` +
                  `<a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>` +
                  `<a:stretch><a:fillRect/></a:stretch>` +
                `</pic:blipFill>` +
                `<pic:spPr>` +
                  `<a:xfrm>` +
                    `<a:off x="0" y="0"/>` +
                    `<a:ext cx="${widthEmu}" cy="${heightEmu}"/>` +
                  `</a:xfrm>` +
                  `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>` +
                `</pic:spPr>` +
              `</pic:pic>` +
            `</a:graphicData>` +
          `</a:graphic>` +
        `</wp:inline>` +
      `</w:drawing>` +
    `</w:r>` +
  `</w:p>`;
}

// ─── Relationship builder ─────────────────────────────────────────────────────

/**
 * Adds an image relationship to word/_rels/document.xml.rels
 * and stores the image bytes in the zip under word/media/.
 */
async function injectImageIntoZip(
  zip:          any,
  base64DataUrl: string,
  fileName:     string,
  rId:          string,
): Promise<void> {
  // Strip the data:image/png;base64, prefix
  const base64 = base64DataUrl.split(',')[1];
  if (!base64) return;

  // Store image in word/media/
  zip.file(`word/media/${fileName}`, base64, { base64: true });

  // Update word/_rels/document.xml.rels
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (!relsFile) return;
  let relsXml: string = await relsFile.async('string');

  const imageType  = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
  const newRelLine = `<Relationship Id="${rId}" Type="${imageType}" Target="media/${fileName}"/>`;

  // Insert before </Relationships>
  relsXml = relsXml.replace('</Relationships>', `${newRelLine}\n</Relationships>`);
  zip.file('word/_rels/document.xml.rels', relsXml);

  // Ensure PNG content type is registered in [Content_Types].xml
  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    let ctXml: string = await ctFile.async('string');
    if (!ctXml.includes('Extension="png"')) {
      ctXml = ctXml.replace(
        '</Types>',
        `<Default Extension="png" ContentType="image/png"/>\n</Types>`
      );
      zip.file('[Content_Types].xml', ctXml);
    }
  }
}

// ─── Placeholder → Image injector ────────────────────────────────────────────

/**
 * Replaces a {%PLACEHOLDER} tag in the docx XML with an inline image.
 *
 * The placeholder paragraph in document.xml looks like:
 *   <w:p>...<w:t>{%SIGNATURE_1}</w:t>...</w:p>
 *
 * We replace the ENTIRE <w:p>...</w:p> block with the image paragraph XML.
 *
 * widthInches / heightInches control the rendered image size.
 */
async function replacePlaceholderWithImage(
  zip:           any,
  placeholder:   string,     // e.g. '{%SIGNATURE_1}'
  base64DataUrl: string,
  rId:           string,
  fileName:      string,
  widthInches:   number,
  heightInches:  number,
  align:         'left' | 'center' | 'right' = 'left',
): Promise<void> {
  const docFile = zip.file('word/document.xml');
  if (!docFile) return;
  let xml: string = await docFile.async('string');

  // Check the placeholder exists — it may be split across runs by Word's XML
  if (!xml.includes(xmlEscape(placeholder)) && !xml.includes(placeholder)) {
    console.warn(`Placeholder "${placeholder}" not found in document.xml`);
    return;
  }

  // Inject the image bytes and relationship
  await injectImageIntoZip(zip, base64DataUrl, fileName, rId);

  const widthEmu  = Math.round(widthInches  * 914400);
  const heightEmu = Math.round(heightInches * 914400);
  const imgParagraph = buildInlineImageParagraph(rId, widthEmu, heightEmu, placeholder, align);

  // Replace the entire <w:p> that contains the placeholder text.
  const escapedTag    = placeholder.replace(/[{}%]/g, '\\$&');
  const xmlEscapedTag = xmlEscape(placeholder).replace(/[{}%]/g, '\\$&');

  // Try both raw and XML-escaped forms of the placeholder
  for (const tag of [escapedTag, xmlEscapedTag]) {
    const pattern = new RegExp(`<w:p[ >][^]*?${tag}[^]*?<\\/w:p>`, 'g');
    const updated = xml.replace(pattern, imgParagraph);
    if (updated !== xml) {
      xml = updated;
      break;
    }
  }

  zip.file('word/document.xml', xml);
}

// ─── Template loader ──────────────────────────────────────────────────────────

const TEMPLATE_MAP: Record<string, string> = {
  'barangay-clearance':    '/files/BRGY-CLEARANCE-TEMPLATE.docx',
  'business-clearance':    '/files/BUSINESS-CLEARANCE.docx',
  'certification-of-death':'/files/CERTIFICATION-OF-DEATH.docx',
  'job-seeker':            '/files/Certification.docx',
  'oath-of-undertaking':   '/files/Oath-of-Undertaking-for-First-Time-Jobseeker.docx',
};

async function loadTemplate(documentType: string): Promise<{ JSZip: any; zip: any }> {
  const JSZip    = await loadJSZip();
  const url      = TEMPLATE_MAP[documentType];
  if (!url) throw new Error(`No template found for document type: ${documentType}`);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load template (${response.status}): ${url}`);

  const buffer = await response.arrayBuffer();
  const zip    = await JSZip.loadAsync(buffer);
  return { JSZip, zip };
}

// ─── Text replacement helpers ─────────────────────────────────────────────────

async function patchXml(zip: any, filename: string, patcher: (xml: string) => string): Promise<void> {
  const file = zip.file(filename);
  if (!file) return;
  const xml     = await file.async('string');
  const updated = patcher(xml);
  zip.file(filename, updated);
}

// ─── Per-document data injectors ──────────────────────────────────────────────

async function injectBarangayClearance(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const name         = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const sex          = profile.sex          ?? 'male';
  const civilStatus  = profile.civilStatus  ?? 'single';
  const purok        = req.purok            ?? '';
  const ctcNo        = req.ctc_no           ?? '___________';
  const ctcDate      = req.ctc_date_issued  ?? '___________';
  const ctcPlace     = req.ctc_place_issued ?? '___________';
  const purpose      = req.purpose === 'others' && req.custom_purpose ? req.custom_purpose : (req.purpose ?? 'general purposes');
  const date         = getToday();

  await patchXml(zip, 'word/document.xml', xml => {
    const certifyText = `${xmlEscape(name)} of legal age, ${xmlEscape(sex)}, ${xmlEscape(civilStatus)}, Filipino citizen, whose name and signature/right thumb mark appears below is a BONAFIDE and permanent resident of ${xmlEscape(purok)}, BRGY. GUIN-ON, Calbayog City,`;
    const furtherCert = `Further certifies that he/ she has no derogatory record and has good moral character as per our Barangay record in connected. This clearance is issued upon request for ${xmlEscape(purpose)} and for whatever legal purpose it may serve.`;

    return xml
      .replace(
        /_____________________ of legal age, male\/female, single\/married\/widow\/ widower, Filipino citizen, whose name and signature\/right thumb mark appears below is a BONAFIDE and permanent resident of BRGY\. GUIN-ON, Calbayog City, /g,
        certifyText
      )
      .replace(
        /Issued this ___ day of JANUARY, 2024 at Brgy\. Guin-on, Calbayog City, Samar, Philippines\./g,
        `Issued this ${xmlEscape(date)} at Brgy. Guin-on, Calbayog City, Samar, Philippines.`
      )
      .replace(/CTC #: __________________ /g,   `CTC #: ${xmlEscape(ctcNo)} `)
      .replace(/Date Issued: ______________ /g,  `Date Issued: ${xmlEscape(ctcDate)} `)
      .replace(/Place Issued: ______________/g,  `Place Issued: ${xmlEscape(ctcPlace)}`)
      .replace(
        /Further certifies that he\/ she has no derogatory record and has good moral character as per our Barangay record in connected\. /g,
        furtherCert + ' '
      );
  });
}

async function injectBusinessClearance(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const owner    = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const business = req.business_name ?? '___________';
  const location = req.purok         ?? '___________';
  const now      = new Date();
  const day      = String(now.getDate());
  const suffix   = day === '1' ? 'st' : day === '2' ? 'nd' : day === '3' ? 'rd' : 'th';
  const month    = now.toLocaleString('en-PH', { month: 'long' }).toUpperCase();
  const year     = String(now.getFullYear());

  await patchXml(zip, 'word/document.xml', xml =>
    xml
      .replace(/Grante GREGORIO BALDOMARO GOMEZ, /g, `Granted to ${xmlEscape(owner)}, `)
      .replace(/GREGORIO BALDOMARO COMEZ/g,           xmlEscape(owner))
      .replace(/of AGRICULTURAL PRODUCTS /g,          `of ${xmlEscape(business)} `)
      .replace(/(<w:t[^>]*>)PUROK-1 (<\/w:t>)/g,     `$1${xmlEscape(location)} $2`)
      .replace(/(<w:t[^>]*>)04(<\/w:t>)/,             `$1${xmlEscape(day)}$2`)
      .replace(/(<w:t[^>]*>)th(<\/w:t>)/,             `$1${xmlEscape(suffix)}$2`)
      .replace(/of DECEMBER /g,                        `of ${xmlEscape(month)} `)
      .replace(/(<w:t[^>]*>)2025(<\/w:t>)/g,          `$1${xmlEscape(year)}$2`)
  );
}

async function injectCertificationOfDeath(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const requestor  = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const deceased   = (req.deceased_name  ?? '___________').toUpperCase();
  const age        = req.deceased_age    ?? '___';
  const dateOfDeath = req.date_of_death  ?? '___________';
  const place      = req.place_of_death  ?? '___________';
  const relation   = req.relationship_to_deceased ?? '___________';
  const date       = getToday();

  await patchXml(zip, 'word/document.xml', xml =>
    xml
      .replace(/JUAN DELA CRUZ/g,                  xmlEscape(requestor))
      .replace(/ERNESTO VALENZUELA/g,               xmlEscape(deceased))
      .replace(/(<w:t[^>]*>)65(<\/w:t>)/,          `$1${xmlEscape(age)}$2`)
      .replace(/JANUARY 1, 2024/g,                  xmlEscape(dateOfDeath))
      .replace(/Calbayog City Samar Philippines/g,  xmlEscape(place))
      .replace(/Son\/Daughter\/Spouse/g,             xmlEscape(relation))
      .replace(/_+day of [A-Z]+, 20\d\d/g,          date)
  );
}

async function injectJobSeekerCert(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const name   = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const purok  = req.purok               ?? '___';
  const years  = req.years_of_residency  ?? '___';
  const bcnNo  = req.bcn_no              ?? '___';
  const now    = new Date();
  const day    = String(now.getDate());
  const suffix = day === '1' ? 'st' : day === '2' ? 'nd' : day === '3' ? 'rd' : 'th';
  const month  = now.toLocaleString('en-PH', { month: 'long' }).toUpperCase();
  const year   = String(now.getFullYear());

  await patchXml(zip, 'word/document.xml', xml =>
    xml
      .replace(/JIRAH JALAYAJAY ARIMALA/g,  xmlEscape(name))
      .replace(/MAIKA DELA CRUZ MERILLES/g, xmlEscape(name))
      .replace(/(<w:t[^>]*>) BCN NO\.: 09(<\/w:t>)/g, `$1 BCN NO.: ${xmlEscape(bcnNo)}$2`)
      .replace(/(<w:t[^>]*>)09(<\/w:t>)/g, `$1${xmlEscape(bcnNo)}$2`)
      .replace(/for 5 years\/month,/g,      `for ${xmlEscape(years)} years/month,`)
      .replace(/(<w:t[^>]*>)06(<\/w:t>)/g, `$1${xmlEscape(day)}$2`)
      .replace(/(<w:t[^>]*>)TH(<\/w:t>)/g, `$1${xmlEscape(suffix.toUpperCase())}$2`)
      .replace(/(<w:t[^>]*>)OCTOBER (<\/w:t>)/g, `$1${xmlEscape(month)} $2`)
      .replace(/2025, in Calbayog City, Samar\./g, `${xmlEscape(year)}, in Calbayog City, Samar.`)
      .replace(/(<w:t[^>]*>)OCTOBER 06(<\/w:t>)/g, `$1${xmlEscape(month)} ${xmlEscape(day)}$2`)
      .replace(/(<w:t[^>]*>), 2025(<\/w:t>)/g, `$1, ${xmlEscape(year)}$2`)
  );
}

async function injectOathOfUndertaking(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const name   = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const age    = profile.age             ?? '___';
  const purok  = req.purok               ?? '___';
  const years  = req.years_of_residency  ?? '___';
  const now    = new Date();
  const day    = String(now.getDate());
  const suffix = day === '1' ? 'st' : day === '2' ? 'nd' : day === '3' ? 'rd' : 'th';
  const month  = now.toLocaleString('en-PH', { month: 'long' }).toUpperCase();
  const year   = String(now.getFullYear());

  await patchXml(zip, 'word/document.xml', xml =>
    xml
      .replace(/EGBERT KIA DELA CRUZ/g,           xmlEscape(name))
      .replace(/Samar for 5 years,/g,              `Samar for ${xmlEscape(years)} years,`)
      .replace(/ 2024, in Barangay Guin-on, Calbayog City, Samar\./g,
               ` ${xmlEscape(year)}, in Barangay Guin-on, Calbayog City, Samar.`)
      .replace(/(<w:t[^>]*>) SEPTEMBER (<\/w:t>)/g, `$1 ${xmlEscape(month)} $2`)
  );
}

// ─── Main generateDocument export ────────────────────────────────────────────

export async function generateDocument(
  req:     RequestDetail,
  profile: Profile,
): Promise<{ blob: Blob; fileName: string }> {
  const docType = req.document_type ?? req.type ?? '';

  // ── 1. Load template ───────────────────────────────────────────────────────
  const { zip } = await loadTemplate(docType);

  // ── 2. Inject text data ────────────────────────────────────────────────────
  switch (docType) {
    case 'barangay-clearance':     await injectBarangayClearance(zip, req, profile);     break;
    case 'business-clearance':     await injectBusinessClearance(zip, req, profile);     break;
    case 'certification-of-death': await injectCertificationOfDeath(zip, req, profile); break;
    case 'job-seeker':             await injectJobSeekerCert(zip, req, profile);         break;
    case 'oath-of-undertaking':    await injectOathOfUndertaking(zip, req, profile);     break;
    default:
      console.warn(`No text injector for document type: ${docType}`);
  }

  // ── 3. Fetch signature images from admin_signatures table ──────────────────
  const sigs = await fetchSignatureImages();

  // ── 4. Inject Secretary signature at {%SIGNATURE_1} ───────────────────────
  //    Displayed transparently over the secretary's name text.
  //    Width: 1.8 inches, Height: 0.6 inches (adjust to fit your template)
  if (sigs.secretary) {
    await replacePlaceholderWithImage(
      zip,
      '{%SIGNATURE_1}',
      sigs.secretary,
      'rId100',
      'sig_secretary.png',
      1.8,    // width in inches — adjust to match your template cell
      0.6,    // height in inches
      'center',
    );
  } else {
    console.warn('Secretary signature not found in admin_signatures. {%SIGNATURE_1} placeholder left in place.');
  }

  // ── 5. Inject Captain signature at {%SIGNATURE_2} ─────────────────────────
  if (sigs.captain) {
    await replacePlaceholderWithImage(
      zip,
      '{%SIGNATURE_2}',
      sigs.captain,
      'rId101',
      'sig_captain.png',
      1.8,    // width in inches
      0.6,    // height in inches
      'center',
    );
  } else {
    console.warn('Captain signature not found in admin_signatures. {%SIGNATURE_2} placeholder left in place.');
  }

  // ── 6. Generate the output blob BEFORE QR (we need the hash) ──────────────
  //    We do a first-pass generation to compute the hash, then inject the QR,
  //    then generate the final blob. This gives us a QR that encodes the actual
  //    document hash for verification.
  const firstPassBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  const firstPassBlob   = new Blob([firstPassBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  const documentHash = await sha256Hex(firstPassBlob);

  // ── 7. Generate Reed-Solomon QR code and inject at {%QR_CODE} ─────────────
  const qrDataUrl = await generateQRCodeDataUrl(req.id, documentHash);

  if (qrDataUrl) {
    await replacePlaceholderWithImage(
      zip,
      '{%QR_CODE}',
      qrDataUrl,
      'rId102',
      'qr_code.png',
      1.3,    // width in inches — matches the QR placeholder size in template
      1.3,    // height in inches (square)
      'center',
    );
  } else {
    console.warn('QR code generation failed. {%QR_CODE} placeholder left in place.');
  }

  // ── 8. Generate final output blob ─────────────────────────────────────────
  const outBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  const blob      = new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const safeName = `${profile.firstName}_${profile.lastName}`.replace(/\s+/g, '_');
  const docLabel = docType.replace(/-/g, '_').toUpperCase();
  const fileName = `${docLabel}_${safeName}_${Date.now()}.docx`;

  return { blob, fileName };
}