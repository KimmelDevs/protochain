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
  exists:       boolean;
  recordedBy:   string;
  timestamp:    number;
  documentType: string;
}

export async function verifyDocumentOnChain(hexHash: string): Promise<VerifyResult> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS is not set.');
  }

  const provider = new JsonRpcProvider(
    process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ?? 'https://rpc.sepolia.org'
  );
  const contract    = new Contract(CONTRACT_ADDRESS, ABI, provider);
  const bytes32Hash = hexToBytes32(hexHash);
  const [exists, recordedBy, timestamp, documentType] =
    await contract.verifyDocument(bytes32Hash);

  return {
    exists,
    recordedBy,
    timestamp:    Number(timestamp),
    documentType,
  };
}
