// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./HETH.sol";

contract MicroLoan {
    struct Loan {
        address lender;
        address[] borrowers;
        uint256 totalAmount;
        bool isActive;
    }

    struct Repayment {
        bool hasRepaid;
        uint256 repaymentAmount;
    }

    HETH public hethToken;
    uint256 public totalLoans;
    mapping(uint256 => Loan) public loans;
    mapping(uint256 => mapping(address => Repayment)) public repayments;

    // Events for frontend / indexing
    event LoanCreated(
        uint256 indexed loanId,
        address indexed lender,
        address[] borrowers,
        uint256 totalAmount
    );

    event LoanRepaid(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 amount
    );

    constructor(address _hethToken) {
        require(_hethToken != address(0), "Invalid token address");
        hethToken = HETH(_hethToken);
    }

    /**
     * @dev Create a group loan: lender sends tokens directly to each borrower.
     * The lender must call `approve(microLoanContract, totalAmount)` before calling this.
     * The contract records the loan but does NOT hold the tokens.
     */
    function createGroupLoan(address[] memory borrowers, uint256 totalAmount) external {
        require(borrowers.length > 0, "Must have at least one borrower");
        require(totalAmount > 0, "Amount must be greater than 0");

        // Calculate per-borrower share by integer division
        uint256 shareAmount = totalAmount / borrowers.length;
        require(shareAmount > 0, "Share amount is zero for given borrowers/amount");

        uint256 distributedTotal = shareAmount * borrowers.length;

        // Transfer tokens from lender directly to each borrower.
        // The lender must have approved this contract to spend distributedTotal.
        for (uint256 i = 0; i < borrowers.length; i++) {
            // transferFrom(lender, borrower, shareAmount)
            // msg.sender is the lender here, since lender calls this function.
            bool ok = hethToken.transferFrom(msg.sender, borrowers[i], shareAmount);
            require(ok, "Transfer to borrower failed");
        }

        // Create loan record (contract doesn't hold funds)
        totalLoans++;
        loans[totalLoans] = Loan({
            lender: msg.sender,
            borrowers: borrowers,
            totalAmount: distributedTotal,
            isActive: true
        });

        emit LoanCreated(totalLoans, msg.sender, borrowers, distributedTotal);
    }

    /**
     * @dev Borrower repays their share directly to lender.
     * Borrower must call `approve(microLoanContract, amount)` before calling this.
     */
    function repay(uint256 loanId, uint256 amount) external {
        Loan storage loan = loans[loanId];
        require(loan.isActive, "Loan is not active");

        // Verify sender is a borrower
        bool isBorrower = false;
        for (uint256 i = 0; i < loan.borrowers.length; i++) {
            if (loan.borrowers[i] == msg.sender) {
                isBorrower = true;
                break;
            }
        }
        require(isBorrower, "Only borrowers can repay this loan");

        // Prevent double repayment
        require(!repayments[loanId][msg.sender].hasRepaid, "Borrower has already repaid");

        // Determine expected share amount
        uint256 shareAmount = getShareAmount(loanId);

        // Allow exact share or very slight tolerance (0.01%)
        require(
            amount >= shareAmount && amount <= shareAmount + (shareAmount / 10000),
            "Repayment amount must be close to share amount"
        );

        // Transfer from borrower -> lender directly
        bool ok = hethToken.transferFrom(msg.sender, loan.lender, amount);
        require(ok, "Repayment transfer failed");

        repayments[loanId][msg.sender] = Repayment(true, amount);

        emit LoanRepaid(loanId, msg.sender, amount);
    }

    // Read helpers
    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }

    function getShareAmount(uint256 loanId) public view returns (uint256) {
        Loan memory loan = loans[loanId];
        require(loan.borrowers.length > 0, "Loan not found");
        return loan.totalAmount / loan.borrowers.length;
    }

    function getTotalLoans() external view returns (uint256) {
        return totalLoans;
    }

    function getRepaymentStatus(uint256 loanId, address borrower) external view returns (Repayment memory) {
        return repayments[loanId][borrower];
    }

    function isLoanFullyRepaid(uint256 loanId) external view returns (bool) {
        Loan memory loan = loans[loanId];
        for (uint256 i = 0; i < loan.borrowers.length; i++) {
            if (!repayments[loanId][loan.borrowers[i]].hasRepaid) {
                return false;
            }
        }
        return true;
    }
}
