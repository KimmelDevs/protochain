import { ethers } from 'ethers';
import hre from 'hardhat';

async function main() {
  const provider  = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  const wallet    = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY!, provider);

  console.log('Deploying DocumentRegistry…');
  console.log('Deployer wallet:', wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log('Deployer balance:', ethers.formatEther(balance), 'ETH\n');

  // Get compiled artifact from Hardhat
  const artifact = await hre.artifacts.readArtifact('DocumentRegistry');
  const factory  = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const registry = await factory.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log('✅ DocumentRegistry deployed to:', address);
  console.log('');
  console.log('─────────────────────────────────────────');
  console.log('Add this to your .env.local:');
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
  console.log('─────────────────────────────────────────');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});