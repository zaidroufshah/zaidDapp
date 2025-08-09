const { ethers } = require('hardhat');
const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🪙 Distributing HETH tokens to test accounts...');

  // Load deployment info
  const deploymentPath = path.join(__dirname, '../deployment.json');
  if (!fs.existsSync(deploymentPath)) {
    console.error(
      "❌ Deployment info not found. Please run 'npm run deploy' first."
    );
    return;
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const hethAddress = deploymentInfo.hethToken.address;
  const hethAbi = JSON.parse(deploymentInfo.hethToken.abi);

  // Get all signers (test accounts)
  const signers = await ethers.getSigners();
  const deployer = signers[0];

  // Connect to HETH contract using ABI from deployment.json
  const hethToken = new ethers.Contract(hethAddress, hethAbi, deployer);

  console.log('📝 Distributing tokens from:', deployer.address);
  console.log('🪙 HETH Token address:', hethAddress);

  // Check deployer balance first
  const deployerBalance = await hethToken.balanceOf(deployer.address);
  console.log(
    `💰 Deployer balance: ${ethers.formatEther(deployerBalance)} HETH`
  );

  // Distribution settings
  const distributionAmount = ethers.parseEther('50000');
  const maxAccounts = Math.min(10, signers.length - 1); // first 10 accounts

  // Calculate total needed
  const totalNeeded = distributionAmount * BigInt(maxAccounts);
  if (deployerBalance < totalNeeded) {
    console.log(
      `⚠️  Warning: Deployer has insufficient balance for all distributions`
    );
    console.log(`   Available: ${ethers.formatEther(deployerBalance)} HETH`);
    console.log(`   Needed: ${ethers.formatEther(totalNeeded)} HETH`);
    console.log(`   Distributing what we can...`);
  }

  let successfulDistributions = 0;

  for (let i = 1; i <= maxAccounts; i++) {
    const recipient = signers[i];
    try {
      const currentBalance = await hethToken.balanceOf(deployer.address);
      if (currentBalance < distributionAmount) {
        console.log(
          `❌ Insufficient balance for Account #${i}. Stopping distributions.`
        );
        break;
      }

      console.log(
        `💰 Transferring 50,000 HETH to Account #${i}: ${recipient.address}`
      );

      const tx = await hethToken.transfer(
        recipient.address,
        distributionAmount
      );
      await tx.wait();

      const balance = await hethToken.balanceOf(recipient.address);
      console.log(
        `✅ Account #${i} now has ${ethers.formatEther(balance)} HETH`
      );
      successfulDistributions++;
    } catch (error) {
      console.error(`❌ Failed to transfer to Account #${i}:`, error.message);
      if (error.message.includes('ERC20InsufficientBalance')) {
        console.log(`💡 Stopping distributions due to insufficient balance`);
        break;
      }
    }
  }

  console.log('\n📊 Final HETH Balances:');
  for (let i = 0; i < Math.min(10, signers.length); i++) {
    try {
      const balance = await hethToken.balanceOf(signers[i].address);
      console.log(`   Account #${i}: ${ethers.formatEther(balance)} HETH`);
    } catch (error) {
      console.log(`   Account #${i}: Error reading balance`);
    }
  }

  console.log(`\n🎉 Token distribution completed!`);
  console.log(
    `✅ Successfully distributed to ${successfulDistributions} accounts`
  );
  console.log(
    '💡 You can now use any test account to create or receive loans.'
  );
}

main().catch((error) => {
  console.error('❌ Token distribution failed:', error);
  process.exit(1);
});
