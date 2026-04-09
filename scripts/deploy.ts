import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying DocumentRegistry…');
  console.log('Deployer wallet:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Deployer balance:', ethers.formatEther(balance), 'ETH\n');

  const Registry = await ethers.getContractFactory('DocumentRegistry');
  const registry  = await Registry.deploy();
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
