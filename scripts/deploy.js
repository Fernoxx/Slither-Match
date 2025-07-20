const { ethers } = require("hardhat");

async function main() {
  // Base Sepolia USDC address
  const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  
  // Entry fee: 1 USDC (1000000 units with 6 decimals)
  const ENTRY_FEE = ethers.parseUnits("1", 6);

  console.log("Deploying contracts to Base Sepolia...");
  console.log("USDC Address:", BASE_SEPOLIA_USDC);
  console.log("Entry Fee:", ENTRY_FEE.toString(), "USDC");

  // Deploy SlitherUser contract first
  console.log("\n--- Deploying SlitherUser ---");
  const SlitherUser = await ethers.getContractFactory("SlitherUser");
  const userContract = await SlitherUser.deploy();
  await userContract.waitForDeployment();
  const userAddress = await userContract.getAddress();
  console.log("SlitherUser deployed to:", userAddress);

  // Deploy SlitherMatch contract
  console.log("\n--- Deploying SlitherMatch ---");
  const SlitherMatch = await ethers.getContractFactory("SlitherMatch");
  const matchContract = await SlitherMatch.deploy(BASE_SEPOLIA_USDC, ENTRY_FEE);
  await matchContract.waitForDeployment();
  const matchAddress = await matchContract.getAddress();
  console.log("SlitherMatch deployed to:", matchAddress);

  // Get deployed contract info
  console.log("\n--- Deployment Summary ---");
  console.log("Network: Base Sepolia");
  console.log("SlitherUser:", userAddress);
  console.log("SlitherMatch:", matchAddress);
  console.log("USDC Token:", BASE_SEPOLIA_USDC);
  console.log("Entry Fee:", ethers.formatUnits(ENTRY_FEE, 6), "USDC");

  // Verify entry fee is set correctly
  const entryFee = await matchContract.entryFee();
  console.log("Verified Entry Fee:", ethers.formatUnits(entryFee, 6), "USDC");

  console.log("\n--- Contract Addresses for Frontend ---");
  console.log(`SLITHER_MATCH_ADDRESS="${matchAddress}"`);
  console.log(`SLITHER_USER_ADDRESS="${userAddress}"`);
  console.log(`USDC_ADDRESS="${BASE_SEPOLIA_USDC}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });