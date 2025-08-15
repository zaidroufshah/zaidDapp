# 🏦 MicroLoan DApp

A decentralized application (DApp) for group microloans with user authentication, similar to Splitwise but built on blockchain technology. This DApp allows users to create and manage group loans with multiple borrowers, track repayments, and handle all transactions using a custom ERC-20 token (HETH).

## 🚀 Features

- **🔐 User Authentication**: Secure signup/signin with Supabase
- **🔗 Wallet Integration**: Link MetaMask wallets to user accounts
- **💰 Custom Token (HETH)**: ERC-20 token for all loan transactions
- **👥 Group Loans**: Support for multiple borrowers per loan
- **⚖️ Equal Split**: Automatic equal distribution of loan amounts among borrowers
- **💳 Repayment Tracking**: Real-time tracking of repayment status
- **📊 Loan History**: View all past and active loans with user roles
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
- **React Icons**: Icon components
- **CSS-in-JS**: Modern styling approach

### Authentication & Database
- **Supabase**: Authentication and user management
- **PostgreSQL**: User profiles and wallet linking

## 📋 Prerequisites

Before running this DApp, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **MetaMask** browser extension
- **Git**
- **Supabase Account** (free tier works)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd microloan-dapp
```

### 2. Install Dependencies

```bash
# Install main dependencies
npm install

# Install additional required packages
npm install @supabase/supabase-js react-icons
npm install @supabase/supabase-js bcryptjs   
npm install --save-dev @types/bcryptjs
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**To get your Supabase credentials:**
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings > API
4. Copy your Project URL and anon/public key

### 4. Database Setup (Supabase)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the following SQL commands:

```sql
-- ===========================================
-- Simple Supabase setup without triggers
-- Cleans up any default Supabase new-user triggers
-- ===========================================

-- 1. Remove any default Supabase "new user" trigger/function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user;

-- 2. Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. Create a simple users table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  wallet_address VARCHAR(42),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Create simple RLS policies
CREATE POLICY "Enable read access for users to their own data"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users only"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users based on id"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- 6. Grant permissions
GRANT ALL ON public.users TO authenticated;
GRANT SELECT ON public.users TO authenticated;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email
  ON public.users(email);

CREATE INDEX IF NOT EXISTS idx_users_wallet_address
  ON public.users(wallet_address);

-- 8. Success message
SELECT 'Simple trigger-free setup completed! You can now manually handle user profile creation in your app.' AS status;
```

### 5. Blockchain Setup

**Step 1: Start Hardhat Local Network**
```bash
npm run node
```
Keep this terminal running. It will show 20 pre-funded test accounts.

**Step 2: Deploy Smart Contracts**
```bash
npm run deploy
```
This will deploy HETH token and MicroLoan contracts to the local network.

**Step 3: Distribute HETH Tokens**
```bash
npm run distribute
```
This distributes 50,000 HETH tokens to test accounts. Note the HETH token address (e.g., `0x5FbDB2315678afecb367f032d93F642f64180aa3`).

### 6. Start the Frontend

```bash
npm run dev
```

The DApp will be available at `http://localhost:3000`

### 7. MetaMask Setup

1. **Install MetaMask** browser extension if not already installed
2. **Add Hardhat Network** to MetaMask:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

3. **Import Test Account**:
   - Copy a private key from the Hardhat node terminal
   - In MetaMask: Account menu → Import Account → Paste private key

4. **Add HETH Token** to MetaMask:
   - Copy the HETH token address from deploy step
   - In MetaMask: Import tokens → Custom token → Paste address

## 📖 How to Use

### User Registration & Authentication

1. **Sign Up**: Create a new account with email and password
2. **Sign In**: Log in with your credentials
3. **Connect Wallet**: Connect your MetaMask wallet
4. **Link Wallet**: Link your wallet address to your user account

### Creating a Loan

1. **Connect & Link Wallet**: Ensure wallet is connected and linked
2. **Create Loan**:
   - Enter borrower addresses (comma-separated)
   - Enter total loan amount in HETH
   - Click "Create Loan"
3. **Approve Transaction**: MetaMask will prompt for approval and transaction
4. **Confirm**: Wait for blockchain confirmation

### Repaying a Loan

1. **Find Loan**: Look for loans where you're listed as a borrower
2. **Use Quick Repay**: Click "Quick Repay" on loan cards (auto-fills amount)
3. **Or Manual Repay**:
   - Enter loan ID in repay form
   - Amount auto-fills based on your share
   - Click "Repay Loan"
4. **Approve & Confirm**: Approve token transfer and confirm transaction

### Viewing Loans

- **All Loans**: View all loans in the system
- **Your Role**: See if you're lender/borrower in each loan
- **Status**: Check repayment status (paid/pending)
- **Details**: Expand to see all borrower addresses

## 🏗️ Project Structure

```
microloan-dapp/
├── components/
│   └── Auth.js                # Authentication component
├── contexts/
│   └── AuthContext.js         # Authentication context
├── contracts/
│   ├── HETH.sol              # ERC-20 token contract
│   └── MicroLoan.sol         # Main loan contract
├── lib/
│   └── supabase.js           # Supabase client configuration
├── pages/
│   ├── _app.js               # Next.js app wrapper
│   └── index.js              # Main DApp interface
├── scripts/
│   ├── deploy.js             # Contract deployment
│   └── distribute-tokens.js  # Token distribution
├── styles/
│   ├── auth.css              # Authentication styles
│   └── globals.css           # Global styles
├── hardhat.config.js         # Hardhat configuration
├── package.json              # Dependencies and scripts
└── deployment.json           # Contract addresses (generated)
```

## 🔧 Smart Contracts

### HETH Token (ERC-20)
- **Name**: Hardhat ETH
- **Symbol**: HETH
- **Initial Supply**: 1,000,000 HETH
- **Features**: Standard ERC-20 with mint/burn functions

### MicroLoan Contract
- **Loan Creation**: Create loans with multiple borrowers
- **Equal Distribution**: Tokens sent directly to borrowers
- **Repayment Tracking**: Borrowers repay directly to lender
- **Events**: Comprehensive event logging
- **View Functions**: Query loan data and repayment status

## 🎯 Key Functions

### For Lenders
- Create group loans with multiple borrowers
- View all loans you've created
- Track which borrowers have repaid
- Receive repayments directly

### For Borrowers
- View loans where you're a borrower
- Repay your share of loans
- Check your repayment status
- Use quick repay feature

### For All Users
- Secure authentication system
- Link multiple wallets to accounts
- View comprehensive loan history
- Real-time balance updates

## 🔍 Troubleshooting

### Authentication Issues
- **Email not confirmed**: Check spam folder for confirmation email
- **Login fails**: Verify email/password, check Supabase connection
- **Profile not created**: Check Supabase RLS policies

### Wallet Issues
- **Connection fails**: Ensure MetaMask is installed and unlocked
- **Wrong network**: Switch to Hardhat Local (Chain ID: 31337)
- **Wallet not linked**: Use "Link Wallet" button after connecting

### Transaction Issues
- **Insufficient HETH**: Run `npm run distribute` to get test tokens
- **Gas fees**: Ensure you have ETH in your account for gas
- **Transaction reverted**: Check borrower addresses and amounts

### Common Error Messages
- **"Provider not initialized"**: MetaMask not connected
- **"Contracts not deployed"**: Run `npm run deploy`
- **"Please link your wallet"**: Link wallet to your user account
- **"Borrower has already repaid"**: Trying to repay twice

## 🧪 Testing

### Manual Testing Flow
1. **Create 2+ user accounts** (different emails)
2. **Import different MetaMask accounts** for each user
3. **Link wallets** to respective user accounts
4. **User A creates loan** with User B as borrower
5. **User B repays loan** using their linked wallet
6. **Verify balances** and loan status updates

### Test Scripts
```bash
# Run contract tests
npm test

# Test token distribution
npm run distribute

# Compile contracts
npm run compile
```

## 📝 Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run compile` - Compile smart contracts
- `npm run test` - Run contract tests
- `npm run node` - Start Hardhat local network
- `npm run deploy` - Deploy contracts to local network
- `npm run distribute` - Distribute HETH tokens to test accounts

## 🔒 Security Features

- **Supabase Authentication**: Email/password with secure sessions
- **Wallet Verification**: Cryptographic proof of wallet ownership
- **Row Level Security**: Database access controls
- **OpenZeppelin Contracts**: Battle-tested smart contracts
- **Input Validation**: Comprehensive validation on all inputs
- **Event Logging**: All actions logged for transparency

## 🌟 Future Enhancements

- [ ] **Interest Rates**: Add configurable interest rates
- [ ] **Loan Deadlines**: Set repayment deadlines
- [ ] **Notifications**: Email/push notifications for repayments
- [ ] **Credit Scoring**: Basic credit history tracking
- [ ] **Mobile App**: React Native mobile application
- [ ] **Multi-chain**: Support for other EVM chains
- [ ] **Collateral**: Support for collateralized loans
- [ ] **Analytics**: Advanced loan analytics dashboard

## 📄 Environment Variables

Required environment variables in `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Database URL for direct connections
DATABASE_URL=postgresql://user:pass@host:port/dbname
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

### Common Issues Checklist

- [ ] Hardhat node is running (`npm run node`)
- [ ] Contracts are deployed (`npm run deploy`)
- [ ] Tokens are distributed (`npm run distribute`)
- [ ] MetaMask connected to localhost:8545
- [ ] Supabase environment variables are set
- [ ] Database tables are created
- [ ] User account is created and wallet is linked

### Getting Help

1. Check the troubleshooting section above
2. Review browser console for error messages
3. Verify all prerequisites are met
4. Ensure all steps were followed in order

## 📄 License

This project is licensed under the MIT License. See `LICENSE` file for details.

## 🙏 Acknowledgments

- **Hardhat** for the excellent development environment
- **OpenZeppelin** for secure smart contract libraries
- **Supabase** for authentication and database services
- **Next.js** for the React framework
- **MetaMask** for wallet integration

---

**Happy Lending! 🚀**

*Built with ❤️ for the decentralized finance community*
