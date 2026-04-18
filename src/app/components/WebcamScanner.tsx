'use client';

/**
 * WebcamScanner — shared modal for QR + OCR hash extraction.
 *
 * QR mode:   continuously scans live video with jsQR; parses both raw
 *            64-hex strings AND the full verify URL (?hash=XXXX&rs=...).
 *
 * OCR mode:  captures a frame, preprocesses it (grayscale → contrast
 *            boost → sharpen) for max Tesseract accuracy, then extracts
 *            the hash via the same multi-strategy parser.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, QrCode, ScanText, X, ZoomIn, Loader2, Check } from 'lucide-react';

/* ─── script loader ──────────────────────────────────────────────────────── */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/* ─── hash extraction — handles all document formats ────────────────────── */
/**
 * Priority order:
 *   1. URL query param  ?hash=<64hex>
 *   2. First raw 64-char lowercase hex sequence in the text
 *   3. (future: RS-decode the &rs= param if hash is missing/corrupted)
 */
export function extractHashFromText(text: string): string | null {
  // 1. Try to parse as URL — covers the QR code payload exactly
  try {
    // The QR encodes the full URL; jsQR gives us the raw string.
    // Also works if OCR picks up the printed URL on the document.
    const url = new URL(text.trim());
    const h = url.searchParams.get('hash');
    if (h && /^[0-9a-fA-F]{64}$/.test(h)) return h.toLowerCase();
  } catch { /* not a URL */ }

  // 2. The text might be just the hash value (Paste Hash tab backup)
  //    or OCR picked up a ?hash=XXXX fragment without a scheme.
  const paramMatch = text.match(/[?&]hash=([0-9a-fA-F]{64})/i);
  if (paramMatch) return paramMatch[1].toLowerCase();

  // 3. First contiguous 64-char hex run anywhere in the text
  const hexMatch = text.match(/[0-9a-fA-F]{64}/);
  if (hexMatch) return hexMatch[0].toLowerCase();

  return null;
}

/* ─── canvas image preprocessing for OCR ────────────────────────────────── */
/**
 * Converts a video frame to a high-contrast greyscale PNG that
 * Tesseract can read much more reliably from printed documents.
 *
 * Steps:
 *   1. Draw raw frame
 *   2. Convert to greyscale (luminosity formula)
 *   3. Apply a simple unsharp-mask (sharpen)
 *   4. Stretch contrast (auto-levels)
 *   5. Return as dataURL for Tesseract
 */
function preprocessFrame(video: HTMLVideoElement): string {
  const w = video.videoWidth;
  const h = video.videoHeight;

  // ── raw frame ──
  const raw = document.createElement('canvas');
  raw.width = w; raw.height = h;
  raw.getContext('2d')!.drawImage(video, 0, 0);
  const src = raw.getContext('2d')!.getImageData(0, 0, w, h);

  // ── greyscale ──
  const grey = new Uint8ClampedArray(src.data.length);
  for (let i = 0; i < src.data.length; i += 4) {
    const g = Math.round(0.299 * src.data[i] + 0.587 * src.data[i + 1] + 0.114 * src.data[i + 2]);
    grey[i] = grey[i + 1] = grey[i + 2] = g;
    grey[i + 3] = 255;
  }

  // ── auto-levels: stretch to [0,255] ──
  let mn = 255, mx = 0;
  for (let i = 0; i < grey.length; i += 4) { mn = Math.min(mn, grey[i]); mx = Math.max(mx, grey[i]); }
  const range = mx - mn || 1;
  for (let i = 0; i < grey.length; i += 4) {
    const v = Math.round(((grey[i] - mn) / range) * 255);
    grey[i] = grey[i + 1] = grey[i + 2] = v;
  }

  // ── sharpen kernel (unsharp mask, 3×3) ──
  const kernel = [
     0, -1,  0,
    -1,  5, -1,
     0, -1,  0,
  ];
  const sharp = new Uint8ClampedArray(grey.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const nx = Math.min(Math.max(x + kx, 0), w - 1);
          const ny = Math.min(Math.max(y + ky, 0), h - 1);
          acc += grey[(ny * w + nx) * 4] * kernel[(ky + 1) * 3 + (kx + 1)];
        }
      }
      const v = Math.min(Math.max(acc, 0), 255);
      const idx = (y * w + x) * 4;
      sharp[idx] = sharp[idx + 1] = sharp[idx + 2] = v;
      sharp[idx + 3] = 255;
    }
  }

  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  out.getContext('2d')!.putImageData(new ImageData(sharp, w, h), 0, 0);
  return out.toDataURL('image/png');
}

/* ─── types ──────────────────────────────────────────────────────────────── */
export type ScanMode = 'qr' | 'ocr';

export interface WebcamScannerProps {
  /** accent color class for rings/borders, e.g. 'border-orange-400' */
  accentBorder?: string;
  /** accent color for the capture button, e.g. 'bg-orange-600 hover:bg-orange-500' */
  accentBtn?: string;
  /** accent dot color */
  accentDot?: string;
  onClose: () => void;
  onHash: (hash: string) => void;
}

/* ─── component ──────────────────────────────────────────────────────────── */
export default function WebcamScanner({
  accentBorder = 'border-orange-400',
  accentBtn    = 'bg-orange-600 hover:bg-orange-500',
  accentDot    = 'bg-orange-500',
  onClose,
  onHash,
}: WebcamScannerProps) {
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

  /* load libs once */
  useEffect(() => {
    Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'),
      loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'),
    ])
      .then(() => setLibsReady(true))
      .catch(() => setStatus('Failed to load scan libraries. Check your connection.'));
  }, []);

  /* start camera */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus('Point at the QR code on the document…');
        }
      } catch {
        setStatus('Camera access denied — please allow camera permission and reload.');
      }
    })();
    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* success handler */
  const handleFound = useCallback((hash: string) => {
    setDetected(true);
    cancelAnimationFrame(rafRef.current);
    setTimeout(() => { onHash(hash); onClose(); }, 700);
  }, [onHash, onClose]);

  /* QR scan loop */
  const qrLoop = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(qrLoop); return;
    }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const img = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsQR = (window as any).jsQR;
    if (jsQR) {
      const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
      if (code?.data) {
        const hash = extractHashFromText(code.data);
        if (hash) {
          setStatus('QR code detected! ✓');
          handleFound(hash);
          return;
        }
      }
    }
    rafRef.current = requestAnimationFrame(qrLoop);
  }, [handleFound]);

  /* switch mode */
  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    setDetected(false);
    if (scanMode === 'qr' && libsReady) {
      setStatus('Point at the QR code on the document…');
      rafRef.current = requestAnimationFrame(qrLoop);
    } else if (scanMode === 'ocr') {
      setStatus('Aim at any text on the document, then tap Capture.');
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [scanMode, libsReady, qrLoop]);

  /* OCR capture */
  const captureOCR = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    setScanning(true); setStatus('Preprocessing image…'); setOcrProgress(0);

    // Preprocess for maximum OCR accuracy
    const dataUrl = preprocessFrame(video);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Tesseract = (window as any).Tesseract;
      setStatus('Running OCR on document…');
      const { data } = await Tesseract.recognize(dataUrl, 'eng', {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100));
        },
      });

      // Try to find hash in all text — including any printed URL / ?hash= param
      const hash = extractHashFromText(data.text);
      if (hash) {
        setStatus('Hash extracted from document! ✓');
        handleFound(hash);
      } else {
        setStatus('No hash found. Try zooming in on the hash text or QR area, then capture again.');
        setScanning(false); setOcrProgress(0);
      }
    } catch {
      setStatus('OCR failed. Please try again.');
      setScanning(false); setOcrProgress(0);
    }
  }, [handleFound]);

  /* ── render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] w-full max-w-lg shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E6E1] dark:border-[#2C2C32]">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#6C6C74] dark:text-[#9090A0]" />
            <span className="mono text-[11px] font-bold tracking-[0.15em] uppercase text-[#1A1A1C] dark:text-[#EAEAEC]">
              Document Scanner
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-[#6C6C74] hover:text-[#1A1A1C] dark:hover:text-[#EAEAEC] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b border-[#E8E6E1] dark:border-[#2C2C32]">
          {(['qr', 'ocr'] as ScanMode[]).map(m => (
            <button
              key={m}
              onClick={() => { if (!scanning) setScanMode(m); }}
              disabled={scanning}
              className={`flex items-center gap-1.5 mono text-[10px] font-bold tracking-[0.12em] uppercase px-5 py-2.5 transition-colors disabled:opacity-40 ${
                scanMode === m
                  ? `${accentBtn} text-white`
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
              {scanMode === 'qr' ? 'Live auto-scan' : 'Capture & extract'}
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
                <div className={`absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] ${accentBorder}`} />
                <div className={`absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] ${accentBorder}`} />
                <div className={`absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] ${accentBorder}`} />
                <div className={`absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] ${accentBorder}`} />
                <div className={`absolute inset-2 border ${accentBorder} opacity-20 animate-pulse`} />
              </div>
            </div>
          )}

          {/* OCR hint */}
          {scanMode === 'ocr' && !scanning && !detected && (
            <div className="absolute bottom-3 inset-x-0 flex flex-col items-center gap-1.5 pointer-events-none">
              <div className="flex items-center gap-1.5 bg-black/70 rounded-full px-3 py-1.5">
                <ZoomIn className="w-3 h-3 text-yellow-300" />
                <span className="mono text-[9px] text-yellow-200">Works on hash text, printed URL, or QR code area</span>
              </div>
            </div>
          )}

          {/* Success overlay */}
          {detected && (
            <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
              <div className="bg-emerald-500 rounded-full p-4 shadow-lg">
                <Check className="w-8 h-8 text-white" />
              </div>
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="px-5 py-3 border-t border-[#E8E6E1] dark:border-[#2C2C32]">
          <div className="flex items-center gap-2 mb-2">
            {scanning ? (
              <Loader2 className="w-3 h-3 animate-spin text-[#6C6C74] shrink-0" />
            ) : detected ? (
              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
            ) : (
              <div className={`w-2 h-2 rounded-full ${accentDot} animate-pulse shrink-0`} />
            )}
            <p className="mono text-[10px] text-[#3A3A3E] dark:text-[#BABABC]">{status}</p>
          </div>
          {scanning && ocrProgress > 0 && (
            <div className="w-full bg-[#E8E6E1] dark:bg-[#2C2C32] h-0.5 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${ocrProgress}%` }} />
            </div>
          )}
        </div>

        {/* OCR capture button */}
        {scanMode === 'ocr' && (
          <div className="px-5 pb-4">
            <button
              onClick={captureOCR}
              disabled={scanning || detected || !libsReady}
              className={`flex items-center justify-center gap-2 w-full ${accentBtn} disabled:opacity-40 disabled:cursor-not-allowed text-white mono text-[11px] font-bold tracking-[0.08em] uppercase py-2.5 transition-colors`}
            >
              {scanning
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running OCR…</>
                : <><ScanText className="w-3.5 h-3.5" /> Capture &amp; Extract Hash</>
              }
            </button>
            <p className="mono text-[9px] text-center text-[#6C6C74] dark:text-[#9090A0] mt-2">
              Reads printed hash text, full verify URL, or digital stamps
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
