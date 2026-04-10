/**
 * Docgenerators.ts
 *
 * Generates barangay documents by:
 *  1. Fetching the .docx template from /public/files/
 *  2. Replacing text placeholders with actual data via JSZip XML patching
 *  3. Injecting ECDSA signature images at {%SIGNATURE_1} and {%SIGNATURE_2} placeholders
 *
 * HOW THE SIGNATURE PLACEHOLDER WORKS:
 *  - In your .docx template, type exactly:  {%SIGNATURE_1}
 *    on its own line/paragraph in the cell where the Secretary signature should appear.
 *  - Type {%SIGNATURE_2} where the Captain's signature should appear.
 *  - The code below finds those paragraphs in the XML and replaces the entire
 *    <w:p>...</w:p> block with an inline image drawing.
 *
 * NOTE: QR code injection is handled separately by existing code — do not add it here.
 */

import { supabase } from '@/app/lib/supabase';

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
  id:           string;
  firstName:    string;
  lastName:     string;
  email:        string;
  phone?:       string;
  address?:     string;
  birthday?:    string;
  civilStatus?: string;
  sex?:         string;
  age?:         string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function normaliseProfile(raw: Record<string, string>): Profile {
  return {
    id:          raw.id           ?? '',
    firstName:   raw.first_name   ?? raw.firstName  ?? '',
    lastName:    raw.last_name    ?? raw.lastName   ?? '',
    email:       raw.email        ?? '',
    phone:       raw.phone        ?? raw.contact_number ?? '',
    address:     raw.address      ?? '',
    birthday:    raw.birthday     ?? raw.date_of_birth  ?? '',
    civilStatus: raw.civil_status ?? raw.civilStatus    ?? '',
    sex:         raw.sex          ?? raw.gender         ?? '',
    age:         raw.age          ?? '',
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
    const s   = document.createElement('script');
    s.src     = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error('Failed to load JSZip'));
    document.head.appendChild(s);
  });
  // @ts-ignore
  return window.JSZip;
}

// ─── Signature fetcher ────────────────────────────────────────────────────────

interface SignatureImages {
  secretary: string | null; // base64 data URL
  captain:   string | null; // base64 data URL
}

async function fetchSignatureImages(): Promise<SignatureImages> {
  try {
    const { data, error } = await supabase
      .from('barangay_settings')
      .select('secretary_signature_url, captain_signature_url')
      .single();

    if (error || !data) return { secretary: null, captain: null };

    const toBase64 = async (url: string | null): Promise<string | null> => {
      if (!url) return null;
      try {
        const res  = await fetch(url);
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
          const reader   = new FileReader();
          reader.onload  = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    };

    const [secretary, captain] = await Promise.all([
      toBase64(data.secretary_signature_url),
      toBase64(data.captain_signature_url),
    ]);

    return { secretary, captain };
  } catch {
    return { secretary: null, captain: null };
  }
}

// ─── Image XML builder ────────────────────────────────────────────────────────

function buildInlineImageParagraph(
  rId:       string,
  widthEmu:  number,
  heightEmu: number,
  descr:     string,
  align:     'left' | 'center' | 'right' = 'left',
): string {
  const jc = align === 'center' ? '<w:jc w:val="center"/>'
           : align === 'right'  ? '<w:jc w:val="right"/>'
           : '';

  return (
    `<w:p>` +
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
                  `<a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm>` +
                  `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>` +
                `</pic:spPr>` +
              `</pic:pic>` +
            `</a:graphicData>` +
          `</a:graphic>` +
        `</wp:inline>` +
      `</w:drawing>` +
    `</w:r>` +
    `</w:p>`
  );
}

// ─── Relationship + media injector ───────────────────────────────────────────

async function injectImageIntoZip(
  zip:           any,
  base64DataUrl: string,
  fileName:      string,
  rId:           string,
): Promise<void> {
  const base64 = base64DataUrl.split(',')[1];
  if (!base64) return;

  zip.file(`word/media/${fileName}`, base64, { base64: true });

  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (!relsFile) return;
  let relsXml: string = await relsFile.async('string');

  // Only add if not already present (avoids duplicates on re-run)
  if (!relsXml.includes(`Id="${rId}"`)) {
    const imageType  = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
    const newRelLine = `<Relationship Id="${rId}" Type="${imageType}" Target="media/${fileName}"/>`;
    relsXml = relsXml.replace('</Relationships>', `${newRelLine}\n</Relationships>`);
    zip.file('word/_rels/document.xml.rels', relsXml);
  }

  // Register PNG content type if missing
  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    let ctXml: string = await ctFile.async('string');
    if (!ctXml.includes('Extension="png"')) {
      ctXml = ctXml.replace('</Types>', `<Default Extension="png" ContentType="image/png"/>\n</Types>`);
      zip.file('[Content_Types].xml', ctXml);
    }
  }
}

// ─── Signature placeholder replacer ──────────────────────────────────────────
//
// The key fix: Word often splits a text run like {%SIGNATURE_1} across
// multiple <w:r> elements when you type it (due to spell-check, font hints,
// autocorrect marks, etc.).
//
// Strategy:
//  1. Strip all XML tags from each <w:p> block to get its plain text.
//  2. If that plain text contains the placeholder string, replace the entire
//     <w:p>...</w:p> with the image paragraph.
//
// This is far more reliable than regex-matching the placeholder inside raw XML.

async function replacePlaceholderWithImage(
  zip:           any,
  placeholder:   string,
  base64DataUrl: string,
  rId:           string,
  fileName:      string,
  widthInches:   number,
  heightInches:  number,
  align:         'left' | 'center' | 'right' = 'left',
): Promise<void> {
  const docFile = zip.file('word/document.xml');
  if (!docFile) return;

  const xml: string = await docFile.async('string');

  // Inject image bytes + relationship first
  await injectImageIntoZip(zip, base64DataUrl, fileName, rId);

  const widthEmu     = Math.round(widthInches  * 914400);
  const heightEmu    = Math.round(heightInches * 914400);
  const imgParagraph = buildInlineImageParagraph(rId, widthEmu, heightEmu, placeholder, align);

  // Split the full XML into individual <w:p>…</w:p> blocks, replacing any
  // paragraph whose stripped plain text contains the placeholder.
  //
  // We use a stateful split approach instead of a greedy regex so that we
  // correctly handle paragraphs that contain nested elements.
  const result   = replaceParagraphContaining(xml, placeholder, imgParagraph);

  if (result === xml) {
    console.warn(`[Docgenerators] Placeholder "${placeholder}" not found in any paragraph — check your template.`);
  }

  zip.file('word/document.xml', result);
}

/**
 * Splits the XML string into segments around <w:p> tags and replaces any
 * paragraph whose concatenated text-run content includes `searchText`.
 *
 * Uses a simple bracket-counting approach so it correctly handles nested
 * elements without backtracking regex issues.
 */
function replaceParagraphContaining(
  xml:        string,
  searchText: string,
  replacement: string,
): string {
  const OPEN  = '<w:p>';
  const OPEN2 = '<w:p ';   // paragraph with attributes, e.g. <w:p w:rsidR="...">
  const CLOSE = '</w:p>';

  let result = '';
  let i      = 0;

  while (i < xml.length) {
    // Find the next paragraph opening tag
    const nextOpen  = xml.indexOf(OPEN,  i);
    const nextOpen2 = xml.indexOf(OPEN2, i);

    // Determine which comes first
    let pStart = -1;
    if (nextOpen  === -1 && nextOpen2 === -1) break;
    if (nextOpen  === -1) pStart = nextOpen2;
    else if (nextOpen2 === -1) pStart = nextOpen;
    else pStart = Math.min(nextOpen, nextOpen2);

    // Append everything before this paragraph
    result += xml.slice(i, pStart);

    // Find the matching </w:p>
    // We count depth to handle <w:p> nested inside bookmarks / structured
    // document tags — though in practice Word rarely nests w:p inside w:p.
    let depth   = 1;
    let cursor  = pStart + (xml[pStart + 4] === ' ' ? OPEN2.length : OPEN.length);

    while (cursor < xml.length && depth > 0) {
      const closeIdx = xml.indexOf(CLOSE, cursor);
      const openIdx  = xml.indexOf(OPEN,  cursor);
      const open2Idx = xml.indexOf(OPEN2, cursor);

      const nextCloseAt = closeIdx === -1 ? Infinity : closeIdx;
      const nextOpenAt  = Math.min(
        openIdx  === -1 ? Infinity : openIdx,
        open2Idx === -1 ? Infinity : open2Idx,
      );

      if (nextCloseAt < nextOpenAt) {
        depth--;
        cursor = closeIdx + CLOSE.length;
      } else if (nextOpenAt < nextCloseAt) {
        depth++;
        cursor = nextOpenAt + (xml[nextOpenAt + 4] === ' ' ? OPEN2.length : OPEN.length);
      } else {
        // No more tags — malformed XML, bail
        cursor = xml.length;
      }
    }

    const pEnd     = cursor; // points right after </w:p>
    const pBlock   = xml.slice(pStart, pEnd);

    // Strip all XML tags to get plain text of this paragraph
    const plainText = pBlock.replace(/<[^>]+>/g, '');

    if (plainText.includes(searchText)) {
      result += replacement;
    } else {
      result += pBlock;
    }

    i = pEnd;
  }

  // Append any remaining XML after the last paragraph
  result += xml.slice(i);
  return result;
}

// ─── Template loader ──────────────────────────────────────────────────────────

const TEMPLATE_MAP: Record<string, string> = {
  'barangay-clearance':     '/files/BRGY-CLEARANCE-TEMPLATE.docx',
  'business-clearance':     '/files/BUSINESS-CLEARANCE.docx',
  'certification-of-death': '/files/CERTIFICATION-OF-DEATH.docx',
  'job-seeker':             '/files/Certification.docx',
  'oath-of-undertaking':    '/files/Oath-of-Undertaking-for-First-Time-Jobseeker.docx',
};

async function loadTemplate(documentType: string): Promise<{ zip: any }> {
  const JSZip = await loadJSZip();
  const url   = TEMPLATE_MAP[documentType];
  if (!url) throw new Error(`No template found for document type: ${documentType}`);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load template (${response.status}): ${url}`);

  const buffer = await response.arrayBuffer();
  const zip    = await JSZip.loadAsync(buffer);
  return { zip };
}

// ─── XML patch helper ─────────────────────────────────────────────────────────

async function patchXml(
  zip:      any,
  filename: string,
  patcher:  (xml: string) => string,
): Promise<void> {
  const file = zip.file(filename);
  if (!file) return;
  const xml     = await file.async('string');
  const updated = patcher(xml);
  zip.file(filename, updated);
}

// ─── Per-document text injectors ─────────────────────────────────────────────

async function injectBarangayClearance(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const name        = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const sex         = profile.sex          ?? 'male';
  const civilStatus = profile.civilStatus  ?? 'single';
  const purok       = req.purok            ?? '';
  const ctcNo       = req.ctc_no           ?? '___________';
  const ctcDate     = req.ctc_date_issued  ?? '___________';
  const ctcPlace    = req.ctc_place_issued ?? '___________';
  const purpose     = req.purpose === 'others' && req.custom_purpose
                      ? req.custom_purpose
                      : (req.purpose ?? 'general purposes');
  const date        = getToday();

  await patchXml(zip, 'word/document.xml', xml => {
    const certifyText = `${xmlEscape(name)} of legal age, ${xmlEscape(sex)}, ${xmlEscape(civilStatus)}, Filipino citizen, whose name and signature/right thumb mark appears below is a BONAFIDE and permanent resident of ${xmlEscape(purok)}, BRGY. GUIN-ON, Calbayog City,`;
    const furtherCert = `Further certifies that he/ she has no derogatory record and has good moral character as per our Barangay record in connected. This clearance is issued upon request for ${xmlEscape(purpose)} and for whatever legal purpose it may serve.`;

    return xml
      .replace(
        /_____________________ of legal age, male\/female, single\/married\/widow\/ widower, Filipino citizen, whose name and signature\/right thumb mark appears below is a BONAFIDE and permanent resident of BRGY\. GUIN-ON, Calbayog City, /g,
        certifyText,
      )
      .replace(
        /Issued this ___ day of JANUARY, 2024 at Brgy\. Guin-on, Calbayog City, Samar, Philippines\./g,
        `Issued this ${xmlEscape(date)} at Brgy. Guin-on, Calbayog City, Samar, Philippines.`,
      )
      .replace(/CTC #: __________________ /g,  `CTC #: ${xmlEscape(ctcNo)} `)
      .replace(/Date Issued: ______________ /g, `Date Issued: ${xmlEscape(ctcDate)} `)
      .replace(/Place Issued: ______________/g, `Place Issued: ${xmlEscape(ctcPlace)}`)
      .replace(
        /Further certifies that he\/ she has no derogatory record and has good moral character as per our Barangay record in connected\. /g,
        furtherCert + ' ',
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
      .replace(/(<w:t[^>]*>)2025(<\/w:t>)/g,          `$1${xmlEscape(year)}$2`),
  );
}

async function injectCertificationOfDeath(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const requestor   = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const deceased    = (req.deceased_name  ?? '___________').toUpperCase();
  const age         = req.deceased_age    ?? '___';
  const dateOfDeath = req.date_of_death   ?? '___________';
  const place       = req.place_of_death  ?? '___________';
  const relation    = req.relationship_to_deceased ?? '___________';
  const date        = getToday();

  await patchXml(zip, 'word/document.xml', xml =>
    xml
      .replace(/JUAN DELA CRUZ/g,                  xmlEscape(requestor))
      .replace(/ERNESTO VALENZUELA/g,               xmlEscape(deceased))
      .replace(/(<w:t[^>]*>)65(<\/w:t>)/,          `$1${xmlEscape(age)}$2`)
      .replace(/JANUARY 1, 2024/g,                  xmlEscape(dateOfDeath))
      .replace(/Calbayog City Samar Philippines/g,  xmlEscape(place))
      .replace(/Son\/Daughter\/Spouse/g,             xmlEscape(relation))
      .replace(/_+day of [A-Z]+, 20\d\d/g,          date),
  );
}

async function injectJobSeekerCert(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const name   = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const purok  = req.purok              ?? '___';
  const years  = req.years_of_residency ?? '___';
  const bcnNo  = req.bcn_no             ?? '___';
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
      .replace(/(<w:t[^>]*>)09(<\/w:t>)/g,             `$1${xmlEscape(bcnNo)}$2`)
      .replace(/for 5 years\/month,/g,                  `for ${xmlEscape(years)} years/month,`)
      .replace(/(<w:t[^>]*>)06(<\/w:t>)/g,             `$1${xmlEscape(day)}$2`)
      .replace(/(<w:t[^>]*>)TH(<\/w:t>)/g,             `$1${xmlEscape(suffix.toUpperCase())}$2`)
      .replace(/(<w:t[^>]*>)OCTOBER (<\/w:t>)/g,       `$1${xmlEscape(month)} $2`)
      .replace(/2025, in Calbayog City, Samar\./g,     `${xmlEscape(year)}, in Calbayog City, Samar.`)
      .replace(/(<w:t[^>]*>)OCTOBER 06(<\/w:t>)/g,    `$1${xmlEscape(month)} ${xmlEscape(day)}$2`)
      .replace(/(<w:t[^>]*>), 2025(<\/w:t>)/g,         `$1, ${xmlEscape(year)}$2`),
  );
}

async function injectOathOfUndertaking(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const name   = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const purok  = req.purok              ?? '___';
  const years  = req.years_of_residency ?? '___';
  const now    = new Date();
  const day    = String(now.getDate());
  const suffix = day === '1' ? 'st' : day === '2' ? 'nd' : day === '3' ? 'rd' : 'th';
  const month  = now.toLocaleString('en-PH', { month: 'long' }).toUpperCase();
  const year   = String(now.getFullYear());

  await patchXml(zip, 'word/document.xml', xml =>
    xml
      .replace(/EGBERT KIA DELA CRUZ/g,  xmlEscape(name))
      .replace(/Samar for 5 years,/g,    `Samar for ${xmlEscape(years)} years,`)
      .replace(/ 2024, in Barangay Guin-on, Calbayog City, Samar\./g,
               ` ${xmlEscape(year)}, in Barangay Guin-on, Calbayog City, Samar.`)
      .replace(/(<w:t[^>]*>) SEPTEMBER (<\/w:t>)/g, `$1 ${xmlEscape(month)} $2`),
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateDocument(
  req:     RequestDetail,
  profile: Profile,
): Promise<{ blob: Blob; fileName: string }> {
  const docType = req.document_type ?? req.type ?? '';

  // 1. Load template
  const { zip } = await loadTemplate(docType);

  // 2. Inject text data
  switch (docType) {
    case 'barangay-clearance':     await injectBarangayClearance(zip, req, profile);     break;
    case 'business-clearance':     await injectBusinessClearance(zip, req, profile);     break;
    case 'certification-of-death': await injectCertificationOfDeath(zip, req, profile); break;
    case 'job-seeker':             await injectJobSeekerCert(zip, req, profile);         break;
    case 'oath-of-undertaking':    await injectOathOfUndertaking(zip, req, profile);     break;
    default:
      console.warn(`[Docgenerators] No text injector for document type: ${docType}`);
  }

  // 3. Fetch signature images from Supabase (admin settings)
  const sigs = await fetchSignatureImages();

  // 4. Replace {%SIGNATURE_1} with Secretary signature image
  if (sigs.secretary) {
    await replacePlaceholderWithImage(
      zip,
      '{%SIGNATURE_1}',
      sigs.secretary,
      'rId100',
      'sig_secretary.png',
      1.8,   // width in inches  — adjust to fit your template cell
      0.6,   // height in inches — adjust to fit your template cell
      'left',
    );
  }

  // 5. Replace {%SIGNATURE_2} with Captain signature image
  if (sigs.captain) {
    await replacePlaceholderWithImage(
      zip,
      '{%SIGNATURE_2}',
      sigs.captain,
      'rId101',
      'sig_captain.png',
      1.8,   // width in inches
      0.6,   // height in inches
      'left',
    );
  }

  // 6. Generate output blob
  const outBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  const blob = new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const safeName = `${profile.firstName}_${profile.lastName}`.replace(/\s+/g, '_');
  const docLabel = docType.replace(/-/g, '_').toUpperCase();
  const fileName = `${docLabel}_${safeName}_${Date.now()}.docx`;

  return { blob, fileName };
}