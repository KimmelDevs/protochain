/**
 * useDocumentUpload
 *
 * Shared hook for the pending-requests and approved-documents admin pages.
 * Handles the full upload pipeline:
 *   1. Compute file-only SHA-256 (for independent file verification)
 *   2. Build the canonical payload string + combined payload hash
 *   3. Upload file to Supabase Storage
 *   4. PATCH the request row with file_url, file_hash, payload_hash, payload_snapshot
 *   5. Record the payload hash on the Sepolia blockchain
 */

import { useState } from 'react';
import { supabase } from '@/app/lib/supabase';
import { recordDocumentOnChain, revokeDocumentOnChain } from '@/app/lib/blockchain';
import {
  type RequestDetail,
  type Profile,
  normaliseProfile,
  sha256Hex,
  buildRequestPayload,
  hashPayload,
} from '@/app/lib/utils/Docgenerators';

export interface UseDocumentUploadOptions {
  /** The request ID — used as the storage path prefix and for PATCH calls. */
  requestId: string;
  /** The current request detail object. */
  request: RequestDetail | null;
  /** Optional audit metadata appended to every PATCH body. */
  auditMeta?: () => Record<string, string | null>;
  /** Called after a successful upload with the public URL and payload hash. */
  onSuccess?: (fileUrl: string, payloadHash: string) => void;
  /** Called after the blockchain tx is confirmed with the tx hash. */
  onChainSuccess?: (txHash: string) => void;
}

export interface UseDocumentUploadReturn {
  uploading: boolean;
  chainRecording: boolean;
  uploadedHash: string | null;
  chainTxHash: string | null;
  uploadError: string;
  chainError: string;
  /** Set the displayed payload hash manually (e.g. when loaded from the DB on mount). */
  setUploadedHash: (hash: string | null) => void;
  setChainTxHash: (hash: string | null) => void;
  clearErrors: () => void;
  uploadFile: (file: Blob, fileName: string) => Promise<void>;
  recordOnChain: () => Promise<void>;
}

export function useDocumentUpload({
  requestId,
  request,
  auditMeta,
  onSuccess,
  onChainSuccess,
}: UseDocumentUploadOptions): UseDocumentUploadReturn {
  const [uploading,      setUploading]      = useState(false);
  const [chainRecording, setChainRecording] = useState(false);
  const [uploadedHash,   setUploadedHash]   = useState<string | null>(null);
  const [chainTxHash,    setChainTxHash]    = useState<string | null>(null);
  const [uploadError,    setUploadError]    = useState('');
  const [chainError,     setChainError]     = useState('');

  const clearErrors = () => { setUploadError(''); setChainError(''); };

  /* ── recordOnChain ────────────────────────────────────────────────────── */
  const _recordOnChain = async (payloadHash: string) => {
    setChainRecording(true);
    setChainError('');
    try {
      const docType = request?.document_type ?? request?.type ?? 'barangay-document';
      const txHash  = await recordDocumentOnChain(payloadHash, docType);
      setChainTxHash(txHash);
      await fetch(`/api/requests?id=${requestId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ chain_tx_hash: txHash }),
      });
      onChainSuccess?.(txHash);
    } catch (err: unknown) {
      setChainError(err instanceof Error ? err.message : 'Blockchain recording failed.');
    } finally {
      setChainRecording(false);
    }
  };

  /* ── recordOnChain (public — retries with the stored hash) ───────────── */
  const recordOnChain = async () => {
    if (!uploadedHash) return;
    await _recordOnChain(uploadedHash);
  };

  /* ── uploadFile ───────────────────────────────────────────────────────── */
  const uploadFile = async (file: Blob, fileName: string) => {
    if (!request) return;
    setUploading(true);
    setUploadError('');
    setChainError('');

    try {
      // 1. File-only hash
      const fileHash = await sha256Hex(file);

      // 2. Combined payload hash (file bytes + canonical metadata string)
      const profile: Profile = normaliseProfile(request as unknown as Record<string, string>);
      const payloadStr  = buildRequestPayload(request, profile);
      const payloadHash = await hashPayload(file, payloadStr);

      // 3. Upload to Supabase Storage
      const storagePath = `documents/${requestId}/${fileName}`;
      const { error: upErr } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      // 3b. If a previous payload_hash exists on-chain, revoke it before re-recording.
      //     This prevents the old record from showing as "REVOKED" after a re-upload.
      const existingPayloadHash: string | null = request?.payload_hash ?? null;
      if (existingPayloadHash && existingPayloadHash !== payloadHash) {
        try {
          await revokeDocumentOnChain(existingPayloadHash);
        } catch {
          // Non-fatal: old record may not exist on-chain yet — continue with new upload.
        }
      }

      // 4. Persist hashes + snapshot to the request row
      const patchBody = {
        file_url:         urlData.publicUrl,
        file_hash:        fileHash,
        payload_hash:     payloadHash,
        payload_snapshot: payloadStr,
        ...(auditMeta?.() ?? {}),
      };
      const res = await fetch(`/api/requests?id=${requestId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patchBody),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Failed to update request.');

      // Show the payload hash (what's recorded on-chain), not the raw file hash.
      setUploadedHash(payloadHash);
      onSuccess?.(urlData.publicUrl, payloadHash);

      // 5. Record on-chain (non-blocking — errors surfaced via chainError)
      // Must use payloadHash (combined file+metadata hash) not fileHash,
      // because verifyDocumentOnChain looks up payload_hash from the DB
      // and checks THAT against the blockchain.
      await _recordOnChain(payloadHash);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    chainRecording,
    uploadedHash,
    chainTxHash,
    uploadError,
    chainError,
    setUploadedHash,
    setChainTxHash,
    clearErrors,
    uploadFile,
    recordOnChain,
  };
}