# 🏦 MicroLoan DApp

A decentralized application (DApp) for group microloans, similar to Splitwise but built on blockchain technology. This DApp allows users to create and manage group loans with multiple borrowers, track repayments, and handle all transactions using a custom ERC-20 token (HETH).

## 🚀 Features

- **🔗 MetaMask Integration**: Seamless wallet connection and account switching
- **💰 Custom Token (HETH)**: ERC-20 token for all loan transactions
- **👥 Group Loans**: Support for multiple borrowers per loan
- **⚖️ Equal Split**: Automatic equal distribution of loan amounts among borrowers
- **💳 Repayment Tracking**: Real-time tracking of repayment status
- **📊 Loan History**: View all past and active loans
- **🎨 Modern UI**: Beautiful, responsive interface with real-time updates
- **🔒 Secure**: Built with OpenZeppelin contracts and best practices

## 🛠️ Tech Stack

### Backend

- **Hardhat**: Ethereum development environment
- **Solidity**: Smart contract language
- **OpenZeppelin**: Secure contract libraries
- **Ethers.js**: Ethereum library for contract interaction

### Frontend

- **Next.js**: React framework
- **Ethers.js v6**: Web3 library for frontend
- **CSS-in-JS**: Modern styling approach
- **MetaMask**: Wallet integration

## 📋 Prerequisites

Before running this DApp, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **MetaMask** browser extension
- **Git**

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd newMicroloanDapp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Hardhat Local Network

Open a new terminal and run:

```bash
npm run node
```

This will start a local Hardhat network with 20 pre-funded accounts. Keep this terminal running.

### 4. Deploy Smart Contracts

Open another terminal and run:

```bash
npm run deploy
```

This will:

- Deploy the HETH token contract
- Deploy the MicroLoan contract
- Save contract addresses and ABIs to `deployment.json`
- Export ABIs for the frontend

### 5. Start the Frontend

Open another terminal and run:

```bash
npm run dev
```

The DApp will be available at `http://localhost:3000`

### 6. Connect MetaMask

1. Open MetaMask
2. Add a new network:

   - **Network Name**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`

3. Import one of the test accounts from the Hardhat node terminal (copy the private key)

## 📖 How to Use

### Creating a Loan

1. **Connect Wallet**: Click "Connect MetaMask" and approve the connection
2. **Create Loan**:
   - Enter borrower addresses (comma-separated)
   - Enter total loan amount in HETH
   - Click "Create Loan"
3. **Approve Tokens**: MetaMask will prompt you to approve the token transfer
4. **Confirm Transaction**: Confirm the loan creation transaction

### Repaying a Loan

1. **Find Loan ID**: Look at the loan list to find the loan ID you want to repay
2. **Repay Loan**:
   - Enter the loan ID
   - Enter the repayment amount (should match the share amount)
   - Click "Repay Loan"
3. **Approve Tokens**: Approve the token transfer
4. **Confirm Transaction**: Confirm the repayment transaction

### Viewing Loans

- All loans are automatically displayed in the "All Loans" section
- Each loan card shows:
  - Loan ID and lender
  - Total amount and share amount
  - Number of borrowers
  - Your role (lender/borrower) and repayment status
  - List of all borrowers (expandable)

## 🏗️ Project Structure

```
newMicroloanDapp/
├── contracts/                 # Smart contracts
│   ├── HETH.sol              # ERC-20 token contract
│   └── MicroLoan.sol         # Main loan contract
├── scripts/
│   └── deploy.js             # Deployment script
├── pages/
│   ├── _app.js               # Next.js app wrapper
│   └── index.js              # Main DApp page
├── styles/
│   └── globals.css           # Global styles
├── hardhat.config.js         # Hardhat configuration
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## 🔧 Smart Contracts

### HETH Token (ERC-20)

- **Name**: Hardhat ETH
- **Symbol**: HETH
- **Initial Supply**: 1,000,000 HETH
- **Features**: Standard ERC-20 with mint/burn functions

### MicroLoan Contract

- **Loan Creation**: Create loans with multiple borrowers
- **Equal Split**: Automatically splits loan amount equally
- **Repayment Tracking**: Tracks individual borrower repayments
- **Events**: Emits events for loan creation and repayments
- **View Functions**: Multiple functions to query loan data

## 🎯 Key Functions

### For Lenders

- `createGroupLoan(address[] borrowers, uint256 totalAmount)`: Create a new group loan
- View all loans you've created
- Track repayment status of borrowers

### For Borrowers

- `repay(uint256 loanId, uint256 amount)`: Repay your share of a loan
- View loans where you're a borrower
- Check your repayment status

### For Everyone

- View all loans in the system
- Check HETH token balance
- Monitor loan status and borrower information

## 🔍 Troubleshooting

### Common Issues

1. **"Provider not initialized"**

   - Make sure MetaMask is installed and unlocked
   - Check that you're connected to the Hardhat network

2. **"Failed to create loan"**

   - Ensure you have enough HETH tokens
   - Check that borrower addresses are valid
   - Verify you've approved the token transfer

3. **"Failed to repay loan"**

   - Make sure you're a borrower in the specified loan
   - Check that you haven't already repaid
   - Verify the repayment amount matches the share amount

4. **"Deployment info not found"**
   - Run `npm run deploy` to deploy contracts first
   - Make sure the Hardhat node is running

### MetaMask Issues

1. **Wrong Network**: Make sure you're connected to the Hardhat local network
2. **No Accounts**: Import a test account using the private key from the Hardhat node
3. **Transaction Failures**: Check that you have enough ETH for gas fees

## 🧪 Testing

To run the test suite:

```bash
npm test
```

## 📝 Scripts

- `npm run dev`: Start Next.js development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run compile`: Compile smart contracts
- `npm run test`: Run tests
- `npm run node`: Start Hardhat local network
- `npm run deploy`: Deploy contracts to local network

## 🔒 Security Features

- **OpenZeppelin Contracts**: Uses battle-tested contract libraries
- **SafeERC20**: Safe token transfer operations
- **Input Validation**: Comprehensive validation of all inputs
- **Access Control**: Proper access control mechanisms
- **Event Logging**: All important actions are logged as events

## 🌟 Future Enhancements

- [ ] Interest rates and fees
- [ ] Loan terms and deadlines
- [ ] Collateral support
- [ ] Credit scoring
- [ ] Mobile app
- [ ] Multi-chain support
- [ ] Advanced analytics dashboard

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the console for error messages
3. Ensure all prerequisites are met
4. Verify network and account settings

---

**Happy Lending! 🚀**
