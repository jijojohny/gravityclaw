import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

  // For testnet, we'll use a mock USDC address or deploy a mock
  // In production, use the actual USDC address on 0G Chain
  const MOCK_USDC = "0x0000000000000000000000000000000000000001"; // Replace with actual USDC

  // Deploy InstanceRegistry
  console.log("\nDeploying InstanceRegistry...");
  const InstanceRegistry = await ethers.getContractFactory("InstanceRegistry");
  const instanceRegistry = await InstanceRegistry.deploy();
  await instanceRegistry.waitForDeployment();
  const instanceRegistryAddress = await instanceRegistry.getAddress();
  console.log("InstanceRegistry deployed to:", instanceRegistryAddress);

  // Deploy Treasury
  console.log("\nDeploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy(MOCK_USDC);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("Treasury deployed to:", treasuryAddress);

  // Deploy Subscription
  console.log("\nDeploying Subscription...");
  const Subscription = await ethers.getContractFactory("Subscription");
  const subscription = await Subscription.deploy(MOCK_USDC, treasuryAddress);
  await subscription.waitForDeployment();
  const subscriptionAddress = await subscription.getAddress();
  console.log("Subscription deployed to:", subscriptionAddress);

  // Summary
  console.log("\n========================================");
  console.log("Deployment Complete!");
  console.log("========================================");
  console.log("InstanceRegistry:", instanceRegistryAddress);
  console.log("Treasury:", treasuryAddress);
  console.log("Subscription:", subscriptionAddress);
  console.log("\nAdd these to your .env file:");
  console.log(`CONTRACT_INSTANCE_REGISTRY=${instanceRegistryAddress}`);
  console.log(`CONTRACT_TREASURY=${treasuryAddress}`);
  console.log(`CONTRACT_SUBSCRIPTION=${subscriptionAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
