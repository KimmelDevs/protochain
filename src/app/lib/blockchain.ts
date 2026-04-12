/**
 * app/lib/blockchain.ts
 *
 * Client-side blockchain utilities.
 * Recording is done server-side via /api/blockchain to avoid MetaMask dependency.
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
  'function verifyDocument(bytes32 docHash) external view returns (bool exists, address recordedBy, uint256 timestamp, string memory documentType)',
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

  const provider    = new JsonRpcProvider(rpcUrl);
  const contract    = new Contract(CONTRACT_ADDRESS, ABI, provider);
  const bytes32Hash = hexToBytes32(hexHash);

  const r = await contract.verifyDocument(bytes32Hash);

  const exists       = Boolean(r[0] ?? r.exists);
  const recordedBy   = String(r[1]  ?? r.recordedBy   ?? '');
  const timestamp    = Number(r[2]  ?? r.timestamp    ?? 0);
  const documentType = String(r[3]  ?? r.documentType ?? '');
  const isRevoked    = false; // contract does not implement revocation

  // Fetch the payload_snapshot from Supabase so the verify page can display
  // every field that was locked into this hash at issuance time.
  let payloadSnapshot: string | undefined;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    // payload_hash is what we record on-chain; look it up in requests table
    const { data } = await supabase
      .from('requests')
      .select('payload_snapshot')
      .eq('payload_hash', hexHash)
      .maybeSingle();
    if (data?.payload_snapshot) payloadSnapshot = data.payload_snapshot;
  } catch {
    // Non-fatal — snapshot display is best-effort
  }

  return { exists, recordedBy, timestamp, documentType, isRevoked, payloadSnapshot };
}