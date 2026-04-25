/**
 * Docgenerators.ts
 *
 * Generates barangay documents by:
 *  1. Fetching the .docx template from /public/files/
 *  2. Replacing text placeholders with actual data via JSZip XML patching
 *  3. Injecting signature images at "Secretary Signature" / "Captain Signature" alt-text placeholders
 *  4. Injecting a QR code by overwriting the QR_SHAPE_NAME image bytes
 *  5. Injecting a Digital Seal (barangay-clearance & business-clearance only)
 *
 * ─── FIELD MAPPING PER DOCUMENT ──────────────────────────────────────────────
 *
 *  barangay-clearance
 *    Profile : firstName, lastName, age, sex, civilStatus
 *    Request : purok, ctc_no, ctc_date_issued, ctc_place_issued, purpose, custom_purpose
 *
 *  business-clearance
 *    Profile : firstName, lastName
 *    Request : business_name, purok
 *
 *  certification-of-death
 *    Profile : firstName, lastName          (requestor / survivor filing the cert)
 *    Request : deceased_name, deceased_age, date_of_death, place_of_death,
 *              deceased_address, relationship_to_deceased
 *
 *  job-seeker  (Barangay Certification – RA 11261)
 *    Profile : firstName, lastName
 *    Request : purok, years_of_residency, bcn_no
 *
 *  oath-of-undertaking
 *    Profile : firstName, lastName, age
 *    Request : purok, years_of_residency
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
  payload_hash?:             string;
  payload_snapshot?:         string;
  chain_tx_hash?:            string;
  revoke_tx_hash?:           string;
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
  deceased_address?:         string;
  relationship_to_deceased?: string;
  bcn_no?:                   string;
  years_of_residency?:       string;
  years_lived?:              string;
  months_lived?:             string;
  follow_up_requested?:      boolean | null;
  follow_up_requested_at?:   string | null;
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

/** Calculates age in whole years from an ISO date string (e.g. "1995-06-15"). */
function calculateAge(birthday: string): string {
  if (!birthday) return '';
  const birth = new Date(birthday);
  if (isNaN(birth.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? String(age) : '';
}

export function normaliseProfile(raw: Record<string, string>): Profile {
  const birthday = raw.birthday ?? raw.date_of_birth ?? '';
  return {
    id:          raw.id           ?? '',
    firstName:   raw.first_name   ?? raw.firstName   ?? '',
    lastName:    raw.last_name    ?? raw.lastName    ?? '',
    email:       raw.email        ?? '',
    phone:       raw.phone        ?? raw.contact_number ?? '',
    address:     raw.address      ?? '',
    birthday,
    civilStatus: raw.civil_status ?? raw.civilStatus ?? '',
    sex:         raw.sex          ?? raw.gender      ?? '',
    age:         raw.age          || calculateAge(birthday),
  };
}

export async function sha256Hex(blob: Blob): Promise<string> {
  const buf    = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const xmlEscape = (s: string): string =>
  s.replace(/&/g, '&amp;')
   .replace(/</g, '&lt;')
   .replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;')
   .replace(/'/g, '&apos;');

/** Returns today formatted as "January 1, 2025" (en-PH locale). */
const getToday = (): string =>
  new Date().toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

/** Returns current date parts needed by all templates. */
function getCurrentDateParts() {
  const now    = new Date();
  const day    = String(now.getDate());
  const suffix = day === '1' ? 'st' : day === '2' ? 'nd' : day === '3' ? 'rd' : 'th';
  const SUFFIX = suffix.toUpperCase();
  const month  = now.toLocaleString('en-PH', { month: 'long' });
  const MONTH  = month.toUpperCase();
  const year   = String(now.getFullYear());
  return { day, suffix, SUFFIX, month, MONTH, year };
}

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

// ─── Template loader ──────────────────────────────────────────────────────────

const TEMPLATE_MAP: Record<string, string> = {
  'barangay-clearance':       '/files/BRGY-CLEARANCE-TEMPLATE.docx',
  'business-clearance':       '/files/BUSINESS-CLEARANCE.docx',
  'certification-of-death':   '/files/CERTIFICATION-OF-DEATH.docx',
  'job-seeker':               '/files/Certification.docx',
  'oath-of-undertaking':      '/files/Oath-of-Undertaking-for-First-Time-Jobseeker.docx',
  'certificate-of-indigency': '/files/CERTIFICATE-OF-INDIGENCY.docx',
  'certificate-of-residency': '/files/CERTIFICATE-OF-RESIDENCY.docx',
  'barangay-certification':   '/files/BARANGAY-CERTIFICATION.docx',
};

async function loadTemplate(documentType: string): Promise<{ JSZip: any; zip: any }> {
  const JSZip = await loadJSZip();
  const url   = TEMPLATE_MAP[documentType];
  if (!url) throw new Error(`No template found for document type: ${documentType}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load template (${response.status}): ${url}`);
  const zip = await JSZip.loadAsync(await response.arrayBuffer());
  return { JSZip, zip };
}

// ─── XML patch helper ─────────────────────────────────────────────────────────

async function patchXml(
  zip:      any,
  filename: string,
  patcher:  (xml: string) => string,
): Promise<void> {
  const file = zip.file(filename);
  if (!file) return;
  zip.file(filename, patcher(await file.async('string')));
}

// ─── Signature / image helpers ────────────────────────────────────────────────

async function removeWhiteBackground(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas  = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx     = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data      = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) data[i + 3] = 0;
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src     = dataUrl;
  });
}

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

    if (secretary) secretary = await removeWhiteBackground(secretary);
    if (captain)   captain   = await removeWhiteBackground(captain);

    return { secretary, captain };
  } catch (err) {
    console.warn('fetchSignatureImages error:', err);
    return { secretary: null, captain: null };
  }
}

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
    `<w:r><w:drawing>` +
    `<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">` +
    `<wp:extent cx="${widthEmu}" cy="${heightEmu}"/>` +
    `<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="1" name="${xmlEscape(descr)}" descr="${xmlEscape(descr)}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="0" name="${xmlEscape(descr)}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>` +
    `<a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline>` +
    `</w:drawing></w:r></w:p>`
  );
}

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
  const imageType = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
  relsXml = relsXml.replace(
    '</Relationships>',
    `<Relationship Id="${rId}" Type="${imageType}" Target="media/${fileName}"/>\n</Relationships>`,
  );
  zip.file('word/_rels/document.xml.rels', relsXml);

  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    let ctXml: string = await ctFile.async('string');
    if (!ctXml.includes('Extension="png"')) {
      ctXml = ctXml.replace('</Types>', `<Default Extension="png" ContentType="image/png"/>\n</Types>`);
      zip.file('[Content_Types].xml', ctXml);
    }
  }
}

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
  let xml: string = await docFile.async('string');
  if (!xml.includes(xmlEscape(placeholder)) && !xml.includes(placeholder)) {
    console.warn(`Placeholder "${placeholder}" not found in document.xml`);
    return;
  }
  await injectImageIntoZip(zip, base64DataUrl, fileName, rId);
  const widthEmu     = Math.round(widthInches  * 914400);
  const heightEmu    = Math.round(heightInches * 914400);
  const imgParagraph = buildInlineImageParagraph(rId, widthEmu, heightEmu, placeholder, align);
  const escapedTag    = placeholder.replace(/[{}%]/g, '\\$&');
  const xmlEscapedTag = xmlEscape(placeholder).replace(/[{}%]/g, '\\$&');
  for (const tag of [escapedTag, xmlEscapedTag]) {
    const updated = xml.replace(new RegExp(`<w:p[ >][^]*?${tag}[^]*?<\\/w:p>`, 'g'), imgParagraph);
    if (updated !== xml) { xml = updated; break; }
  }
  zip.file('word/document.xml', xml);
}

async function injectSignatureIntoZip(
  zip:           any,
  altText:       string,
  base64DataUrl: string,
  newFileName:   string,
  newRId:        string,
): Promise<void> {
  const docFile = zip.file('word/document.xml');
  if (!docFile) return;
  let xml: string = await docFile.async('string');

  const descrPos = xml.indexOf(`descr="${altText}"`);
  if (descrPos === -1) { console.warn(`Signature alt text "${altText}" not found`); return; }

  const embedMatch = xml.slice(descrPos, descrPos + 1500).match(/r:embed="(rId[^"]+)"/);
  if (!embedMatch) { console.warn(`No r:embed near "${altText}"`); return; }
  const existingRId = embedMatch[1];

  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (!relsFile) return;
  let relsXml: string = await relsFile.async('string');
  const relMatch = relsXml.match(new RegExp(`Id="${existingRId}"[^>]*Target="media/([^"]+)"`));
  if (!relMatch) { console.warn(`No media target for ${existingRId}`); return; }

  const cleanDataUrl = await removeWhiteBackground(base64DataUrl);
  const base64       = cleanDataUrl.split(',')[1];
  if (!base64) return;

  const usageCount = (xml.match(new RegExp(`r:embed="${existingRId}"`, 'g')) ?? []).length;
  if (usageCount <= 1) {
    zip.file(`word/media/${relMatch[1]}`, base64, { base64: true });
  } else {
    zip.file(`word/media/${newFileName}`, base64, { base64: true });
    const imageType = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
    relsXml = relsXml.replace(
      '</Relationships>',
      `<Relationship Id="${newRId}" Type="${imageType}" Target="media/${newFileName}"/>\n</Relationships>`,
    );
    zip.file('word/_rels/document.xml.rels', relsXml);
    const patched = xml.slice(descrPos).replace(`r:embed="${existingRId}"`, `r:embed="${newRId}"`);
    xml = xml.slice(0, descrPos) + patched;
    zip.file('word/document.xml', xml);
  }
}

// ─── QR Code ─────────────────────────────────────────────────────────────────

async function renderQRToDataUrl(text: string): Promise<string> {
  // @ts-ignore
  if (typeof window.QRCode === 'undefined') {
    await new Promise<void>((resolve, reject) => {
      const s  = document.createElement('script');
      s.src    = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload = () => resolve();
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
        text, width: 256, height: 256,
        colorDark: '#000000', colorLight: '#ffffff',
        // @ts-ignore
        correctLevel: window.QRCode?.CorrectLevel?.H ?? 3,
      });
    } catch (err) { document.body.removeChild(wrap); reject(err); return; }
    setTimeout(() => {
      try {
        const canvas = wrap.querySelector('canvas') as HTMLCanvasElement | null;
        resolve(canvas ? canvas.toDataURL('image/png') : (wrap.querySelector('img') as HTMLImageElement)?.src ?? '');
      } finally { document.body.removeChild(wrap); }
    }, 300);
  });
}

async function generateQRDataUrl(requestId: string, fileHash?: string | null): Promise<string | null> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    let payload: string;
    if (fileHash && /^[0-9a-f]{64}$/i.test(fileHash)) {
      const rsEncoded = rsEncode(hexToBytes(fileHash), 32);
      payload = `${origin}/verify?hash=${fileHash}&rs=${bytesToHex(rsEncoded)}`;
    } else {
      payload = `${origin}/verify?id=${requestId}`;
    }
    return await renderQRToDataUrl(payload);
  } catch (err) {
    console.warn('QR generation failed:', err);
    return null;
  }
}

async function injectQRIntoZip(zip: any, qrDataUrl: string): Promise<void> {
  const docFile = zip.file('word/document.xml');
  if (!docFile) return;
  const xml: string = await docFile.async('string');

  // All templates use descr="{qr}" as the alt-text placeholder for the QR image.
  const QR_DESCR = 'descr="{qr}"';
  const shapePos = xml.indexOf(QR_DESCR);
  if (shapePos === -1) { console.warn(`QR placeholder "${QR_DESCR}" not found in document.xml`); return; }

  // Search forward from the placeholder for the r:embed attribute (within the same anchor/drawing block).
  const embedMatch = xml.slice(shapePos, shapePos + 2000).match(/r:embed="(rId\d+)"/);
  if (!embedMatch) { console.warn('No r:embed found near QR placeholder'); return; }

  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (!relsFile) return;
  const relMatch = (await relsFile.async('string')).match(
    new RegExp(`Id="${embedMatch[1]}"[^>]*Target="media/([^"]+)"`)
  );
  if (!relMatch) return;
  const base64 = qrDataUrl.split(',')[1];
  if (base64) zip.file(`word/media/${relMatch[1]}`, base64, { base64: true });
}

// ─── Digital Seal ─────────────────────────────────────────────────────────────

async function generateDigitalSealDataUrl(
  txHash?:  string | null,
  docHash?: string | null,
): Promise<string> {
  const SIZE = 300, CX = 150, CY = 150, R = 144;
  const NAVY = '#1a237e', GOLD = '#b8860b';
  const fingerprint = (txHash || docHash || Date.now().toString(16)).slice(0, 8).toUpperCase();
  const canvas  = document.createElement('canvas');
  canvas.width  = SIZE; canvas.height = SIZE;
  const ctx     = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, SIZE, SIZE);
  for (const [r, lw] of [[R, 4], [R - 8, 1.5]] as [number, number][]) {
    ctx.beginPath(); ctx.arc(CX, CY, r, 0, Math.PI * 2);
    ctx.strokeStyle = NAVY; ctx.lineWidth = lw; ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(CX, CY, R - 1, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(26,35,126,0.06)'; ctx.fill();
  const topText = 'BARANGAY GUIN-ON', topR = R - 14;
  ctx.font = 'bold 13px Arial,sans-serif'; ctx.fillStyle = NAVY;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < topText.length; i++) {
    const a = -Math.PI * 0.78 + (Math.PI * 1.56 / (topText.length - 1)) * i;
    ctx.save(); ctx.translate(CX + topR * Math.cos(a), CY + topR * Math.sin(a));
    ctx.rotate(a + Math.PI / 2); ctx.fillText(topText[i], 0, 0); ctx.restore();
  }
  const botText = 'DIGITALLY SEALED', botR = R - 14;
  ctx.font = 'bold 12px Arial,sans-serif'; ctx.fillStyle = GOLD;
  for (let i = 0; i < botText.length; i++) {
    const a = Math.PI * 0.22 + (Math.PI * 1.56 / (botText.length - 1)) * i;
    ctx.save(); ctx.translate(CX + botR * Math.cos(a), CY + botR * Math.sin(a));
    ctx.rotate(a - Math.PI / 2); ctx.fillText(botText[i], 0, 0); ctx.restore();
  }
  ctx.strokeStyle = NAVY; ctx.lineWidth = 1;
  for (const y of [CY - 28, CY + 28]) {
    ctx.beginPath(); ctx.moveTo(CX - (R - 22), y); ctx.lineTo(CX + (R - 22), y); ctx.stroke();
  }
  ctx.font = 'bold 9.5px Arial,sans-serif'; ctx.fillStyle = NAVY;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('CALBAYOG CITY · SAMAR', CX, CY);
  ctx.font = '8px "Courier New",monospace'; ctx.fillStyle = 'rgba(26,35,126,0.65)';
  ctx.fillText(fingerprint, CX, CY + 17);
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? 9 : 4;
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    i === 0 ? ctx.moveTo(CX + r * Math.cos(a), (CY - 48) + r * Math.sin(a))
            : ctx.lineTo(CX + r * Math.cos(a), (CY - 48) + r * Math.sin(a));
  }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = NAVY;
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    if (a > -0.3 && a < Math.PI + 0.3) continue;
    ctx.beginPath(); ctx.arc(CX + (R - 20) * Math.cos(a), CY + (R - 20) * Math.sin(a), 1, 0, Math.PI * 2); ctx.fill();
  }
  return canvas.toDataURL('image/png');
}

async function injectDigitalSealIntoZip(zip: any, sealDataUrl: string): Promise<void> {
  // All templates use descr="{seal}" as the alt-text placeholder for the seal anchor.
  const SEAL_PLACEHOLDER = '{seal}';
  const SEAL_RID  = 'rId_seal';
  const SEAL_FILE = 'digital_seal.png';
  const docFile = zip.file('word/document.xml');
  if (!docFile) return;
  let xml: string = await docFile.async('string');

  const base64 = sealDataUrl.split(',')[1];
  if (!base64) return;

  // ── Write the seal image and register its relationship ────────────────────
  zip.file(`word/media/${SEAL_FILE}`, base64, { base64: true });
  const relsFile = zip.file('word/_rels/document.xml.rels');
  if (!relsFile) return;
  let relsXml: string = await relsFile.async('string');
  if (!relsXml.includes(`Id="${SEAL_RID}"`)) {
    const imageType = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
    relsXml = relsXml.replace(
      '</Relationships>',
      `<Relationship Id="${SEAL_RID}" Type="${imageType}" Target="media/${SEAL_FILE}"/>\n</Relationships>`,
    );
    zip.file('word/_rels/document.xml.rels', relsXml);
  }

  // ── Helper: build the floating anchor XML ─────────────────────────────────
  const buildSealAnchor = (
    cx: string, cy: string,
    posH: string, posV: string,
    relH: string, relV: string,
    relHeight: string,
  ): string =>
    `<wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" ` +
    `relativeHeight="${relHeight}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1" ` +
    `xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">` +
    `<wp:simplePos x="0" y="0"/>` +
    `<wp:positionH relativeFrom="${relH}"><wp:posOffset>${posH}</wp:posOffset></wp:positionH>` +
    `<wp:positionV relativeFrom="${relV}"><wp:posOffset>${posV}</wp:posOffset></wp:positionV>` +
    `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/>` +
    `<wp:docPr id="9001" name="Digital Seal" descr="${SEAL_PLACEHOLDER}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">` +
    `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:nvPicPr><pic:cNvPr id="9001" name="Digital Seal"/><pic:cNvPicPr><a:picLocks noChangeAspect="1"/></pic:cNvPicPr></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${SEAL_RID}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>` +
    `<a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
    `<a:prstGeom prst="ellipse"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:anchor>`;

  // ── Find the {seal} placeholder anchor in the template ────────────────────
  const descrPos = xml.indexOf(`descr="${SEAL_PLACEHOLDER}"`);

  if (descrPos !== -1) {
    // ── Path A: template has a {seal} placeholder anchor — replace it in-place
    const anchorStart = xml.slice(0, descrPos).lastIndexOf('<wp:anchor');
    if (anchorStart === -1) return;
    const fromAnchor = xml.slice(anchorStart);
    const anchorEnd  = anchorStart + fromAnchor.indexOf('</wp:anchor>') + '</wp:anchor>'.length;
    const oldAnchor  = xml.slice(anchorStart, anchorEnd);
    const cx        = oldAnchor.match(/<wp:extent cx="(\d+)"/)?.[1]                          ?? '1057910';
    const cy        = oldAnchor.match(/<wp:extent[^>]*cy="(\d+)"/)?.[1]                      ?? '1059180';
    const posH      = oldAnchor.match(/<wp:positionH[^>]*>[\s\S]*?<wp:posOffset>(\d+)/)?.[1] ?? '5334000';
    const posV      = oldAnchor.match(/<wp:positionV[^>]*>[\s\S]*?<wp:posOffset>(\d+)/)?.[1] ?? '8580120';
    const relH      = oldAnchor.match(/<wp:positionH relativeFrom="([^"]+)"/)?.[1]           ?? 'column';
    const relV      = oldAnchor.match(/<wp:positionV relativeFrom="([^"]+)"/)?.[1]           ?? 'paragraph';
    const relHeight = oldAnchor.match(/relativeHeight="(\d+)"/)?.[1]                         ?? '251699200';
    const newAnchor = buildSealAnchor(cx, cy, posH, posV, relH, relV, relHeight);
    xml = xml.slice(0, anchorStart) + newAnchor + xml.slice(anchorEnd);
    console.log(`Digital Seal replaced (H=${posH} V=${posV})`);
  } else {
    // ── Path B: no placeholder — append a new floating anchor ─────────────────
    // Fallback for any future template that lacks a {seal} anchor.
    const cx = '1057910';
    const cy = '1059180';
    const relHeight = '251699200';

    let posH = '5601360';
    let posV = '8762238';
    let relH = 'page';
    let relV = 'page';

    // Derive position from Captain Signature anchor if present
    const capIdx = xml.indexOf('Captain Signature');
    if (capIdx !== -1) {
      const capAnchorStart = xml.slice(0, capIdx).lastIndexOf('<wp:anchor');
      if (capAnchorStart !== -1) {
        const capAnchorSnippet = xml.slice(capAnchorStart, capAnchorStart + 800);
        const capH    = capAnchorSnippet.match(/<wp:positionH relativeFrom="([^"]+)">[\s\S]*?<wp:posOffset>(\d+)/);
        const capV    = capAnchorSnippet.match(/<wp:positionV relativeFrom="([^"]+)">[\s\S]*?<wp:posOffset>(\d+)/);
        const capPosH = capH ? parseInt(capH[2]) : null;
        const capPosV = capV ? parseInt(capV[2]) : null;
        if (capPosH !== null && capPosV !== null) {
          posH = String(capPosH - 200000);
          posV = String(capPosV + 400000);
          relH = capH?.[1] ?? relH;
          relV = capV?.[1] ?? relV;
        }
      }
    }

    const bodyEnd = xml.lastIndexOf('</w:body>');
    if (bodyEnd === -1) return;
    const sealPara =
      `<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>` +
      `<w:r><w:drawing>` +
      buildSealAnchor(cx, cy, posH, posV, relH, relV, relHeight) +
      `</w:drawing></w:r></w:p>`;
    xml = xml.slice(0, bodyEnd) + sealPara + xml.slice(bodyEnd);
    console.log(`Digital Seal appended (H=${posH} V=${posV} relH=${relH} relV=${relV})`);
  }

  zip.file('word/document.xml', xml);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Per-document injectors ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

async function injectBarangayClearance(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const name        = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const age         = profile.age         ?? '___';
  const sex         = profile.sex         ?? 'male/female';
  const civilStatus = profile.civilStatus ?? 'single/married';
  const purok       = req.purok           ?? '___________';
  const ctcNo       = req.ctc_no          ?? '__________________';
  const ctcDate     = req.ctc_date_issued ?? '______________';
  const ctcPlace    = req.ctc_place_issued ?? '______________';
  const purpose     =
    req.purpose === 'others' && req.custom_purpose
      ? req.custom_purpose
      : req.purpose ?? 'general purposes';
  const { day, suffix, MONTH, year } = getCurrentDateParts();

  await patchXml(zip, 'word/document.xml', xml => {
    const R = 'w:rsidR="00E96396"';
    xml = xml.replace(
      `<w:r ${R}><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r ${R}><w:t>fullname</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r ${R}><w:t>}</w:t></w:r>`,
      `<w:r ${R}><w:t>{fullname}</w:t></w:r>`,
    );
    xml = xml.replace(
      `<w:r ${R}><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r ${R}><w:t>this_day</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r ${R}><w:t>}</w:t></w:r>`,
      `<w:r ${R}><w:t>{this_day}</w:t></w:r>`,
    );
    xml = xml.replace(
      `<w:r ${R}><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r ${R}><w:t>ctc_no</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r ${R}><w:t>}</w:t></w:r>`,
      `<w:r ${R}><w:t>{ctc_no}</w:t></w:r>`,
    );
    xml = xml.replace(
      `<w:r ${R}><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r ${R}><w:t>ctc_date_issued</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r ${R}><w:t>}</w:t></w:r>`,
      `<w:r ${R}><w:t>{ctc_date_issued}</w:t></w:r>`,
    );
    xml = xml.replace(
      `<w:r ${R}><w:t xml:space="preserve"> {</w:t></w:r><w:proofErr w:type="spellStart"/><w:r ${R}><w:t>ctc_place_issued</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r ${R}><w:t>}</w:t></w:r>`,
      `<w:r ${R}><w:t xml:space="preserve"> {ctc_place_issued}</w:t></w:r>`,
    );

    xml = xml.replace(/APPLICANT NAME PLACEHOLDER/g,  xmlEscape(name));
    xml = xml.replace(/\{fullname\}/g,                xmlEscape(name));
    xml = xml.replace(/\{this_day\}/g,                xmlEscape(day + suffix));
    xml = xml.replace(/\{month\}/g,                   xmlEscape(MONTH));
    xml = xml.replace(/\{year\}/g,                    xmlEscape(year));
    xml = xml.replace(/\{ctc_no\}/g,                  xmlEscape(ctcNo));
    xml = xml.replace(/\{ctc_date_issued\}/g,         xmlEscape(ctcDate));
    xml = xml.replace(/ ?\{ctc_place_issued\}/g,      xmlEscape(ctcPlace));

    xml = xml.replace(
      /_____________________ of legal age, male\/female, single\/married\/widow\/ widower, Filipino citizen, whose name and signature\/right thumb mark appears below is a BONAFIDE and permanent resident of BRGY\. GUIN-ON, Calbayog City, /g,
      `${xmlEscape(name)}, ${xmlEscape(age)} years old, ${xmlEscape(sex)}, ` +
      `${xmlEscape(civilStatus)}, Filipino citizen, whose name and signature/right thumb mark ` +
      `appears below is a BONAFIDE and permanent resident of ${xmlEscape(purok)}, ` +
      `BRGY. GUIN-ON, Calbayog City, `,
    );
    xml = xml.replace(/Issued this ___ day of /g,
      `Issued this ${xmlEscape(day)}${xmlEscape(suffix)} day of `);
    xml = xml.replace(/JANUARY,/g, `${xmlEscape(MONTH)},`);
    xml = xml.replace(/ 2024 at Brgy\. Guin-on, Calbayog City, Samar, Philippines\./g,
      ` ${xmlEscape(year)} at Brgy. Guin-on, Calbayog City, Samar, Philippines.`);
    xml = xml.replace(
      /Further certifies that he\/ she has no derogatory record and has good moral character as per our Barangay record in connected\. /g,
      `Further certifies that he/ she has no derogatory record and has good moral character ` +
      `as per our Barangay record in connected. This clearance is issued upon request for ` +
      `${xmlEscape(purpose)} and for whatever legal purpose it may serve. `,
    );
    xml = xml.replace(/CTC #: __________________ /g,  `CTC #: ${xmlEscape(ctcNo)} `);
    xml = xml.replace(/Date Issued: ______________ /g, `Date Issued: ${xmlEscape(ctcDate)} `);
    xml = xml.replace(/Place Issued: ______________/g, `Place Issued: ${xmlEscape(ctcPlace)}`);

    return xml;
  });
}

async function injectBusinessClearance(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const owner    = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const business = req.business_name    ?? '___________';
  const location = req.purok            ?? '___________';
  const ctcNo    = req.ctc_no           ?? '___________';
  const ctcDate  = req.ctc_date_issued  ?? '___________';
  const ctcPlace = req.ctc_place_issued ?? '___________';
  const { day, suffix, MONTH, year } = getCurrentDateParts();

  await patchXml(zip, 'word/document.xml', xml => {
    // ── Universal normalizer first (catches any rsidR variation) ──────────────
    for (const token of ['fullname', 'this_day', 'business_name', 'ctc_no', 'ctc_date_issued', 'ctc_place_issued']) {
      xml = normalizeSplitPlaceholder(xml, token);
    }

    // ── Old template split-run normalizers (rsidR 0005616E / 00F7455D / 00464B19) ──
    xml = xml.replace(
      '<w:r w:rsidR="0005616E" w:rsidRPr="0005616E"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r w:rsidR="0005616E" w:rsidRPr="0005616E"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>fullname</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r w:rsidR="0005616E" w:rsidRPr="0005616E"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>}</w:t></w:r>',
      '<w:r w:rsidR="0005616E" w:rsidRPr="0005616E"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>{fullname}</w:t></w:r>',
    );
    xml = xml.replace(
      '<w:r w:rsidR="00F7455D"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r w:rsidR="00F7455D"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>business_name</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r w:rsidR="00F7455D"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">} </w:t></w:r>',
      '<w:r w:rsidR="00F7455D"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">{business_name} </w:t></w:r>',
    );
    xml = xml.replace(
      '<w:r w:rsidR="00464B19" w:rsidRPr="00464B19"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r w:rsidR="00464B19" w:rsidRPr="00464B19"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>this_day</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r w:rsidR="00464B19" w:rsidRPr="00464B19"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>}</w:t></w:r>',
      '<w:r w:rsidR="00464B19" w:rsidRPr="00464B19"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>{this_day}</w:t></w:r>',
    );
    xml = xml.replace(
      '<w:r w:rsidR="00464B19" w:rsidRPr="00464B19"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:spacing w:val="-1"/><w:kern w:val="0"/></w:rPr><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r w:rsidR="00464B19" w:rsidRPr="00464B19"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:spacing w:val="-1"/><w:kern w:val="0"/></w:rPr><w:t>ctc_date_issued</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r w:rsidR="00464B19" w:rsidRPr="00464B19"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:spacing w:val="-1"/><w:kern w:val="0"/></w:rPr><w:t>}</w:t></w:r>',
      '<w:r w:rsidR="00464B19" w:rsidRPr="00464B19"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:spacing w:val="-1"/><w:kern w:val="0"/></w:rPr><w:t>{ctc_date_issued}</w:t></w:r>',
    );
    xml = xml.replace(
      '<w:r w:rsidR="00464B19" w:rsidRPr="00464B19"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:w w:val="102"/><w:kern w:val="0"/></w:rPr><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r w:rsidR="00464B19" w:rsidRPr="00464B19"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:w w:val="102"/><w:kern w:val="0"/></w:rPr><w:t>ctc_place_issued</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r w:rsidR="00464B19" w:rsidRPr="00464B19"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:w w:val="102"/><w:kern w:val="0"/></w:rPr><w:t>}</w:t></w:r>',
      '<w:r w:rsidR="00464B19" w:rsidRPr="00464B19"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:w w:val="102"/><w:kern w:val="0"/></w:rPr><w:t>{ctc_place_issued}</w:t></w:r>',
    );

    // ── New template CTC normalizers (rsidRPr 000511D4, prefix-merged pattern) ──
    // CTC #: { | ctc_no | } 
    xml = xml.replace(
      '<w:r w:rsidRPr="000511D4"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:kern w:val="0"/></w:rPr><w:t>CTC #: {</w:t></w:r><w:proofErr w:type="spellStart"/><w:r w:rsidRPr="000511D4"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:kern w:val="0"/></w:rPr><w:t>ctc_no</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r w:rsidRPr="000511D4"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:kern w:val="0"/></w:rPr><w:t xml:space="preserve">} </w:t></w:r>',
      '<w:r w:rsidRPr="000511D4"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:kern w:val="0"/></w:rPr><w:t xml:space="preserve">CTC #: {ctc_no} </w:t></w:r>',
    );
    // Date Issued: { | ctc_date_issued | } 
    xml = xml.replace(
      '<w:r w:rsidRPr="000511D4"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:kern w:val="0"/></w:rPr><w:t>Date Issued: {</w:t></w:r><w:proofErr w:type="spellStart"/><w:r w:rsidRPr="000511D4"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:kern w:val="0"/></w:rPr><w:t>ctc_date_issued</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r w:rsidRPr="000511D4"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:kern w:val="0"/></w:rPr><w:t xml:space="preserve">} </w:t></w:r>',
      '<w:r w:rsidRPr="000511D4"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:kern w:val="0"/></w:rPr><w:t xml:space="preserve">Date Issued: {ctc_date_issued} </w:t></w:r>',
    );
    // Place Issued: { | ctc_place_issued | }
    xml = xml.replace(
      '<w:r w:rsidRPr="000511D4"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:kern w:val="0"/></w:rPr><w:t>Place Issued: {</w:t></w:r><w:proofErr w:type="spellStart"/><w:r w:rsidRPr="000511D4"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:kern w:val="0"/></w:rPr><w:t>ctc_place_issued</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r w:rsidRPr="000511D4"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:kern w:val="0"/></w:rPr><w:t>}</w:t></w:r>',
      '<w:r w:rsidRPr="000511D4"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:kern w:val="0"/></w:rPr><w:t>Place Issued: {ctc_place_issued}</w:t></w:r>',
    );

    xml = xml.replace(/APPLICANT NAME PLACEHOLDER/g, xmlEscape(owner));
    xml = xml.replace(/\{fullname\}/g,               xmlEscape(owner));
    xml = xml.replace(/\{business_name\} /g,         xmlEscape(business) + ' ');
    xml = xml.replace(/\{business_name\}/g,          xmlEscape(business));
    xml = xml.replace(/\{purok\/location\}/g,        xmlEscape(location));
    xml = xml.replace(/\{this_day\}/g,               xmlEscape(day + suffix));
    xml = xml.replace(/\{month\}/g,                  xmlEscape(MONTH));
    xml = xml.replace(/\{year\}/g,                   xmlEscape(year));
    xml = xml.replace(/CTC #: \{ctc_no\} /g,        `CTC #: ${xmlEscape(ctcNo)} `);
    xml = xml.replace(/Date Issued: \{ctc_date_issued\} /g, `Date Issued: ${xmlEscape(ctcDate)} `);
    xml = xml.replace(/Place Issued: \{ctc_place_issued\}/g, `Place Issued: ${xmlEscape(ctcPlace)}`);
    xml = xml.replace(/\{ctc_no\} /g,               xmlEscape(ctcNo) + ' ');
    xml = xml.replace(/\{ctc_no\}/g,                xmlEscape(ctcNo));
    xml = xml.replace(/\{ctc_date_issued\} /g,      xmlEscape(ctcDate) + ' ');
    xml = xml.replace(/\{ctc_date_issued\}/g,       xmlEscape(ctcDate));
    xml = xml.replace(/\{ctc_place_issued\}/g,      xmlEscape(ctcPlace));

    xml = xml.replace(
      /BUSINESS CLEARANCE is Grante GREGORIO/g,
      `BUSINESS CLEARANCE is Granted to ${xmlEscape(owner)}`,
    );
    xml = xml.replace(
      /BALDOMARO GOMEZ, and owner of AGRICULTURAL /g,
      `and owner of ${xmlEscape(business)} `,
    );
    xml = xml.replace(/ PUROK-1 /g, ` ${xmlEscape(location)} `);
    xml = xml.replace(
      /Issued this 04th   day of DECEMBER 2025 at /g,
      `Issued this ${xmlEscape(day)}${xmlEscape(suffix)}   day of ${xmlEscape(MONTH)} ${xmlEscape(year)} at `,
    );

    return xml;
  });
}

/**
 * CERTIFICATION OF DEATH
 *
 * Fields injected:
 *   Profile  : firstName + lastName → requestor (person filing, not the deceased)
 *   Request  : deceased_name        → replaces "ERNESTO VALENZUELA" (split across two runs)
 *   Request  : deceased_age         → replaces "72"
 *   Request  : date_of_death        → replaces "MAY 8 2025"
 *   Request  : place_of_death       → replaces "PUROK 5 BRGY. GUIN- ON CALBAYOG CITY"
 *   Request  : deceased_address     → replaces {deceased_address} placeholder  ← NEW
 *   Request  : relationship_to_deceased → replaces "(son)"
 *   Date     : today                → "Given this 14th day of MAY, 2025 …"
 */
async function injectCertificationOfDeath(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const requestor       = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const deceasedFull    = (req.deceased_name ?? '___________').toUpperCase().trim();
  const deceasedAge     = req.deceased_age             ?? '___';
  const dateOfDeath     = req.date_of_death            ?? '___________';
  const placeRaw        = (req.place_of_death          ?? '___________').toUpperCase();
  const deceasedAddress = (req.deceased_address        ?? '___________').toUpperCase(); // ← NEW
  const relationship    = req.relationship_to_deceased ?? '___________';
  const { day, suffix, MONTH, year } = getCurrentDateParts();

  await patchXml(zip, 'word/document.xml', xml => {

    // ── Normalize split placeholders ──────────────────────────────────────────
    // {deceased_name} is split across 5 runs by Word (word-breaks on underscores).
    xml = xml.replace(
      '<w:r w:rsidR="00F450AD"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/><w:u w:val="single"/></w:rPr><w:t>{d</w:t></w:r>' +
      '<w:r w:rsidR="00F450AD" w:rsidRPr="00F450AD"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/><w:u w:val="single"/></w:rPr><w:t>eceased</w:t></w:r>' +
      '<w:r w:rsidR="00F450AD"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/><w:u w:val="single"/></w:rPr><w:t>_n</w:t></w:r>' +
      '<w:r w:rsidR="00F450AD" w:rsidRPr="00F450AD"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/><w:u w:val="single"/></w:rPr><w:t>ame</w:t></w:r>' +
      '<w:r w:rsidR="00F450AD"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/><w:u w:val="single"/></w:rPr><w:t>}</w:t></w:r>',
      '<w:r w:rsidR="00F450AD"><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="22"/><w:szCs w:val="22"/><w:u w:val="single"/></w:rPr><w:t>{deceased_name}</w:t></w:r>',
    );

    // ── Replace placeholders with real values ─────────────────────────────────
    xml = xml.replace(/\{deceased_name\}/g,    xmlEscape(deceasedFull));
    xml = xml.replace(/\{age_at_death\}/g,     xmlEscape(deceasedAge));
    xml = xml.replace(/\{place_of_death\}/g,   xmlEscape(placeRaw));
    xml = xml.replace(/\{deceased_address\}/g, xmlEscape(deceasedAddress)); // ← NEW
    xml = xml.replace(/\{fullname\}/g,         xmlEscape(requestor));
    xml = xml.replace(/\{this_day\}/g,         xmlEscape(day + suffix));
    xml = xml.replace(/\{month\}/g,            xmlEscape(MONTH));
    xml = xml.replace(/\{year\}/g,             xmlEscape(year));

    // ── Legacy hardcoded replacements (fallback) ──────────────────────────────
    const dParts = deceasedFull.split(/\s+/);
    const dFirst = dParts.length > 1 ? dParts.slice(0, -1).join(' ') : deceasedFull;
    const dLast  = dParts.length > 1 ? dParts[dParts.length - 1] : '';
    xml = xml.replace(/ERNESTO /g,    `${xmlEscape(dFirst)} `);
    xml = xml.replace(/VALENZUELA ,/g, `${xmlEscape(dLast)} ,`);
    xml = xml.replace(/ 72 /g,        ` ${xmlEscape(deceasedAge)} `);
    xml = xml.replace(
      /\. The said aforementioned name died on MAY 8 2025/g,
      `. The said aforementioned name died on ${xmlEscape(dateOfDeath)}`,
    );
    xml = xml.replace(/PUROK 5 BRGY\. GUIN- /g, `${xmlEscape(placeRaw)} `);
    xml = xml.replace(/ON  CALBAYOG/g,           ``);
    xml = xml.replace(/ CITY\./g,                `.`);
    xml = xml.replace(/ ISAGANI ROJAS CANETE/g,  ` ${xmlEscape(requestor)}`);
    xml = xml.replace(/ \(son\) /g,              ` (${xmlEscape(relationship)}) `);
    xml = xml.replace(/certificatiom/g,          'certification');
    xml = xml.replace(/Given this 14/g,          `Given this ${xmlEscape(day)}`);
    xml = xml.replace(
      /(Given this \d+<\/w:t><\/w:r>[\s\S]{0,200}<w:r[\s\S]{0,100}><w:t[^>]*>)th(<\/w:t>)/,
      `$1${xmlEscape(suffix)}$2`,
    );
    xml = xml.replace(/(<w:t[^>]*>)MAY,(<\/w:t>)/g, `$1${xmlEscape(MONTH)},$2`);
    xml = xml.replace(/ 2025 at the office of Sangguniang/g,
      ` ${xmlEscape(year)} at the office of Sangguniang`);

    return xml;
  });
}

async function injectJobSeekerCert(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const firstName = profile.firstName.toUpperCase();
  const lastName  = profile.lastName.toUpperCase();
  const fullName  = `${firstName} ${lastName}`;
  const purok     = req.purok              ?? '___';
  const years     = req.years_of_residency ?? '___';
  const bcnNo     = req.bcn_no             ?? '___';
  const { day, suffix, SUFFIX, MONTH, year } = getCurrentDateParts();
  const dayPadded  = day.padStart(2, '0');
  const footerDate = `${MONTH} ${dayPadded}, ${year}`;

  await patchXml(zip, 'word/document.xml', xml => {
    xml = xml.replace(
      '<w:r w:rsidR="0073151E"><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr><w:t>{</w:t></w:r>' +
      '<w:r w:rsidR="0073151E" w:rsidRPr="0073151E"><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr><w:t>purok/location</w:t></w:r>' +
      '<w:r w:rsidR="0073151E"><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr><w:t>}</w:t></w:r>',
      '<w:r w:rsidR="0073151E" w:rsidRPr="0073151E"><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr><w:t>{purok/location}</w:t></w:r>',
    );

    xml = xml.replace(/\{fullname\}/g,        xmlEscape(fullName));
    xml = xml.replace(/\{purok\/location\}/g, xmlEscape(purok));
    xml = xml.replace(/\{this_day\}/g,        xmlEscape(day + suffix));
    xml = xml.replace(/\{month\}/g,           xmlEscape(MONTH));
    xml = xml.replace(/\{year\}/g,            xmlEscape(year));

    xml = xml.replace(/ BCN NO\.: 09/g, ` BCN NO.: ${xmlEscape(bcnNo)}`);
    xml = xml.replace(/Ms\.MAIKA/g, `Mr/Ms.${xmlEscape(firstName)}`);
    xml = xml.replace(
      / DELA CRUZ MERILLES a resident of Purok 4, Barangay Guin-on, Calbayog City, Samar, for 5 years\/month,/g,
      ` ${xmlEscape(lastName)} a resident of ${xmlEscape(purok)}, Barangay Guin-on, ` +
      `Calbayog City, Samar, for ${xmlEscape(years)} years/month,`,
    );
    xml = xml.replace(/MAIKA DELA CRUZ MERILLES/g, `${xmlEscape(firstName)} ${xmlEscape(lastName)}`);
    xml = xml.replace(/Signed this 06/g, `Signed this ${xmlEscape(day)}`);
    xml = xml.replace(
      /(<w:t[^>]*>)TH(<\/w:t><\/w:r>[\s\S]{0,100}day of OCTOBER)/g,
      `$1${xmlEscape(SUFFIX)}$2`,
    );
    xml = xml.replace(/day of OCTOBER 2025,/g, `day of ${xmlEscape(MONTH)} ${xmlEscape(year)},`);
    xml = xml.replace(/OCTOBER 06, /g,         `${xmlEscape(MONTH)} ${xmlEscape(dayPadded)}, `);
    xml = xml.replace(/OCTOBER 06, 2025/g,     xmlEscape(footerDate));
    xml = xml.replace(
      /(<w:t[^>]*>)2025(<\/w:t><\/w:r>[\s\S]{0,60}(?:BRGY\. SECRETARY|one \(1\) year))/g,
      `$1${xmlEscape(year)}$2`,
    );

    return xml;
  });
}

async function injectOathOfUndertaking(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const firstName = profile.firstName.toUpperCase();
  const lastName  = profile.lastName.toUpperCase();
  const fullName  = `${firstName} ${lastName}`;
  const age    = profile.age            ?? '___';
  const purok  = req.purok              ?? '___';
  const years  = req.years_of_residency ?? '___';
  const { day, suffix, MONTH, year } = getCurrentDateParts();

  await patchXml(zip, 'word/document.xml', xml => {
    xml = xml.replace(
      '<w:r w:rsidR="00CC4651"><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr><w:t>{</w:t></w:r>' +
      '<w:proofErr w:type="spellStart"/>' +
      '<w:r w:rsidR="00CC4651"><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr><w:t>fullname</w:t></w:r>' +
      '<w:proofErr w:type="spellEnd"/>' +
      '<w:proofErr w:type="gramStart"/>' +
      '<w:r w:rsidR="00CC4651"><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr><w:t>}</w:t></w:r>',
      '<w:r w:rsidR="00CC4651"><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr><w:t>{fullname}</w:t></w:r>',
    );
    xml = xml.replace(
      '<w:r w:rsidR="00CC4651"><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr><w:t>{</w:t></w:r>' +
      '<w:proofErr w:type="gramEnd"/>' +
      '<w:r w:rsidR="00CC4651"><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr><w:t>year}</w:t></w:r>',
      '<w:r w:rsidR="00CC4651"><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr><w:t>{year}</w:t></w:r>',
    );
    xml = xml.replace(
      '<w:r w:rsidR="00CC4651"><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr><w:t>{</w:t></w:r>' +
      '<w:proofErr w:type="spellStart"/>' +
      '<w:r w:rsidR="00CC4651"><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr><w:t>this_</w:t></w:r>' +
      '<w:proofErr w:type="gramStart"/>' +
      '<w:r w:rsidR="00CC4651"><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr><w:t>day</w:t></w:r>' +
      '<w:proofErr w:type="spellEnd"/>' +
      '<w:r w:rsidR="00CC4651"><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr><w:t>}</w:t></w:r>',
      '<w:r w:rsidR="00CC4651"><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr><w:t>{this_day}</w:t></w:r>',
    );

    xml = xml.replace(/\{fullname\}/g,  xmlEscape(fullName));
    xml = xml.replace(/\{age\}/g,       xmlEscape(age));
    xml = xml.replace(/\{this_day\}/g,  xmlEscape(day + suffix));
    xml = xml.replace(/\{purok\}/g,     xmlEscape(purok));
    xml = xml.replace(/\{month\}/g,     xmlEscape(MONTH));
    xml = xml.replace(/\{year\}/g,      xmlEscape(year));

    xml = xml.replace(/I, EGBERT KIA DELA CRUZ ,/g, `I, ${xmlEscape(fullName)} ,`);
    xml = xml.replace(/EGBERT KIA DELA CRUZ(?=<\/w:t>)/g, xmlEscape(fullName));
    xml = xml.replace(/  23 /g,                `  ${xmlEscape(age)} `);
    xml = xml.replace(
      / a resident of Purok 2, Brgy\. Guin-on, Calbayog City, Samar for 5 years,/g,
      ` a resident of ${xmlEscape(purok)}, Brgy. Guin-on, Calbayog City, Samar for ${xmlEscape(years)} years,`,
    );
    xml = xml.replace(/Signed, this 2(?=<\/w:t>)/g,    `Signed, this ${xmlEscape(day)}`);
    xml = xml.replace(
      /(<w:t[^>]*>)nd(<\/w:t><\/w:r>[\s\S]{0,200}  day)/g,
      `$1${xmlEscape(suffix)}$2`,
    );
    xml = xml.replace(/of  SEPTEMBER/g, `of  ${xmlEscape(MONTH)}`);
    xml = xml.replace(
      /  2024, in Barangay Guin-on, Calbayog City, Samar\./g,
      `  ${xmlEscape(year)}, in Barangay Guin-on, Calbayog City, Samar.`,
    );

    return xml;
  });
}

// ─── Universal split-run normalizer ──────────────────────────────────────────
//
// Word splits placeholder text across multiple <w:r> runs when edited,
// making exact-string matching fragile. This regex-based approach collapses
// any split-run pattern for a given token regardless of rsidR values, rPr
// formatting, or xml:space attributes.
//
// Used as a FIRST PASS before the existing hardcoded normalizations — both
// approaches try to match; whichever succeeds wins.
//
function normalizeSplitPlaceholder(xml: string, token: string): string {
  const esc     = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const chars   = `{${token}}`.split('');
  const runPat  = (c: string) =>
    `<w:r[^>]*>(?:<w:rPr>[\\s\\S]*?<\\/w:rPr>)?<w:t[^>]*>${esc(c)}<\\/w:t><\\/w:r>`;
  const sep     = '(?:<w:proofErr[^/]*/>)*';
  const pattern = chars.map(runPat).join(sep);
  const re      = new RegExp(pattern, 'g');
  return xml.replace(re, `<w:r><w:t>{${token}}</w:t></w:r>`);
}

/**
 * CERTIFICATE OF INDIGENCY
 *
 * Placeholders shared with barangay-clearance:
 *   {fullname}, {this_day}, {month}, {year}
 *   {ctc_no}, {ctc_date_issued}, {ctc_place_issued}
 *   APPLICANT NAME PLACEHOLDER (floating header)
 *
 * rsidR for split runs: 00084929
 */
async function injectCertificateOfIndigency(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const name     = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const ctcNo    = req.ctc_no           ?? '__________________';
  const ctcDate  = req.ctc_date_issued  ?? '______________';
  const ctcPlace = req.ctc_place_issued ?? '______________';
  const { day, suffix, MONTH, year } = getCurrentDateParts();
  const R = '00084929';

  await patchXml(zip, 'word/document.xml', xml => {
    // First pass: universal regex normalizer (handles any rsidR variation)
    for (const token of ['fullname', 'this_day', 'ctc_no', 'ctc_date_issued', 'ctc_place_issued']) {
      xml = normalizeSplitPlaceholder(xml, token);
    }
    // Normalize split {this_day} runs
    xml = xml.replace(
      `<w:r w:rsidR="${R}"><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r w:rsidR="${R}"><w:t>this_day</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r w:rsidR="${R}"><w:t>}</w:t></w:r>`,
      `<w:r w:rsidR="${R}"><w:t>{this_day}</w:t></w:r>`,
    );
    // Normalize split {fullname} runs
    xml = xml.replace(
      `<w:r w:rsidR="${R}"><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r w:rsidR="${R}"><w:t>fullname</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r w:rsidR="${R}"><w:t>}</w:t></w:r>`,
      `<w:r w:rsidR="${R}"><w:t>{fullname}</w:t></w:r>`,
    );

    // ── Text-box CTC normalizers (prefix-merged pattern) ──────────────────────
    // In these templates the '{' is merged into the label run:
    // <w:r><w:t>CTC #: {</w:t></w:r><w:proofErr/><w:r><w:t>ctc_no</w:t></w:r><w:proofErr/><w:r><w:t xml:space="preserve">} </w:t></w:r>
    xml = xml.replace(
      `<w:r><w:t>CTC #: {</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ctc_no</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t xml:space="preserve">} </w:t></w:r>`,
      `<w:r><w:t xml:space="preserve">CTC #: {ctc_no} </w:t></w:r>`,
    );
    xml = xml.replace(
      `<w:r><w:t>Date Issued: {</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ctc_date_issued</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t xml:space="preserve">} </w:t></w:r>`,
      `<w:r><w:t xml:space="preserve">Date Issued: {ctc_date_issued} </w:t></w:r>`,
    );
    xml = xml.replace(
      `<w:r><w:t>Place Issued: {</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ctc_place_issued</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t>}</w:t></w:r>`,
      `<w:r><w:t>Place Issued: {ctc_place_issued}</w:t></w:r>`,
    );

    // ── Fallback: standalone split runs (no rsidR attr) ───────────────────────
    xml = xml.replace(
      `<w:r><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ctc_no</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t xml:space="preserve">} </w:t></w:r>`,
      `<w:r><w:t xml:space="preserve">{ctc_no} </w:t></w:r>`,
    );
    xml = xml.replace(
      `<w:r><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ctc_date_issued</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t xml:space="preserve">} </w:t></w:r>`,
      `<w:r><w:t xml:space="preserve">{ctc_date_issued} </w:t></w:r>`,
    );
    xml = xml.replace(
      `<w:r><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ctc_place_issued</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t>}</w:t></w:r>`,
      `<w:r><w:t>{ctc_place_issued}</w:t></w:r>`,
    );

    xml = xml.replace(/APPLICANT NAME PLACEHOLDER/g, xmlEscape(name));
    xml = xml.replace(/\{fullname\}/g,               xmlEscape(name));
    xml = xml.replace(/\{this_day\}/g,               xmlEscape(day + suffix));
    xml = xml.replace(/\{month\}/g,                  xmlEscape(MONTH));
    xml = xml.replace(/\{year\}/g,                   xmlEscape(year));
    xml = xml.replace(/CTC #: \{ctc_no\} /g,        `CTC #: ${xmlEscape(ctcNo)} `);
    xml = xml.replace(/Date Issued: \{ctc_date_issued\} /g, `Date Issued: ${xmlEscape(ctcDate)} `);
    xml = xml.replace(/Place Issued: \{ctc_place_issued\}/g, `Place Issued: ${xmlEscape(ctcPlace)}`);
    xml = xml.replace(/\{ctc_no\} /g,               xmlEscape(ctcNo) + ' ');
    xml = xml.replace(/\{ctc_no\}/g,                xmlEscape(ctcNo));
    xml = xml.replace(/\{ctc_date_issued\} /g,      xmlEscape(ctcDate) + ' ');
    xml = xml.replace(/\{ctc_date_issued\}/g,       xmlEscape(ctcDate));
    xml = xml.replace(/\{ctc_place_issued\}/g,      xmlEscape(ctcPlace));

    return xml;
  });
}

/**
 * CERTIFICATE OF RESIDENCY
 *
 * Placeholders shared with barangay-clearance:
 *   {fullname}, {this_day}, {month}, {year}
 *   {ctc_no}, {ctc_date_issued}, {ctc_place_issued}
 *   APPLICANT NAME PLACEHOLDER (floating header)
 *
 * Additional placeholders (new):
 *   {years_lived}   — split: rsidR 006B711C
 *   {months_lived}  — split across two runs: "months_live" (006B711C) + "d" (007A7286)
 *
 * rsidR for split {this_day}/{fullname} runs: 00B57F13
 */
async function injectCertificateOfResidency(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const name       = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const ctcNo      = req.ctc_no           ?? '__________________';
  const ctcDate    = req.ctc_date_issued  ?? '______________';
  const ctcPlace   = req.ctc_place_issued ?? '______________';
  const yearsLived  = req.years_lived     ?? '___';
  const monthsLived = req.months_lived    ?? '___';
  const { day, suffix, MONTH, year } = getCurrentDateParts();
  const R  = '00B57F13';
  const RY = '006B711C';
  const RM = '007A7286';

  // Formatting props shared by years_lived / months_lived runs in the template
  const rPrResidency = '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>';

  await patchXml(zip, 'word/document.xml', xml => {
    // First pass: universal regex normalizer (handles any rsidR variation)
    for (const token of ['fullname', 'this_day', 'ctc_no', 'ctc_date_issued', 'ctc_place_issued', 'years_lived', 'months_lived']) {
      xml = normalizeSplitPlaceholder(xml, token);
    }
    // Normalize split {this_day}
    xml = xml.replace(
      `<w:r w:rsidR="${R}"><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r w:rsidR="${R}"><w:t>this_day</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r w:rsidR="${R}"><w:t>}</w:t></w:r>`,
      `<w:r w:rsidR="${R}"><w:t>{this_day}</w:t></w:r>`,
    );
    // Normalize split {fullname}
    xml = xml.replace(
      `<w:r w:rsidR="${R}"><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r w:rsidR="${R}"><w:t>fullname</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r w:rsidR="${R}"><w:t>}</w:t></w:r>`,
      `<w:r w:rsidR="${R}"><w:t>{fullname}</w:t></w:r>`,
    );
    // Normalize split {years_lived}
    xml = xml.replace(
      `<w:r w:rsidR="${RY}"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>{</w:t></w:r>` +
      `<w:proofErr w:type="spellStart"/>` +
      `<w:r w:rsidR="${RY}">${rPrResidency}<w:t>years_lived</w:t></w:r>` +
      `<w:proofErr w:type="spellEnd"/>` +
      `<w:r w:rsidR="${RY}">${rPrResidency}<w:t xml:space="preserve">} </w:t></w:r>`,
      `<w:r w:rsidR="${RY}">${rPrResidency}<w:t xml:space="preserve">{years_lived} </w:t></w:r>`,
    );
    // Normalize split {months_lived} — "months_live" (RY) + "d" (RM) split across two runs
    xml = xml.replace(
      `<w:r w:rsidR="${RY}"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>{</w:t></w:r>` +
      `<w:proofErr w:type="spellStart"/>` +
      `<w:r w:rsidR="${RY}">${rPrResidency}<w:t>months_live</w:t></w:r>` +
      `<w:r w:rsidR="${RM}">${rPrResidency}<w:t>d</w:t></w:r>` +
      `<w:proofErr w:type="spellEnd"/>` +
      `<w:r w:rsidR="${RY}">${rPrResidency}<w:t xml:space="preserve">} </w:t></w:r>`,
      `<w:r w:rsidR="${RY}">${rPrResidency}<w:t xml:space="preserve">{months_lived} </w:t></w:r>`,
    );
    // ── Text-box CTC normalizers (prefix-merged pattern) ──────────────────────
    // In these templates the '{' is merged into the label run:
    // <w:r><w:t>CTC #: {</w:t></w:r><w:proofErr/><w:r><w:t>ctc_no</w:t></w:r><w:proofErr/><w:r><w:t xml:space="preserve">} </w:t></w:r>
    xml = xml.replace(
      `<w:r><w:t>CTC #: {</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ctc_no</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t xml:space="preserve">} </w:t></w:r>`,
      `<w:r><w:t xml:space="preserve">CTC #: {ctc_no} </w:t></w:r>`,
    );
    xml = xml.replace(
      `<w:r><w:t>Date Issued: {</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ctc_date_issued</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t xml:space="preserve">} </w:t></w:r>`,
      `<w:r><w:t xml:space="preserve">Date Issued: {ctc_date_issued} </w:t></w:r>`,
    );
    xml = xml.replace(
      `<w:r><w:t>Place Issued: {</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ctc_place_issued</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t>}</w:t></w:r>`,
      `<w:r><w:t>Place Issued: {ctc_place_issued}</w:t></w:r>`,
    );

    // ── Fallback: standalone split runs (no rsidR attr) ───────────────────────
    xml = xml.replace(
      `<w:r><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ctc_no</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t xml:space="preserve">} </w:t></w:r>`,
      `<w:r><w:t xml:space="preserve">{ctc_no} </w:t></w:r>`,
    );
    xml = xml.replace(
      `<w:r><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ctc_date_issued</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t xml:space="preserve">} </w:t></w:r>`,
      `<w:r><w:t xml:space="preserve">{ctc_date_issued} </w:t></w:r>`,
    );
    xml = xml.replace(
      `<w:r><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ctc_place_issued</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t>}</w:t></w:r>`,
      `<w:r><w:t>{ctc_place_issued}</w:t></w:r>`,
    );

    xml = xml.replace(/APPLICANT NAME PLACEHOLDER/g, xmlEscape(name));
    xml = xml.replace(/\{fullname\}/g,               xmlEscape(name));
    xml = xml.replace(/\{this_day\}/g,               xmlEscape(day + suffix));
    xml = xml.replace(/\{month\}/g,                  xmlEscape(MONTH));
    xml = xml.replace(/\{year\}/g,                   xmlEscape(year));
    xml = xml.replace(/\{years_lived\} /g,           xmlEscape(yearsLived) + ' ');
    xml = xml.replace(/\{years_lived\}/g,            xmlEscape(yearsLived));
    xml = xml.replace(/\{months_lived\} /g,          xmlEscape(monthsLived) + ' ');
    xml = xml.replace(/\{months_lived\}/g,           xmlEscape(monthsLived));
    xml = xml.replace(/CTC #: \{ctc_no\} /g,        `CTC #: ${xmlEscape(ctcNo)} `);
    xml = xml.replace(/Date Issued: \{ctc_date_issued\} /g, `Date Issued: ${xmlEscape(ctcDate)} `);
    xml = xml.replace(/Place Issued: \{ctc_place_issued\}/g, `Place Issued: ${xmlEscape(ctcPlace)}`);
    xml = xml.replace(/\{ctc_no\} /g,               xmlEscape(ctcNo) + ' ');
    xml = xml.replace(/\{ctc_no\}/g,                xmlEscape(ctcNo));
    xml = xml.replace(/\{ctc_date_issued\} /g,      xmlEscape(ctcDate) + ' ');
    xml = xml.replace(/\{ctc_date_issued\}/g,       xmlEscape(ctcDate));
    xml = xml.replace(/\{ctc_place_issued\}/g,      xmlEscape(ctcPlace));

    return xml;
  });
}

/**
 * BARANGAY CERTIFICATION
 *
 * Placeholders shared with barangay-clearance:
 *   {fullname}, {this_day}, {month}, {year}
 *   {ctc_no}, {ctc_date_issued}, {ctc_place_issued}
 *   APPLICANT NAME PLACEHOLDER (floating header)
 *
 * rsidR for split runs: 00993485
 */
async function injectBarangayCertification(zip: any, req: RequestDetail, profile: Profile): Promise<void> {
  const name     = `${profile.firstName} ${profile.lastName}`.toUpperCase();
  const ctcNo    = req.ctc_no           ?? '__________________';
  const ctcDate  = req.ctc_date_issued  ?? '______________';
  const ctcPlace = req.ctc_place_issued ?? '______________';
  const { day, suffix, MONTH, year } = getCurrentDateParts();
  const R = '00993485';

  await patchXml(zip, 'word/document.xml', xml => {
    // First pass: universal regex normalizer (handles any rsidR variation)
    for (const token of ['fullname', 'this_day', 'ctc_no', 'ctc_date_issued', 'ctc_place_issued']) {
      xml = normalizeSplitPlaceholder(xml, token);
    }
    // Normalize split {this_day}
    xml = xml.replace(
      `<w:r w:rsidR="${R}"><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r w:rsidR="${R}"><w:t>this_day</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r w:rsidR="${R}"><w:t>}</w:t></w:r>`,
      `<w:r w:rsidR="${R}"><w:t>{this_day}</w:t></w:r>`,
    );
    // Normalize split {fullname}
    xml = xml.replace(
      `<w:r w:rsidR="${R}"><w:t>{</w:t></w:r><w:proofErr w:type="spellStart"/><w:r w:rsidR="${R}"><w:t>fullname</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r w:rsidR="${R}"><w:t>}</w:t></w:r>`,
      `<w:r w:rsidR="${R}"><w:t>{fullname}</w:t></w:r>`,
    );
    // ── Text-box CTC normalizers (prefix-merged pattern) ──────────────────────
    // In these templates the '{' is merged into the label run:
    // <w:r><w:t>CTC #: {</w:t></w:r><w:proofErr/><w:r><w:t>ctc_no</w:t></w:r><w:proofErr/><w:r><w:t xml:space="preserve">} </w:t></w:r>
    xml = xml.replace(
      `<w:r><w:t>CTC #: {</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ctc_no</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t xml:space="preserve">} </w:t></w:r>`,
      `<w:r><w:t xml:space="preserve">CTC #: {ctc_no} </w:t></w:r>`,
    );
    xml = xml.replace(
      `<w:r><w:t>Date Issued: {</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ctc_date_issued</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t xml:space="preserve">} </w:t></w:r>`,
      `<w:r><w:t xml:space="preserve">Date Issued: {ctc_date_issued} </w:t></w:r>`,
    );
    xml = xml.replace(
      `<w:r><w:t>Place Issued: {</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ctc_place_issued</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t>}</w:t></w:r>`,
      `<w:r><w:t>Place Issued: {ctc_place_issued}</w:t></w:r>`,
    );

    xml = xml.replace(/APPLICANT NAME PLACEHOLDER/g, xmlEscape(name));
    xml = xml.replace(/\{fullname\}/g,               xmlEscape(name));
    xml = xml.replace(/\{this_day\}/g,               xmlEscape(day + suffix));
    xml = xml.replace(/\{month\}/g,                  xmlEscape(MONTH));
    xml = xml.replace(/\{year\}/g,                   xmlEscape(year));
    xml = xml.replace(/CTC #: \{ctc_no\} /g,        `CTC #: ${xmlEscape(ctcNo)} `);
    xml = xml.replace(/Date Issued: \{ctc_date_issued\} /g, `Date Issued: ${xmlEscape(ctcDate)} `);
    xml = xml.replace(/Place Issued: \{ctc_place_issued\}/g, `Place Issued: ${xmlEscape(ctcPlace)}`);
    xml = xml.replace(/\{ctc_no\} /g,               xmlEscape(ctcNo) + ' ');
    xml = xml.replace(/\{ctc_no\}/g,                xmlEscape(ctcNo));
    xml = xml.replace(/\{ctc_date_issued\} /g,      xmlEscape(ctcDate) + ' ');
    xml = xml.replace(/\{ctc_date_issued\}/g,       xmlEscape(ctcDate));
    xml = xml.replace(/\{ctc_place_issued\}/g,      xmlEscape(ctcPlace));

    return xml;
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Main export ──────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateDocument(
  req:     RequestDetail,
  profile: Profile,
): Promise<{ blob: Blob; fileName: string }> {
  const docType = req.document_type ?? req.type ?? '';

  const { zip } = await loadTemplate(docType);

  switch (docType) {
    case 'barangay-clearance':       await injectBarangayClearance(zip, req, profile);       break;
    case 'business-clearance':       await injectBusinessClearance(zip, req, profile);       break;
    case 'certification-of-death':   await injectCertificationOfDeath(zip, req, profile);    break;
    case 'job-seeker':               await injectJobSeekerCert(zip, req, profile);            break;
    case 'oath-of-undertaking':      await injectOathOfUndertaking(zip, req, profile);        break;
    case 'certificate-of-indigency': await injectCertificateOfIndigency(zip, req, profile);  break;
    case 'certificate-of-residency': await injectCertificateOfResidency(zip, req, profile);  break;
    case 'barangay-certification':   await injectBarangayCertification(zip, req, profile);   break;
    default:
      console.warn(`No text injector for document type: ${docType}`);
  }

  const sigs = await fetchSignatureImages();

  if (sigs.secretary) {
    await injectSignatureIntoZip(zip, 'Secretary Signature', sigs.secretary, 'sig_secretary.png', 'rId_sec');
  }
  if (sigs.captain) {
    await injectSignatureIntoZip(zip, 'Captain Signature', sigs.captain, 'sig_captain.png', 'rId_cap');
  }

  const qrDataUrl = await generateQRDataUrl(req.id, req.file_hash ?? null);
  if (qrDataUrl) {
    await injectQRIntoZip(zip, qrDataUrl);
  } else {
    console.warn('QR generation failed — placeholder image left unchanged.');
  }

  if (['barangay-clearance', 'business-clearance', 'certificate-of-indigency', 'certificate-of-residency', 'barangay-certification'].includes(docType)) {
    const sealDataUrl = await generateDigitalSealDataUrl(
      req.chain_tx_hash ?? null,
      req.file_hash     ?? null,
    );
    await injectDigitalSealIntoZip(zip, sealDataUrl);
  }

  const outBuffer = await zip.generateAsync({ type: 'arraybuffer' });
  const blob = new Blob([outBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  const safeName = `${profile.firstName}_${profile.lastName}`.replace(/\s+/g, '_');
  const docLabelMap: Record<string, string> = {
    'barangay-clearance':       'Brgy_Clearance',
    'business-clearance':       'Bus_Clearance',
    'certification-of-death':   'Cert_of_Death',
    'job-seeker':               'Jobseeker_Cert',
    'oath-of-undertaking':      'Oath_Undertaking',
    'certificate-of-indigency': 'Cert_of_Indigency',
    'certificate-of-residency': 'Cert_of_Residency',
    'barangay-certification':   'Brgy_Certification',
  };
  const docLabel = docLabelMap[docType] ?? docType.replace(/-/g, '_');
  const fileName = `${docLabel}_${safeName}.docx`;

  return { blob, fileName };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── Payload hash helpers ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function buildRequestPayload(req: RequestDetail, profile: Profile): string {
  const docType  = (req.document_type ?? req.type ?? '').trim().toLowerCase();
  const fullName = `${profile.firstName} ${profile.lastName}`.trim().toLowerCase();
  const purpose  = (req.purpose === 'others' && req.custom_purpose
    ? req.custom_purpose
    : req.purpose ?? '').trim().toLowerCase();

  const typeFields: Record<string, string | undefined> = {};

  switch (docType) {
    case 'barangay-clearance':
      typeFields['ctc_date_issued']  = req.ctc_date_issued;
      typeFields['ctc_no']           = req.ctc_no;
      typeFields['ctc_place_issued'] = req.ctc_place_issued;
      typeFields['purok']            = req.purok;
      break;
    case 'business-clearance':
      typeFields['business_name']    = req.business_name;
      typeFields['ctc_date_issued']  = req.ctc_date_issued;
      typeFields['ctc_no']           = req.ctc_no;
      typeFields['ctc_place_issued'] = req.ctc_place_issued;
      typeFields['purok']            = req.purok;
      break;
    case 'certification-of-death':
      typeFields['date_of_death']            = req.date_of_death;
      typeFields['deceased_address']         = req.deceased_address; // ← NEW
      typeFields['deceased_age']             = req.deceased_age;
      typeFields['deceased_name']            = req.deceased_name;
      typeFields['place_of_death']           = req.place_of_death;
      typeFields['relationship_to_deceased'] = req.relationship_to_deceased;
      break;
    case 'job-seeker':
      typeFields['bcn_no']             = req.bcn_no;
      typeFields['purok']              = req.purok;
      typeFields['years_of_residency'] = req.years_of_residency;
      break;
    case 'oath-of-undertaking':
      typeFields['age']                = profile.age;
      typeFields['purok']              = req.purok;
      typeFields['years_of_residency'] = req.years_of_residency;
      break;
    case 'certificate-of-indigency':
      typeFields['ctc_date_issued']  = req.ctc_date_issued;
      typeFields['ctc_no']           = req.ctc_no;
      typeFields['ctc_place_issued'] = req.ctc_place_issued;
      typeFields['purok']            = req.purok;
      break;
    case 'certificate-of-residency':
      typeFields['ctc_date_issued']  = req.ctc_date_issued;
      typeFields['ctc_no']           = req.ctc_no;
      typeFields['ctc_place_issued'] = req.ctc_place_issued;
      typeFields['months_lived']     = req.months_lived;
      typeFields['purok']            = req.purok;
      typeFields['years_lived']      = req.years_lived;
      break;
    case 'barangay-certification':
      typeFields['ctc_date_issued']  = req.ctc_date_issued;
      typeFields['ctc_no']           = req.ctc_no;
      typeFields['ctc_place_issued'] = req.ctc_place_issued;
      typeFields['purok']            = req.purok;
      break;
  }

  const fieldParts = Object.entries(typeFields)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${(v ?? '').trim().toLowerCase()}`);

  const issuedAt = (req.created_at ?? '').trim();

  return [docType, fullName, purpose, ...fieldParts, issuedAt].join('|');
}

export async function hashPayload(fileBlob: Blob, payloadString: string): Promise<string> {
  const fileBytes = await fileBlob.arrayBuffer();
  const metaBytes = new TextEncoder().encode(payloadString);
  const combined  = new Uint8Array(fileBytes.byteLength + metaBytes.byteLength);
  combined.set(new Uint8Array(fileBytes), 0);
  combined.set(metaBytes, fileBytes.byteLength);
  const digest = await crypto.subtle.digest('SHA-256', combined);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}