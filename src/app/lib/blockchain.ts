/**
 * app/lib/blockchain.ts
 *
 * Thin wrapper around ethers.js + MetaMask for recording and verifying
 * barangay document hashes on-chain.
 *
 * Usage (in uploadFile):
 *   const txHash = await recordDocumentOnChain(sha256HexString, 'barangay-clearance');
 *
 * Usage (in verify page):
 *   const result = await verifyDocumentOnChain(sha256HexString);
 */

declare global {
  interface Window {
    ethereum?: any;
  }
}
 /*const result = await verifyDocumentOnChain(sha256HexString);*/
 

import { BrowserProvider, Contract, zeroPadValue, toBeHex } from 'ethers';

// Set in .env.local after deploying the contract
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!;

// Minimal ABI — only the two functions we need
const ABI = [
  'function recordDocument(bytes32 docHash, string calldata documentType) external',
  'function verifyDocument(bytes32 docHash) external view returns (bool exists, address recordedBy, uint256 timestamp, string memory documentType)',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert a 64-char hex string (from sha256Hex) into a bytes32 value. */
function hexToBytes32(hexHash: string): string {
  // Strip leading 0x if present, then pad/truncate to 32 bytes
  const clean = hexHash.startsWith('0x') ? hexHash.slice(2) : hexHash;
  return zeroPadValue('0x' + clean.slice(0, 64).padStart(64, '0'), 32);
}

/** Connect to MetaMask and return a signer-backed provider. */
export async function connectMetaMask(): Promise<BrowserProvider> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask is not installed. Please install it from https://metamask.io');
  }
  const provider = new BrowserProvider(window.ethereum);
  await provider.send('eth_requestAccounts', []);
  return provider;
}

// ── Record ────────────────────────────────────────────────────────────────────

/**
 * Record a document hash on the blockchain via MetaMask.
 *
 * @param hexHash      — the SHA-256 hex string from sha256Hex()
 * @param documentType — e.g. 'barangay-clearance'
 * @returns            transaction hash string
 */
export async function recordDocumentOnChain(
  hexHash: string,
  documentType: string,
): Promise<string> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS is not set in .env.local');
  }

  const provider = await connectMetaMask();
  const signer   = await provider.getSigner();
  const contract = new Contract(CONTRACT_ADDRESS, ABI, signer);

  const bytes32Hash = hexToBytes32(hexHash);
  const tx = await contract.recordDocument(bytes32Hash, documentType);
  await tx.wait(); // wait for 1 confirmation
  return tx.hash as string;
}

// ── Verify ────────────────────────────────────────────────────────────────────

export interface VerifyResult {
  exists:       boolean;
  recordedBy:   string;
  timestamp:    number;   // Unix seconds
  documentType: string;
}

/**
 * Verify a document hash on the blockchain.
 * Does NOT require MetaMask — uses a read-only provider via window.ethereum
 * if available, otherwise falls back to a public RPC.
 *
 * @param hexHash — the SHA-256 hex string to look up
 */
export async function verifyDocumentOnChain(hexHash: string): Promise<VerifyResult> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('NEXT_PUBLIC_CONTRACT_ADDRESS is not set in .env.local');
  }

  // Use MetaMask provider if available, otherwise use a public Sepolia RPC
  let provider: BrowserProvider;
  if (typeof window !== 'undefined' && window.ethereum) {
    provider = new BrowserProvider(window.ethereum);
  } else {
    // Fallback — read-only, no wallet needed
    const { JsonRpcProvider } = await import('ethers');
    const fallback = new JsonRpcProvider('https://rpc.sepolia.org');
    const contract = new Contract(CONTRACT_ADDRESS, ABI, fallback);
    const bytes32Hash = hexToBytes32(hexHash);
    const [exists, recordedBy, timestamp, documentType] =
      await contract.verifyDocument(bytes32Hash);
    return {
      exists,
      recordedBy,
      timestamp: Number(timestamp),
      documentType,
    };
  }

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