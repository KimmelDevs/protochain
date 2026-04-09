/**
 * POST /api/blockchain
 *
 * Server-side transaction signing — uses DEPLOYER_PRIVATE_KEY from env.
 * No MetaMask required. Works in production deployments.
 *
 * Body: { hexHash: string, documentType: string }
 * Returns: { txHash: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const ABI = [
  'function recordDocument(bytes32 docHash, string calldata documentType) external',
];

function hexToBytes32(hexHash: string): string {
  const clean = hexHash.startsWith('0x') ? hexHash.slice(2) : hexHash;
  return ethers.zeroPadValue('0x' + clean.slice(0, 64).padStart(64, '0'), 32);
}

export async function POST(req: NextRequest) {
  try {
    const { hexHash, documentType } = await req.json();

    if (!hexHash || !documentType) {
      return NextResponse.json({ error: 'hexHash and documentType are required.' }, { status: 400 });
    }

    const rpcUrl          = process.env.SEPOLIA_RPC_URL;
    const privateKey      = process.env.DEPLOYER_PRIVATE_KEY;
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

    if (!rpcUrl)          return NextResponse.json({ error: 'SEPOLIA_RPC_URL is not set.'                  }, { status: 500 });
    if (!privateKey)      return NextResponse.json({ error: 'DEPLOYER_PRIVATE_KEY is not set.'             }, { status: 500 });
    if (!contractAddress) return NextResponse.json({ error: 'NEXT_PUBLIC_CONTRACT_ADDRESS is not set.'     }, { status: 500 });

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet   = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, ABI, wallet);

    const bytes32Hash = hexToBytes32(hexHash);
    const tx          = await contract.recordDocument(bytes32Hash, documentType);
    await tx.wait(); // wait for 1 confirmation

    return NextResponse.json({ txHash: tx.hash });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error.';
    console.error('[/api/blockchain]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
