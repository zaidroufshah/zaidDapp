const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  // Get deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Deployer balance:", ethers.formatEther(balance), "ETH");

  // Deploy HETH token first
  console.log("🪙 Deploying HETH token...");
  const HETH = await ethers.getContractFactory("HETH");
  const hethToken = await HETH.deploy();
  await hethToken.waitForDeployment();
  const hethAddress = await hethToken.getAddress();
  console.log("✅ HETH token deployed to:", hethAddress);

  // Verify HETH token deployment
  const hethBalance = await hethToken.balanceOf(deployer.address);
  console.log("🪙 HETH initial supply to deployer:", ethers.formatEther(hethBalance), "HETH");

  // Deploy MicroLoan contract with HETH token address
  console.log("💰 Deploying MicroLoan contract...");
  const MicroLoan = await ethers.getContractFactory("MicroLoan");
  const microLoan = await MicroLoan.deploy(hethAddress);
  await microLoan.waitForDeployment();
  const microLoanAddress = await microLoan.getAddress();
  console.log("✅ MicroLoan contract deployed to:", microLoanAddress);

  // Verify MicroLoan contract deployment
  const connectedHethAddress = await microLoan.hethToken();
  console.log("🔗 MicroLoan connected to HETH token:", connectedHethAddress);

  // Get contract ABIs
  const hethArtifact = await ethers.getContractFactory("HETH");
  const microLoanArtifact = await ethers.getContractFactory("MicroLoan");

  // Create deployment info object
  const deploymentInfo = {
    hethToken: {
      address: hethAddress,
      abi: hethArtifact.interface.formatJson(),
    },
    microLoan: {
      address: microLoanAddress,
      abi: microLoanArtifact.interface.formatJson(),
    },
    network: "localhost",
    chainId: 31337,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    blockNumber: await ethers.provider.getBlockNumber(),
  };

  // Save deployment info to JSON file
  const deploymentPath = path.join(__dirname, "../deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("💾 Deployment info saved to:", deploymentPath);

  // Also save ABIs separately for frontend
  const abiPath = path.join(__dirname, "../frontend/contracts");
  if (!fs.existsSync(abiPath)) {
    fs.mkdirSync(abiPath, { recursive: true });
  }

  fs.writeFileSync(
    path.join(abiPath, "HETH.json"),
    JSON.stringify(
      { 
        address: hethAddress, 
        abi: JSON.parse(hethArtifact.interface.formatJson())
      },
      null,
      2
    )
  );

  fs.writeFileSync(
    path.join(abiPath, "MicroLoan.json"),
    JSON.stringify(
      {
        address: microLoanAddress,
        abi: JSON.parse(microLoanArtifact.interface.formatJson()),
      },
      null,
      2
    )
  );

  console.log("📁 ABIs saved to frontend/contracts/");

  // Test basic contract functionality
  console.log("\n🧪 Running basic contract tests...");
  
  try {
    // Test HETH token
    const hethName = await hethToken.name();
    const hethSymbol = await hethToken.symbol();
    const hethSupply = await hethToken.totalSupply();
    console.log(`✅ HETH Token: ${hethName} (${hethSymbol})`);
    console.log(`✅ Total Supply: ${ethers.formatEther(hethSupply)} HETH`);

    // Test MicroLoan contract
    const totalLoans = await microLoan.getTotalLoans();
    console.log(`✅ MicroLoan: Total loans = ${totalLoans}`);

  } catch (error) {
    console.error("❌ Contract test failed:", error);
  }

  // Log some useful information
  console.log("\n🎉 Deployment completed successfully!");
  console.log("📊 Contract Addresses:");
  console.log("   HETH Token:", hethAddress);
  console.log("   MicroLoan:", microLoanAddress);
  console.log("\n🔗 Next steps:");
  console.log("   1. Distribute tokens: npm run distribute");
  console.log("   2. Start the frontend: npm run dev");
  console.log("   3. Connect MetaMask to localhost:8545 (Chain ID: 31337)");
  console.log("   4. Import test accounts from hardhat node");
  console.log("   5. Start creating and managing microloans!");
  
  console.log("\n💡 Test Account Addresses (for MetaMask import):");
  const signers = await ethers.getSigners();
  for (let i = 0; i < Math.min(5, signers.length); i++) {
    console.log(`   Account #${i}: ${signers[i].address}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });