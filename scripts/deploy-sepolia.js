const { ethers } = require("hardhat");

async function main() {
  // Base Sepolia USDC address (official)
  const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  
  // Entry fee: 1 USDC (1000000 units with 6 decimals)
  const ENTRY_FEE = ethers.parseUnits("1", 6);

  console.log("🚀 Deploying SlitherMatch contracts to Base Sepolia...");
  console.log("====================================================");
  console.log("Network: Base Sepolia");
  console.log("Chain ID: 84532");
  console.log("USDC Address:", BASE_SEPOLIA_USDC);
  console.log("Entry Fee:", ethers.formatUnits(ENTRY_FEE, 6), "USDC");
  console.log("====================================================\n");

  // Get deployer info
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy SlitherUser contract first
  console.log("📝 Deploying SlitherUser contract...");
  const SlitherUser = await ethers.getContractFactory("SlitherUser");
  const userContract = await SlitherUser.deploy();
  await userContract.waitForDeployment();
  const userAddress = await userContract.getAddress();
  console.log("✅ SlitherUser deployed to:", userAddress);

  // Deploy SlitherMatch contract
  console.log("\n🎮 Deploying SlitherMatch contract...");
  const SlitherMatch = await ethers.getContractFactory("SlitherMatch");
  const matchContract = await SlitherMatch.deploy(BASE_SEPOLIA_USDC, ENTRY_FEE);
  await matchContract.waitForDeployment();
  const matchAddress = await matchContract.getAddress();
  console.log("✅ SlitherMatch deployed to:", matchAddress);

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const entryFee = await matchContract.entryFee();
  const usdcAddress = await matchContract.usdcToken();
  const owner = await matchContract.owner();
  
  console.log("Entry Fee verified:", ethers.formatUnits(entryFee, 6), "USDC");
  console.log("USDC Token verified:", usdcAddress);
  console.log("Contract Owner:", owner);

  // Final summary
  console.log("\n🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("====================================================");
  console.log("Network: Base Sepolia (Testnet)");
  console.log("SlitherUser:", userAddress);
  console.log("SlitherMatch:", matchAddress);
  console.log("USDC Token:", BASE_SEPOLIA_USDC);
  console.log("Entry Fee:", ethers.formatUnits(ENTRY_FEE, 6), "USDC");
  console.log("====================================================");

  console.log("\n📋 Environment Variables for Frontend:");
  console.log("====================================================");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS="${matchAddress}"`);
  console.log(`NEXT_PUBLIC_USER_CONTRACT_ADDRESS="${userAddress}"`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS="${BASE_SEPOLIA_USDC}"`);
  console.log(`NEXT_PUBLIC_NETWORK="baseSepolia"`);
  console.log(`NEXT_PUBLIC_CHAIN_ID="84532"`);
  console.log("====================================================");

  console.log("\n🔗 Useful Links:");
  console.log(`SlitherMatch Contract: https://sepolia.basescan.org/address/${matchAddress}`);
  console.log(`SlitherUser Contract: https://sepolia.basescan.org/address/${userAddress}`);
  console.log(`USDC Token: https://sepolia.basescan.org/address/${BASE_SEPOLIA_USDC}`);

  console.log("\n⚠️  IMPORTANT:");
  console.log("1. Save the contract addresses above");
  console.log("2. Update your .env.local file with the environment variables");
  console.log("3. Test the contracts on Base Sepolia before mainnet deployment");
  console.log("4. Consider verifying contracts on BaseScan");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });