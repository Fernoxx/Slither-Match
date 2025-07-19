const { ethers } = require("hardhat");

async function main() {
  // Base Mainnet USDC address (official USD Coin)
  const BASE_MAINNET_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  
  // Entry fee: 1 USDC (1000000 units with 6 decimals)
  const ENTRY_FEE = ethers.parseUnits("1", 6);

  console.log("🚀 Deploying SlitherMatch contracts to Base Mainnet...");
  console.log("====================================================");
  console.log("Network: Base Mainnet");
  console.log("Chain ID: 8453");
  console.log("USDC Address:", BASE_MAINNET_USDC);
  console.log("Entry Fee:", ethers.formatUnits(ENTRY_FEE, 6), "USDC");
  console.log("====================================================\n");

  console.log("⚠️  WARNING: DEPLOYING TO MAINNET!");
  console.log("This will use real ETH and deploy live contracts.");
  console.log("Make sure you've tested everything on Base Sepolia first.\n");

  // Get deployer info
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  if (parseFloat(ethers.formatEther(balance)) < 0.01) {
    console.log("❌ Insufficient ETH balance for deployment!");
    console.log("You need at least 0.01 ETH for gas fees.");
    process.exit(1);
  }
  console.log("✅ Sufficient balance for deployment\n");

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
  const matchContract = await SlitherMatch.deploy(BASE_MAINNET_USDC, ENTRY_FEE);
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
  console.log("\n🎉 MAINNET DEPLOYMENT SUCCESSFUL!");
  console.log("====================================================");
  console.log("Network: Base Mainnet (LIVE)");
  console.log("SlitherUser:", userAddress);
  console.log("SlitherMatch:", matchAddress);
  console.log("USDC Token:", BASE_MAINNET_USDC);
  console.log("Entry Fee:", ethers.formatUnits(ENTRY_FEE, 6), "USDC");
  console.log("====================================================");

  console.log("\n📋 Environment Variables for Production:");
  console.log("====================================================");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS="${matchAddress}"`);
  console.log(`NEXT_PUBLIC_USER_CONTRACT_ADDRESS="${userAddress}"`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS="${BASE_MAINNET_USDC}"`);
  console.log(`NEXT_PUBLIC_NETWORK="baseMainnet"`);
  console.log(`NEXT_PUBLIC_CHAIN_ID="8453"`);
  console.log("====================================================");

  console.log("\n🔗 Contract Explorer Links:");
  console.log(`SlitherMatch Contract: https://basescan.org/address/${matchAddress}`);
  console.log(`SlitherUser Contract: https://basescan.org/address/${userAddress}`);
  console.log(`USDC Token: https://basescan.org/address/${BASE_MAINNET_USDC}`);

  console.log("\n🚨 CRITICAL NEXT STEPS:");
  console.log("1. ✅ VERIFY contracts on BaseScan immediately");
  console.log("2. ✅ UPDATE production environment variables");
  console.log("3. ✅ TEST all functions with small amounts first");
  console.log("4. ✅ Set up monitoring and alerts");
  console.log("5. ✅ Prepare emergency procedures");
  console.log("6. ✅ Consider setting up a multisig for contract ownership");
  
  console.log("\n📞 Support Resources:");
  console.log("- Base Discord: https://discord.gg/buildonbase");
  console.log("- BaseScan Support: https://basescan.org/contactus");
  console.log("- Base Documentation: https://docs.base.org/");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ MAINNET DEPLOYMENT FAILED:", error);
    console.log("\n🛟 Recovery steps:");
    console.log("1. Check your private key and network configuration");
    console.log("2. Ensure sufficient ETH balance for gas");
    console.log("3. Verify USDC contract address is correct");
    console.log("4. Try deploying to Base Sepolia first for testing");
    process.exit(1);
  });