'use client';

/**
 * WebcamScanner — QR-only modal for hash extraction.
 *
 * Continuously scans live video with jsQR; parses both raw
 * 64-hex strings AND the full verify URL (?hash=XXXX&rs=...).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Camera, QrCode, X, Loader2, Check } from 'lucide-react';

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
 */
export function extractHashFromText(text: string): string | null {
  // 1. Try to parse as URL — covers the QR code payload exactly
  try {
    const url = new URL(text.trim());
    const h = url.searchParams.get('hash');
    if (h && /^[0-9a-fA-F]{64}$/.test(h)) return h.toLowerCase();
  } catch { /* not a URL */ }

  // 2. The text might contain a ?hash=XXXX fragment without a scheme
  const paramMatch = text.match(/[?&]hash=([0-9a-fA-F]{64})/i);
  if (paramMatch) return paramMatch[1].toLowerCase();

  // 3. First contiguous 64-char hex run anywhere in the text
  const hexMatch = text.match(/[0-9a-fA-F]{64}/);
  if (hexMatch) return hexMatch[0].toLowerCase();

  return null;
}

/* ─── types ──────────────────────────────────────────────────────────────── */
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

  const [status,    setStatus]    = useState('Starting camera…');
  const [libsReady, setLibsReady] = useState(false);
  const [detected,  setDetected]  = useState(false);

  /* load jsQR only */
  useEffect(() => {
    loadScript('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js')
      .then(() => setLibsReady(true))
      .catch(() => setStatus('Failed to load QR library. Check your connection.'));
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

  /* start QR loop when ready */
  useEffect(() => {
    if (!libsReady) return;
    setStatus('Point at the QR code on the document…');
    rafRef.current = requestAnimationFrame(qrLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [libsReady, qrLoop]);

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
              QR Scanner
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-[#6C6C74] hover:text-[#1A1A1C] dark:hover:text-[#EAEAEC] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode label */}
        <div className="flex items-center gap-2 px-5 py-2 border-b border-[#E8E6E1] dark:border-[#2C2C32] bg-[#F6F5F3] dark:bg-[#111113]">
          <QrCode className="w-3.5 h-3.5 text-[#6C6C74] dark:text-[#9090A0]" />
          <span className="mono text-[10px] font-bold tracking-[0.12em] uppercase text-[#6C6C74] dark:text-[#9090A0]">
            Live QR Auto-Scan
          </span>
        </div>

        {/* Video feed */}
        <div className="relative bg-black">
          <video ref={videoRef} className="w-full aspect-video object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />

          {/* QR viewfinder */}
          {!detected && (
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
          <div className="flex items-center gap-2">
            {detected ? (
              <Check className="w-3 h-3 text-emerald-500 shrink-0" />
            ) : (
              <div className={`w-2 h-2 rounded-full ${accentDot} animate-pulse shrink-0`} />
            )}
            <p className="mono text-[10px] text-[#3A3A3E] dark:text-[#BABABC]">{status}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
