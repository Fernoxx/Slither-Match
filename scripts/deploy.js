const { ethers } = require("hardhat");

async function main() {
  const SlitherMatch = await ethers.getContractFactory("SlitherMatch");
  const contract = await SlitherMatch.deploy(
    ethers.parseEther("0.001") // For Hardhat v2.20.0+
  );

  await contract.waitForDeployment();

  console.log("SlitherMatch deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});