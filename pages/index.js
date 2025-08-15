import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useAuth } from "../contexts/AuthContext";
import Auth from "../components/Auth";
import { FiUser, FiLogOut, FiLink } from 'react-icons/fi';

// Contract ABIs and addresses (will be populated after deployment)
let HETH_ABI = [];
let MICROLOAN_ABI = [];
let HETH_ADDRESS = "";
let MICROLOAN_ADDRESS = "";

// Try to load deployment info
try {
  const deploymentInfo = require("../deployment.json");
  HETH_ABI = JSON.parse(deploymentInfo.hethToken.abi);
  MICROLOAN_ABI = JSON.parse(deploymentInfo.microLoan.abi);
  HETH_ADDRESS = deploymentInfo.hethToken.address;
  MICROLOAN_ADDRESS = deploymentInfo.microLoan.address;
} catch (error) {
  console.log("Deployment info not found. Please deploy contracts first.");
}

export default function Home() {
  const { user, loading: authLoading, signOut, linkWallet } = useAuth();
  
  // State variables
  const [account, setAccount] = useState("");
  const [provider, setProvider] = useState(null);
  const [hethContract, setHethContract] = useState(null);
  const [microLoanContract, setMicroLoanContract] = useState(null);
  const [hethBalance, setHethBalance] = useState("0");
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [chainId, setChainId] = useState(null);
  const [walletLinked, setWalletLinked] = useState(false);

  // Form states
  const [borrowerAddresses, setBorrowerAddresses] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [repayLoanId, setRepayLoanId] = useState("");
  const [repayAmount, setRepayAmount] = useState("");

  // ---------------- FUNCTIONS (defined BEFORE effects & early returns) ----------------

  // Initialize Web3 provider
  const initializeProvider = async () => {
    if (typeof window.ethereum !== "undefined") {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);

        // Get network info
        const network = await provider.getNetwork();
        setChainId(network.chainId);

        // Check if we're on the correct network (Hardhat local network)
        if (network.chainId !== 31337n) {
          setStatus({
            type: "error",
            message: "Please switch to Hardhat Local Network (Chain ID: 31337)",
          });
        }

        // Initialize contracts
        if (HETH_ADDRESS && MICROLOAN_ADDRESS) {
          const hethContract = new ethers.Contract(
            HETH_ADDRESS,
            HETH_ABI,
            provider
          );
          const microLoanContract = new ethers.Contract(
            MICROLOAN_ADDRESS,
            MICROLOAN_ABI,
            provider
          );
          setHethContract(hethContract);
          setMicroLoanContract(microLoanContract);
          console.log("✅ Contracts loaded successfully");
        } else {
          console.log(
            "❌ Contract addresses not found. Please deploy contracts first."
          );
          setStatus({
            type: "error",
            message:
              "Contracts not deployed. Please run 'npm run deploy' first.",
          });
        }

        // Listen for account changes
        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", handleChainChanged);
      } catch (error) {
        console.error("Error initializing provider:", error);
        setStatus({
          type: "error",
          message: "Failed to initialize Web3 provider",
        });
      }
    } else {
      setStatus({
        type: "error",
        message: "Please install MetaMask to use this DApp",
      });
    }
  };

  // Handle chain changes
  const handleChainChanged = (chainId) => {
    console.log("Chain changed to:", chainId);
    // Reload the page to reinitialize everything
    window.location.reload();
  };

  // Handle account changes
  const handleAccountsChanged = async (accounts) => {
    console.log("Accounts changed:", accounts);
    if (accounts.length === 0) {
      // User disconnected
      setAccount("");
      setHethBalance("0");
      setLoans([]);
      setWalletLinked(false);
      setStatus({
        type: "info",
        message: "Please connect your MetaMask wallet",
      });
    } else {
      setAccount(accounts[0]);
      setStatus({
        type: "success",
        message: `Switched to account: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
      });
      // Reload data for the new account
      if (microLoanContract) {
        await loadLoans();
        await loadHethBalance();
      }
      // Check if this wallet is linked to the user
      const userWallet = user?.user_metadata?.wallet_address;
      setWalletLinked(userWallet && userWallet.toLowerCase() === accounts[0].toLowerCase());
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    if (!provider) {
      setStatus({ type: "error", message: "Provider not initialized" });
      return;
    }

    try {
      setLoading(true);

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        setAccount(accounts[0]);
        setStatus({ type: "success", message: "Wallet connected successfully!" });

        // Check network
        const network = await provider.getNetwork();
        if (network.chainId !== 31337n) {
          setStatus({
            type: "error",
            message: "Please switch to Hardhat Local Network (localhost:8545)",
          });
        }

        // Check if this wallet is already linked to the user
        const userWallet = user?.user_metadata?.wallet_address;
        if (userWallet && userWallet.toLowerCase() === accounts[0].toLowerCase()) {
          setWalletLinked(true);
          setStatus({ type: "success", message: "Wallet connected and linked to your account!" });
        }
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      if (error.code === 4001) {
        setStatus({ type: "error", message: "Connection rejected by user" });
      } else {
        setStatus({ type: "error", message: "Failed to connect wallet" });
      }
    } finally {
      setLoading(false);
    }
  };

  // Link wallet to user account
  const handleLinkWallet = async () => {
    if (!account) {
      setStatus({ type: "error", message: "Please connect your wallet first" });
      return;
    }

    try {
      setLoading(true);
      const result = await linkWallet(account);
      
      if (result.error) {
        setStatus({ type: "error", message: "Failed to link wallet: " + result.error.message });
      } else {
        setWalletLinked(true);
        setStatus({ type: "success", message: "Wallet linked to your account successfully!" });
      }
    } catch (error) {
      console.error("Error linking wallet:", error);
      setStatus({ type: "error", message: "Failed to link wallet" });
    } finally {
      setLoading(false);
    }
  };

  // Switch account function
  const switchAccount = async () => {
    try {
      // Request to connect accounts, which will show the account selection dialog
      await window.ethereum.request({
        method: "wallet_requestPermissions",
        params: [{ eth_accounts: {} }],
      });

      // This will trigger the accountsChanged event
      setStatus({ type: "info", message: "Account switching initiated..." });
    } catch (error) {
      console.error("Error switching account:", error);
      setStatus({ type: "error", message: "Failed to switch account" });
    }
  };

  // Sign out function
  const handleSignOut = async () => {
    try {
      await signOut();
      // Reset all state
      setAccount("");
      setHethBalance("0");
      setLoans([]);
      setWalletLinked(false);
      setBorrowerAddresses("");
      setLoanAmount("");
      setRepayLoanId("");
      setRepayAmount("");
      setStatus({ type: "info", message: "Signed out successfully" });
    } catch (error) {
      console.error("Error signing out:", error);
      setStatus({ type: "error", message: "Failed to sign out" });
    }
  };

  // Load HETH balance
  const loadHethBalance = async () => {
    if (!hethContract || !account) return;

    try {
      const balance = await hethContract.balanceOf(account);
      setHethBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error("Error loading HETH balance:", error);
    }
  };

  // Load all loans
  const loadLoans = async () => {
    if (!microLoanContract) return;

    try {
      const totalLoans = await microLoanContract.getTotalLoans();
      console.log("Total loans found:", totalLoans);
      const loansArray = [];

      // totalLoans may be a BigNumber-like; convert to number safely
      const total = Number(totalLoans.toString());

      for (let i = 1; i <= total; i++) {
        try {
          const loan = await microLoanContract.getLoan(i);
          const shareAmount = await microLoanContract.getShareAmount(i);

          console.log(`Loan ${i}:`, {
            lender: loan.lender,
            borrowers: loan.borrowers,
            totalAmount: ethers.formatEther(loan.totalAmount),
            shareAmount: ethers.formatEther(shareAmount),
            isActive: loan.isActive,
          });

          // Get repayment status for current user
          let userRepaymentStatus = { hasRepaid: false, repaymentAmount: 0 };
          if (account) {
            try {
              userRepaymentStatus = await microLoanContract.getRepaymentStatus(
                i,
                account
              );
            } catch (error) {
              console.log(`Could not get repayment status for loan ${i}:`, error.message);
            }
          }

          loansArray.push({
            id: i,
            lender: loan.lender,
            borrowers: loan.borrowers,
            totalAmount: ethers.formatEther(loan.totalAmount),
            shareAmount: ethers.formatEther(shareAmount),
            isActive: loan.isActive,
            userRepaymentStatus,
          });
        } catch (error) {
          console.error(`Error loading loan ${i}:`, error);
        }
      }

      console.log("Final loans array:", loansArray);
      setLoans(loansArray);
    } catch (error) {
      console.error("Error loading loans:", error);
    }
  };

  // Approve HETH tokens
  const approveHeth = async (amount) => {
    if (!hethContract || !account) return false;

    try {
      const signer = await provider.getSigner();
      const hethWithSigner = hethContract.connect(signer);

      const amountWei = ethers.parseEther(amount.toString());

      console.log("Approving HETH tokens:", {
        amount,
        amountWei: amountWei.toString(),
        microLoanAddress: MICROLOAN_ADDRESS,
      });

      const tx = await hethWithSigner.approve(MICROLOAN_ADDRESS, amountWei);
      const receipt = await tx.wait();

      console.log("Approval transaction receipt:", receipt);
      return true;
    } catch (error) {
      console.error("Error approving HETH:", error);
      setStatus({
        type: "error",
        message: "Failed to approve HETH tokens: " + error.message,
      });
      return false;
    }
  };

  // Create a new loan
  const createLoan = async (e) => {
    e.preventDefault();

    if (!microLoanContract || !account) {
      setStatus({
        type: "error",
        message:
          "Please connect your wallet first and ensure contracts are deployed",
      });
      return;
    }

    if (!walletLinked) {
      setStatus({
        type: "error",
        message: "Please link your wallet to your account first",
      });
      return;
    }

    if (!borrowerAddresses.trim() || !loanAmount) {
      setStatus({ type: "error", message: "Please fill in all fields" });
      return;
    }

    try {
      setLoading(true);

      // Parse borrower addresses
      const borrowers = borrowerAddresses
        .split(",")
        .map((addr) => addr.trim())
        .filter((addr) => addr);

      if (borrowers.length === 0) {
        setStatus({
          type: "error",
          message: "Please provide at least one borrower address",
        });
        return;
      }

      // Validate addresses
      for (const addr of borrowers) {
        if (!ethers.isAddress(addr)) {
          setStatus({ type: "error", message: `Invalid address: ${addr}` });
          return;
        }
      }

      const amountWei = ethers.parseEther(loanAmount);

      // Check if lender has enough balance
      const lenderBalance = await hethContract.balanceOf(account);
      if (lenderBalance < amountWei) {
        setStatus({
          type: "error",
          message: `Insufficient balance. You have ${ethers.formatEther(
            lenderBalance
          )} HETH but need ${loanAmount} HETH`,
        });
        return;
      }

      console.log("Creating loan with:", {
        borrowers,
        amountWei: amountWei.toString(),
        amountEth: loanAmount,
      });

      // Approve tokens first
      setStatus({ type: "info", message: "Approving HETH tokens..." });
      const approved = await approveHeth(loanAmount);
      if (!approved) return;

      // Check if approval was successful
      const allowance = await hethContract.allowance(
        account,
        MICROLOAN_ADDRESS
      );
      console.log(
        "HETH allowance after approval:",
        ethers.formatEther(allowance)
      );

      if (allowance < amountWei) {
        setStatus({
          type: "error",
          message: "Approval failed. Please try again.",
        });
        return;
      }

      // Create loan
      setStatus({ type: "info", message: "Creating loan..." });
      const signer = await provider.getSigner();
      const microLoanWithSigner = microLoanContract.connect(signer);

      console.log("About to call createGroupLoan with:", {
        borrowers,
        amountWei: amountWei.toString(),
        contractAddress: MICROLOAN_ADDRESS,
      });

      const tx = await microLoanWithSigner.createGroupLoan(
        borrowers,
        amountWei
      );

      console.log("Loan creation transaction sent:", tx.hash);

      setStatus({
        type: "info",
        message: "Waiting for transaction confirmation...",
      });
      const receipt = await tx.wait();

      console.log("Loan creation transaction receipt:", receipt);

      setStatus({ type: "success", message: "Loan created successfully!" });

      // Reset form and reload data
      setBorrowerAddresses("");
      setLoanAmount("");
      await loadLoans();
      await loadHethBalance();
    } catch (error) {
      console.error("Error creating loan:", error);

      // Provide more detailed error messages
      let errorMessage = "Failed to create loan: ";
      if (error.message.includes("insufficient funds")) {
        errorMessage += "Insufficient ETH for gas fees";
      } else if (error.message.includes("execution reverted")) {
        errorMessage +=
          "Transaction reverted. Check borrower addresses and amounts.";
      } else if (error.message.includes("user rejected")) {
        errorMessage += "Transaction was rejected by user";
      } else {
        errorMessage += error.message;
      }

      setStatus({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill repayment amount when loan ID is selected
  const handleRepayLoanIdChange = async (loanId) => {
    setRepayLoanId(loanId);

    if (loanId && microLoanContract) {
      try {
        const shareAmount = await microLoanContract.getShareAmount(parseInt(loanId));
        const shareAmountEth = ethers.formatEther(shareAmount);
        setRepayAmount(shareAmountEth);

        setStatus({
          type: "info",
          message: `Auto-filled repayment amount: ${shareAmountEth} HETH`,
        });
      } catch (error) {
        console.error("Error getting share amount:", error);
        setRepayAmount("");
      }
    } else {
      setRepayAmount("");
    }
  };

  // Repay a loan
  const repayLoan = async (e) => {
    e.preventDefault();

    if (!microLoanContract || !account) {
      setStatus({
        type: "error",
        message:
          "Please connect your wallet first and ensure contracts are deployed",
      });
      return;
    }

    if (!walletLinked) {
      setStatus({
        type: "error",
        message: "Please link your wallet to your account first",
      });
      return;
    }

    if (!repayLoanId || !repayAmount) {
      setStatus({ type: "error", message: "Please fill in all fields" });
      return;
    }

    try {
      setLoading(true);

      const loanId = parseInt(repayLoanId);

      // Get the exact share amount from the contract
      const exactShareAmount = await microLoanContract.getShareAmount(loanId);

      console.log("Repaying loan with exact share amount:", {
        loanId,
        exactShareAmount: exactShareAmount.toString(),
        exactShareAmountEth: ethers.formatEther(exactShareAmount),
      });

      // Check borrower balance
      const borrowerBalance = await hethContract.balanceOf(account);
      if (borrowerBalance < exactShareAmount) {
        setStatus({
          type: "error",
          message: `Insufficient balance. You have ${ethers.formatEther(
            borrowerBalance
          )} HETH but need ${ethers.formatEther(exactShareAmount)} HETH`,
        });
        return;
      }

      // Check if user is actually a borrower in this loan
      const loan = await microLoanContract.getLoan(loanId);

      // DEBUG logging for address mismatch issues
      console.log("Frontend account:", account);
      console.log("Loan borrowers (raw):", loan.borrowers);
      console.log("Loan borrowers (lowercase):", loan.borrowers.map(a => a.toLowerCase()));

      const isBorrower = loan.borrowers
        .map((addr) => addr.toLowerCase())
        .includes(account.toLowerCase());

      if (!isBorrower) {
        setStatus({
          type: "error",
          message: "You are not a borrower in this loan",
        });
        return;
      }

      // Check if already repaid
      const repaymentStatus = await microLoanContract.getRepaymentStatus(loanId, account);
      if (repaymentStatus.hasRepaid) {
        setStatus({
          type: "error",
          message: "You have already repaid this loan",
        });
        return;
      }

      // Approve tokens first
      setStatus({ type: "info", message: "Approving HETH tokens..." });
      const approved = await approveHeth(ethers.formatEther(exactShareAmount));
      if (!approved) return;

      // Repay loan with exact amount
      setStatus({ type: "info", message: "Processing repayment..." });
      const signer = await provider.getSigner();
      const microLoanWithSigner = microLoanContract.connect(signer);

      const tx = await microLoanWithSigner.repay(loanId, exactShareAmount);

      setStatus({
        type: "info",
        message: "Waiting for transaction confirmation...",
      });

      const receipt = await tx.wait();

      console.log("Repayment transaction receipt:", receipt);

      setStatus({ type: "success", message: "Loan repaid successfully!" });

      // Reset form and reload data
      setRepayLoanId("");
      setRepayAmount("");
      await loadLoans();
      await loadHethBalance();
    } catch (error) {
      console.error("Error repaying loan:", error);

      let errorMessage = "Failed to repay loan: ";
      if (error.message.includes("Must repay exact share amount")) {
        errorMessage += "Amount mismatch. Please use the auto-filled amount.";
      } else if (error.message.includes("Borrower has already repaid")) {
        errorMessage += "You have already repaid this loan.";
      } else if (error.message.includes("Only borrowers can repay")) {
        errorMessage += "You are not a borrower in this loan.";
      } else if (error.message.includes("user rejected")) {
        errorMessage += "Transaction was rejected by user";
      } else {
        errorMessage += error.message;
      }

      setStatus({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Check if user is borrower in a loan (case-insensitive)
  const isUserBorrower = (loan) => {
    if (!account || !loan || !loan.borrowers) return false;
    return loan.borrowers
      .map((addr) => addr.toLowerCase())
      .includes(account.toLowerCase());
  };

  // Check if user is lender in a loan (case-insensitive)
  const isUserLender = (loan) => {
    if (!account || !loan || !loan.lender) return false;
    return loan.lender.toLowerCase() === account.toLowerCase();
  };

  // Quick repay function for loan cards
  const quickRepay = async (loanId, shareAmount) => {
    setRepayLoanId(loanId.toString());
    setRepayAmount(shareAmount);

    // Scroll to repayment form
    document.querySelector('#repay-form').scrollIntoView({ behavior: 'smooth' });

    setStatus({
      type: "info",
      message: `Ready to repay ${shareAmount} HETH for Loan #${loanId}`,
    });
  };

  // ---------------- EFFECTS (declared AFTER functions, BEFORE early returns) ----------------

  // Initialize provider and contracts
  useEffect(() => {
    initializeProvider();
    // Optional: cleanup listeners on unmount
    return () => {
      if (typeof window !== "undefined" && window.ethereum) {
        window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener?.("chainChanged", handleChainChanged);
      }
    };
  }, []);

  // Load loans when contracts are ready
  useEffect(() => {
    if (microLoanContract && account) {
      loadLoans();
      loadHethBalance();
    }
  }, [microLoanContract, account]);

  // Check if wallet is already linked
  useEffect(() => {
    if (user && account) {
      const userWallet = user.user_metadata?.wallet_address;
      if (userWallet && userWallet.toLowerCase() === account.toLowerCase()) {
        setWalletLinked(true);
      } else {
        setWalletLinked(false);
      }
    }
  }, [user, account]);

  // ----------- EARLY RETURNS (AFTER hooks to avoid conditional hooks) -----------
  if (authLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  // ---------------- UI ----------------
  return (
    <div className="container">
      {/* Header */}
      <header className="text-center mb-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1
              style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                color: "white",
                marginBottom: "1rem",
                textShadow: "2px 2px 4px rgba(0,0,0,0.3)",
              }}
            >
              🏦 MicroLoan DApp
            </h1>
            <p style={{ color: "white", fontSize: "1.1rem", opacity: 0.9 }}>
              Decentralized Group Microloans powered by Blockchain
            </p>
          </div>
          
          {/* User Info & Sign Out */}
          <div className="user-header">
            <div className="user-info">
              <FiUser className="user-icon" />
              <div>
                <p className="user-name">{user.user_metadata?.full_name || user.email}</p>
                <p className="user-email">{user.email}</p>
              </div>
            </div>
            <button
              className="btn btn-secondary sign-out-btn"
              onClick={handleSignOut}
              title="Sign Out"
            >
              <FiLogOut />
            </button>
          </div>
        </div>
        
        {chainId && (
          <p style={{ color: "white", fontSize: "0.9rem", opacity: 0.8 }}>
            Network: {chainId === 31337n ? "Hardhat Local" : `Chain ID: ${chainId}`}
          </p>
        )}
      </header>

      {/* Status Messages */}
      {status.message && (
        <div className={`status ${status.type}`}>{status.message}</div>
      )}

      {/* Wallet Connection */}
      <div className="card">
        <h2>🔗 Wallet Connection</h2>
        {!account ? (
          <div>
            <button className="btn" onClick={connectWallet} disabled={loading}>
              {loading ? (
                <span className="spinner"></span>
              ) : (
                "🔌 Connect MetaMask"
              )}
            </button>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <h4 className="font-bold mb-2">💡 Testing Instructions:</h4>
              <ol className="text-sm space-y-1">
                <li>
                  1. Make sure Hardhat node is running:{" "}
                  <code>npx hardhat node</code>
                </li>
                <li>
                  2. Deploy contracts: <code>npm run deploy</code>
                </li>
                <li>
                  3. Distribute tokens: <code>npm run distribute</code>
                </li>
                <li>4. Import test accounts from Hardhat node into MetaMask</li>
                <li>5. Connect MetaMask to localhost:8545 (Chain ID: 31337)</li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p>
                <strong>Connected:</strong>{" "}
                <span className="address">{formatAddress(account)}</span>
              </p>
              <p>
                <strong>HETH Balance:</strong> {hethBalance} HETH
              </p>
              <p>
                <strong>Network:</strong> {chainId === 31337n ? "✅ Hardhat Local" : "❌ Wrong Network"}
              </p>
              <p>
                <strong>Account Status:</strong> {walletLinked ? (
                  <span style={{ color: "#28a745" }}>✅ Linked to your account</span>
                ) : (
                  <span style={{ color: "#ffc107" }}>⚠️ Not linked</span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              {!walletLinked && (
                <button
                  className="btn btn-success"
                  onClick={handleLinkWallet}
                  disabled={loading}
                >
                  <FiLink className="mr-1" />
                  Link Wallet
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={switchAccount}
                disabled={loading}
              >
                🔄 Switch Account
              </button>
              <button
                className="btn btn-secondary"
                onClick={loadHethBalance}
                disabled={loading}
              >
                🔄 Refresh Balance
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Loan Form */}
      <div className="card">
        <h2>💰 Create New Loan</h2>
        <form onSubmit={createLoan}>
          <div className="form-group">
            <label className="form-label">
              Borrower Addresses (comma-separated)
            </label>
            <input
              type="text"
              className="input"
              value={borrowerAddresses}
              onChange={(e) => setBorrowerAddresses(e.target.value)}
              placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8, 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
              disabled={!account || loading || !walletLinked}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Total Loan Amount (HETH)</label>
            <input
              type="number"
              className="input"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              placeholder="100"
              step="0.01"
              min="0"
              disabled={!account || loading || !walletLinked}
            />
            <small style={{ color: "#666", fontSize: "0.8rem" }}>
              This amount will be split equally among all borrowers
            </small>
          </div>
          <button
            type="submit"
            className="btn btn-success"
            disabled={!account || loading || chainId !== 31337n || !walletLinked}
          >
            {loading ? <span className="spinner"></span> : "🚀 Create Loan"}
          </button>
          {!walletLinked && account && (
            <small style={{ color: "#dc3545", fontSize: "0.8rem", display: "block", marginTop: "8px" }}>
              Please link your wallet to your account to create loans
            </small>
          )}
        </form>
      </div>

      {/* Repay Loan Form */}
      <div className="card" id="repay-form">
        <h2>💳 Repay Loan</h2>
        <form onSubmit={repayLoan}>
          <div className="form-group">
            <label className="form-label">Loan ID</label>
            <input
              type="number"
              className="input"
              value={repayLoanId}
              onChange={(e) => handleRepayLoanIdChange(e.target.value)}
              placeholder="1"
              min="1"
              disabled={!account || loading || !walletLinked}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Repayment Amount (HETH)</label>
            <input
              type="number"
              className="input"
              value={repayAmount}
              onChange={(e) => setRepayAmount(e.target.value)}
              placeholder="Auto-filled when you enter Loan ID"
              step="0.000000000000000001"
              min="0"
              disabled={!account || loading || !walletLinked}
              readOnly
            />
            <small style={{ color: "#666", fontSize: "0.8rem" }}>
              Amount is auto-filled based on your share in the loan
            </small>
          </div>
          <button
            type="submit"
            className="btn btn-success"
            disabled={!account || loading || !repayLoanId || !repayAmount || !walletLinked}
          >
            {loading ? <span className="spinner"></span> : "💸 Repay Loan"}
          </button>
          {!walletLinked && account && (
            <small style={{ color: "#dc3545", fontSize: "0.8rem", display: "block", marginTop: "8px" }}>
              Please link your wallet to your account to repay loans
            </small>
          )}
        </form>
      </div>

      {/* Loans List */}
      <div className="card">
        <h2>📋 All Loans</h2>
        <div className="mb-3">
          <button
            className="btn btn-secondary"
            onClick={loadLoans}
            disabled={loading}
          >
            {loading ? <span className="spinner"></span> : "🔄 Refresh Loans"}
          </button>
        </div>
        {loans.length === 0 ? (
          <p className="text-muted">
            No loans found. Create your first loan above!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loans.map((loan) => (
              <div
                key={loan.id}
                className={`card loan-card ${
                  loan.userRepaymentStatus.hasRepaid ? "repaid" : "pending"
                }`}
              >
                <h3>Loan #{loan.id}</h3>
                <p>
                  <strong>Lender:</strong>{" "}
                  <span className="address">{formatAddress(loan.lender)}</span>
                </p>
                <p>
                  <strong>Total Amount:</strong> {loan.totalAmount} HETH
                </p>
                <p>
                  <strong>Share Amount:</strong> {loan.shareAmount} HETH
                </p>
                <p>
                  <strong>Borrowers:</strong> {loan.borrowers.length}
                </p>

                {/* Show user's role and status */}
                {account && (
                  <div className="mt-3">
                    {isUserLender(loan) && (
                      <span className="status success">👑 You are the lender</span>
                    )}
                    {isUserBorrower(loan) && (
                      <div>
                        {loan.userRepaymentStatus.hasRepaid ? (
                          <span className="status success">
                            ✅ You have repaid
                          </span>
                        ) : (
                          <div>
                            <span className="status error">
                              ⏳ You owe {loan.shareAmount} HETH
                            </span>
                            {walletLinked ? (
                              <button
                                className="btn btn-success mt-2"
                                onClick={() => quickRepay(loan.id, loan.shareAmount)}
                                disabled={loading}
                                style={{ width: "100%", fontSize: "0.9rem" }}
                              >
                                💳 Quick Repay
                              </button>
                            ) : (
                              <small style={{ color: "#dc3545", fontSize: "0.8rem", display: "block", marginTop: "8px" }}>
                                Link your wallet to repay
                              </small>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Borrower list */}
                <details className="mt-3">
                  <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                    👥 View Borrowers ({loan.borrowers.length})
                  </summary>
                  <div className="mt-2">
                    {loan.borrowers.map((borrower, index) => (
                      <div key={index} className="address mb-1">
                        {formatAddress(borrower)}
                        {borrower.toLowerCase() === account.toLowerCase() && (
                          <span style={{ color: "#28a745", fontWeight: "bold" }}> (You)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="text-center mt-4 mb-4">
        <p style={{ color: "white", opacity: 0.8 }}>
          Built with ❤️ using Hardhat + Next.js + Ethers.js + Supabase
        </p>
        <p style={{ color: "white", opacity: 0.6, fontSize: "0.8rem" }}>
          Make sure to connect to Hardhat Local Network (localhost:8545)
        </p>
        <p style={{ color: "white", opacity: 0.6, fontSize: "0.8rem" }}>
          Logged in as: {user.user_metadata?.full_name || user.email}
        </p>
      </footer>
    </div>
  );
}
