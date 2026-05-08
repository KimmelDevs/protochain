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
  requestId: string;
  request: RequestDetail | null;
  auditMeta?: () => Record<string, string | null>;
  onSuccess?: (fileUrl: string, payloadHash: string) => void;
  onChainSuccess?: (txHash: string) => void;
}

export interface UseDocumentUploadReturn {
  uploading: boolean;
  chainRecording: boolean;
  uploadedHash: string | null;
  chainTxHash: string | null;
  uploadError: string;
  chainError: string;
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

  const recordOnChain = async () => {
    if (!uploadedHash) return;
    await _recordOnChain(uploadedHash);
  };

  const uploadFile = async (file: Blob, fileName: string, fileHashHint?: string) => {
    if (!request) return;
    setUploading(true);
    setUploadError('');
    setChainError('');

    try {
      // pre-QR hash — encoded in the QR URL, used by QR scan verify
      const fileHash = fileHashHint ?? await sha256Hex(file);

      // post-QR hash — hash of the actual blob the user downloads.
      // When the user uploads that file on the verify page, the browser
      // computes this hash. Stored so the file-upload verify path can find the row.
      const finalFileHash = fileHashHint ? await sha256Hex(file) : fileHash;

      // combined payload hash (file bytes + metadata) — recorded on-chain
      const profile: Profile = normaliseProfile(request as unknown as Record<string, string>);
      const payloadStr  = buildRequestPayload(request, profile);
      const payloadHash = await hashPayload(file, payloadStr);

      // upload to storage
      const storagePath = `documents/${requestId}/${fileName}`;
      const { error: upErr } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      // revoke old on-chain record if hash changed
      const existingPayloadHash: string | null = request?.payload_hash ?? null;
      if (existingPayloadHash && existingPayloadHash !== payloadHash) {
        try { await revokeDocumentOnChain(existingPayloadHash); } catch { /* non-fatal */ }
      }

      // persist to DB
      const patchBody = {
        file_url:         urlData.publicUrl,
        file_hash:        fileHash,
        final_file_hash:  finalFileHash,
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

      setUploadedHash(payloadHash);
      onSuccess?.(urlData.publicUrl, payloadHash);

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