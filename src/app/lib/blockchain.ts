/**
 * app/lib/blockchain.ts
 *
 * Client-side blockchain utilities.
 * Recording and revocation are done server-side via /api/blockchain to avoid MetaMask dependency.
 * Verification is read-only and works without a wallet.
 */

import { JsonRpcProvider, Contract, zeroPadValue } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;

const ABI = [
  'function recordDocument(bytes32 docHash, string calldata documentType, uint256 expiresAt) external',
  'function revokeDocument(bytes32 docHash) external',
  'function verifyDocument(bytes32 docHash) external view returns (bool exists, address recordedBy, uint256 timestamp, string memory documentType, bool isRevoked, uint256 expiresAt, bool isExpired)',
];

function hexToBytes32(hexHash: string): string {
  const clean = hexHash.startsWith('0x') ? hexHash.slice(2) : hexHash;
  return zeroPadValue('0x' + clean.slice(0, 64).padStart(64, '0'), 32);
}

// ── Record (calls server API — no MetaMask needed) ────────────────────────────

export async function recordDocumentOnChain(
  hexHash: string,
  documentType: string,
  expiresAt?: number,
): Promise<string> {
  const expiry = expiresAt ?? Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  const res = await fetch('/api/blockchain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hexHash, documentType, expiresAt: expiry }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Blockchain recording failed.');
  return json.txHash as string;
}

// ── Revoke (calls server API — no MetaMask needed) ────────────────────────────

export async function revokeDocumentOnChain(hexHash: string): Promise<string> {
  const res = await fetch('/api/blockchain', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hexHash }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Blockchain revocation failed.');
  return json.txHash as string;
}

// ── Verify (read-only, no wallet needed) ─────────────────────────────────────

export interface VerifyResult {
  exists:           boolean;
  recordedBy:       string;
  timestamp:        number;
  documentType:     string;
  isRevoked:        boolean;
  expiresAt:        number;
  isExpired:        boolean;
  /** The canonical payload string that was hashed into this record, if available. */
  payloadSnapshot?: string;
}

/**
 * Verifies a document hash against the blockchain.
 *
 * @param hexHash  The SHA-256 hash to verify.
 * @param lookup   Which DB column the payload-snapshot API should query first.
 *                 "file_hash"       → QR scan / manual hash paste (default).
 *                 "final_file_hash" → file-upload verify path.
 */
export async function verifyDocumentOnChain(
  hexHash: string,
  lookup: 'file_hash' | 'final_file_hash' = 'file_hash',
): Promise<VerifyResult> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS is not set.');
  }

  const rpcUrl =
    process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ??
    process.env.NEXT_PUBLIC_RPC_URL ??
    'https://rpc.sepolia.org';

  const provider = new JsonRpcProvider(rpcUrl);
  const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);

  // ── Step 1: resolve hash → payloadHash + snapshot from Supabase ──────────
  //   QR / manual: lookup=file_hash        → queries file_hash, falls back to final_file_hash
  //   Upload:      lookup=final_file_hash  → queries final_file_hash only
  let onChainHash    = hexHash;
  let payloadSnapshot: string | undefined;
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const res  = await fetch(`${origin}/api/payload-snapshot?hash=${hexHash}&lookup=${lookup}`);
    if (res.ok) {
      const json = await res.json();
      if (json.payload_hash)     onChainHash     = json.payload_hash;
      if (json.payload_snapshot) payloadSnapshot = json.payload_snapshot;
    }
  } catch {
    // Non-fatal — fall back to using the raw input hash
  }

  // ── Step 2: verify on-chain
  const bytes32Hash = hexToBytes32(onChainHash);
  const r = await contract.verifyDocument(bytes32Hash);

  const exists       = Boolean(r[0] ?? r.exists);
  const recordedBy   = String(r[1]  ?? r.recordedBy   ?? '');
  const timestamp    = Number(r[2]  ?? r.timestamp    ?? 0);
  const documentType = String(r[3]  ?? r.documentType ?? '');
  const isRevoked    = Boolean(r[4] ?? r.isRevoked    ?? false);
  const expiresAt    = Number(r[5]  ?? r.expiresAt    ?? 0);
  const isExpired    = Boolean(r[6] ?? r.isExpired    ?? false);

  return { exists, recordedBy, timestamp, documentType, isRevoked, expiresAt, isExpired, payloadSnapshot };
}