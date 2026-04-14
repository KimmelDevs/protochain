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
  'function recordDocument(bytes32 docHash, string calldata documentType) external',
  'function revokeDocument(bytes32 docHash) external',
  'function verifyDocument(bytes32 docHash) external view returns (bool exists, address recordedBy, uint256 timestamp, string memory documentType, bool isRevoked)',
];

function hexToBytes32(hexHash: string): string {
  const clean = hexHash.startsWith('0x') ? hexHash.slice(2) : hexHash;
  return zeroPadValue('0x' + clean.slice(0, 64).padStart(64, '0'), 32);
}

// ── Record (calls server API — no MetaMask needed) ────────────────────────────

export async function recordDocumentOnChain(
  hexHash: string,
  documentType: string,
): Promise<string> {
  const res = await fetch('/api/blockchain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hexHash, documentType }),
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
  /** The canonical payload string that was hashed into this record, if available. */
  payloadSnapshot?: string;
}

export async function verifyDocumentOnChain(hexHash: string): Promise<VerifyResult> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS is not set.');
  }

  const rpcUrl =
    process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ??
    process.env.NEXT_PUBLIC_RPC_URL ??
    'https://rpc.sepolia.org';

  const provider = new JsonRpcProvider(rpcUrl);
  const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);

  // ── Step 1: use fileHash (🟦) to fetch payloadHash (🟧) + snapshot (🟩) from Supabase
  let onChainHash    = hexHash;          // fallback: treat the input as the on-chain hash
  let payloadSnapshot: string | undefined;
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const res  = await fetch(`${origin}/api/payload-snapshot?hash=${hexHash}`);
    if (res.ok) {
      const json = await res.json();
      // 🟧 payload_hash is what was actually recorded on-chain
      if (json.payload_hash)     onChainHash     = json.payload_hash;
      // 🟩 payload_snapshot is the human-readable locked fields
      if (json.payload_snapshot) payloadSnapshot = json.payload_snapshot;
    }
  } catch {
    // Non-fatal — fall back to using the raw input hash
  }

  // ── Step 2: verify 🟧 on-chain
  const bytes32Hash = hexToBytes32(onChainHash);
  const r = await contract.verifyDocument(bytes32Hash);

  const exists       = Boolean(r[0] ?? r.exists);
  const recordedBy   = String(r[1]  ?? r.recordedBy   ?? '');
  const timestamp    = Number(r[2]  ?? r.timestamp    ?? 0);
  const documentType = String(r[3]  ?? r.documentType ?? '');
  const isRevoked    = Boolean(r[4] ?? r.isRevoked    ?? false);

  return { exists, recordedBy, timestamp, documentType, isRevoked, payloadSnapshot };
}
