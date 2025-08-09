const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MicroLoan DApp", function () {
  let HETH, hethToken, MicroLoan, microLoan;
  let owner, lender, borrower1, borrower2, borrower3;
  let hethAddress, microLoanAddress;

  beforeEach(async function () {
    // Get signers
    [owner, lender, borrower1, borrower2, borrower3] = await ethers.getSigners();

    // Deploy HETH token
    HETH = await ethers.getContractFactory("HETH");
    hethToken = await HETH.deploy();
    await hethToken.waitForDeployment();
    hethAddress = await hethToken.getAddress();

    // Deploy MicroLoan contract
    MicroLoan = await ethers.getContractFactory("MicroLoan");
    microLoan = await MicroLoan.deploy(hethAddress);
    await microLoan.waitForDeployment();
    microLoanAddress = await microLoan.getAddress();

    // Transfer HETH to lender for testing
    const transferAmount = ethers.parseEther("10000");
    await hethToken.transfer(lender.address, transferAmount);
    
    // Transfer some HETH to borrowers for repayment testing
    await hethToken.transfer(borrower1.address, ethers.parseEther("1000"));
    await hethToken.transfer(borrower2.address, ethers.parseEther("1000"));
  });

  describe("HETH Token", function () {
    it("Should have correct name and symbol", async function () {
      expect(await hethToken.name()).to.equal("Hardhat ETH");
      expect(await hethToken.symbol()).to.equal("HETH");
    });

    it("Should have initial supply", async function () {
      const totalSupply = await hethToken.totalSupply();
      expect(totalSupply).to.equal(ethers.parseEther("1000000"));
    });

    it("Should transfer tokens correctly", async function () {
      const transferAmount = ethers.parseEther("100");
      await hethToken.transfer(borrower1.address, transferAmount);

      const balance = await hethToken.balanceOf(borrower1.address);
      expect(balance).to.be.gte(transferAmount); // >= because borrower1 already has some tokens
    });
  });

  describe("MicroLoan Contract", function () {
    it("Should create a loan successfully", async function () {
      const borrowers = [borrower1.address, borrower2.address];
      const totalAmount = ethers.parseEther("100");

      // Approve tokens first
      await hethToken.connect(lender).approve(microLoanAddress, totalAmount);

      // Create loan
      const tx = await microLoan
        .connect(lender)
        .createGroupLoan(borrowers, totalAmount);
      const receipt = await tx.wait();

      // Check loan was created
      const loan = await microLoan.getLoan(1);
      expect(loan.lender).to.equal(lender.address);
      expect(loan.borrowers).to.deep.equal(borrowers);
      expect(loan.isActive).to.be.true;

      // Check share amount (should be 50 each for 2 borrowers)
      const shareAmount = await microLoan.getShareAmount(1);
      expect(shareAmount).to.equal(ethers.parseEther("50"));

      // Check borrowers received their shares
      const borrower1Balance = await hethToken.balanceOf(borrower1.address);
      const borrower2Balance = await hethToken.balanceOf(borrower2.address);
      
      // They should have their initial balance plus the loan share
      expect(borrower1Balance).to.be.gte(ethers.parseEther("1050")); // 1000 + 50
      expect(borrower2Balance).to.be.gte(ethers.parseEther("1050")); // 1000 + 50
    });

    it("Should handle precise division correctly", async function () {
      const borrowers = [borrower1.address, borrower2.address, borrower3.address];
      const totalAmount = ethers.parseEther("100");

      // Approve tokens first
      await hethToken.connect(lender).approve(microLoanAddress, totalAmount);

      // Create loan
      await microLoan.connect(lender).createGroupLoan(borrowers, totalAmount);

      // Get loan details
      const loan = await microLoan.getLoan(1);
      const shareAmount = await microLoan.getShareAmount(1);

      // With 3 borrowers and 100 HETH, each should get 33.333... HETH
      // But due to integer division, each gets 33 HETH exactly
      expect(shareAmount).to.equal(ethers.parseEther("33"));
      
      // Total distributed should be 33 * 3 = 99 HETH (not 100)
      expect(loan.totalAmount).to.equal(ethers.parseEther("99"));
    });

    it("Should allow loan repayment with exact amount", async function () {
      const borrowers = [borrower1.address];
      const totalAmount = ethers.parseEther("100");

      // Create loan
      await hethToken.connect(lender).approve(microLoanAddress, totalAmount);
      await microLoan.connect(lender).createGroupLoan(borrowers, totalAmount);

      // Get exact share amount
      const shareAmount = await microLoan.getShareAmount(1);

      // Borrower repays with exact amount
      await hethToken.connect(borrower1).approve(microLoanAddress, shareAmount);
      await microLoan.connect(borrower1).repay(1, shareAmount);

      // Check repayment status
      const repaymentStatus = await microLoan.getRepaymentStatus(1, borrower1.address);
      expect(repaymentStatus.hasRepaid).to.be.true;
      expect(repaymentStatus.repaymentAmount).to.equal(shareAmount);
    });

    it("Should allow loan repayment with slight tolerance", async function () {
      const borrowers = [borrower1.address];
      const totalAmount = ethers.parseEther("100");

      // Create loan
      await hethToken.connect(lender).approve(microLoanAddress, totalAmount);
      await microLoan.connect(lender).createGroupLoan(borrowers, totalAmount);

      // Get share amount and add tiny amount (within tolerance)
      const shareAmount = await microLoan.getShareAmount(1);
      const slightlyMore = shareAmount + BigInt(shareAmount) / BigInt(10000); // 0.01% more

      // Borrower repays with slightly more amount (should be accepted)
      await hethToken.connect(borrower1).approve(microLoanAddress, slightlyMore);
      await microLoan.connect(borrower1).repay(1, slightlyMore);

      // Check repayment status
      const repaymentStatus = await microLoan.getRepaymentStatus(1, borrower1.address);
      expect(repaymentStatus.hasRepaid).to.be.true;
    });

    it("Should prevent double repayment", async function () {
      const borrowers = [borrower1.address];
      const totalAmount = ethers.parseEther("100");

      // Create loan
      await hethToken.connect(lender).approve(microLoanAddress, totalAmount);
      await microLoan.connect(lender).createGroupLoan(borrowers, totalAmount);

      // First repayment
      const shareAmount = await microLoan.getShareAmount(1);
      await hethToken.connect(borrower1).approve(microLoanAddress, shareAmount);
      await microLoan.connect(borrower1).repay(1, shareAmount);

      // Second repayment should fail
      await hethToken.connect(borrower1).approve(microLoanAddress, shareAmount);
      await expect(
        microLoan.connect(borrower1).repay(1, shareAmount)
      ).to.be.revertedWith("Borrower has already repaid");
    });

    it("Should prevent non-borrowers from repaying", async function () {
      const borrowers = [borrower1.address];
      const totalAmount = ethers.parseEther("100");

      // Create loan
      await hethToken.connect(lender).approve(microLoanAddress, totalAmount);
      await microLoan.connect(lender).createGroupLoan(borrowers, totalAmount);

      // Non-borrower tries to repay
      const shareAmount = await microLoan.getShareAmount(1);
      await hethToken.connect(borrower2).approve(microLoanAddress, shareAmount);
      
      await expect(
        microLoan.connect(borrower2).repay(1, shareAmount)
      ).to.be.revertedWith("Only borrowers can repay this loan");
    });

    it("Should reject repayment with wrong amount", async function () {
      const borrowers = [borrower1.address];
      const totalAmount = ethers.parseEther("100");

      // Create loan
      await hethToken.connect(lender).approve(microLoanAddress, totalAmount);
      await microLoan.connect(lender).createGroupLoan(borrowers, totalAmount);

      // Try to repay with wrong amount (too much)
      const wrongAmount = ethers.parseEther("150");
      await hethToken.connect(borrower1).approve(microLoanAddress, wrongAmount);
      
      await expect(
        microLoan.connect(borrower1).repay(1, wrongAmount)
      ).to.be.revertedWith("Repayment amount must be close to share amount");
    });

    it("Should track total loans correctly", async function () {
      expect(await microLoan.getTotalLoans()).to.equal(0);

      const borrowers = [borrower1.address];
      const totalAmount = ethers.parseEther("100");

      await hethToken.connect(lender).approve(microLoanAddress, totalAmount);
      await microLoan.connect(lender).createGroupLoan(borrowers, totalAmount);

      expect(await microLoan.getTotalLoans()).to.equal(1);

      // Create another loan
      await hethToken.connect(lender).approve(microLoanAddress, totalAmount);
      await microLoan.connect(lender).createGroupLoan(borrowers, totalAmount);

      expect(await microLoan.getTotalLoans()).to.equal(2);
    });

    it("Should check if loan is fully repaid", async function () {
      const borrowers = [borrower1.address, borrower2.address];
      const totalAmount = ethers.parseEther("100");

      // Create loan
      await hethToken.connect(lender).approve(microLoanAddress, totalAmount);
      await microLoan.connect(lender).createGroupLoan(borrowers, totalAmount);

      // Initially not fully repaid
      expect(await microLoan.isLoanFullyRepaid(1)).to.be.false;

      // First borrower repays
      const shareAmount = await microLoan.getShareAmount(1);
      await hethToken.connect(borrower1).approve(microLoanAddress, shareAmount);
      await microLoan.connect(borrower1).repay(1, shareAmount);

      // Still not fully repaid
      expect(await microLoan.isLoanFullyRepaid(1)).to.be.false;

      // Second borrower repays
      await hethToken.connect(borrower2).approve(microLoanAddress, shareAmount);
      await microLoan.connect(borrower2).repay(1, shareAmount);

      // Now fully repaid
      expect(await microLoan.isLoanFullyRepaid(1)).to.be.true;
    });
  });

  describe("Integration Tests", function () {
    it("Should handle multiple loans from different lenders", async function () {
      const borrowers1 = [borrower1.address];
      const borrowers2 = [borrower2.address];
      const amount = ethers.parseEther("50");

      // Lender creates first loan
      await hethToken.connect(lender).approve(microLoanAddress, amount);
      await microLoan.connect(lender).createGroupLoan(borrowers1, amount);

      // Owner creates second loan (using remaining tokens)
      await hethToken.connect(owner).approve(microLoanAddress, amount);
      await microLoan.connect(owner).createGroupLoan(borrowers2, amount);

      expect(await microLoan.getTotalLoans()).to.equal(2);

      // Check both loans exist with different lenders
      const loan1 = await microLoan.getLoan(1);
      const loan2 = await microLoan.getLoan(2);

      expect(loan1.lender).to.equal(lender.address);
      expect(loan2.lender).to.equal(owner.address);
    });

    it("Should handle complete loan lifecycle", async function () {
      const borrowers = [borrower1.address, borrower2.address];
      const totalAmount = ethers.parseEther("200");
      
      // Record initial balances
      const initialLenderBalance = await hethToken.balanceOf(lender.address);

      // Create loan
      await hethToken.connect(lender).approve(microLoanAddress, totalAmount);
      await microLoan.connect(lender).createGroupLoan(borrowers, totalAmount);

      // Check loan created correctly
      const loan = await microLoan.getLoan(1);
      expect(loan.isActive).to.be.true;
      expect(loan.borrowers.length).to.equal(2);

      // Both borrowers repay
      const shareAmount = await microLoan.getShareAmount(1);
      
      await hethToken.connect(borrower1).approve(microLoanAddress, shareAmount);
      await microLoan.connect(borrower1).repay(1, shareAmount);

      await hethToken.connect(borrower2).approve(microLoanAddress, shareAmount);
      await microLoan.connect(borrower2).repay(1, shareAmount);

      // Check loan is fully repaid
      expect(await microLoan.isLoanFullyRepaid(1)).to.be.true;

      // Check lender received repayments
      const finalLenderBalance = await hethToken.balanceOf(lender.address);
      const expectedBalance = initialLenderBalance - (shareAmount * BigInt(2)) + (shareAmount * BigInt(2));
      expect(finalLenderBalance).to.equal(expectedBalance);
    });
  });
});