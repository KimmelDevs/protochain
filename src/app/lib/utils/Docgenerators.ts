/**
 * Docgenerators.ts
 *
 * Generates barangay documents by:
 *  1. Fetching the .docx template from /public/files/
 *  2. Replacing text placeholders with actual data via JSZip XML patching
 *  3. Injecting ECDSA signature images at {%SIGNATURE_1} and {%SIGNATURE_2} placeholders
 *     — Signatures fetched from `admin_signatures` table as record_json.signatureDataUrl
 *  4. Injecting a QR code at {%QR_CODE} placeholder
 *     — Payload = rsEncodeHex(sha256(requestId), 32) via Reed-Solomon
 *
 * FIX: All heavy work is yielded via setTimeout(0) so the UI never freezes.
 */

import { supabase } from '@/app/lib/supabase';
import { rsEncodeHex } from '@/app/lib/utils/reedsolomon';

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

async function sha256HexStr(str: string): Promise<string> {
  const buf    = new TextEncoder().encode(str);
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

/** Yield to the browser event loop — prevents UI freezing during heavy work */
const yieldToUI = () => new Promise<void>(resolve => setTimeout(resolve, 0));

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
// Table: admin_signatures  { role: 'captain'|'secretary', record_json: { signatureDataUrl: string } }

interface SignatureImages {
  secretary: string | null;
  captain:   string | null;
}

async function fetchSignatureImages(): Promise<SignatureImages> {
  try {
    const { data, error } = await supabase
      .from('admin_signatures')
      .select('role, record_json');

    if (error || !data || data.length === 0) {
      console.warn('[Docgenerators] No rows in admin_signatures');
      return { secretary: null, captain: null };
    }

    const capRow = data.find((r: any) => r.role === 'captain');
    const secRow = data.find((r: any) => r.role === 'secretary');

    return {
      secretary: secRow?.record_json?.signatureDataUrl ?? null,
      captain:   capRow?.record_json?.signatureDataUrl ?? null,
    };
  } catch (e) {
    console.error('[Docgenerators] fetchSignatureImages failed:', e);
    return { secretary: null, captain: null };
  }
}

// ─── QR code generator ────────────────────────────────────────────────────────
// Payload: rsEncodeHex(sha256(requestId), 32) — Reed-Solomon ~25% error correction

async function generateQRDataUrl(requestId: string): Promise<string | null> {
  try {
    // 1. Build RS-protected payload
    const hash    = await sha256HexStr(requestId);
    const payload = rsEncodeHex(hash, 32);

    await yieldToUI(); // yield after RS encoding (CPU-intensive)

    // 2. Load QRCode.js if needed
    // @ts-ignore
    if (typeof window.QRCode === 'undefined') {
      await new Promise<void>((resolve, reject) => {
        const s   = document.createElement('script');
        s.src     = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
        s.onload  = () => resolve();
        s.onerror = () => reject(new Error('Failed to load QRCode.js'));
        document.head.appendChild(s);
      });
    }

    // 3. Render QR to canvas and extract PNG
    return await new Promise<string>((resolve, reject) => {
      const div = document.createElement('div');
      div.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:256px;height:256px;';
      document.body.appendChild(div);

      try {
        // @ts-ignore
        new window.QRCode(div, {
          text:         payload,
          width:        256,
          height:       256,
          colorDark:    '#000000',
          colorLight:   '#ffffff',
          correctLevel: 2, // QRCode.CorrectLevel.H
        });
      } catch (e) {
        document.body.removeChild(div);
        reject(e);
        return;
      }

      // QRCode.js renders asynchronously into a canvas — wait for it
      setTimeout(() => {
        try {
          const canvas = div.querySelector('canvas') as HTMLCanvasElement | null;
          document.body.removeChild(div);
          if (canvas) {
            resolve(canvas.toDataURL('image/png'));
          } else {
            // QRCode.js sometimes creates an <img> instead of canvas on some browsers
            const img = div.querySelector('img') as HTMLImageElement | null;
            if (img && img.src) {
              resolve(img.src);
            } else {
              reject(new Error('QR canvas/img not found'));
            }
          }
        } catch (e) {
          reject(e);
        }
      }, 200); // 200ms is enough for QRCode.js to finish rendering
    });
  } catch (e) {
    console.error('[Docgenerators] QR generation failed:', e);
    return null;
  }
}

// ─── Namespace ensurer ────────────────────────────────────────────────────────
// Drawing namespaces MUST be on the root <w:document> element.
// Inline xmlns re-declarations cause "Word experienced an error opening the file".

function ensureDrawingNamespaces(xml: string): string {
  const required: Record<string, string> = {
    'xmlns:wp':  'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'xmlns:a':   'http://schemas.openxmlformats.org/drawingml/2006/main',
    'xmlns:pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture',
    'xmlns:r':   'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
  };
  // The root element is <w:document ...>
  const rootEnd = xml.indexOf('>');
  if (rootEnd === -1) return xml;
  let rootTag = xml.slice(0, rootEnd);
  for (const [prefix, uri] of Object.entries(required)) {
    if (!rootTag.includes(prefix)) {
      rootTag += ` ${prefix}="${uri}"`;
    }
  }
  return rootTag + xml.slice(rootEnd);
}

// ─── Image XML builder ────────────────────────────────────────────────────────
// Namespaces (wp:, a:, pic:, r:) are declared on <w:document> root by
// ensureDrawingNamespaces() — NOT inline here, to avoid Word parse errors.

function buildInlineImageParagraph(
  rId:       string,
  docPrId:   number,
  widthEmu:  number,
  heightEmu: number,
  descr:     string,
  align:     'left' | 'center' | 'right' = 'left',
): string {
  const safeDescr = xmlEscape(descr);
  const jc = align === 'center' ? '<w:jc w:val="center"/>'
           : align === 'right'  ? '<w:jc w:val="right"/>'
           : '';
  const pPr = `<w:pPr>${jc}<w:spacing w:before="0" w:after="0"/></w:pPr>`;
  return (
    `<w:p>${pPr}<w:r><w:drawing>` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${widthEmu}" cy="${heightEmu}"/>` +
    `<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="${docPrId}" name="${safeDescr}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic>` +
    `<pic:nvPicPr><pic:cNvPr id="${docPrId}" name="${safeDescr}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic>` +
    `</wp:inline></w:drawing></w:r></w:p>`
  );
}

// ─── Replace existing image in template ──────────────────────────────────────
// The QR placeholder is already an image in the .docx template.
// We find the first image relationship (the QR placeholder) and overwrite
// its file in word/media/ with the newly generated QR PNG.

async function replaceExistingImage(
  zip:           any,
  base64DataUrl: string,
  newFileName:   string,
): Promise<void> {
  const base64 = base64DataUrl.includes(',')
    ? base64DataUrl.split(',')[1]
    : base64DataUrl;
  if (!base64) return;

  // Read relationships to find the first image target
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (!relsFile) return;
  const relsXml: string = await relsFile.async('string');

  // Find all image relationships
  const imageType = 'relationships/image';
  const relRegex  = /Id="([^"]+)"[^>]*Type="[^"]*relationships\/image"[^>]*Target="([^"]+)"/g;
  const matches: Array<{ id: string; target: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = relRegex.exec(relsXml)) !== null) {
    matches.push({ id: m[1], target: m[2] });
  }

  if (matches.length === 0) {
    console.warn('[Docgenerators] No image relationships found in template — cannot replace QR image');
    return;
  }

  // The QR image is typically the LAST image in the document (bottom of page)
  // Use the last relationship entry as the QR placeholder
  const qrRel = matches[matches.length - 1];
  const oldTarget = qrRel.target; // e.g. "media/image1.png" or "media/image2.jpeg"
  const oldPath   = `word/${oldTarget}`;

  console.log(`[Docgenerators] Replacing QR image: ${oldPath} (rId: ${qrRel.id})`);

  // Overwrite the image file with the new QR PNG bytes
  zip.file(oldPath, base64, { base64: true });

  // Ensure PNG content type is registered
  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    let ctXml: string = await ctFile.async('string');
    if (!ctXml.includes('Extension="png"')) {
      ctXml = ctXml.replace('</Types>', `<Default Extension="png" ContentType="image/png"/>
</Types>`);
      zip.file('[Content_Types].xml', ctXml);
    }
  }
}

// ─── Relationship + media injector ───────────────────────────────────────────

async function injectImageIntoZip(
  zip:           any,
  base64DataUrl: string,
  fileName:      string,
  rId:           string,
): Promise<void> {
  // Handle both data URLs ("data:image/png;base64,XXX") and raw base64
  const base64 = base64DataUrl.includes(',')
    ? base64DataUrl.split(',')[1]
    : base64DataUrl;
  if (!base64) return;

  zip.file(`word/media/${fileName}`, base64, { base64: true });

  // Register relationship
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (relsFile) {
    let relsXml: string = await relsFile.async('string');
    if (!relsXml.includes(`Id="${rId}"`)) {
      const imageType = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
      relsXml = relsXml.replace(
        '</Relationships>',
        `<Relationship Id="${rId}" Type="${imageType}" Target="media/${fileName}"/>\n</Relationships>`,
      );
      zip.file('word/_rels/document.xml.rels', relsXml);
    }
  }

  // Register PNG content type (only once)
  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    let ctXml: string = await ctFile.async('string');
    if (!ctXml.includes('Extension="png"')) {
      ctXml = ctXml.replace('</Types>', `<Default Extension="png" ContentType="image/png"/>\n</Types>`);
      zip.file('[Content_Types].xml', ctXml);
    }
  }
}

// ─── Placeholder replacer ─────────────────────────────────────────────────────
//
// Word splits typed text ({%SIGNATURE_1} etc.) across multiple <w:r> runs,
// so regex-matching inside raw XML is unreliable.
//
// Fix: walk paragraph-by-paragraph, strip tags to get plain text,
// replace the whole <w:p>...</w:p> block when it contains the placeholder.

async function replacePlaceholderWithImage(
  zip:           any,
  placeholder:   string,
  base64DataUrl: string,
  rId:           string,
  fileName:      string,
  docPrId:       number,
  widthInches:   number,
  heightInches:  number,
  align:         'left' | 'center' | 'right' = 'left',
): Promise<void> {
  const docFile = zip.file('word/document.xml');
  if (!docFile) return;

  let xml: string = await docFile.async('string');
  await injectImageIntoZip(zip, base64DataUrl, fileName, rId);

  // Ensure drawing namespaces exist on root <w:document> — required by Word
  xml = ensureDrawingNamespaces(xml);

  await yieldToUI(); // yield before XML walking (can be slow on large docs)

  const widthEmu     = Math.round(widthInches  * 914400);
  const heightEmu    = Math.round(heightInches * 914400);
  const imgParagraph = buildInlineImageParagraph(rId, docPrId, widthEmu, heightEmu, placeholder, align);
  const result       = replaceParagraphContaining(xml, placeholder, imgParagraph);

  if (result === xml) {
    // Last-resort fallback: the placeholder might be a contiguous string in the raw XML
    // (e.g. pasted in rather than typed, or saved by a different editor).
    // Try a simple string replace on the whole XML.
    const fallback = xml.replace(placeholder, imgParagraph);
    if (fallback !== xml) {
      console.log(`[Docgenerators] Replaced "${placeholder}" via fallback ✓`);
      zip.file('word/document.xml', fallback);
      return;
    }
    console.warn(`[Docgenerators] Placeholder "${placeholder}" not found — check your .docx template.`);
  } else {
    console.log(`[Docgenerators] Replaced "${placeholder}" ✓`);
  }

  zip.file('word/document.xml', result);
}

/**
 * Normalises plain text extracted from a docx paragraph for placeholder matching.
 *
 * Word can split a typed string like {%SIGNATURE_1} across multiple <w:r> runs
 * AND may XML-encode special chars (% → &#x25; or &#37;, { → &#x7B;, etc.).
 * After stripping tags we also decode entities and collapse whitespace so the
 * comparison always works regardless of how Word serialised the text.
 */
function normalisePlainText(raw: string): string {
  return raw
    // Decode common XML/HTML entities Word uses
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g,        (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    // Collapse all whitespace (tabs, newlines, non-breaking spaces) into nothing
    // so "{%SIGNATURE_ 1}" or "{%SIGN ATURE_1}" still matches
    .replace(/\s+/g, '');
}

/**
 * Walks the XML string paragraph-by-paragraph.
 * Strips all XML tags from each <w:p> block, normalises the plain text,
 * then checks if it contains searchText (also normalised).
 * If it does → replaces the entire <w:p>…</w:p> block with replacement.
 */
function replaceParagraphContaining(
  xml:         string,
  searchText:  string,
  replacement: string,
): string {
  const OPEN  = '<w:p>';
  const OPEN2 = '<w:p ';
  const CLOSE = '</w:p>';

  // Normalise the search text the same way we normalise paragraph text
  const normSearch = normalisePlainText(searchText);

  let result = '';
  let i      = 0;

  while (i < xml.length) {
    const nextOpen  = xml.indexOf(OPEN,  i);
    const nextOpen2 = xml.indexOf(OPEN2, i);

    let pStart = -1;
    if (nextOpen === -1 && nextOpen2 === -1) break;
    if (nextOpen  === -1) pStart = nextOpen2;
    else if (nextOpen2 === -1) pStart = nextOpen;
    else pStart = Math.min(nextOpen, nextOpen2);

    // Append everything before this paragraph
    result += xml.slice(i, pStart);

    // Walk forward to find the matching </w:p>, counting nesting depth
    const tagLen = xml[pStart + 4] === ' ' ? OPEN2.length : OPEN.length;
    let depth    = 1;
    let cursor   = pStart + tagLen;

    while (cursor < xml.length && depth > 0) {
      const closeIdx = xml.indexOf(CLOSE, cursor);
      const openIdx  = xml.indexOf(OPEN,  cursor);
      const open2Idx = xml.indexOf(OPEN2, cursor);

      const nextCloseAt = closeIdx === -1 ? Infinity : closeIdx;
      const nextOpenAt  = Math.min(
        openIdx  === -1 ? Infinity : openIdx,
        open2Idx === -1 ? Infinity : open2Idx,
      );

      if (nextCloseAt <= nextOpenAt) {
        depth--;
        cursor = nextCloseAt + CLOSE.length;
      } else {
        depth++;
        cursor = nextOpenAt + (xml[nextOpenAt + 4] === ' ' ? OPEN2.length : OPEN.length);
      }
    }

    const pBlock    = xml.slice(pStart, cursor);
    const plainText = pBlock.replace(/<[^>]+>/g, ''); // strip all XML tags
    const normText  = normalisePlainText(plainText);   // decode entities + collapse spaces

    result += normText.includes(normSearch) ? replacement : pBlock;
    i = cursor;
  }

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
  await yieldToUI(); // yield after fetch, before decompression
  const zip = await JSZip.loadAsync(buffer);
  return { zip };
}

async function patchXml(
  zip:      any,
  filename: string,
  patcher:  (xml: string) => string,
): Promise<void> {
  const file = zip.file(filename);
  if (!file) return;
  const xml = await file.async('string');
  await yieldToUI(); // yield before applying regex replacements
  zip.file(filename, patcher(xml));
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
                      ? req.custom_purpose : (req.purpose ?? 'general purposes');
  const date        = getToday();
  await patchXml(zip, 'word/document.xml', xml => {
    const certifyText = `${xmlEscape(name)} of legal age, ${xmlEscape(sex)}, ${xmlEscape(civilStatus)}, Filipino citizen, whose name and signature/right thumb mark appears below is a BONAFIDE and permanent resident of ${xmlEscape(purok)}, BRGY. GUIN-ON, Calbayog City,`;
    const furtherCert = `Further certifies that he/ she has no derogatory record and has good moral character as per our Barangay record in connected. This clearance is issued upon request for ${xmlEscape(purpose)} and for whatever legal purpose it may serve.`;
    return xml
      .replace(/_____________________ of legal age, male\/female, single\/married\/widow\/ widower, Filipino citizen, whose name and signature\/right thumb mark appears below is a BONAFIDE and permanent resident of BRGY\. GUIN-ON, Calbayog City, /g, certifyText)
      .replace(/Issued this ___ day of JANUARY, 2024 at Brgy\. Guin-on, Calbayog City, Samar, Philippines\./g, `Issued this ${xmlEscape(date)} at Brgy. Guin-on, Calbayog City, Samar, Philippines.`)
      .replace(/CTC #: __________________ /g,  `CTC #: ${xmlEscape(ctcNo)} `)
      .replace(/Date Issued: ______________ /g, `Date Issued: ${xmlEscape(ctcDate)} `)
      .replace(/Place Issued: ______________/g, `Place Issued: ${xmlEscape(ctcPlace)}`)
      .replace(/Further certifies that he\/ she has no derogatory record and has good moral character as per our Barangay record in connected\. /g, furtherCert + ' ');
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
      .replace(/(<w:t[^>]*>)2025(<\/w:t>)/g,          `$1${xmlEscape(year)}$2`));
}

async function injectCertificationOfDeath(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const requestor   = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const deceased    = (req.deceased_name ?? '___________').toUpperCase();
  const age         = req.deceased_age   ?? '___';
  const dateOfDeath = req.date_of_death  ?? '___________';
  const place       = req.place_of_death ?? '___________';
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
      .replace(/_+day of [A-Z]+, 20\d\d/g,          date));
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
      .replace(/(<w:t[^>]*>), 2025(<\/w:t>)/g,         `$1, ${xmlEscape(year)}$2`));
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
      .replace(/ 2024, in Barangay Guin-on, Calbayog City, Samar\./g, ` ${xmlEscape(year)}, in Barangay Guin-on, Calbayog City, Samar.`)
      .replace(/(<w:t[^>]*>) SEPTEMBER (<\/w:t>)/g, `$1 ${xmlEscape(month)} $2`));
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function generateDocument(
  req:     RequestDetail,
  profile: Profile,
): Promise<{ blob: Blob; fileName: string }> {
  const docType = req.document_type ?? req.type ?? '';

  await yieldToUI(); // yield before starting heavy work

  // 1. Load template (fetch + JSZip decompression)
  const { zip } = await loadTemplate(docType);

  // 2. Inject text data (regex replacements on XML)
  switch (docType) {
    case 'barangay-clearance':     await injectBarangayClearance(zip, req, profile);     break;
    case 'business-clearance':     await injectBusinessClearance(zip, req, profile);     break;
    case 'certification-of-death': await injectCertificationOfDeath(zip, req, profile); break;
    case 'job-seeker':             await injectJobSeekerCert(zip, req, profile);         break;
    case 'oath-of-undertaking':    await injectOathOfUndertaking(zip, req, profile);     break;
    default:
      console.warn(`[Docgenerators] No text injector for document type: ${docType}`);
  }

  await yieldToUI(); // yield between text injection and image injection

  // 3. Fetch signatures (network — already async, but yield after)
  const sigs = await fetchSignatureImages();
  await yieldToUI();

  // 4. Inject {%SIGNATURE_1} — Secretary signature
  if (sigs.secretary) {
    await replacePlaceholderWithImage(
      zip, '{%SIGNATURE_1}', sigs.secretary,
      'rId100', 'sig_secretary.png',
      101,   // unique docPr id
      1.8, 0.6, 'left',
    );
  } else {
    console.warn('[Docgenerators] Secretary signature missing — go to Admin > Settings > Signatures');
  }

  // 5. Inject {%SIGNATURE_2} — Captain signature
  if (sigs.captain) {
    await replacePlaceholderWithImage(
      zip, '{%SIGNATURE_2}', sigs.captain,
      'rId101', 'sig_captain.png',
      102,   // unique docPr id
      1.8, 0.6, 'left',
    );
  } else {
    console.warn('[Docgenerators] Captain signature missing — go to Admin > Settings > Signatures');
  }

  // 6. Generate QR and replace the existing QR image in the template.
  //    The template already has a QR image placeholder — we find its relationship
  //    ID in document.xml.rels and overwrite the image file in word/media/.
  const qrDataUrl = await generateQRDataUrl(req.id);
  await yieldToUI();
  if (qrDataUrl) {
    await replaceExistingImage(zip, qrDataUrl, 'qr_code_replaced.png');
  } else {
    console.warn('[Docgenerators] QR generation failed');
  }

  await yieldToUI(); // yield before final ZIP compression

  // 7. Build output blob
  const outBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  const blob = new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const safeName = `${profile.firstName}_${profile.lastName}`.replace(/\s+/g, '_');
  const docLabel = docType.replace(/-/g, '_').toUpperCase();
  const fileName = `${docLabel}_${safeName}_${Date.now()}.docx`;

  return { blob, fileName };
}