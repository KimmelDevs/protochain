"use client";

/**
 * Barangay Guin-on Document Generator
 *
 * Place this file in your Next.js app:
 *   app/documents/page.tsx   ← App Router
 *   pages/documents.tsx      ← Pages Router
 *
 * Install dependencies:
 *   npm install docx
 *
 * IMPORTANT: Place templates at:
 *   public/files/BRGY-CLEARANCE-TEMPLATE.docx
 *   public/files/CERTIFICATION-OF-DEATH.docx
 *   public/files/BUSINESS-CLEARANCE.docx
 *   public/files/Certification.docx
 *
 * JSZip is loaded dynamically from CDN for the clearance template.
 */

import { useState, CSSProperties, ChangeEvent } from "react";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  UnderlineType,
  LevelFormat,
} from "docx";

// ─── Types ───────────────────────────────────────────────────────────────────

type FormValues = Record<string, string>;

interface DocField {
  key: string;
  label: string;
  placeholder: string;
}

interface DocConfig {
  id: string;
  icon: string;
  title: string;
  color: string;
  accent: string;
  fields: DocField[];
  defaults: FormValues;
  onDownload: (form: FormValues) => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getToday = (): string =>
  new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

const getSignDate = (): string => {
  const d = new Date();
  const day = d.getDate();
  const suffix =
    day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th";
  const monthYear = d
    .toLocaleDateString("en-PH", { month: "long", year: "numeric" })
    .toUpperCase();
  return `${day}${suffix} day of ${monthYear}`;
};

const BARANGAY_INFO = [
  "REPUBLIC OF THE PHILIPPINES",
  "OFFICE OF THE SANGGUNIANG BARANGAY",
  "BARANGAY GUIN-ON, CALBAYOG CITY",
  "PROVINCE OF SAMAR",
];

function makeHeader(): Paragraph[] {
  return BARANGAY_INFO.map(
    (t) =>
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: t, bold: true, size: 22 })],
        spacing: { after: 0 },
      })
  );
}

function spacer(lines = 1): Paragraph[] {
  return Array.from({ length: lines }, () => new Paragraph({ children: [] }));
}

function makeLine(
  text = "",
  bold = false,
  center = false,
  underline = false,
  size = 22
): Paragraph {
  return new Paragraph({
    alignment: center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    children: [
      new TextRun({
        text,
        bold,
        size,
        underline: underline ? { type: UnderlineType.SINGLE } : undefined,
      }),
    ],
  });
}

function saveDocx(buffer: Awaited<ReturnType<typeof Packer.toBuffer>>, filename: string): void {
  const blob = new Blob([new Uint8Array(buffer)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const pageProps = {
  size: { width: 12240, height: 15840 },
  margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
};

// ─── Document Builders ───────────────────────────────────────────────────────

/**
 * Builds Barangay Clearance by fetching the real template from public/files/,
 * then doing a text-replacement inside the docx XML.
 * Requires JSZip to be available (loaded via CDN or bundled).
 */
async function buildBrgyClearance(form: FormValues): Promise<void> {
  const {
    name,
    age,
    sex,
    civilStatus,
    purok,
    ctcNo,
    ctcDateIssued,
    ctcPlaceIssued,
    purpose,
    date,
  } = form;

  // --- 1. Load JSZip dynamically if not already available ---
  // @ts-ignore
  if (typeof window.JSZip === "undefined") {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load JSZip"));
      document.head.appendChild(s);
    });
  }
  // @ts-ignore
  const JSZip = window.JSZip;

  // --- 2. Fetch template ---
  const response = await fetch("/files/BRGY-CLEARANCE-TEMPLATE.docx");
  if (!response.ok) throw new Error(`Could not load template: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();

  // --- 3. Open zip & patch document.xml ---
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Helper: replace ALL occurrences of a plain-text string inside XML-encoded content.
  // We need to XML-escape the replacement values.
  const xmlEscape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  // Build the full "certify" sentence that replaces the placeholder text
  const certifyText = `${xmlEscape(name)} of legal age, ${xmlEscape(sex)}, ${xmlEscape(civilStatus)}, Filipino citizen, whose name and signature/right thumb mark appears below is a BONAFIDE and permanent resident of ${xmlEscape(purok)}, BRGY. GUIN-ON, Calbayog City,`;

  // Build issued-this date line replacement
  const issuedThisNew = `Issued this ${xmlEscape(date)} at Brgy. Guin-on, Calbayog City, Samar, Philippines.`;

  // CTC replacements
  const ctcLineNew    = `CTC #: ${xmlEscape(ctcNo)} `;
  const dateLineNew   = `Date Issued: ${xmlEscape(ctcDateIssued)} `;
  const placeLineNew  = `Place Issued: ${xmlEscape(ctcPlaceIssued)}`;

  // Purpose injection: we replace the "To whom it may concern," area to add purpose.
  // Actually we insert a new paragraph after the "Further certifies" block.
  // Easiest: append purpose text to the "Further certifies" run, or we patch a specific placeholder.
  // Since the template has no purpose placeholder, we'll append it to the "Further certifies" sentence.
  const furtherCertNew = `Further certifies that he/ she has no derogatory record and has good moral character as per our Barangay record in connected. This clearance is issued upon request for ${xmlEscape(purpose)} and for whatever legal purpose it may serve.`;

  const patchFile = async (filename: string) => {
    const file = zip.file(filename);
    if (!file) return;
    let content: string = await file.async("string");

    // Replace name placeholder + full sentence
    content = content.replace(
      /_____________________ of legal age, male\/female, single\/married\/widow\/ widower, Filipino citizen, whose name and signature\/right thumb mark appears below is a BONAFIDE and permanent resident of BRGY\. GUIN-ON, Calbayog City, /g,
      certifyText
    );

    // Replace issued-this date
    content = content.replace(
      /Issued this ___ day of JANUARY, 2024 at Brgy\. Guin-on, Calbayog City, Samar, Philippines\./g,
      issuedThisNew
    );

    // Replace CTC fields
    content = content.replace(/CTC #: __________________ /g, ctcLineNew);
    content = content.replace(/Date Issued: ______________ /g, dateLineNew);
    content = content.replace(/Place Issued: ______________/g, placeLineNew);

    // Replace further certifies + inject purpose
    content = content.replace(
      /Further certifies that he\/ she has no derogatory record and has good moral character as per our Barangay record in connected\. /g,
      furtherCertNew + " "
    );

    zip.file(filename, content);
  };

  // Patch main document and any alternate content copies
  await patchFile("word/document.xml");

  // --- 4. Generate and download ---
  const outBuffer = await zip.generateAsync({ type: "arraybuffer" });
  const blob = new Blob([outBuffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Barangay_Clearance_${name.replace(/\s+/g, "_")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

async function buildBusinessClearance(form: FormValues): Promise<void> {
  const { owner, business, location, issuedDay, issuedDaySuffix, issuedMonth, issuedYear } = form;

  // Load JSZip dynamically if needed
  // @ts-ignore
  if (typeof window.JSZip === "undefined") {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load JSZip"));
      document.head.appendChild(s);
    });
  }
  // @ts-ignore
  const JSZip = window.JSZip;

  const response = await fetch("/files/BUSINESS-CLEARANCE.docx");
  if (!response.ok) throw new Error(`Could not load template: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const xmlEscape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
     .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

  let content: string = await zip.file("word/document.xml").async("string");

  // Replace owner name (appears in body paragraph and at bottom as applicant)
  // Body: "Grante GREGORIO BALDOMARO GOMEZ, "
  content = content.replace(
    /Grante GREGORIO BALDOMARO GOMEZ, /g,
    `Granted to ${xmlEscape(owner)}, `
  );

  // Applicant line at bottom: "GREGORIO BALDOMARO COMEZ"
  content = content.replace(
    /GREGORIO BALDOMARO COMEZ/g,
    xmlEscape(owner)
  );

  // Replace business name: "of AGRICULTURAL PRODUCTS "
  content = content.replace(
    /of AGRICULTURAL PRODUCTS /g,
    `of ${xmlEscape(business)} `
  );

  // Replace location — it's fragmented but "PUROK-1 " appears as "PUROK-1 " in a run
  // The location text "PUROK-1 " followed by "Brgy." — replace just the PUROK-1 part
  content = content.replace(
    /(<w:t[^>]*>)PUROK-1 (<\/w:t>)/g,
    `$1${xmlEscape(location)} $2`
  );

  // Replace issued day: "04"
  content = content.replace(
    /(<w:t[^>]*>)04(<\/w:t>)/,
    `$1${xmlEscape(issuedDay)}$2`
  );

  // Replace day suffix: "th" (in superscript run after the day number)
  content = content.replace(
    /(<w:t[^>]*>)th(<\/w:t>)/,
    `$1${xmlEscape(issuedDaySuffix)}$2`
  );

  // Replace month: "of DECEMBER "
  content = content.replace(
    /of DECEMBER /g,
    `of ${xmlEscape(issuedMonth)} `
  );

  // Replace year: "2025"
  content = content.replace(
    /(<w:t[^>]*>)2025(<\/w:t>)/g,
    `$1${xmlEscape(issuedYear)}$2`
  );

  zip.file("word/document.xml", content);

  const outBuffer = await zip.generateAsync({ type: "arraybuffer" });
  const blob = new Blob([outBuffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Business_Clearance_${owner.replace(/\s+/g, "_")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

async function buildCertificationOfDeath(form: FormValues): Promise<void> {
  const { deceased, age, purok, dateOfDeath, placeOfDeath, requestor, relationship, givenDay, givenDaySuffix, givenMonth, givenYear } = form;

  // Load JSZip dynamically if needed
  // @ts-ignore
  if (typeof window.JSZip === "undefined") {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load JSZip"));
      document.head.appendChild(s);
    });
  }
  // @ts-ignore
  const JSZip = window.JSZip;

  const response = await fetch("/files/CERTIFICATION-OF-DEATH.docx");
  if (!response.ok) throw new Error(`Could not load template: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const xmlEscape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
     .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

  let content: string = await zip.file("word/document.xml").async("string");

  // Replace: deceased name — template has "ERNESTO VALENZUELA ,"
  content = content.replace(/ERNESTO VALENZUELA ,/g, `${xmlEscape(deceased)},`);

  // Replace: age — template has " 72 "
  content = content.replace(/ 72 /g, ` ${xmlEscape(age)} `);

  // Replace: purok/address — template has "Purok 5, Brgy. Guin- on, Calbayog City"
  content = content.replace(
    /Purok 5, Brgy\. Guin- on, Calbayog City/g,
    xmlEscape(purok)
  );

  // Replace: date of death — template has ". The said aforementioned name died on MAY 8 2025"
  content = content.replace(
    /\. The said aforementioned name died on MAY 8 2025/g,
    `. The said aforementioned name died on ${xmlEscape(dateOfDeath)}`
  );

  // Replace: place of death — template has "PUROK 5 BRGY. GUIN- ON  CALBAYOG CITY."
  content = content.replace(
    /PUROK 5 BRGY\. GUIN- ON  CALBAYOG CITY\./g,
    `${xmlEscape(placeOfDeath)}.`
  );

  // Replace: requestor — template has " ISAGANI ROJAS CANETE"
  content = content.replace(/ ISAGANI ROJAS CANETE/g, ` ${xmlEscape(requestor)}`);

  // Replace: relationship — template has " (son) of the deceased"
  content = content.replace(
    / \(son\) of the deceased/g,
    ` (${xmlEscape(relationship)}) of the deceased`
  );

  // Replace: given day number — template has "14" (in its own run between "Given this " and "th")
  // We need to be careful — "14" appears as its own text run
  content = content.replace(
    /(<w:t[^>]*>)14(<\/w:t>)/g,
    `$1${xmlEscape(givenDay)}$2`
  );

  // Replace: day suffix — template has "th" in its own run (superscript)
  content = content.replace(
    /(<w:t[^>]*>)th(<\/w:t>)/g,
    `$1${xmlEscape(givenDaySuffix)}$2`
  );

  // Replace: month — template has "MAY" in its own run
  content = content.replace(
    /(<w:t[^>]*>)MAY(<\/w:t>)/g,
    `$1${xmlEscape(givenMonth)}$2`
  );

  // Replace: year — template has ", 2025 " in its own run
  content = content.replace(
    /(<w:t[^>]*>), 2025 (<\/w:t>)/g,
    `$1, ${xmlEscape(givenYear)} $2`
  );

  zip.file("word/document.xml", content);

  const outBuffer = await zip.generateAsync({ type: "arraybuffer" });
  const blob = new Blob([outBuffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Certification_of_Death_${deceased.replace(/\s+/g, "_")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

async function buildFirstTimeJobseekerCert(form: FormValues): Promise<void> {
  const { bcnNo, name, purok, years, issuedDay, issuedDaySuffix, issuedMonth, issuedYear } = form;

  // Load JSZip dynamically if needed
  // @ts-ignore
  if (typeof window.JSZip === "undefined") {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load JSZip"));
      document.head.appendChild(s);
    });
  }
  // @ts-ignore
  const JSZip = window.JSZip;

  const response = await fetch("/files/Certification.docx");
  if (!response.ok) throw new Error(`Could not load template: ${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const xmlEscape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
     .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

  let content: string = await zip.file("word/document.xml").async("string");

  // The template has TWO certifications on one page.
  // We replace both name occurrences (first and second person) with the same applicant.

  // Replace first name: "JIRAH JALAYAJAY ARIMALA"
  content = content.replace(
    /JIRAH JALAYAJAY ARIMALA/g,
    xmlEscape(name)
  );

  // Replace second name: "MAIKA DELA CRUZ MERILLES"
  content = content.replace(
    /MAIKA DELA CRUZ MERILLES/g,
    xmlEscape(name)
  );

  // Replace BCN number — template has "09" as own run after "BCN NO.: "
  // There are two BCN lines; first has " BCN NO.: 09", second has " BCN NO.: " then "09" separately
  // Replace the intact " BCN NO.: 09" run
  content = content.replace(
    /(<w:t[^>]*>) BCN NO\.: 09(<\/w:t>)/g,
    `$1 BCN NO.: ${xmlEscape(bcnNo)}$2`
  );
  // Replace standalone "09" run that follows "BCN NO.: "
  content = content.replace(
    /(<w:t[^>]*>)09(<\/w:t>)/g,
    `$1${xmlEscape(bcnNo)}$2`
  );

  // Replace Purok number — "2" in first cert, "4" in second cert are their own runs
  // Both sit between '" a resident of Purok "' and '", Barangay Guin-on'
  // The purok number runs appear right after the 'Purok ' text run
  // Replace all instances of the purok number (they're standalone bold runs)
  // First occurrence: "2", second: "4"
  let purokCount = 0;
  content = content.replace(
    /(a resident of Purok <\/w:t><\/w:r><w:r[^>]*><w:rPr>[^<]*(?:<[^<]*>)*<\/w:rPr><w:t>)([^<]+)(<\/w:t>)/,
    (match, before, _val, after) => `${before}${xmlEscape(purok)}${after}`
  );
  content = content.replace(
    /(a resident of Purok <\/w:t><\/w:r><w:r[^>]*><w:rPr>[^<]*(?:<[^<]*>)*<\/w:rPr><w:t>)([^<]+)(<\/w:t>)/,
    (match, before, _val, after) => `${before}${xmlEscape(purok)}${after}`
  );

  // Replace years "5 years/month" — "5" is embedded in the long text run
  content = content.replace(
    /for 5 years\/month,/g,
    `for ${xmlEscape(years)} years/month,`
  );

  // Replace issued day number — "06" (both certs)
  content = content.replace(
    /(<w:t[^>]*>)06(<\/w:t>)/g,
    `$1${xmlEscape(issuedDay)}$2`
  );

  // Replace day suffix — "TH" (superscript run, both certs)
  content = content.replace(
    /(<w:t[^>]*>)TH(<\/w:t>)/g,
    `$1${xmlEscape(issuedDaySuffix.toUpperCase())}$2`
  );

  // Replace month in "day of OCTOBER " (both certs)
  content = content.replace(
    /(<w:t[^>]*>)OCTOBER (<\/w:t>)/g,
    `$1${xmlEscape(issuedMonth.toUpperCase())} $2`
  );

  // Replace year in "2025, in Calbayog" body text
  content = content.replace(
    /2025, in Calbayog City, Samar\./g,
    `${xmlEscape(issuedYear)}, in Calbayog City, Samar.`
  );

  // Replace "OCTOBER 06" date lines (signature area, both certs)
  content = content.replace(
    /(<w:t[^>]*>)OCTOBER 06(<\/w:t>)/g,
    `$1${xmlEscape(issuedMonth.toUpperCase())} ${xmlEscape(issuedDay)}$2`
  );

  // Replace ", 2025" year in signature date lines
  content = content.replace(
    /(<w:t[^>]*>), 2025(<\/w:t>)/g,
    `$1, ${xmlEscape(issuedYear)}$2`
  );

  zip.file("word/document.xml", content);

  const outBuffer = await zip.generateAsync({ type: "arraybuffer" });
  const blob = new Blob([outBuffer], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `FTJ_Certification_${name.replace(/\s+/g, "_")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

async function buildOathOfUndertaking(form: FormValues): Promise<void> {
  const { name, age, purok, years, signDate } = form;

  const oathItems = [
    "That this is the first time that I will actively look for a job and therefore requesting that a Barangay Certification be issued in my favor to avail the benefits of the law;",
    "That I am aware that the benefit and privilege/s under the said law shall be valid only for one (1) year from the date that the Barangay Certification is issued;",
    "That I can avail the benefits of the law once;",
    "That I understand that my personal information shall be included in the Roster/list of First Time Jobseekers and will not be used for any unlawful purposes;",
    "That I will inform and/or report to the barangay personally, through text or other means, or through my family/relatives once I get employed; and",
    "That I am not a beneficiary of the JobStart program under R.A. No. 10869 and other laws that give similar exemption for the documents or transactions exempted under R.A. No. 11261;",
    "That if issued the requested certification, I will not use the same in any fraud, neither falsely nor help and/or assist in the fabrication of the said certification;",
    "That this undertaking is made solely for the purpose of obtaining a barangay certification consistent with the objective of R.A. No. 11261 and not for any other purpose;",
    "That I consent to the use of my personal information pursuant to the Data Privacy Act and other applicable laws, rules and regulations.",
  ];

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "oath-items",
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: { page: pageProps },
        children: [
          ...makeHeader(),
          ...spacer(2),
          makeLine("OATH OF UNDERTAKING", true, true, false, 28),
          ...spacer(1),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({ text: "I, ", size: 22 }),
              new TextRun({
                text: name,
                bold: true,
                size: 22,
                underline: { type: UnderlineType.SINGLE },
              }),
              new TextRun({
                text: `, ${age} years of age, is a resident of ${purok}, Brgy. Guin-on, Calbayog City, Samar for ${years} years, availing the benefits of `,
                size: 22,
              }),
              new TextRun({ text: "Republic Act 11261", bold: true, size: 22 }),
              new TextRun({ text: ", other known as the ", size: 22 }),
              new TextRun({
                text: "First Time Jobseekers Act of 2019",
                bold: true,
                size: 22,
              }),
              new TextRun({
                text: ", do hereby declare, agree and undertake to abide and be bound by the following:",
                size: 22,
              }),
            ],
          }),
          ...spacer(1),
          ...oathItems.map(
            (text) =>
              new Paragraph({
                numbering: { reference: "oath-items", level: 0 },
                alignment: AlignmentType.JUSTIFIED,
                children: [new TextRun({ text, size: 22 })],
                spacing: { after: 120 },
              })
          ),
          ...spacer(1),
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            children: [
              new TextRun({
                text: `Signed, this ${signDate}, in Barangay Guin-on, Calbayog City, Samar.`,
                size: 22,
              }),
            ],
          }),
          ...spacer(3),
          new Paragraph({
            children: [
              new TextRun({ text: name, bold: true, size: 22 }),
              new TextRun({
                text: "          BENJAMIN O. JAROPOJOP",
                bold: true,
                size: 22,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "First Time Jobseeker", size: 22 }),
              new TextRun({
                text: "          Punong Barangay",
                size: 22,
              }),
            ],
          }),
          ...spacer(1),
          makeLine("Witnessed by:"),
          ...spacer(1),
          makeLine("HON. RUEL I. EYA", true),
          makeLine("BARANGAY KAGAWAD"),
        ],
      },
    ],
  });
  const buf = await Packer.toBuffer(doc);
  saveDocx(buf, `Oath_of_Undertaking_${name.replace(/\s+/g, "_")}.docx`);
}

// ─── Doc Config ──────────────────────────────────────────────────────────────

const DOCS: DocConfig[] = [
  {
    id: "brgy",
    icon: "🏛️",
    title: "Barangay Clearance",
    color: "#1a472a",
    accent: "#2d6a4f",
    fields: [
      { key: "name", label: "Full Name", placeholder: "JUAN DELA CRUZ" },
      { key: "age", label: "Age", placeholder: "35" },
      { key: "sex", label: "Sex", placeholder: "male" },
      { key: "civilStatus", label: "Civil Status", placeholder: "single" },
      { key: "purok", label: "Purok / Address", placeholder: "Purok 2" },
      { key: "ctcNo", label: "CTC #", placeholder: "12345678" },
      { key: "ctcDateIssued", label: "CTC Date Issued", placeholder: "January 5, 2025" },
      { key: "ctcPlaceIssued", label: "CTC Place Issued", placeholder: "Calbayog City" },
      { key: "purpose", label: "Purpose", placeholder: "employment purposes" },
      { key: "date", label: "Date Issued", placeholder: "April 1, 2026" },
    ],
    defaults: { date: getToday() },
    onDownload: buildBrgyClearance,
  },
  {
    id: "biz",
    icon: "💼",
    title: "Business Clearance",
    color: "#1b3a6b",
    accent: "#2563eb",
    fields: [
      { key: "owner", label: "Owner Full Name", placeholder: "GREGORIO BALDOMARO GOMEZ" },
      { key: "business", label: "Business Name", placeholder: "AGRICULTURAL PRODUCTS" },
      { key: "location", label: "Location / Purok", placeholder: "PUROK-1" },
      { key: "issuedDay", label: "Issued Day (number)", placeholder: "04" },
      { key: "issuedDaySuffix", label: "Day Suffix", placeholder: "th" },
      { key: "issuedMonth", label: "Issued Month", placeholder: "DECEMBER" },
      { key: "issuedYear", label: "Issued Year", placeholder: "2025" },
    ],
    defaults: {},
    onDownload: buildBusinessClearance,
  },
  {
    id: "death",
    icon: "📋",
    title: "Certification of Death",
    color: "#4a1942",
    accent: "#7c3aed",
    fields: [
      { key: "deceased", label: "Name of Deceased", placeholder: "ERNESTO VALENZUELA" },
      { key: "age", label: "Age", placeholder: "72" },
      { key: "purok", label: "Purok / Address", placeholder: "Purok 5, Brgy. Guin- on, Calbayog City" },
      { key: "dateOfDeath", label: "Date of Death", placeholder: "MAY 8 2025" },
      { key: "placeOfDeath", label: "Place of Death", placeholder: "PUROK 5 BRGY. GUIN- ON CALBAYOG CITY" },
      { key: "requestor", label: "Requested By", placeholder: "ISAGANI ROJAS CANETE" },
      { key: "relationship", label: "Relationship to Deceased", placeholder: "son" },
      { key: "givenDay", label: "Given Day (number)", placeholder: "14" },
      { key: "givenDaySuffix", label: "Day Suffix", placeholder: "th" },
      { key: "givenMonth", label: "Given Month", placeholder: "MAY" },
      { key: "givenYear", label: "Given Year", placeholder: "2025" },
    ],
    defaults: {},
    onDownload: buildCertificationOfDeath,
  },
  {
    id: "ftj",
    icon: "📄",
    title: "First Time Jobseeker Certification",
    color: "#7c3900",
    accent: "#d97706",
    fields: [
      { key: "bcnNo", label: "BCN Number", placeholder: "09" },
      { key: "name", label: "Full Name", placeholder: "JIRAH JALAYAJAY ARIMALA" },
      { key: "purok", label: "Purok Number", placeholder: "2" },
      { key: "years", label: "Years of Residency", placeholder: "5" },
      { key: "issuedDay", label: "Issued Day (number)", placeholder: "06" },
      { key: "issuedDaySuffix", label: "Day Suffix", placeholder: "TH" },
      { key: "issuedMonth", label: "Issued Month", placeholder: "OCTOBER" },
      { key: "issuedYear", label: "Issued Year", placeholder: "2025" },
    ],
    defaults: {},
    onDownload: buildFirstTimeJobseekerCert,
  },
  {
    id: "oath",
    icon: "✍️",
    title: "Oath of Undertaking (First Time Jobseeker)",
    color: "#14403a",
    accent: "#0d9488",
    fields: [
      { key: "name", label: "Full Name", placeholder: "JUAN DELA CRUZ" },
      { key: "age", label: "Age", placeholder: "23" },
      { key: "purok", label: "Purok / Address", placeholder: "Purok 2" },
      { key: "years", label: "Years of Residency", placeholder: "5" },
      { key: "signDate", label: "Date Signed", placeholder: "2nd day of APRIL 2026" },
    ],
    defaults: { signDate: getSignDate() },
    onDownload: buildOathOfUndertaking,
  },
];

// ─── Components ──────────────────────────────────────────────────────────────

interface DocCardProps {
  doc: DocConfig;
}

function DocCard({ doc }: DocCardProps) {
  const [form, setForm] = useState<FormValues>(doc.defaults);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleChange = (key: string, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleDownload = async () => {
    setLoading(true);
    try {
      await doc.onDownload(form);
    } catch (e) {
      alert("Error generating document: " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle: CSSProperties = {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
    overflow: "hidden",
    border: `1px solid ${doc.color}22`,
  };

  const headerBtnStyle: CSSProperties = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "18px 22px",
    background: doc.color,
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  };

  const bodyStyle: CSSProperties = {
    padding: "22px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  };

  const labelStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  };

  const labelTextStyle: CSSProperties = {
    fontSize: 12,
    fontWeight: 700,
    color: doc.color,
    letterSpacing: 1,
    textTransform: "uppercase",
  };

  const inputStyle: CSSProperties = {
    border: `1.5px solid ${doc.color}55`,
    borderRadius: 8,
    padding: "9px 13px",
    fontSize: 15,
    fontFamily: "inherit",
    outline: "none",
    transition: "border 0.2s",
  };

  const btnStyle: CSSProperties = {
    marginTop: 8,
    padding: "12px 0",
    background: loading ? "#aaa" : doc.accent,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    fontFamily: "Georgia, serif",
    fontSize: 15,
    fontWeight: 700,
    cursor: loading ? "default" : "pointer",
    letterSpacing: 0.5,
    transition: "background 0.2s",
  };

  return (
    <div style={cardStyle}>
      <button onClick={() => setOpen((o) => !o)} style={headerBtnStyle}>
        <span style={{ fontSize: 28 }}>{doc.icon}</span>
        <span
          style={{
            color: "#fff",
            fontFamily: "Georgia, serif",
            fontSize: 17,
            fontWeight: 700,
            flex: 1,
          }}
        >
          {doc.title}
        </span>
        <span style={{ color: "#ffffff99", fontSize: 20 }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div style={bodyStyle}>
          {doc.fields.map((f) => (
            <label key={f.key} style={labelStyle}>
              <span style={labelTextStyle}>{f.label}</span>
              <input
                value={form[f.key] ?? ""}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  handleChange(f.key, e.target.value)
                }
                placeholder={f.placeholder}
                style={inputStyle}
                onFocus={(e) =>
                  (e.currentTarget.style.border = `1.5px solid ${doc.accent}`)
                }
                onBlur={(e) =>
                  (e.currentTarget.style.border = `1.5px solid ${doc.color}55`)
                }
              />
            </label>
          ))}

          <button onClick={handleDownload} disabled={loading} style={btnStyle}>
            {loading ? "Generating…" : "⬇ Download .docx"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BarangayDocumentsPage() {
  const pageStyle: CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f0f4f8 0%, #e8efe8 100%)",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    padding: "0 0 60px",
  };

  const heroStyle: CSSProperties = {
    background: "linear-gradient(135deg, #1a472a 0%, #2d6a4f 100%)",
    color: "#fff",
    padding: "40px 24px 36px",
    textAlign: "center",
    boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
  };

  const gridStyle: CSSProperties = {
    maxWidth: 680,
    margin: "32px auto 0",
    padding: "0 16px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  };

  return (
    <div style={pageStyle}>
      <div style={heroStyle}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>🏛️</div>
        <h1
          style={{
            margin: 0,
            fontFamily: "Georgia, serif",
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          Barangay Guin-on
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 15, opacity: 0.85 }}>
          Calbayog City, Samar — Official Document Generator
        </p>
        <p
          style={{
            margin: "10px auto 0",
            fontSize: 13,
            opacity: 0.65,
            maxWidth: 420,
          }}
        >
          Fill in the required fields for each document, then click Download to
          get a ready-to-print .docx file.
        </p>
      </div>

      <div style={gridStyle}>
        {DOCS.map((doc) => (
          <DocCard key={doc.id} doc={doc} />
        ))}
      </div>

      <p
        style={{
          textAlign: "center",
          fontSize: 12,
          color: "#999",
          marginTop: 40,
        }}
      >
        Barangay Guin-on, Calbayog City, Samar • Official Document System
      </p>
    </div>
  );
}