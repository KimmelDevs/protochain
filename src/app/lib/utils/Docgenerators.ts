/**
 * Docgenerators.ts
 *
 * Generates barangay documents by:
 *  1. Fetching the .docx template from /public/files/
 *  2. Replacing text placeholders with actual data via JSZip XML patching
 *  3. Injecting ECDSA signature images at {%SIGNATURE_1} and {%SIGNATURE_2} placeholders
 *  4. Injecting a QR code at {%QR_CODE} placeholder (if present)
 *
 * Signature images are fetched from Supabase (stored in barangay_settings),
 * converted to base64, then embedded as inline <wp:inline> drawings in the
 * docx XML — replacing the placeholder paragraph entirely.
 *
 * HOW THE PLACEHOLDER WORKS:
 *  - In your .docx template, type exactly:  {%SIGNATURE_1}
 *    on its own line/paragraph in the cell where the signature image should appear.
 *  - Type {%SIGNATURE_2} where the Captain's signature should appear.
 *  - Type {%QR_CODE} where the QR code image should appear.
 *  - The code below finds those runs in the XML and replaces the entire
 *    surrounding <w:p> paragraph with an inline image drawing.
 */

import { supabase } from '@/app/lib/supabase';
import { rsEncode, hexToBytes, bytesToHex } from '@/app/lib/utils/reedsolomon';

// ─── QR placeholder shape name (same in every template) ───────────────────────
// Every .docx template has the QR sample image with this exact shape name.
// We find its rId via this name, then overwrite the image bytes in word/media/.
const QR_SHAPE_NAME = 'Picture 1117202640';

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

// ─── Signature fetcher ────────────────────────────────────────────────────────

interface SignatureImages {
  secretary: string | null;  // base64 PNG data URL
  captain:   string | null;  // base64 PNG data URL
}

/**
 * Removes the white background from a signature PNG data URL.
 * Draws the image onto a canvas, then for each pixel that is near-white,
 * sets its alpha to 0 (transparent). Returns a new PNG data URL.
 */
async function removeWhiteBackground(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas  = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data      = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // If the pixel is near-white (all channels > 230), make it transparent
        if (r > 230 && g > 230 && b > 230) {
          data[i + 3] = 0; // set alpha to 0
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl); // fallback: return original if error
    img.src = dataUrl;
  });
}

async function fetchSignatureImages(): Promise<SignatureImages> {
  try {
    // Signatures are stored in admin_signatures table as record_json.signatureDataUrl
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

    // Remove white backgrounds so signatures appear transparent over document text
    if (secretary) secretary = await removeWhiteBackground(secretary);
    if (captain)   captain   = await removeWhiteBackground(captain);

    return { secretary, captain };
  } catch (err) {
    console.warn('fetchSignatureImages error:', err);
    return { secretary: null, captain: null };
  }
}

// ─── Image XML builder ────────────────────────────────────────────────────────

/**
 * Builds a <w:p> paragraph containing an inline <wp:inline> image drawing.
 *
 * The image is embedded as a base64 relationship (data URI converted to bytes
 * in the zip). We add a new relationship entry and reference it here.
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
 *
 * Returns the rId string (e.g. "rId100").
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

// ─── Signature injector ───────────────────────────────────────────────────────

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
  // so we search for the text content loosely
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
  // We match from <w:p> (or <w:p >) up to the first </w:p> that follows the placeholder.
  //
  // Strategy: Find the paragraph that contains the placeholder tag and replace it whole.
  // We use a regex that matches <w:p...>...{%PLACEHOLDER}...</w:p>
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

// ─── QR Code generator (Reed-Solomon encoded) ────────────────────────────────

/**
 * Dynamically loads qrcode.js from CDN (once) and renders the given text
 * into an off-screen canvas, returning a PNG data URL.
 */
async function renderQRToDataUrl(text: string): Promise<string> {
  // @ts-ignore
  if (typeof window.QRCode === 'undefined') {
    await new Promise<void>((resolve, reject) => {
      const s  = document.createElement('script');
      s.src    = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload  = () => resolve();
      s.onerror = () => reject(new Error('Failed to load qrcode.js'));
      document.head.appendChild(s);
    });
  }

  return new Promise<string>((resolve, reject) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:256px;height:256px;';
    document.body.appendChild(wrap);

    try {
      // @ts-ignore
      new window.QRCode(wrap, {
        text,
        width:        256,
        height:       256,
        colorDark:    '#000000',
        colorLight:   '#ffffff',
        // @ts-ignore
        correctLevel: window.QRCode?.CorrectLevel?.H ?? 3,
      });
    } catch (err) {
      document.body.removeChild(wrap);
      reject(err);
      return;
    }

    setTimeout(() => {
      try {
        const canvas = wrap.querySelector('canvas') as HTMLCanvasElement | null;
        if (canvas) {
          resolve(canvas.toDataURL('image/png'));
        } else {
          const img = wrap.querySelector('img') as HTMLImageElement | null;
          resolve(img?.src ?? '');
        }
      } finally {
        document.body.removeChild(wrap);
      }
    }, 300);
  });
}

/**
 * Builds a Reed-Solomon encoded verification URL, then renders it as a QR PNG.
 *
 * RS encoding adds 32 parity bytes to the 32-byte SHA-256 hash (~25% extra
 * error correction on top of the QR's own built-in ECC).
 *
 * QR payload: https://<origin>/verify?hash=<sha256hex>&rs=<rsEncodedHex>
 */
async function generateQRDataUrl(requestId: string, fileHash?: string | null): Promise<string | null> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    let payload: string;

    if (fileHash && /^[0-9a-f]{64}$/i.test(fileHash)) {
      const rsEncoded = rsEncode(hexToBytes(fileHash), 32); // 32 data + 32 ECC bytes
      const rsHex     = bytesToHex(rsEncoded);
      payload = `${origin}/verify?hash=${fileHash}&rs=${rsHex}`;
    } else {
      payload = `${origin}/verify?id=${requestId}`;
    }

    return await renderQRToDataUrl(payload);
  } catch (err) {
    console.warn('QR generation failed:', err);
    return null;
  }
}


async function injectSignatureIntoZip(
  zip:          any,
  altText:      string,   // e.g. 'Secretary Signature' or 'Captain Signature'
  base64DataUrl: string,  // PNG data URL from admin_signatures
  newFileName:  string,   // e.g. 'sig_secretary.png'
  newRId:       string,   // e.g. 'rId_sec'
): Promise<void> {
  const docFile = zip.file('word/document.xml');
  if (!docFile) return;
  let xml: string = await docFile.async('string');
  let mutableDataUrl = base64DataUrl; // mutable copy for background removal

  // ── 1. Find the drawing element with this alt text ─────────────────────────
  const descrAttr = `descr="${altText}"`;
  const descrPos  = xml.indexOf(descrAttr);
  if (descrPos === -1) {
    console.warn(`Signature placeholder with alt text "${altText}" not found`);
    return;
  }

  // ── 2. Find the r:embed rId in this specific drawing ──────────────────────
  // Search forward from the descr attribute within a safe window
  const window2000 = xml.slice(descrPos, descrPos + 1500);
  const embedMatch = window2000.match(/r:embed="(rId[^"]+)"/);
  if (!embedMatch) {
    console.warn(`No r:embed found near "${altText}"`);
    return;
  }
  const existingRId = embedMatch[1];

  // ── 3. Look up existing media filename ────────────────────────────────────
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (!relsFile) return;
  let relsXml: string = await relsFile.async('string');

  const relMatch = relsXml.match(new RegExp(`Id="${existingRId}"[^>]*Target="media/([^"]+)"`));
  if (!relMatch) {
    console.warn(`Could not find media target for ${existingRId}`);
    return;
  }
  const existingMedia = relMatch[1]; // e.g. 'image1.png'

  // ── 4. Remove white background to make signature transparent ─────────────
  mutableDataUrl = await removeWhiteBackground(mutableDataUrl);

  const base64 = mutableDataUrl.split(',')[1];
  if (!base64) return;

  // ── 4. Check if this media file is shared with another signature ───────────
  // Count how many times this rId appears in the document XML
  const rIdUsageCount = (xml.match(new RegExp(`r:embed="${existingRId}"`, 'g')) ?? []).length;

  if (rIdUsageCount <= 1) {
    // Only used once — safe to overwrite directly
    zip.file(`word/media/${existingMedia}`, base64, { base64: true });
    console.log(`Signature "${altText}" injected: overwrote word/media/${existingMedia}`);
  } else {
    // Shared with another signature — add a new media file and new relationship,
    // then patch only THIS drawing's r:embed to point to the new file.
    zip.file(`word/media/${newFileName}`, base64, { base64: true });

    // Add new relationship
    const imageType = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
    relsXml = relsXml.replace(
      '</Relationships>',
      `<Relationship Id="${newRId}" Type="${imageType}" Target="media/${newFileName}"/>\n</Relationships>`
    );
    zip.file('word/_rels/document.xml.rels', relsXml);

    // Patch ONLY this drawing's r:embed — replace the first occurrence of
    // existingRId that appears after the descr attribute position.
    const beforeDescr = xml.slice(0, descrPos);
    const fromDescr   = xml.slice(descrPos);
    const patched     = fromDescr.replace(
      `r:embed="${existingRId}"`,
      `r:embed="${newRId}"`
    );
    xml = beforeDescr + patched;
    zip.file('word/document.xml', xml);

    console.log(`Signature "${altText}" injected: added word/media/${newFileName} (${newRId})`);
  }
}

/**
 * Replaces the QR placeholder image in the docx zip.
 *
 * Instead of touching the XML structure, we:
 *  1. Find the shape named QR_SHAPE_NAME in document.xml to get its r:embed rId.
 *  2. Look up that rId in the rels file to get the media filename (e.g. image2.png).
 *  3. Overwrite that file in word/media/ with the new QR PNG bytes.
 *
 * This is the safest approach — zero XML changes, Word opens the file cleanly.
 */
async function injectQRIntoZip(zip: any, qrDataUrl: string): Promise<void> {
  // ── 1. Find rId from document.xml via shape name ──────────────────────────
  const docFile = zip.file('word/document.xml');
  if (!docFile) return;
  const xml: string = await docFile.async('string');

  // Locate the shape and extract the r:embed rId
  const shapePos = xml.indexOf(QR_SHAPE_NAME);
  if (shapePos === -1) {
    console.warn(`QR placeholder shape "${QR_SHAPE_NAME}" not found in document.xml`);
    return;
  }

  // Search forward from the shape name for the nearest r:embed
  const searchWindow = xml.slice(shapePos, shapePos + 2000);
  const embedMatch   = searchWindow.match(/r:embed="(rId\d+)"/);
  if (!embedMatch) {
    console.warn('Could not find r:embed for QR shape');
    return;
  }
  const rId = embedMatch[1];

  // ── 2. Look up the media filename in the rels file ────────────────────────
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (!relsFile) return;
  const relsXml: string = await relsFile.async('string');

  const relMatch = relsXml.match(new RegExp(`Id="${rId}"[^>]*Target="media/([^"]+)"`));
  if (!relMatch) {
    console.warn(`Could not find media target for ${rId}`);
    return;
  }
  const mediaFileName = relMatch[1]; // e.g. "image2.png"

  // ── 3. Overwrite the image bytes in word/media/ ───────────────────────────
  const base64 = qrDataUrl.split(',')[1];
  if (!base64) return;

  zip.file(`word/media/${mediaFileName}`, base64, { base64: true });
  console.log(`QR injected: replaced word/media/${mediaFileName} (${rId})`);
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

  // ── 3. Fetch signature images from admin_signatures table ─────────────────
  const sigs = await fetchSignatureImages();

  // ── 4. Inject Secretary signature (alt text: "Secretary Signature") ────────
  if (sigs.secretary) {
    await injectSignatureIntoZip(zip, 'Secretary Signature', sigs.secretary, 'sig_secretary.png', 'rId_sec');
  }

  // ── 5. Inject Captain signature (alt text: "Captain Signature") ────────────
  if (sigs.captain) {
    await injectSignatureIntoZip(zip, 'Captain Signature', sigs.captain, 'sig_captain.png', 'rId_cap');
  }

  // ── 6. Generate Reed-Solomon QR code and swap the placeholder image ────────
  //    The QR encodes a verification URL with the RS-protected document hash.
  //    We locate the placeholder by its shape name and overwrite its image bytes.
  const qrDataUrl = await generateQRDataUrl(req.id, req.file_hash ?? null);
  if (qrDataUrl) {
    await injectQRIntoZip(zip, qrDataUrl);
  } else {
    console.warn('QR generation failed — placeholder image left unchanged.');
  }

  // ── 7. Generate output blob ────────────────────────────────────────────────
  const outBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  const blob      = new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const safeName = `${profile.firstName}_${profile.lastName}`.replace(/\s+/g, '_');
  const docLabel = docType.replace(/-/g, '_').toUpperCase();
  const fileName = `${docLabel}_${safeName}_${Date.now()}.docx`;

  return { blob, fileName };
}