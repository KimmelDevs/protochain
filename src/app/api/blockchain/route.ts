/**
 * POST /api/blockchain          — record a document hash on-chain
 * DELETE /api/blockchain        — revoke a previously recorded document hash
 *
 * Server-side transaction signing — uses DEPLOYER_PRIVATE_KEY from env.
 * No MetaMask required. Works in production deployments.
 *
 * POST body:   { hexHash: string, documentType: string }
 * DELETE body: { hexHash: string }
 * Returns:     { txHash: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const ABI = [
  'function recordDocument(bytes32 docHash, string calldata documentType) external',
  'function revokeDocument(bytes32 docHash) external',
];

function hexToBytes32(hexHash: string): string {
  const clean = hexHash.startsWith('0x') ? hexHash.slice(2) : hexHash;
  return ethers.zeroPadValue('0x' + clean.slice(0, 64).padStart(64, '0'), 32);
}

function getSignerAndContract() {
  const rpcUrl          = process.env.SEPOLIA_RPC_URL;
  const privateKey      = process.env.DEPLOYER_PRIVATE_KEY;
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  if (!rpcUrl)          throw { status: 500, message: 'SEPOLIA_RPC_URL is not set.' };
  if (!privateKey)      throw { status: 500, message: 'DEPLOYER_PRIVATE_KEY is not set.' };
  if (!contractAddress) throw { status: 500, message: 'NEXT_PUBLIC_CONTRACT_ADDRESS is not set.' };

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet   = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, ABI, wallet);
  return contract;
}

// ── POST: record ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { hexHash, documentType } = await req.json();

    if (!hexHash || !documentType) {
      return NextResponse.json(
        { error: 'hexHash and documentType are required.' },
        { status: 400 },
      );
    }

    const contract    = getSignerAndContract();
    const bytes32Hash = hexToBytes32(hexHash);
    const tx          = await contract.recordDocument(bytes32Hash, documentType);
    await tx.wait();

    return NextResponse.json({ txHash: tx.hash });

  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'status' in err) {
      const e = err as { status: number; message: string };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = err instanceof Error ? err.message : 'Unknown error.';
    console.error('[/api/blockchain POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── DELETE: revoke ────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const { hexHash } = await req.json();

    if (!hexHash) {
      return NextResponse.json({ error: 'hexHash is required.' }, { status: 400 });
    }

    const contract    = getSignerAndContract();
    const bytes32Hash = hexToBytes32(hexHash);
    const tx          = await contract.revokeDocument(bytes32Hash);
    await tx.wait();

    return NextResponse.json({ txHash: tx.hash });

  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'status' in err) {
      const e = err as { status: number; message: string };
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = err instanceof Error ? err.message : 'Unknown error.';
    console.error('[/api/blockchain DELETE]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
