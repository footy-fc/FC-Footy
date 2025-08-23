const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying ScoreSquareV2...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy ScoreSquareV2
  const ScoreSquareV2 = await ethers.getContractFactory("ScoreSquareV2");
  
  // Set community wallet (you can change this address)
  const communityWallet = "0x0000000000000000000000000000000000000000"; // Replace with actual address
  
  const scoreSquareV2 = await ScoreSquareV2.deploy(communityWallet);
  await scoreSquareV2.deployed();

  console.log("ScoreSquareV2 deployed to:", scoreSquareV2.address);
  console.log("Community wallet set to:", communityWallet);

  // Verify the deployment
  const version = await scoreSquareV2.VERSION();
  console.log("Contract version:", version.toString());

  // Save deployment info
  const deploymentInfo = {
    contract: "ScoreSquareV2",
    address: scoreSquareV2.address,
    deployer: deployer.address,
    communityWallet: communityWallet,
    version: version.toString(),
    network: network.name,
    timestamp: new Date().toISOString(),
  };

  console.log("Deployment info:", JSON.stringify(deploymentInfo, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
