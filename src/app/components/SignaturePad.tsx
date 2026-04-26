'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  PenTool, Trash2, Save, ShieldCheck, Eye, EyeOff, Loader2, Check, AlertTriangle,
} from 'lucide-react';

// ─── ECDSA Key Utilities ──────────────────────────────────────────────────────

export interface ECDSAKeyPair {
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
}

export interface SignatureRecord {
  role: 'captain' | 'secretary' | 'kagawad';
  name: string;
  signatureDataUrl: string;         // base64 PNG of the drawn signature
  publicKeyJwk: JsonWebKey;         // stored for verification
  ecdsaSignature: string;           // hex-encoded ECDSA signature of the signature image hash
  signedAt: string;                 // ISO timestamp
}

/** Generate a P-256 ECDSA key pair. */
export async function generateECDSAKeyPair(): Promise<ECDSAKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const publicKeyJwk  = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  return { publicKeyJwk, privateKeyJwk };
}

/** Sign arbitrary data with the ECDSA private key; returns hex string. */
export async function ecdsaSign(data: ArrayBuffer, privateKeyJwk: JsonWebKey): Promise<string> {
  const key = await crypto.subtle.importKey(
    'jwk', privateKeyJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign'],
  );
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, data);
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Verify an ECDSA signature. Returns true if valid. */
export async function ecdsaVerify(
  data: ArrayBuffer,
  hexSig: string,
  publicKeyJwk: JsonWebKey,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'jwk', publicKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false, ['verify'],
    );
    const sigBytes = new Uint8Array(hexSig.match(/.{2}/g)!.map(h => parseInt(h, 16)));
    return await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, sigBytes, data);
  } catch {
    return false;
  }
}

/** SHA-256 hash of a string → ArrayBuffer. */
async function hashString(s: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
}

// ─── Canvas helpers ────────────────────────────────────────────────────────────

interface Point { x: number; y: number; }

// ─── Props ────────────────────────────────────────────────────────────────────

interface SignaturePadProps {
  role: 'captain' | 'secretary' | 'kagawad';
  label: string;
  existingRecord: SignatureRecord | null;
  onSave: (record: SignatureRecord) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SignaturePad({ role, label, existingRecord, onSave }: SignaturePadProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const isDrawing    = useRef(false);
  const lastPoint    = useRef<Point | null>(null);

  const [name,       setName]       = useState(existingRecord?.name ?? '');
  const [hasDrawn,   setHasDrawn]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [status,     setStatus]     = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMsg,  setStatusMsg]  = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [verifying,  setVerifying]  = useState(false);

  // ── Setup canvas ────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1a1917';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  // ── Drawing logic ────────────────────────────────────────────────────────────
  const getPos = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    lastPoint.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current || !lastPoint.current) return;
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    const curr   = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
    lastPoint.current = curr;
    setHasDrawn(true);
  };

  const endDraw = () => { isDrawing.current = false; lastPoint.current = null; };

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current!;
    const ctx    = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setStatus('idle');
  }, []);

  // ── Save signature with ECDSA ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!hasDrawn) { setStatus('error'); setStatusMsg('Please draw your signature first.'); return; }
    if (!name.trim()) { setStatus('error'); setStatusMsg('Please enter your name.'); return; }
    setSaving(true); setStatus('idle');
    try {
      const canvas       = canvasRef.current!;
      const dataUrl      = canvas.toDataURL('image/png');
      const keyPair      = await generateECDSAKeyPair();
      const payload      = `${role}|${name.trim()}|${dataUrl}|${new Date().toISOString()}`;
      const hash         = await hashString(payload);
      const ecdsaSignature = await ecdsaSign(hash, keyPair.privateKeyJwk);

      const record: SignatureRecord = {
        role,
        name:             name.trim(),
        signatureDataUrl: dataUrl,
        publicKeyJwk:     keyPair.publicKeyJwk,
        ecdsaSignature,
        signedAt:         new Date().toISOString(),
      };

      await onSave(record);
      setStatus('success');
      setStatusMsg('Signature saved and ECDSA-signed successfully.');
    } catch (err: unknown) {
      setStatus('error');
      setStatusMsg(err instanceof Error ? err.message : 'Failed to save signature.');
    } finally {
      setSaving(false);
    }
  };

  // ── Verify existing signature ────────────────────────────────────────────────
  const handleVerify = async () => {
    if (!existingRecord) return;
    setVerifying(true);
    try {
      const payload = `${existingRecord.role}|${existingRecord.name}|${existingRecord.signatureDataUrl}|${existingRecord.signedAt}`;
      const hash    = await hashString(payload);
      const ok      = await ecdsaVerify(hash, existingRecord.ecdsaSignature, existingRecord.publicKeyJwk);
      setVerifyStatus(ok ? 'ok' : 'fail');
    } catch {
      setVerifyStatus('fail');
    } finally {
      setVerifying(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <PenTool className="w-4 h-4 text-orange-500" />
        <p className="mono text-[11px] font-bold tracking-[0.2em] uppercase text-[#1a1917] dark:text-[#f0eee8]">
          {label}
        </p>
      </div>

      {/* Name field */}
      <div>
        <label className="block mono text-[10px] tracking-[0.18em] uppercase text-[#5c5a54] dark:text-[#9e9b94] mb-1.5">
          Full Name / Official Name
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={role === 'captain' ? 'e.g. HON. JUAN DELA CRUZ' : 'e.g. MARIA SANTOS'}
          className="w-full bg-white dark:bg-[#1e1e24] border border-[#c8c6c0] dark:border-[#2a2a32] text-[#1a1917] dark:text-[#f0eee8] text-[13px] px-3 py-2.5 focus:outline-none focus:border-orange-500 dark:focus:border-orange-400 transition-colors"
        />
      </div>

      {/* Canvas drawing area */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="mono text-[10px] tracking-[0.18em] uppercase text-[#5c5a54] dark:text-[#9e9b94]">
            Draw Signature
          </label>
          <button
            onClick={clearCanvas}
            className="mono text-[10px] tracking-[0.1em] uppercase text-[#7a7870] dark:text-[#7e7b75] hover:text-red-500 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        </div>
        <div className="relative border-2 border-dashed border-[#c8c6c0] dark:border-[#2a2a32] bg-white">
          {!hasDrawn && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-[12px] text-[#c8c6c0] dark:text-[#3a3a42] select-none">
                Sign here using mouse or touch
              </p>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className="w-full touch-none cursor-crosshair"
            style={{ height: '160px' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>
        <p className="mono text-[10px] text-[#7a7870] dark:text-[#7e7b75] mt-1">
          Signature will be embedded as a PNG in generated documents and signed with ECDSA P-256.
        </p>
      </div>

      {/* ECDSA info badge */}
      <div className="flex items-start gap-2 border-l-2 border-orange-400 pl-3 py-1">
        <ShieldCheck className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
        <p className="text-[12px] text-[#5c5a54] dark:text-[#9e9b94] leading-snug">
          A unique <strong>ECDSA P-256</strong> key pair is generated on save. Your signature image is hashed and cryptographically signed. The public key is stored with the record for future verification — the private key is never persisted.
        </p>
      </div>

      {/* Status message */}
      {status !== 'idle' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 text-[12px] px-3 py-2 border ${
            status === 'success'
              ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400'
              : 'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400'
          }`}
        >
          {status === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          {statusMsg}
        </motion.div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="mono text-[11px] font-bold tracking-[0.1em] uppercase text-white bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 dark:hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors px-4 py-2 flex items-center gap-2"
      >
        {saving
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Signing &amp; Saving…</>
          : <><Save className="w-3.5 h-3.5" /> Save &amp; Sign with ECDSA</>
        }
      </button>

      {/* Existing signature preview + verify */}
      {existingRecord && (
        <div className="border border-[#e8e5e0] dark:border-[#222228] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="mono text-[10px] tracking-[0.18em] uppercase text-[#5c5a54] dark:text-[#9e9b94]">
              Current Saved Signature
            </p>
            <button
              onClick={() => setShowPreview(p => !p)}
              className="mono text-[10px] text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
            >
              {showPreview ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> View</>}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mono text-[10px] text-[#7a7870] dark:text-[#7e7b75] mb-0.5">Name</p>
              <p className="text-[13px] font-medium text-[#1a1917] dark:text-[#f0eee8]">{existingRecord.name}</p>
            </div>
            <div>
              <p className="mono text-[10px] text-[#7a7870] dark:text-[#7e7b75] mb-0.5">Signed At</p>
              <p className="text-[12px] text-[#3d3b36] dark:text-[#c9c6be]">
                {new Date(existingRecord.signedAt).toLocaleString('en-PH')}
              </p>
            </div>
          </div>

          {showPreview && (
            <div className="border border-[#e8e5e0] dark:border-[#222228] bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={existingRecord.signatureDataUrl} alt="Saved signature" className="max-h-24 object-contain" />
            </div>
          )}

          {/* ECDSA signature (truncated) */}
          <div>
            <p className="mono text-[10px] text-[#7a7870] dark:text-[#7e7b75] mb-1">ECDSA Signature (P-256)</p>
            <p className="mono text-[10px] text-[#5c5a54] dark:text-[#9e9b94] break-all leading-relaxed">
              {existingRecord.ecdsaSignature.slice(0, 64)}…
            </p>
          </div>

          {/* Verify button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="mono text-[10px] font-bold tracking-[0.1em] uppercase border border-[#c8c6c0] dark:border-[#2a2a32] text-[#3d3b36] dark:text-[#c9c6be] hover:border-orange-500 hover:text-orange-600 disabled:opacity-50 px-3 py-1.5 flex items-center gap-1.5 transition-colors"
            >
              {verifying
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <ShieldCheck className="w-3 h-3" />
              }
              Verify ECDSA
            </button>
            {verifyStatus === 'ok' && (
              <span className="mono text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Valid
              </span>
            )}
            {verifyStatus === 'fail' && (
              <span className="mono text-[10px] text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Invalid / Tampered
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
