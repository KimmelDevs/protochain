'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ShieldX, ShieldAlert, Loader2, Search,
  Upload, FileText, ExternalLink, Copy, Check,
  Camera, QrCode, ScanText,
} from 'lucide-react';
import { verifyDocumentOnChain, type VerifyResult } from '@/app/lib/blockchain';
import WebcamScanner from '@/app/components/WebcamScanner';

/* ─── helpers ───────────────────────────────────────────────────────────── */
async function computeSha256(file: File): Promise<string> {
  const buf    = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const fmtDocType = (s: string) =>
  s.split(/[\s\-_]+/)
   .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
   .join(' ');

/* ─── page ──────────────────────────────────────────────────────────────── */
export default function VerifyPage() {
  const fileRef = useRef<HTMLInputElement>(null);

  const [hash,       setHash]       = useState('');
  const [fileName,   setFileName]   = useState('');
  const [result,     setResult]     = useState<VerifyResult | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [hashing,    setHashing]    = useState(false);
  const [error,      setError]      = useState('');
  const [copied,     setCopied]     = useState(false);
  const [activeTab,  setActiveTab]  = useState<'file' | 'hash' | 'scan'>('file');
  const [showWebcam, setShowWebcam] = useState(false);

  const handleFile = async (file: File) => {
    setHashing(true); setError(''); setResult(null);
    try {
      const h = await computeSha256(file);
      setHash(h); setFileName(file.name);
    } catch { setError('Failed to read file.'); }
    finally { setHashing(false); }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) handleFile(f);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
  };

  const handleVerify = async () => {
    const h = hash.trim();
    if (!h) { setError('Please enter or upload a document to verify.'); return; }
    if (h.length !== 64) { setError('SHA-256 hash must be exactly 64 characters.'); return; }
    setLoading(true); setError(''); setResult(null);
    try { setResult(await verifyDocumentOnChain(h)); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Verification failed.'); }
    finally { setLoading(false); }
  };

  const copyHash = () => {
    navigator.clipboard.writeText(hash); setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScanResult = (scannedHash: string) => {
    setHash(scannedHash); setError(''); setResult(null);
    setActiveTab('file');
  };

  const isAuthentic = result?.exists && !result?.isRevoked;
  const isRevoked   = result?.exists && result?.isRevoked;
  const isNotFound  = result && !result.exists;

  const resultBorderClass = isAuthentic
    ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20'
    : isRevoked
    ? 'border-amber-400 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20'
    : 'border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-950/20';

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap'); .pjs{font-family:'Plus Jakarta Sans',sans-serif}`}</style>
      <input ref={fileRef} type="file" className="hidden" onChange={onFileChange} />

      <AnimatePresence>
        {showWebcam && (
          <WebcamScanner
            accentBorder="border-orange-400"
            accentBtn="bg-orange-600 hover:bg-orange-500"
            accentDot="bg-orange-500"
            onClose={() => setShowWebcam(false)}
            onHash={handleScanResult}
          />
        )}
      </AnimatePresence>

      <div className="pjs min-h-screen bg-[#F6F5F3] dark:bg-[#111113] p-4 lg:p-10">
        <div className="max-w-2xl mx-auto">

          {/* HEADER */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
            <div className="w-14 h-14 bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7 text-orange-500" />
            </div>
            <h1 className="mono text-3xl font-bold text-[#1A1A1C] dark:text-[#EAEAEC] tracking-tight mb-2">VERIFY DOCUMENT</h1>
            <p className="text-[13px] text-[#6C6C74] dark:text-[#9090A0] max-w-md mx-auto leading-relaxed">
              Upload your document, paste its hash, or scan the QR code / any printed text with your webcam.
            </p>
          </motion.div>

          {/* TABS */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="flex border-b-2 border-[#1A1A1C] dark:border-[#EAEAEC] mb-6">
            {(['file', 'hash', 'scan'] as const).map(tab => (
              <button key={tab}
                onClick={() => { setActiveTab(tab); setResult(null); setError(''); }}
                className={`mono text-[11px] font-bold tracking-[0.15em] uppercase px-5 py-2.5 transition-colors flex items-center gap-1.5 ${
                  activeTab === tab
                    ? 'bg-[#1a1917] dark:bg-[#f0eee8] text-white dark:text-[#1A1A1C]'
                    : 'text-[#6C6C74] dark:text-[#9090A0] hover:text-[#1A1A1C] dark:hover:text-[#f0eee8]'
                }`}>
                {tab === 'file' && '① Upload'}
                {tab === 'hash' && '② Hash'}
                {tab === 'scan' && <><Camera className="w-3 h-3" />③ Scan</>}
              </button>
            ))}
          </motion.div>

          {/* INPUT PANEL */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] p-6 mb-4">

            <AnimatePresence mode="wait">
              {/* ── File tab ── */}
              {activeTab === 'file' && (
                <motion.div key="file" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-[#E8E6E1] dark:border-[#2C2C32] hover:border-orange-500 dark:hover:border-orange-400 transition-colors cursor-pointer p-10 text-center mb-4">
                    {hashing ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                        <p className="mono text-[12px] text-[#6C6C74] dark:text-[#9090A0]">Computing SHA-256…</p>
                      </div>
                    ) : fileName ? (
                      <div className="flex flex-col items-center gap-2">
                        <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-[13px] font-medium text-[#1A1A1C] dark:text-[#EAEAEC]">{fileName}</p>
                        <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0]">Click to change file</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="w-6 h-6 text-[#6C6C74] dark:text-[#9090A0]" />
                        <p className="text-[13px] text-[#3A3A3E] dark:text-[#BABABC] font-medium">Drop your document here</p>
                        <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0]">or click to browse — .docx, .pdf</p>
                      </div>
                    )}
                  </div>
                  {hash && (
                    <div className="border-l-2 border-orange-500 pl-3 py-1 mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] tracking-[0.08em] uppercase text-orange-600 dark:text-orange-400 font-bold">Computed SHA-256</span>
                        <button onClick={copyHash} className="mono text-[10px] text-[#6C6C74] hover:text-orange-600 flex items-center gap-1">
                          {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                        </button>
                      </div>
                      <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] break-all leading-relaxed">{hash}</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Hash tab ── */}
              {activeTab === 'hash' && (
                <motion.div key="hash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <label className="text-[11px] tracking-[0.08em] uppercase text-[#6C6C74] dark:text-[#9090A0] block mb-2 font-bold">SHA-256 Hash (64 characters)</label>
                  <textarea value={hash} onChange={e => { setHash(e.target.value); setResult(null); }} rows={3}
                    placeholder="Paste your 64-character SHA-256 hash here…"
                    className="w-full mono text-[12px] bg-[#F6F5F3] dark:bg-[#111113] border border-[#E8E6E1] dark:border-[#2C2C32] p-3 text-[#1A1A1C] dark:text-[#EAEAEC] placeholder-[#B0B0B8] focus:outline-none focus:border-orange-500 resize-none mb-1" />
                  <p className={`mono text-[10px] ${hash.trim().length === 64 ? 'text-emerald-600' : 'text-[#6C6C74]'}`}>
                    {hash.trim().length} / 64 characters
                  </p>
                </motion.div>
              )}

              {/* ── Scan tab ── */}
              {activeTab === 'scan' && (
                <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-[13px] text-[#3A3A3E] dark:text-[#BABABC] mb-5 leading-relaxed">
                    Use your webcam to read the document. The scanner can detect <strong>QR codes</strong>, printed <strong>hash text</strong>, or <strong>verify URLs</strong> — including the digital ESCDA stamp.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { icon: <QrCode className="w-5 h-5 text-orange-500" />, title: 'QR Code', desc: 'Auto-detects the embedded QR continuously' },
                      { icon: <ScanText className="w-5 h-5 text-orange-500" />, title: 'OCR / Text', desc: 'Reads hash text, URLs & digital stamps via OCR' },
                    ].map(({ icon, title, desc }) => (
                      <button key={title} onClick={() => setShowWebcam(true)}
                        className="group flex flex-col items-center gap-3 border-2 border-dashed border-[#E8E6E1] dark:border-[#2C2C32] hover:border-orange-500 dark:hover:border-orange-400 p-5 transition-colors">
                        <div className="w-10 h-10 bg-orange-500/10 group-hover:bg-orange-500/20 flex items-center justify-center transition-colors">{icon}</div>
                        <div className="text-center">
                          <p className="mono text-[11px] font-bold tracking-[0.1em] uppercase text-[#1A1A1C] dark:text-[#EAEAEC] mb-1">{title}</p>
                          <p className="mono text-[9px] text-[#6C6C74] dark:text-[#9090A0] leading-relaxed">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {hash && (
                    <div className="border-l-2 border-emerald-500 pl-3 py-1">
                      <p className="mono text-[10px] font-bold tracking-[0.08em] uppercase text-emerald-600 dark:text-emerald-400 mb-1">✓ Hash captured from scan</p>
                      <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] break-all">{hash}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {error && <p className="text-red-500 text-[12px] mt-3 border-l-2 border-red-400 pl-3">{error}</p>}

            <button onClick={handleVerify} disabled={loading || hashing || !hash.trim()}
              className="flex items-center justify-center gap-2 w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-bold tracking-[0.06em] uppercase py-3 transition-colors mt-4">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying on Blockchain…</>
                : <><Search className="w-4 h-4" />Verify on Blockchain</>}
            </button>
          </motion.div>

          {/* RESULT */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`border-2 p-6 ${resultBorderClass}`}>

                {isAuthentic && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <p className="mono text-[14px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Authentic Document</p>
                        <p className="text-[12px] text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">Officially recorded on the Sepolia blockchain.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                      <div>
                        <p className="mono text-[10px] font-bold tracking-[0.15em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1">Document Type</p>
                        <p className="text-[13px] font-semibold text-[#1A1A1C] dark:text-[#EAEAEC]">{result.documentType ? fmtDocType(result.documentType) : '—'}</p>
                      </div>
                      <div>
                        <p className="mono text-[10px] font-bold tracking-[0.15em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1">Recorded On</p>
                        <p className="text-[13px] font-semibold text-[#1A1A1C] dark:text-[#EAEAEC]">
                          {result.timestamp ? new Date(result.timestamp * 1000).toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="mono text-[10px] font-bold tracking-[0.15em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1">Recorded By (Wallet)</p>
                        <p className="mono text-[11px] text-[#3A3A3E] dark:text-[#BABABC] break-all">{result.recordedBy || '—'}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="mono text-[10px] font-bold tracking-[0.15em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1">Payload Hash (on-chain)</p>
                        <p className="mono text-[10px] text-[#3A3A3E] dark:text-[#BABABC] break-all">{hash}</p>
                      </div>
                      {result.payloadSnapshot && (
                        <div className="sm:col-span-2 border border-emerald-400/30 dark:border-emerald-600/30 bg-emerald-50/60 dark:bg-emerald-950/20 p-3">
                          <p className="mono text-[10px] font-bold tracking-[0.15em] uppercase text-emerald-700 dark:text-emerald-400 mb-2">🔒 Locked Fields</p>
                          {(() => {
                            const parts = result.payloadSnapshot!.split('|');
                            const labeled: { label: string; value: string }[] = [];
                            if (parts[0]) labeled.push({ label: 'Document Type', value: parts[0] });
                            if (parts[1]) labeled.push({ label: 'Full Name', value: parts[1] });
                            if (parts[2]) labeled.push({ label: 'Purpose', value: parts[2] });
                            for (let i = 3; i < parts.length - 1; i++) {
                              const eq = parts[i].indexOf('='); if (eq === -1) continue;
                              const v = parts[i].slice(eq + 1); if (v) labeled.push({ label: parts[i].slice(0, eq).replace(/_/g, ' '), value: v });
                            }
                            const last = parts[parts.length - 1];
                            if (last && parts.length > 1) labeled.push({ label: 'Issued At', value: new Date(last).toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) });
                            return (
                              <div className="grid grid-cols-1 gap-1.5">
                                {labeled.map(({ label, value }, i) => (
                                  <div key={i} className="flex gap-2 mono text-[10px]">
                                    <span className="text-emerald-600/70 dark:text-emerald-400/70 shrink-0 w-36 truncate capitalize">{label}</span>
                                    <span className="text-[#3A3A3E] dark:text-[#BABABC]">{value}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                          <p className="mono text-[9px] text-emerald-600/50 dark:text-emerald-400/50 mt-2">Any change to these fields would produce a different hash.</p>
                        </div>
                      )}
                    </div>
                    <a href={`https://sepolia.etherscan.io/address/${result.recordedBy}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.08em] uppercase text-emerald-700 dark:text-emerald-400 hover:underline">
                      <ExternalLink className="w-3.5 h-3.5" /> View Recorder on Etherscan
                    </a>
                  </>
                )}

                {isRevoked && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <ShieldAlert className="w-7 h-7 text-[#92600A] dark:text-[#F5C06A] shrink-0" />
                      <div>
                        <p className="mono text-[14px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Document Revoked</p>
                        <p className="text-[12px] text-amber-600/80 dark:text-amber-400/70 mt-0.5">This document has been officially revoked and is no longer valid.</p>
                      </div>
                    </div>
                    <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 border-l-4 border-amber-500">
                      <p className="mono text-[11px] font-bold text-amber-700 dark:text-amber-400">⚠ THIS DOCUMENT HAS BEEN REVOKED — DO NOT ACCEPT AS VALID</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <p className="mono text-[10px] font-bold tracking-[0.15em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1">Document Type</p>
                        <p className="text-[13px] font-semibold text-[#1A1A1C] dark:text-[#EAEAEC]">{result.documentType ? fmtDocType(result.documentType) : '—'}</p>
                      </div>
                      <div>
                        <p className="mono text-[10px] font-bold tracking-[0.15em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1">Originally Recorded</p>
                        <p className="text-[13px] font-semibold text-[#1A1A1C] dark:text-[#EAEAEC]">
                          {result.timestamp ? new Date(result.timestamp * 1000).toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="mono text-[10px] font-bold tracking-[0.15em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1">Document Hash</p>
                        <p className="mono text-[10px] text-[#3A3A3E] dark:text-[#BABABC] break-all">{hash}</p>
                      </div>
                    </div>
                  </>
                )}

                {isNotFound && (
                  <div className="flex items-start gap-3">
                    <ShieldX className="w-7 h-7 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="mono text-[14px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">Not Found on Blockchain</p>
                      <p className="text-[13px] text-red-500/80 dark:text-red-400/70 leading-relaxed">No record exists for this hash. The document may not have been issued by the barangay, or the file may have been tampered with.</p>
                      <div className="mt-4 border-l-2 border-red-400/40 pl-3">
                        <p className="mono text-[10px] font-bold tracking-[0.15em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-1">Hash Checked</p>
                        <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] break-all">{hash}</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="mono text-[10px] text-center text-[#6C6C74] dark:text-[#9090A0] mt-8 leading-relaxed">
            Verification is done against the Sepolia Ethereum testnet. Records are permanent and tamper-proof once on-chain.
          </motion.p>
        </div>
      </div>
    </>
  );
}
