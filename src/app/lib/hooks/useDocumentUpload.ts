/**
 * useDocumentUpload
 *
 * Shared hook for the pending-requests and approved-documents admin pages.
 * Handles the full upload pipeline:
 *   1. Compute file-only SHA-256 (for independent file verification)
 *   2. Compute final_file_hash — SHA-256 of the actual uploaded blob (includes QR)
 *   3. Build the canonical payload string + combined payload hash
 *   4. Upload file to Supabase Storage
 *   5. PATCH the request row with file_url, file_hash, final_file_hash, payload_hash, payload_snapshot
 *   6. Record the payload hash on the Sepolia blockchain
 *
 * ── Why two file hashes? ──────────────────────────────────────────────────────
 *
 *  file_hash       → SHA-256 of the pre-QR blob. This is what the QR code
 *                    encodes in its URL (?hash=<file_hash>). The QR scan
 *                    verify path does: file_hash → payload_hash → chain. ✓
 *
 *  final_file_hash → SHA-256 of the final blob that is actually uploaded and
 *                    downloaded by the user (QR already injected). When a user
 *                    uploads that file on the verify page, computeSha256 will
 *                    produce this hash. The file-upload verify path does:
 *                    final_file_hash → payload_hash → chain. ✓
 *
 *  When no fileHashHint is provided (admin manually uploads a plain file with
 *  no QR injection), both hashes are identical and only one lookup is needed.
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
  uploadFile: (file: Blob, fileName: string, fileHashHint?: string) => Promise<void>;
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
  const uploadFile = async (file: Blob, fileName: string, fileHashHint?: string) => {
    if (!request) return;
    setUploading(true);
    setUploadError('');
    setChainError('');

    try {
      // 1. file_hash — use the hint from generateDocument if provided.
      //    The hint is SHA-256 of the pre-QR blob; it's what the QR encodes,
      //    so verify/?hash=<hint> → DB lookup by file_hash → payload_hash → chain. ✓
      const fileHash = fileHashHint ?? await sha256Hex(file);

      // 2. final_file_hash — SHA-256 of the actual blob being uploaded.
      //    When fileHashHint is provided the final blob includes the injected QR,
      //    so its hash differs from fileHashHint. When no hint exists both are equal.
      //    verify (file-upload path) hashes the downloaded file → matches this. ✓
      const finalFileHash = fileHashHint ? await sha256Hex(file) : fileHash;

      // 3. Combined payload hash (file bytes + canonical metadata string).
      //    This is what gets recorded on-chain.
      const profile: Profile = normaliseProfile(request as unknown as Record<string, string>);
      const payloadStr  = buildRequestPayload(request, profile);
      const payloadHash = await hashPayload(file, payloadStr);

      // 4. Upload to Supabase Storage
      const storagePath = `documents/${requestId}/${fileName}`;
      const { error: upErr } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      // 4b. If a previous payload_hash exists on-chain, revoke it before re-recording.
      //     This prevents the old record from showing as "REVOKED" after a re-upload.
      const existingPayloadHash: string | null = request?.payload_hash ?? null;
      if (existingPayloadHash && existingPayloadHash !== payloadHash) {
        try {
          await revokeDocumentOnChain(existingPayloadHash);
        } catch {
          // Non-fatal: old record may not exist on-chain yet — continue with new upload.
        }
      }

      // 5. Persist hashes + snapshot to the request row
      const patchBody = {
        file_url:         urlData.publicUrl,
        file_hash:        fileHash,        // pre-QR hash — QR encodes this
        final_file_hash:  finalFileHash,   // post-QR hash — what the user downloads
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

      // 6. Record on-chain (non-blocking — errors surfaced via chainError).
      //    Must use payloadHash (combined file+metadata hash), not fileHash,
      //    because verifyDocumentOnChain looks up payload_hash from the DB
      //    and checks THAT against the blockchain.
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