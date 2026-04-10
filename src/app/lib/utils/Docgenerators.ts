// app/lib/utils/Docgenerators.ts
// Shared between review-request and approved-documents detail pages.
// Generates QR codes (with Reed-Solomon protected hash) and embeds transparent
// captain/secretary signatures.

import { rsEncodeHex } from '@/app/lib/utils/reedsolomon';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RequestDetail {
  id: string; type: string; document_type: string; status: string;
  created_at: string; processed_at?: string | null; purpose: string;
  custom_purpose: string | null; additional_info: string | null;
  file_url: string | null; notes: string | null; file_hash: string | null;
  chain_tx_hash: string | null;
  purok: string | null; ctc_no: string | null; ctc_date_issued: string | null;
  ctc_place_issued: string | null; business_name: string | null;
  deceased_name: string | null; deceased_age: string | null;
  date_of_death: string | null; place_of_death: string | null;
  relationship_to_deceased: string | null; years_of_residency: string | null;
  bcn_no: string | null; user_id: string;
}

export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  birthday: string | null;
  civilStatus: string | null;
}

export interface SignatureRecord {
  role: 'captain' | 'secretary';
  name: string;
  signatureDataUrl: string;
  publicKeyJwk: JsonWebKey;
  ecdsaSignature: string;
  signedAt: string;
}

// ─── Profile normaliser ───────────────────────────────────────────────────────

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

// ─── QRCode.js loader ─────────────────────────────────────────────────────────

async function loadQRCode(): Promise<any> {
  if (typeof window === 'undefined') throw new Error('QRCode is browser-only');
  // @ts-ignore
  if (typeof window.QRCode === 'undefined') {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      s.onload  = () => resolve();
      s.onerror = () => reject(new Error('Failed to load QRCode.js'));
      document.head.appendChild(s);
    });
  }
  // @ts-ignore
  return window.QRCode;
}

// ─── QR Code generator ────────────────────────────────────────────────────────

export async function generateQRCodeDataUrl(text: string): Promise<string> {
  const QRCode = await loadQRCode();
  return new Promise<string>((resolve, reject) => {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    document.body.appendChild(container);
    try {
      new QRCode(container, {
        text, width: 300, height: 300,
        colorDark: '#000000', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M,
      });
      const tryGet = (attempts: number) => {
        const img = container.querySelector('img') as HTMLImageElement | null;
        if (img?.src?.startsWith('data:')) { document.body.removeChild(container); resolve(img.src); return; }
        const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
        if (canvas) { document.body.removeChild(container); resolve(canvas.toDataURL('image/png')); return; }
        if (attempts > 0) setTimeout(() => tryGet(attempts - 1), 50);
        else { document.body.removeChild(container); reject(new Error('QR generation timed out')); }
      };
      setTimeout(() => tryGet(20), 100);
    } catch (err) { document.body.removeChild(container); reject(err); }
  });
}

// ─── Transparent signature maker ──────────────────────────────────────────────

/**
 * Takes a signature canvas dataUrl (white background) and returns a new PNG
 * with a transparent background — only the ink strokes remain visible.
 */
export async function makeTransparentSignature(dataUrl: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Make near-white pixels fully transparent
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        // White threshold — pixels brighter than 230 become transparent
        if (r > 230 && g > 230 && b > 230) {
          data[i + 3] = 0; // fully transparent
        } else {
          // Darken ink strokes to pure black for clean embedding
          data[i]     = 0;
          data[i + 1] = 0;
          data[i + 2] = 0;
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// ─── Supabase loaders ─────────────────────────────────────────────────────────

let _captainSigCache:   SignatureRecord | null | undefined = undefined;
let _secretarySigCache: SignatureRecord | null | undefined = undefined;

export async function loadCaptainSignature(): Promise<SignatureRecord | null> {
  if (_captainSigCache !== undefined) return _captainSigCache;
  try {
    const { supabase } = await import('@/app/lib/supabase');
    const { data } = await supabase
      .from('admin_signatures').select('record_json').eq('role', 'captain').single();
    _captainSigCache = data ? (data.record_json as SignatureRecord) : null;
  } catch { _captainSigCache = null; }
  return _captainSigCache;
}

export async function loadSecretarySignature(): Promise<SignatureRecord | null> {
  if (_secretarySigCache !== undefined) return _secretarySigCache;
  try {
    const { supabase } = await import('@/app/lib/supabase');
    const { data } = await supabase
      .from('admin_signatures').select('record_json').eq('role', 'secretary').single();
    _secretarySigCache = data ? (data.record_json as SignatureRecord) : null;
  } catch { _secretarySigCache = null; }
  return _secretarySigCache;
}

export async function loadBarangaySettings(): Promise<{ captain: string } | null> {
  try {
    const { supabase } = await import('@/app/lib/supabase');
    const { data } = await supabase.from('barangay_settings').select('captain').eq('id', 1).single();
    return data ?? null;
  } catch { return null; }
}

// ─── XML helpers ──────────────────────────────────────────────────────────────

export const xmlEscape = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function ordinal(day: string): string {
  if (day.endsWith('1') && day !== '11') return 'st';
  if (day.endsWith('2') && day !== '12') return 'nd';
  if (day.endsWith('3') && day !== '13') return 'rd';
  return 'th';
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// ─── Image bytes helper ───────────────────────────────────────────────────────

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes  = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function replaceZipImage(zip: any, imagePath: string, dataUrl: string): Promise<void> {
  zip.file(imagePath, dataUrlToBytes(dataUrl));
}

// ─── QR payload builder (with Reed-Solomon protected hash) ────────────────────
//
// Workflow:
//   1. Build a canonical JSON payload (id, type, issuedAt, issuedBy, verify).
//   2. SHA-256 hash the canonical string → 32 bytes / 64 hex chars.
//   3. RS-encode the hash with 32 ECC bytes (QR level Q ~25% correction capacity)
//      using the project's own reedsolomon.ts — no external dependency.
//   4. Embed both the human-readable fields AND the rs_hash into the QR so that:
//      • Any QR scanner shows the verify URL immediately.
//      • The /verify page can re-hash the fields, RS-decode the stored hash, and
//        confirm integrity even if part of the QR was physically damaged.

async function sha256HexStr(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function buildQrPayload(req: RequestDetail, captainName: string): Promise<string> {
  const verifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/verify?id=${req.id}`
    : `/verify?id=${req.id}`;

  // Canonical fields (deterministic — no trailing whitespace, fixed key order)
  const canonical = JSON.stringify({
    id:       req.id,
    type:     req.document_type,
    issuedAt: new Date().toISOString(),
    issuedBy: captainName,
    verify:   verifyUrl,
  });

  // SHA-256 → RS-encode with 32 ECC bytes (≈ QR error-correction level Q)
  const rawHash  = await sha256HexStr(canonical);
  const rsHash   = rsEncodeHex(rawHash, 32);   // 64 + 64 = 128 hex chars

  // Final QR text: human-readable JSON + the RS-protected hash
  return JSON.stringify({
    id:       req.id,
    type:     req.document_type,
    issuedAt: JSON.parse(canonical).issuedAt,
    issuedBy: captainName,
    verify:   verifyUrl,
    rs_hash:  rsHash,   // Reed-Solomon encoded SHA-256 — for /verify integrity check
  });
}

// ─── Floating "in-front-of-text" image XML builder ───────────────────────────
//
// Inserts a wp:anchor drawing that:
//   • uses wrapNone (in front of text)
//   • is positioned relative to the page/margin
//   • has a high z-index so it sits on top of existing content
//
// posXEmu / posYEmu  — position in EMU (1 inch = 914400 EMU)
// widthEmu / heightEmu — size in EMU
// rIdRef — the relationship ID for the image (e.g. "rId20")
// imgId  — unique numeric id for the drawing element

function buildInFrontImageXml(
  rIdRef: string,
  imgId: number,
  posXEmu: number,
  posYEmu: number,
  widthEmu: number,
  heightEmu: number,
): string {
  return `<w:r><w:rPr/><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="251699200" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${posXEmu}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${posYEmu}</wp:posOffset></wp:positionV><wp:extent cx="${widthEmu}" cy="${heightEmu}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${imgId}" name="Sig${imgId}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${imgId}" name="Sig${imgId}"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rIdRef}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><a:extLst><a:ext uri="{28A0092B-C50C-407E-A947-70E740481C1C}"><a14:useLocalDpi xmlns:a14="http://schemas.microsoft.com/office/drawing/2010/main" val="0"/></a:ext></a:extLst></a:blip><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr bwMode="auto"><a:xfrm><a:off x="0" y="0"/><a:ext cx="${widthEmu}" cy="${heightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>`;
}

// ─── Relationship adder ───────────────────────────────────────────────────────

function addImageRelationship(relsXml: string, rId: string, imagePath: string): string {
  const newRel = `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${imagePath}"/>`;
  return relsXml.replace('</Relationships>', newRel + '</Relationships>');
}

// ─── Find next available rId ──────────────────────────────────────────────────

function nextRId(relsXml: string): string {
  const ids = [...relsXml.matchAll(/Id="rId(\d+)"/g)].map(m => parseInt(m[1]));
  const max  = ids.length ? Math.max(...ids) : 0;
  return `rId${max + 1}`;
}

// ─── Signature injection helper ───────────────────────────────────────────────
//
// Finds the paragraph containing `titleKeyword` (e.g. "Punong Barangay") and
// inserts a floating in-front-of-text image BEFORE that paragraph's first <w:r>.
// The image is added to word/media/ and word/_rels/document.xml.rels.
//
// For BRGY/BUSINESS (text box layouts), the captain name and "Punong Barangay"
// are in text boxes (wps:txbx), so we inject into the document body paragraph
// that precedes the text box anchor instead.

interface SigPlacement {
  keyword: string;       // text to find (e.g. "Punong Barangay")
  imagePath: string;     // e.g. "word/media/sig_captain.png"
  rId: string;           // relationship ID to assign
  posXEmu: number;       // horizontal position from page left (EMU)
  posYEmu: number;       // vertical position from page top (EMU)
  widthEmu: number;
  heightEmu: number;
  imgId: number;
}

async function injectSignatures(
  zip: any,
  placements: SigPlacement[],
  sigDataUrl: string,         // transparent PNG data URL
): Promise<void> {
  const transparentSig = await makeTransparentSignature(sigDataUrl);
  const sigBytes       = dataUrlToBytes(transparentSig);

  let docXml  = await zip.file('word/document.xml').async('string') as string;
  let relsXml = await zip.file('word/_rels/document.xml.rels').async('string') as string;

  for (const pl of placements) {
    // Add image to zip
    zip.file(pl.imagePath, sigBytes);

    // Add relationship
    relsXml = addImageRelationship(relsXml, pl.rId, pl.imagePath.replace('word/', ''));

    // Build the drawing XML
    const drawingXml = buildInFrontImageXml(
      pl.rId, pl.imgId,
      pl.posXEmu, pl.posYEmu,
      pl.widthEmu, pl.heightEmu,
    );

    // Find the paragraph containing the keyword and inject the drawing
    // We add it as first run inside that paragraph (before the name text)
    const kwIdx = docXml.indexOf(pl.keyword);
    if (kwIdx < 0) continue;

    // Find the start of the paragraph containing this keyword
    const pStart = docXml.lastIndexOf('<w:p ', kwIdx);
    if (pStart < 0) continue;

    // Insert drawing after <w:pPr>...</w:pPr> (or right after <w:p ...>)
    const pPrEnd = docXml.indexOf('</w:pPr>', pStart);
    const insertAt = pPrEnd >= 0 && pPrEnd < kwIdx ? pPrEnd + 8 : docXml.indexOf('>', pStart) + 1;

    docXml = docXml.slice(0, insertAt) + drawingXml + docXml.slice(insertAt);
  }

  zip.file('word/document.xml', docXml);
  zip.file('word/_rels/document.xml.rels', relsXml);
}

// ─── EMU constants ────────────────────────────────────────────────────────────
// 1 inch = 914400 EMU.  Letter page = 8.5 x 11 in, standard margins ~1.25 in each side.

const IN = 914400; // 1 inch in EMU

// ─── Document generators ──────────────────────────────────────────────────────

export async function generateBrgyClearance(req: RequestDetail, profile: Profile): Promise<Blob> {
  const JSZip = await loadJSZip();
  const response = await fetch('/files/BRGY-CLEARANCE-TEMPLATE.docx');
  if (!response.ok) throw new Error('Could not load Barangay Clearance template');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());

  const [captainSig, secretarySig, brgySets] = await Promise.all([
    loadCaptainSignature(), loadSecretarySignature(), loadBarangaySettings(),
  ]);
  const captainName   = captainSig?.name   ?? brgySets?.captain ?? 'HON. BENJAMIN O. JAROPOJOP';
  const secretaryName = secretarySig?.name ?? 'CRISANTA L. MERILLES';

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
  content = content.replace(/HON\. BENJAMIN O\. JAROPOJOP/g, xmlEscape(captainName));
  content = content.replace(/Hon\. benjamin o\. jaropojop/g, xmlEscape(captainName.toLowerCase()));
  content = content.replace(/CRISANTA L\. MERILLES/g,         xmlEscape(secretaryName));

  zip.file('word/document.xml', content);

  // QR code → image2.png
  const qrDataUrl = await generateQRCodeDataUrl(await buildQrPayload(req, captainName));
  await replaceZipImage(zip, 'word/media/image2.png', qrDataUrl);

  // BRGY uses two copies (left + right page columns):
  //   Captain text box:   posH≈4.17in  posV≈8.25in  size≈2.92×0.55in
  //   Secretary text box: posH≈4.50in  posV≈7.25in  size≈2.58×0.56in
  // Signature sits ABOVE the name → subtract ~0.5in from posV

  let relsXml: string = await zip.file('word/_rels/document.xml.rels').async('string');
  const nextRIdNum = Math.max(...[...relsXml.matchAll(/Id="rId(\d+)"/g)].map(m => parseInt(m[1]))) + 1;

  const placements: Array<{ role: 'captain' | 'secretary'; sig: SignatureRecord | null; imagePath: string; rId: string; imgId: number; posX: number; posY: number }> = [
    { role: 'captain',   sig: captainSig,   imagePath: 'word/media/sig_captain.png',   rId: `rId${nextRIdNum}`,     imgId: 90001, posX: Math.round(4.17 * IN), posY: Math.round(7.70 * IN) },
    { role: 'secretary', sig: secretarySig, imagePath: 'word/media/sig_secretary.png', rId: `rId${nextRIdNum + 1}`, imgId: 90002, posX: Math.round(4.50 * IN), posY: Math.round(6.70 * IN) },
  ];

  const sigW = Math.round(1.80 * IN);
  const sigH = Math.round(0.50 * IN);

  let docXml: string = await zip.file('word/document.xml').async('string');

  for (const pl of placements) {
    if (!pl.sig?.signatureDataUrl) continue;
    const transparent = await makeTransparentSignature(pl.sig.signatureDataUrl);
    zip.file(pl.imagePath, dataUrlToBytes(transparent));
    relsXml = addImageRelationship(relsXml, pl.rId, pl.imagePath.replace('word/', ''));
    const drawingXml = buildInFrontImageXml(pl.rId, pl.imgId, pl.posX, pl.posY, sigW, sigH);
    // Inject at the start of the first paragraph in the document body
    const bodyStart = docXml.indexOf('<w:body>') + 8;
    const firstPEnd = docXml.indexOf('</w:pPr>', bodyStart) + 8;
    docXml = docXml.slice(0, firstPEnd) + drawingXml + docXml.slice(firstPEnd);
  }

  zip.file('word/document.xml', docXml);
  zip.file('word/_rels/document.xml.rels', relsXml);

  return new Blob([await zip.generateAsync({ type: 'arraybuffer' })], { type: DOCX_MIME });
}

export async function generateBusinessClearance(req: RequestDetail, profile: Profile): Promise<Blob> {
  const JSZip = await loadJSZip();
  const response = await fetch('/files/BUSINESS-CLEARANCE.docx');
  if (!response.ok) throw new Error('Could not load Business Clearance template');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());

  const [captainSig, secretarySig, brgySets] = await Promise.all([
    loadCaptainSignature(), loadSecretarySignature(), loadBarangaySettings(),
  ]);
  const captainName   = captainSig?.name   ?? brgySets?.captain ?? 'HON. BENJAMIN O. JAROPOJOP';
  const secretaryName = secretarySig?.name ?? 'CRISANTA L. MERILLES';

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
  content = content.replace(/HON\. BENJAMIN O\. JAROPOJOP/g,      xmlEscape(captainName));
  content = content.replace(/CRISANTA L\. MERILLES/g,              xmlEscape(secretaryName));
  zip.file('word/document.xml', content);

  // QR → image1.png
  const qrDataUrl = await generateQRCodeDataUrl(await buildQrPayload(req, captainName));
  await replaceZipImage(zip, 'word/media/image1.png', qrDataUrl);

  // Inject signatures
  let relsXml: string = await zip.file('word/_rels/document.xml.rels').async('string');
  let docXml:  string = await zip.file('word/document.xml').async('string');
  const base = Math.max(...[...relsXml.matchAll(/Id="rId(\d+)"/g)].map(m => parseInt(m[1])));
  const sigW = Math.round(1.80 * IN), sigH = Math.round(0.50 * IN);

  const sigs = [
    { sig: captainSig,   rId: `rId${base+1}`, imgId: 90003, img: 'word/media/sig_captain_b.png',   posX: Math.round(4.17 * IN), posY: Math.round(7.70 * IN) },
    { sig: secretarySig, rId: `rId${base+2}`, imgId: 90004, img: 'word/media/sig_secretary_b.png', posX: Math.round(4.50 * IN), posY: Math.round(6.70 * IN) },
  ];
  for (const s of sigs) {
    if (!s.sig?.signatureDataUrl) continue;
    const t = await makeTransparentSignature(s.sig.signatureDataUrl);
    zip.file(s.img, dataUrlToBytes(t));
    relsXml = addImageRelationship(relsXml, s.rId, s.img.replace('word/', ''));
    const drawing = buildInFrontImageXml(s.rId, s.imgId, s.posX, s.posY, sigW, sigH);
    const bodyStart = docXml.indexOf('<w:body>') + 8;
    const firstPEnd = docXml.indexOf('</w:pPr>', bodyStart) + 8;
    docXml = docXml.slice(0, firstPEnd) + drawing + docXml.slice(firstPEnd);
  }
  zip.file('word/document.xml', docXml);
  zip.file('word/_rels/document.xml.rels', relsXml);

  return new Blob([await zip.generateAsync({ type: 'arraybuffer' })], { type: DOCX_MIME });
}

export async function generateDeathCert(req: RequestDetail, profile: Profile): Promise<Blob> {
  const JSZip = await loadJSZip();
  const response = await fetch('/files/CERTIFICATION-OF-DEATH.docx');
  if (!response.ok) throw new Error('Could not load Death Certification template');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());

  const [captainSig, secretarySig, brgySets] = await Promise.all([
    loadCaptainSignature(), loadSecretarySignature(), loadBarangaySettings(),
  ]);
  const captainName   = captainSig?.name   ?? brgySets?.captain ?? 'HON. BENJAMIN O. JAROPOJOP';
  const secretaryName = secretarySig?.name ?? 'CRISANTA L. MERILLES';

  const requestor = `${profile.firstName} ${profile.lastName}`;
  const today = new Date();
  const day = today.getDate().toString(), suffix = ordinal(day);
  const month = today.toLocaleDateString('en-PH', { month: 'long' }).toUpperCase();
  const year  = today.getFullYear().toString();

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
  content = content.replace(/HON\. BENJAMIN O\. JAROPOJOP/g,                        xmlEscape(captainName));
  content = content.replace(/CRISANTA L\. MERILLES/g,                                xmlEscape(secretaryName));
  zip.file('word/document.xml', content);

  // QR → image3.png
  const qrDataUrl = await generateQRCodeDataUrl(await buildQrPayload(req, captainName));
  await replaceZipImage(zip, 'word/media/image3.png', qrDataUrl);

  // Death cert: "Barangay Secretary ... Punong Barangay" is inline text (not text boxes)
  // Captain position: right side ~5.5in from left, ~9.5in from top
  // Secretary position: left ~1.0in from left, ~9.5in from top
  let relsXml: string = await zip.file('word/_rels/document.xml.rels').async('string');
  let docXml:  string = await zip.file('word/document.xml').async('string');
  const base = Math.max(...[...relsXml.matchAll(/Id="rId(\d+)"/g)].map(m => parseInt(m[1])));
  const sigW = Math.round(1.60 * IN), sigH = Math.round(0.45 * IN);

  const sigs = [
    { sig: captainSig,   rId: `rId${base+1}`, imgId: 90005, img: 'word/media/sig_captain_d.png',   posX: Math.round(5.50 * IN), posY: Math.round(9.00 * IN) },
    { sig: secretarySig, rId: `rId${base+2}`, imgId: 90006, img: 'word/media/sig_secretary_d.png', posX: Math.round(1.00 * IN), posY: Math.round(9.00 * IN) },
  ];
  for (const s of sigs) {
    if (!s.sig?.signatureDataUrl) continue;
    const t = await makeTransparentSignature(s.sig.signatureDataUrl);
    zip.file(s.img, dataUrlToBytes(t));
    relsXml = addImageRelationship(relsXml, s.rId, s.img.replace('word/', ''));
    const drawing = buildInFrontImageXml(s.rId, s.imgId, s.posX, s.posY, sigW, sigH);
    // Inject near "Punong Barangay" or "Barangay Secretary" paragraph
    const kw = s === sigs[0] ? 'Punong Baranga' : 'Barangay Secretary';
    const kwIdx = docXml.indexOf(kw);
    if (kwIdx < 0) continue;
    const pStart = docXml.lastIndexOf('<w:p ', kwIdx);
    if (pStart < 0) continue;
    const pPrEnd = docXml.indexOf('</w:pPr>', pStart);
    const insertAt = pPrEnd >= 0 ? pPrEnd + 8 : docXml.indexOf('>', pStart) + 1;
    docXml = docXml.slice(0, insertAt) + drawing + docXml.slice(insertAt);
  }
  zip.file('word/document.xml', docXml);
  zip.file('word/_rels/document.xml.rels', relsXml);

  return new Blob([await zip.generateAsync({ type: 'arraybuffer' })], { type: DOCX_MIME });
}

export async function generateJobSeeker(req: RequestDetail, profile: Profile): Promise<Blob> {
  const JSZip = await loadJSZip();
  const response = await fetch('/files/Certification.docx');
  if (!response.ok) throw new Error('Could not load Job Seeker Certification template');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());

  const [captainSig, secretarySig, brgySets] = await Promise.all([
    loadCaptainSignature(), loadSecretarySignature(), loadBarangaySettings(),
  ]);
  const captainName   = captainSig?.name   ?? brgySets?.captain ?? 'HON. BENJAMIN O. JAROPOJOP';
  const secretaryName = secretarySig?.name ?? 'CRISANTA L. MERILLES';

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
  content = content.replace(/HON\. BENJAMIN O\. JAROPOJOP/g,              xmlEscape(captainName));
  content = content.replace(/CRISANTA L\. MERILLES/g,                      xmlEscape(secretaryName));
  zip.file('word/document.xml', content);

  // QR → image1.png
  const qrDataUrl = await generateQRCodeDataUrl(await buildQrPayload(req, captainName));
  await replaceZipImage(zip, 'word/media/image1.png', qrDataUrl);

  // Cert: captain is at ~5.1in from left, secretary at ~1.0in
  let relsXml: string = await zip.file('word/_rels/document.xml.rels').async('string');
  let docXml:  string = await zip.file('word/document.xml').async('string');
  const base = Math.max(...[...relsXml.matchAll(/Id="rId(\d+)"/g)].map(m => parseInt(m[1])));
  const sigW = Math.round(1.60 * IN), sigH = Math.round(0.45 * IN);

  const sigs = [
    { sig: captainSig,   rId: `rId${base+1}`, imgId: 90007, img: 'word/media/sig_captain_c.png',   kw: 'Punong Barangay',    posX: Math.round(5.10 * IN), posY: Math.round(9.00 * IN) },
    { sig: secretarySig, rId: `rId${base+2}`, imgId: 90008, img: 'word/media/sig_secretary_c.png', kw: 'Brgy. Secretary',    posX: Math.round(1.00 * IN), posY: Math.round(9.00 * IN) },
  ];
  for (const s of sigs) {
    if (!s.sig?.signatureDataUrl) continue;
    const t = await makeTransparentSignature(s.sig.signatureDataUrl);
    zip.file(s.img, dataUrlToBytes(t));
    relsXml = addImageRelationship(relsXml, s.rId, s.img.replace('word/', ''));
    const drawing = buildInFrontImageXml(s.rId, s.imgId, s.posX, s.posY, sigW, sigH);
    const kwIdx = docXml.indexOf(s.kw);
    if (kwIdx < 0) continue;
    const pStart = docXml.lastIndexOf('<w:p ', kwIdx);
    if (pStart < 0) continue;
    const pPrEnd = docXml.indexOf('</w:pPr>', pStart);
    const insertAt = pPrEnd >= 0 ? pPrEnd + 8 : docXml.indexOf('>', pStart) + 1;
    docXml = docXml.slice(0, insertAt) + drawing + docXml.slice(insertAt);
  }
  zip.file('word/document.xml', docXml);
  zip.file('word/_rels/document.xml.rels', relsXml);

  return new Blob([await zip.generateAsync({ type: 'arraybuffer' })], { type: DOCX_MIME });
}

export async function generateOath(req: RequestDetail, profile: Profile): Promise<Blob> {
  const JSZip = await loadJSZip();
  const response = await fetch('/files/Oath-of-Undertaking-for-First-Time-Jobseeker.docx');
  if (!response.ok) throw new Error('Could not load Oath of Undertaking template');
  const zip = await JSZip.loadAsync(await response.arrayBuffer());

  const [captainSig, brgySets] = await Promise.all([loadCaptainSignature(), loadBarangaySettings()]);
  const captainName = captainSig?.name ?? brgySets?.captain ?? 'HON. BENJAMIN O. JAROPOJOP';

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
  content = content.replace(/BENJAMIN/g,                                               xmlEscape(captainName));
  zip.file('word/document.xml', content);

  // QR → image1.png
  const qrDataUrl = await generateQRCodeDataUrl(await buildQrPayload(req, captainName));
  await replaceZipImage(zip, 'word/media/image1.png', qrDataUrl);

  // Captain signature above "Punong Barangay"
  if (captainSig?.signatureDataUrl) {
    let relsXml: string = await zip.file('word/_rels/document.xml.rels').async('string');
    let docXml:  string = await zip.file('word/document.xml').async('string');
    const base = Math.max(...[...relsXml.matchAll(/Id="rId(\d+)"/g)].map(m => parseInt(m[1])));
    const sigW = Math.round(1.60 * IN), sigH = Math.round(0.45 * IN);
    const rId  = `rId${base + 1}`, imgId = 90009;
    const t = await makeTransparentSignature(captainSig.signatureDataUrl);
    zip.file('word/media/sig_captain_o.png', dataUrlToBytes(t));
    relsXml = addImageRelationship(relsXml, rId, 'media/sig_captain_o.png');
    const drawing = buildInFrontImageXml(rId, imgId, Math.round(5.10 * IN), Math.round(9.00 * IN), sigW, sigH);
    const kwIdx = docXml.indexOf('Punong Barangay');
    if (kwIdx >= 0) {
      const pStart = docXml.lastIndexOf('<w:p ', kwIdx);
      if (pStart >= 0) {
        const pPrEnd = docXml.indexOf('</w:pPr>', pStart);
        const insertAt = pPrEnd >= 0 ? pPrEnd + 8 : docXml.indexOf('>', pStart) + 1;
        docXml = docXml.slice(0, insertAt) + drawing + docXml.slice(insertAt);
      }
    }
    zip.file('word/document.xml', docXml);
    zip.file('word/_rels/document.xml.rels', relsXml);
  }

  return new Blob([await zip.generateAsync({ type: 'arraybuffer' })], { type: DOCX_MIME });
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

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
