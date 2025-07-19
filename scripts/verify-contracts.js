const hre = require("hardhat");

async function main() {
  // Get network info
  const network = hre.network.name;
  console.log(`🔍 Verifying contracts on ${network}...`);
  
  // Contract addresses - UPDATE THESE AFTER DEPLOYMENT
  const contracts = {
    baseSepolia: {
      SlitherMatch: "YOUR_SEPOLIA_SLITHERMATCH_ADDRESS",
      SlitherUser: "YOUR_SEPOLIA_SLITHERUSER_ADDRESS",
      usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      entryFee: "1000000" // 1 USDC with 6 decimals
    },
    baseMainnet: {
      SlitherMatch: "YOUR_MAINNET_SLITHERMATCH_ADDRESS", 
      SlitherUser: "YOUR_MAINNET_SLITHERUSER_ADDRESS",
      usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      entryFee: "1000000" // 1 USDC with 6 decimals
    }
  };

  const config = contracts[network];
  if (!config) {
    console.log("❌ Unsupported network:", network);
    console.log("Supported networks: baseSepolia, baseMainnet");
    return;
  }

  try {
    // Verify SlitherUser contract
    console.log("\n📝 Verifying SlitherUser contract...");
    await hre.run("verify:verify", {
      address: config.SlitherUser,
      constructorArguments: []
    });
    console.log("✅ SlitherUser verified!");

    // Verify SlitherMatch contract  
    console.log("\n🎮 Verifying SlitherMatch contract...");
    await hre.run("verify:verify", {
      address: config.SlitherMatch,
      constructorArguments: [config.usdcAddress, config.entryFee]
    });
    console.log("✅ SlitherMatch verified!");

    console.log("\n🎉 All contracts verified successfully!");
    console.log(`View on BaseScan: https://${network === 'baseSepolia' ? 'sepolia.' : ''}basescan.org/address/${config.SlitherMatch}`);

  } catch (error) {
    console.error("❌ Verification failed:", error.message);
    
    if (error.message.includes("Already Verified")) {
      console.log("ℹ️  Contracts may already be verified");
    } else if (error.message.includes("Invalid constructor arguments")) {
      console.log("🛠️  Check constructor arguments:");
      console.log("SlitherMatch args:", [config.usdcAddress, config.entryFee]);
    } else {
      console.log("🛟 Troubleshooting tips:");
      console.log("1. Make sure contract addresses are correct");
      console.log("2. Verify constructor arguments match deployment");
      console.log("3. Wait a few minutes after deployment before verifying");
      console.log("4. Check network configuration");
    }
  }
}

// Instructions for updating contract addresses
console.log("📋 BEFORE RUNNING THIS SCRIPT:");
console.log("1. Update contract addresses in this file after deployment");
console.log("2. Run: npm run verify:sepolia or npm run verify:mainnet");
console.log("3. Or manually: npx hardhat run scripts/verify-contracts.js --network <network>\n");

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });