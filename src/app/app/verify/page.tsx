'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ShieldX, ShieldAlert, Loader2, Search,
  Upload, FileText, ExternalLink, Copy, Check, Camera, QrCode, ScanText,
} from 'lucide-react';
import { verifyDocumentOnChain, type VerifyResult } from '@/app/lib/blockchain';
import Header from '@/app/components/header';
import Footer from '@/app/components/footer';
import WebcamScanner from '@/app/components/WebcamScanner';

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

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyPageInner />
    </Suspense>
  );
}

function VerifyPageInner() {
  const searchParams = useSearchParams();
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

  // Read ?hash= from URL (e.g. from QR code scan) and auto-populate + switch to hash tab
  useEffect(() => {
    const h = searchParams.get('hash');
    if (h && /^[0-9a-f]{64}$/i.test(h)) {
      setHash(h);
      setActiveTab('hash');
    }
  }, [searchParams]);

  const handleFile = async (file: File) => {
    setHashing(true); setError(''); setResult(null);
    try { const h = await computeSha256(file); setHash(h); setFileName(file.name); }
    catch { setError('Failed to read file.'); }
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

  const copyHash = () => { navigator.clipboard.writeText(hash); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const handleScanResult = (scannedHash: string) => {
    setHash(scannedHash); setError(''); setResult(null);
    setActiveTab('file');
  };

  const isAuthentic = result?.exists && !result?.isRevoked && !result?.isExpired;
  const isExpiredDoc = result?.exists && !result?.isRevoked && result?.isExpired;
  const isRevoked   = result?.exists && result?.isRevoked;
  const isNotFound  = result && !result.exists;

  return (
    <>
      <input ref={fileRef} type="file" className="hidden" onChange={onFileChange} />

      <AnimatePresence>
        {showWebcam && (
          <WebcamScanner
            accentBorder="border-orange-400"
            accentBtn="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400"
            accentDot="bg-orange-400"
            onClose={() => setShowWebcam(false)}
            onHash={handleScanResult}
          />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#0f0f23]">
        <Header />

        {/* Decorative particles */}
        <div className="fixed inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-blue-500 rounded-full animate-pulse delay-75" />
          <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-cyan-500 rounded-full animate-pulse delay-150" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-4 pt-28 pb-20">

          {/* HEADER */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/30 mb-5">
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-semibold text-orange-300">Blockchain Verification</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent tracking-tight">
              Verify Document
            </h1>
            <p className="text-[15px] text-[#b0b4ba] max-w-md mx-auto leading-relaxed">
              Upload your document, paste its hash, or scan the QR code / printed text on the document with your webcam.
            </p>
          </motion.div>

          {/* TABS */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex gap-2 mb-4">
            {(['file', 'hash', 'scan'] as const).map(tab => (
              <button key={tab}
                onClick={() => { setActiveTab(tab); setResult(null); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold rounded-lg transition-all ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : 'bg-white/5 border border-white/10 text-[#b0b4ba] hover:text-white hover:border-orange-500/50'
                }`}>
                {tab === 'file' && '① Upload'}
                {tab === 'hash' && '② Hash'}
                {tab === 'scan' && <><Camera className="w-3.5 h-3.5" /> Scan</>}
              </button>
            ))}
          </motion.div>

          {/* INPUT PANEL */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-xl p-6 mb-4 backdrop-blur-sm">

            <AnimatePresence mode="wait">
              {activeTab === 'file' && (
                <motion.div key="file" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-white/20 hover:border-orange-500/60 transition-colors cursor-pointer p-10 text-center mb-4 rounded-lg bg-white/[0.02]">
                    {hashing ? (
                      <div className="flex flex-col items-center gap-2"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /><p className="text-[12px] text-[#b0b4ba]">Computing SHA-256…</p></div>
                    ) : fileName ? (
                      <div className="flex flex-col items-center gap-2"><FileText className="w-6 h-6 text-emerald-400" /><p className="text-[13px] font-medium text-white">{fileName}</p><p className="text-[11px] text-[#b0b4ba]">Click to change file</p></div>
                    ) : (
                      <div className="flex flex-col items-center gap-2"><Upload className="w-6 h-6 text-[#b0b4ba]" /><p className="text-[13px] text-white font-medium">Drop your document here</p><p className="text-[11px] text-[#b0b4ba]">or click to browse — .docx, .pdf</p></div>
                    )}
                  </div>
                  {hash && (
                    <div className="border-l-2 border-orange-500 pl-3 py-1 mb-4 bg-orange-500/5 rounded-r-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-orange-400">Computed SHA-256</span>
                        <button onClick={copyHash} className="text-[10px] text-[#b0b4ba] hover:text-orange-400 flex items-center gap-1 transition-colors">
                          {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                        </button>
                      </div>
                      <p className="text-[10px] text-[#b0b4ba] break-all leading-relaxed font-mono">{hash}</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'hash' && (
                <motion.div key="hash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <label className="text-[11px] tracking-[0.1em] uppercase text-[#b0b4ba] block mb-2 font-semibold">SHA-256 Hash (64 characters)</label>
                  <textarea value={hash} onChange={e => { setHash(e.target.value); setResult(null); }} rows={3}
                    placeholder="Paste your 64-character SHA-256 hash here…"
                    className="w-full font-mono text-[12px] bg-white/5 border border-white/20 focus:border-orange-500/60 rounded-lg p-3 text-white placeholder-[#555860] focus:outline-none resize-none mb-1 transition-colors" />
                  <p className={`text-[10px] font-mono ${hash.trim().length === 64 ? 'text-emerald-400' : 'text-[#b0b4ba]'}`}>
                    {hash.trim().length} / 64 characters
                  </p>
                </motion.div>
              )}

              {activeTab === 'scan' && (
                <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-[13px] text-[#b0b4ba] mb-5 leading-relaxed">
                    Use your webcam to scan the barangay document. Works on the <strong className="text-white">embedded QR code</strong>, printed <strong className="text-white">hash text</strong>, or <strong className="text-white">verify URL</strong> — including the digital ESCDA stamp.
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { icon: <QrCode className="w-5 h-5 text-orange-400" />, title: 'QR Code', desc: 'Auto-detects the embedded QR continuously' },
                      { icon: <ScanText className="w-5 h-5 text-orange-400" />, title: 'OCR / Text', desc: 'Reads hash text, URLs & digital stamps' },
                    ].map(({ icon, title, desc }) => (
                      <button key={title} onClick={() => setShowWebcam(true)}
                        className="group flex flex-col items-center gap-3 border-2 border-dashed border-white/15 hover:border-orange-500/60 rounded-lg p-5 transition-colors bg-white/[0.02]">
                        <div className="w-10 h-10 bg-orange-500/10 group-hover:bg-orange-500/20 rounded-lg flex items-center justify-center transition-colors">{icon}</div>
                        <div className="text-center">
                          <p className="text-[11px] font-bold tracking-wide uppercase text-white mb-1">{title}</p>
                          <p className="text-[9px] text-[#b0b4ba] leading-relaxed">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  {hash && (
                    <div className="border-l-2 border-emerald-500 pl-3 py-1 bg-emerald-500/5 rounded-r-lg">
                      <p className="text-[10px] font-bold tracking-wide uppercase text-emerald-400 mb-1">✓ Hash captured from scan</p>
                      <p className="font-mono text-[10px] text-[#b0b4ba] break-all">{hash}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {error && <p className="text-red-400 text-[12px] mb-4 border-l-2 border-red-500 pl-3 mt-2">{error}</p>}

            <button onClick={handleVerify} disabled={loading || hashing || !hash.trim()}
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[13px] font-bold tracking-wide py-3 rounded-lg transition-all transform hover:scale-[1.02] shadow-lg shadow-orange-500/20 mt-4">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying on Blockchain…</>
                : <><Search className="w-4 h-4" />Verify on Blockchain</>}
            </button>
          </motion.div>

          {/* RESULT */}
          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`rounded-xl border-2 p-6 backdrop-blur-sm ${
                  isAuthentic  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : isExpiredDoc ? 'border-red-500/50 bg-red-500/10'
                  : isRevoked  ? 'border-amber-500/50 bg-amber-500/10'
                  : 'border-red-500/50 bg-red-500/10'
                }`}>

                {isAuthentic && (                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-emerald-400 uppercase tracking-wide">Authentic Document</p>
                        <p className="text-[12px] text-emerald-400/70 mt-0.5">Officially recorded on the Sepolia blockchain.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                      {[
                        { label: 'Document Type', value: result.documentType ? fmtDocType(result.documentType) : '—' },
                        { label: 'Recorded On', value: result.timestamp ? new Date(result.timestamp * 1000).toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white/5 rounded-lg p-3">
                          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#b0b4ba] mb-1">{label}</p>
                          <p className="text-[13px] font-semibold text-white">{value}</p>
                        </div>
                      ))}
                      <div className="sm:col-span-2 bg-white/5 rounded-lg p-3">
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#b0b4ba] mb-1">Recorded By (Wallet)</p>
                        <p className="font-mono text-[11px] text-[#b0b4ba] break-all">{result.recordedBy || '—'}</p>
                      </div>
                      <div className={`rounded-lg p-3 ${result.isExpired ? 'bg-red-500/10 border border-red-500/30' : 'bg-white/5'}`}>
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#b0b4ba] mb-1">Valid Until</p>
                        <p className={`text-[13px] font-semibold ${result.isExpired ? 'text-red-400' : 'text-white'}`}>
                          {result.expiresAt ? new Date(result.expiresAt * 1000).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                        </p>
                        {result.isExpired && (
                          <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">⚠ Expired</span>
                        )}
                      </div>
                      <div className={`rounded-lg p-3 ${result.isExpired ? 'bg-red-500/10 border border-red-500/30' : 'bg-emerald-500/10 border border-emerald-500/20'}`}>
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#b0b4ba] mb-1">Validity Status</p>
                        <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide ${result.isExpired ? 'text-red-400' : 'text-emerald-400'}`}>
                          {result.isExpired ? '⚠ Document Expired' : '✓ Currently Valid'}
                        </span>
                      </div>
                      <div className="sm:col-span-2 bg-white/5 rounded-lg p-3">
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#b0b4ba] mb-1">Payload Hash (on-chain)</p>
                        <p className="font-mono text-[10px] text-[#b0b4ba] break-all">{hash}</p>
                      </div>
                      {result.payloadSnapshot && (
                        <div className="sm:col-span-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3">
                          <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-emerald-400 mb-2">🔒 Locked Fields</p>
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
                                  <div key={i} className="flex gap-2 text-[10px] font-mono">
                                    <span className="text-emerald-400/70 shrink-0 w-36 truncate capitalize">{label}</span>
                                    <span className="text-[#b0b4ba]">{value}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                          <p className="text-[9px] text-emerald-400/50 mt-2">Any change to these fields would produce a different hash.</p>
                        </div>
                      )}
                    </div>
                    <a href={`https://sepolia.etherscan.io/address/${result.recordedBy}`} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wide uppercase text-emerald-400 hover:text-emerald-300 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" /> View on Etherscan
                    </a>
                  </>
                )}

                {isExpiredDoc && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <ShieldAlert className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-red-400 uppercase tracking-wide">Document Expired</p>
                        <p className="text-[12px] text-red-400/70 mt-0.5">This document was genuine but has passed its validity date.</p>
                      </div>
                    </div>
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-[11px] font-bold text-red-400">⚠ THIS DOCUMENT HAS EXPIRED — DO NOT ACCEPT AS VALID</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#b0b4ba] mb-1">Document Type</p>
                        <p className="text-[13px] font-semibold text-white">{result.documentType ? fmtDocType(result.documentType) : '—'}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#b0b4ba] mb-1">Originally Recorded</p>
                        <p className="text-[13px] font-semibold text-white">
                          {result.timestamp ? new Date(result.timestamp * 1000).toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                        </p>
                      </div>
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#b0b4ba] mb-1">Expired On</p>
                        <p className="text-[13px] font-semibold text-red-400">
                          {result.expiresAt ? new Date(result.expiresAt * 1000).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#b0b4ba] mb-1">Hash</p>
                        <p className="font-mono text-[10px] text-[#b0b4ba] break-all">{hash}</p>
                      </div>
                    </div>
                  </>
                )}

                {isRevoked && (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <ShieldAlert className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-amber-400 uppercase tracking-wide">Document Revoked</p>
                        <p className="text-[12px] text-amber-400/70 mt-0.5">This document has been officially revoked and is no longer valid.</p>
                      </div>
                    </div>
                    <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <p className="text-[11px] font-bold text-amber-400">⚠ DO NOT ACCEPT THIS DOCUMENT AS VALID</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#b0b4ba] mb-1">Document Type</p>
                        <p className="text-[13px] font-semibold text-white">{result.documentType ? fmtDocType(result.documentType) : '—'}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#b0b4ba] mb-1">Originally Recorded</p>
                        <p className="text-[13px] font-semibold text-white">
                          {result.timestamp ? new Date(result.timestamp * 1000).toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {isNotFound && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShieldX className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-[14px] font-bold text-red-400 uppercase tracking-wide mb-1">Not Found on Blockchain</p>
                      <p className="text-[13px] text-red-400/70 leading-relaxed">No record exists for this hash. The document may not have been issued by the barangay, or the file may have been tampered with.</p>
                      <div className="mt-4 bg-white/5 rounded-lg p-3">
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase text-[#b0b4ba] mb-1">Hash Checked</p>
                        <p className="font-mono text-[10px] text-[#b0b4ba] break-all">{hash}</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-[11px] text-center text-[#555860] mt-8 leading-relaxed">
            Verification is done against the Sepolia Ethereum testnet. Records are permanent and tamper-proof once on-chain.
          </motion.p>
        </div>
        <Footer />
      </div>
    </>
  );
}