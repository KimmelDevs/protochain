'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ShieldX, ShieldAlert, Loader2, Search,
  Upload, FileText, ExternalLink, Copy, Check,
  Camera, QrCode, ScanText, X, ZoomIn,
} from 'lucide-react';
import { verifyDocumentOnChain, type VerifyResult } from '@/app/lib/blockchain';

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

/** Extract first 64-char hex string from OCR/QR text */
function extractHash(text: string): string | null {
  const match = text.match(/[0-9a-fA-F]{64}/);
  return match ? match[0].toLowerCase() : null;
}

/* ─── dynamic script loader ─────────────────────────────────────────────── */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = () => resolve(); s.onerror = reject;
    document.head.appendChild(s);
  });
}

/* ─── webcam scan modal ─────────────────────────────────────────────────── */
type ScanMode = 'qr' | 'ocr';

interface WebcamModalProps {
  onClose: () => void;
  onHash: (hash: string) => void;
}

function WebcamModal({ onClose, onHash }: WebcamModalProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);

  const [scanMode,    setScanMode]    = useState<ScanMode>('qr');
  const [status,      setStatus]      = useState('Starting camera…');
  const [scanning,    setScanning]    = useState(false);
  const [libsReady,   setLibsReady]   = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [detected,    setDetected]    = useState(false);

  /* load libs */
  useEffect(() => {
    Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'),
      loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'),
    ]).then(() => setLibsReady(true)).catch(() => setStatus('Failed to load scan libraries.'));
  }, []);

  /* start camera */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus('Point at a QR code…');
        }
      } catch {
        setStatus('Camera access denied. Please allow camera permission and reload.');
      }
    })();
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* QR scan loop */
  const qrLoop = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(qrLoop); return;
    }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsQR = (window as any).jsQR;
    if (jsQR) {
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });
      if (code?.data) {
        const hash = extractHash(code.data);
        if (hash) {
          setDetected(true);
          setStatus('QR code detected! ✓');
          cancelAnimationFrame(rafRef.current);
          setTimeout(() => { onHash(hash); onClose(); }, 700);
          return;
        }
      }
    }
    rafRef.current = requestAnimationFrame(qrLoop);
  }, [onHash, onClose]);

  /* switch mode */
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    setDetected(false);
    if (scanMode === 'qr' && libsReady) {
      setStatus('Point at a QR code…');
      rafRef.current = requestAnimationFrame(qrLoop);
    } else if (scanMode === 'ocr') {
      setStatus('Point camera at the hash text, then click Capture & Extract.');
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [scanMode, libsReady, qrLoop]);

  /* OCR capture */
  const captureOCR = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setScanning(true); setStatus('Capturing frame…'); setOcrProgress(0);
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Tesseract = (window as any).Tesseract;
      setStatus('Running OCR — this may take a few seconds…');
      const { data } = await Tesseract.recognize(dataUrl, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100));
        },
      });
      const hash = extractHash(data.text);
      if (hash) {
        setDetected(true);
        setStatus('Hash extracted! ✓');
        setTimeout(() => { onHash(hash); onClose(); }, 700);
      } else {
        setStatus('No 64-char hash found. Zoom in closer on the hash text and try again.');
        setScanning(false); setOcrProgress(0);
      }
    } catch {
      setStatus('OCR failed. Please try again.');
      setScanning(false); setOcrProgress(0);
    }
  }, [onHash, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] w-full max-w-lg shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E6E1] dark:border-[#2C2C32]">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-orange-500" />
            <span className="mono text-[11px] font-bold tracking-[0.15em] uppercase text-[#1A1A1C] dark:text-[#EAEAEC]">
              Webcam Scanner
            </span>
          </div>
          <button onClick={onClose} className="text-[#6C6C74] hover:text-[#1A1A1C] dark:hover:text-[#EAEAEC] transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-[#E8E6E1] dark:border-[#2C2C32]">
          {(['qr', 'ocr'] as ScanMode[]).map(m => (
            <button
              key={m}
              onClick={() => setScanMode(m)}
              disabled={scanning}
              className={`flex items-center gap-1.5 mono text-[10px] font-bold tracking-[0.12em] uppercase px-5 py-2.5 transition-colors disabled:opacity-40 ${
                scanMode === m
                  ? 'bg-orange-600 text-white'
                  : 'text-[#6C6C74] dark:text-[#9090A0] hover:text-[#1A1A1C] dark:hover:text-[#EAEAEC]'
              }`}
            >
              {m === 'qr'
                ? <><QrCode className="w-3 h-3" /> QR Code</>
                : <><ScanText className="w-3 h-3" /> OCR Text</>
              }
            </button>
          ))}
          <div className="flex-1 flex items-center justify-end pr-3">
            <span className="mono text-[9px] text-[#6C6C74] dark:text-[#9090A0]">
              {scanMode === 'qr' ? 'Auto scanning…' : 'Manual capture'}
            </span>
          </div>
        </div>

        {/* Video feed */}
        <div className="relative bg-black">
          <video ref={videoRef} className="w-full aspect-video object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />

          {/* QR viewfinder */}
          {scanMode === 'qr' && !detected && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-44 h-44 relative">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-orange-400" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] border-orange-400" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] border-orange-400" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-orange-400" />
                <div className="absolute inset-2 border border-orange-400/10 animate-pulse" />
              </div>
            </div>
          )}

          {/* OCR zoom hint */}
          {scanMode === 'ocr' && !scanning && !detected && (
            <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none">
              <div className="flex items-center gap-1.5 bg-black/65 rounded-full px-3 py-1.5">
                <ZoomIn className="w-3 h-3 text-orange-300" />
                <span className="mono text-[9px] text-orange-200">Zoom in on the 64-char hash text</span>
              </div>
            </div>
          )}

          {/* Detected overlay */}
          {detected && (
            <div className="absolute inset-0 bg-emerald-500/25 flex items-center justify-center">
              <div className="bg-emerald-500 rounded-full p-4 shadow-lg">
                <Check className="w-8 h-8 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="px-5 py-3 border-t border-[#E8E6E1] dark:border-[#2C2C32]">
          <div className="flex items-center gap-2 mb-2">
            {scanning ? (
              <Loader2 className="w-3 h-3 text-orange-500 animate-spin shrink-0" />
            ) : detected ? (
              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
            )}
            <p className="mono text-[10px] text-[#3A3A3E] dark:text-[#BABABC]">{status}</p>
          </div>
          {scanning && ocrProgress > 0 && (
            <div className="w-full bg-[#E8E6E1] dark:bg-[#2C2C32] h-1 overflow-hidden">
              <div
                className="h-full bg-orange-500 transition-all duration-300"
                style={{ width: `${ocrProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* OCR button */}
        {scanMode === 'ocr' && (
          <div className="px-5 pb-4">
            <button
              onClick={captureOCR}
              disabled={scanning || detected || !libsReady}
              className="flex items-center justify-center gap-2 w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white mono text-[11px] font-bold tracking-[0.08em] uppercase py-2.5 transition-colors"
            >
              {scanning
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running OCR…</>
                : <><ScanText className="w-3.5 h-3.5" /> Capture &amp; Extract Hash</>
              }
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

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
  const [activeTab,  setActiveTab]  = useState<'hash' | 'file' | 'scan'>('file');
  const [showWebcam, setShowWebcam] = useState(false);

  const handleFile = async (file: File) => {
    setHashing(true); setError(''); setResult(null);
    try {
      const h = await computeSha256(file);
      setHash(h); setFileName(file.name);
    } catch {
      setError('Failed to read file.');
    } finally { setHashing(false); }
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
    try {
      const r = await verifyDocumentOnChain(h); setResult(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed.');
    } finally { setLoading(false); }
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap'); .pjs{font-family:'Plus Jakarta Sans',sans-serif} `}</style>
      <input ref={fileRef} type="file" className="hidden" onChange={onFileChange} />

      <AnimatePresence>
        {showWebcam && (
          <WebcamModal onClose={() => setShowWebcam(false)} onHash={handleScanResult} />
        )}
      </AnimatePresence>

      <div className="pjs min-h-screen bg-[#F6F5F3] dark:bg-[#111113] transition-colors duration-200 p-4 lg:p-10">
        <div className="max-w-2xl mx-auto">

          {/* HEADER */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
            <div className="w-14 h-14 bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-7 h-7 text-orange-500" />
            </div>
            <h1 className="mono text-3xl font-bold text-[#1A1A1C] dark:text-[#EAEAEC] tracking-tight mb-2">
              VERIFY DOCUMENT
            </h1>
            <p className="text-[13px] text-[#6C6C74] dark:text-[#9090A0] max-w-md mx-auto leading-relaxed">
              Upload your barangay document, paste its SHA-256 hash, or scan the QR code / printed hash with your webcam.
            </p>
          </motion.div>

          {/* TABS */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="flex border-b-2 border-[#1A1A1C] dark:border-[#EAEAEC] mb-6">
            {(['file', 'hash', 'scan'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setResult(null); setError(''); }}
                className={`mono text-[11px] font-bold tracking-[0.15em] uppercase px-5 py-2.5 transition-colors flex items-center gap-1.5 ${
                  activeTab === tab
                    ? 'bg-[#1a1917] dark:bg-[#f0eee8] text-white dark:text-[#1A1A1C]'
                    : 'text-[#6C6C74] dark:text-[#9090A0] hover:text-[#1A1A1C] dark:hover:text-[#f0eee8]'
                }`}
              >
                {tab === 'file' && '① Upload File'}
                {tab === 'hash' && '② Paste Hash'}
                {tab === 'scan' && <><Camera className="w-3 h-3" />③ Scan</>}
              </button>
            ))}
          </motion.div>

          {/* INPUT PANEL */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] p-6 mb-4">

            <AnimatePresence mode="wait">
              {activeTab === 'file' && (
                <motion.div key="file" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div
                    onDrop={onDrop} onDragOver={e => e.preventDefault()}
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-[#E8E6E1] dark:border-[#2C2C32] hover:border-orange-500 dark:hover:border-orange-400 transition-colors cursor-pointer p-10 text-center mb-4"
                  >
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
                        <span className="text-[10px] font-700 tracking-[0.08em] uppercase text-orange-600 dark:text-orange-400">Computed SHA-256</span>
                        <button onClick={copyHash} className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] hover:text-orange-600 dark:hover:text-orange-400 flex items-center gap-1">
                          {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                        </button>
                      </div>
                      <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] break-all leading-relaxed">{hash}</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'hash' && (
                <motion.div key="hash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <label className="text-[11px] font-500 tracking-[0.08em] uppercase text-[#6C6C74] dark:text-[#9090A0] block mb-2">
                    SHA-256 Hash (64 characters)
                  </label>
                  <textarea
                    value={hash}
                    onChange={e => { setHash(e.target.value); setResult(null); }}
                    rows={3}
                    placeholder="Paste your 64-character SHA-256 hash here…"
                    className="w-full mono text-[12px] bg-[#F6F5F3] dark:bg-[#111113] border border-[#E8E6E1] dark:border-[#2C2C32] p-3 text-[#1A1A1C] dark:text-[#EAEAEC] placeholder-[#B0B0B8] dark:placeholder-[#55555F] focus:outline-none focus:border-orange-500 resize-none mb-1"
                  />
                  <p className={`mono text-[10px] ${hash.trim().length === 64 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#6C6C74] dark:text-[#9090A0]'}`}>
                    {hash.trim().length} / 64 characters
                  </p>
                </motion.div>
              )}

              {activeTab === 'scan' && (
                <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <p className="text-[13px] text-[#3A3A3E] dark:text-[#BABABC] mb-5 leading-relaxed">
                    Use your webcam to read the document hash. Choose the method that matches your document:
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <button
                      onClick={() => setShowWebcam(true)}
                      className="group flex flex-col items-center gap-3 border-2 border-dashed border-[#E8E6E1] dark:border-[#2C2C32] hover:border-orange-500 dark:hover:border-orange-400 p-6 transition-colors"
                    >
                      <div className="w-10 h-10 bg-orange-500/10 group-hover:bg-orange-500/20 flex items-center justify-center transition-colors">
                        <QrCode className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="text-center">
                        <p className="mono text-[11px] font-bold tracking-[0.1em] uppercase text-[#1A1A1C] dark:text-[#EAEAEC] mb-1">QR Code</p>
                        <p className="mono text-[9px] text-[#6C6C74] dark:text-[#9090A0] leading-relaxed">Auto-detects & reads QR codes continuously</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setShowWebcam(true)}
                      className="group flex flex-col items-center gap-3 border-2 border-dashed border-[#E8E6E1] dark:border-[#2C2C32] hover:border-orange-500 dark:hover:border-orange-400 p-6 transition-colors"
                    >
                      <div className="w-10 h-10 bg-orange-500/10 group-hover:bg-orange-500/20 flex items-center justify-center transition-colors">
                        <ScanText className="w-5 h-5 text-orange-500" />
                      </div>
                      <div className="text-center">
                        <p className="mono text-[11px] font-bold tracking-[0.1em] uppercase text-[#1A1A1C] dark:text-[#EAEAEC] mb-1">OCR Text</p>
                        <p className="mono text-[9px] text-[#6C6C74] dark:text-[#9090A0] leading-relaxed">Captures a frame and extracts the printed hash</p>
                      </div>
                    </button>
                  </div>

                  {hash && (
                    <div className="border-l-2 border-emerald-500 pl-3 py-1">
                      <p className="mono text-[10px] font-bold tracking-[0.08em] uppercase text-emerald-600 dark:text-emerald-400 mb-1">
                        ✓ Hash captured from scan
                      </p>
                      <p className="mono text-[10px] text-[#6C6C74] dark:text-[#9090A0] break-all">{hash}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <p className="text-red-500 text-[12px] mt-3 border-l-2 border-red-400 pl-3">{error}</p>
            )}

            <button
              onClick={handleVerify}
              disabled={loading || hashing || !hash.trim()}
              className="flex items-center justify-center gap-2 w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-700 tracking-[0.06em] uppercase py-3 transition-colors mt-4"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying on Blockchain…</>
                : <><Search className="w-4 h-4" />Verify on Blockchain</>
              }
            </button>
          </motion.div>

          {/* RESULT */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`border-2 p-6 ${resultBorderClass}`}
              >
                {isAuthentic && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <p className="mono text-[14px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Authentic Document</p>
                        <p className="text-[12px] text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">This document was officially recorded on the Sepolia blockchain.</p>
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
                          <p className="mono text-[10px] font-bold tracking-[0.15em] uppercase text-emerald-700 dark:text-emerald-400 mb-2">🔒 Locked Fields (hashed into this record)</p>
                          {(() => {
                            const parts = result.payloadSnapshot!.split('|');
                            const labeled: { label: string; value: string }[] = [];
                            const docType = parts[0] ?? ''; const fullName = parts[1] ?? ''; const purpose = parts[2] ?? '';
                            if (docType) labeled.push({ label: 'Document Type', value: docType });
                            if (fullName) labeled.push({ label: 'Full Name', value: fullName });
                            if (purpose) labeled.push({ label: 'Purpose', value: purpose });
                            for (let i = 3; i < parts.length - 1; i++) {
                              const eqIdx = parts[i].indexOf('='); if (eqIdx === -1) continue;
                              const k = parts[i].slice(0, eqIdx); const v = parts[i].slice(eqIdx + 1);
                              if (v) labeled.push({ label: k.replace(/_/g, ' '), value: v });
                            }
                            const issuedAt = parts[parts.length - 1] ?? '';
                            if (issuedAt && parts.length > 1) labeled.push({ label: 'Issued At', value: new Date(issuedAt).toLocaleString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) });
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
                          <p className="mono text-[9px] text-emerald-600/50 dark:text-emerald-400/50 mt-2">Any change to the above fields would produce a different hash and fail verification.</p>
                        </div>
                      )}
                    </div>
                    <a href={`https://sepolia.etherscan.io/address/${result.recordedBy}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[11px] font-700 tracking-[0.08em] uppercase text-emerald-700 dark:text-emerald-400 hover:underline">
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
                        <p className="text-[12px] text-amber-600/80 dark:text-amber-400/70 mt-0.5">This document exists on-chain but has been officially revoked and is no longer valid.</p>
                      </div>
                    </div>
                    <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900/30 border-l-4 border-amber-500">
                      <p className="mono text-[11px] font-bold text-amber-700 dark:text-amber-400">⚠ THIS DOCUMENT HAS BEEN REVOKED — DO NOT ACCEPT AS VALID</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
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
