# SlitherMatch - Farcaster Miniapp Game

A Farcaster miniapp + Base smart contract game where 3-5 players compete in snake-style gameplay for USDC prizes.

## 🎯 Game Overview

- **Entry Fee**: $1 USDC on Base
- **Players**: 3-5 per lobby
- **Duration**: 5 minutes max
- **Countdown**: 30 seconds after 3 players join
- **Winner Takes All**: 100% of pooled entry fees

## 🏗️ Smart Contracts

### SlitherMatch Contract
Main game contract handling:
- ✅ Lobby creation and management
- ✅ USDC-based entry fees (1 USDC = 1,000,000 units)
- ✅ 30-second countdown after 3 players join
- ✅ 5-minute refund window for incomplete lobbies
- ✅ Winner declaration and prize distribution
- ✅ Support for 3-5 players per lobby

### SlitherUser Contract
User management contract handling:
- ✅ Farcaster user profile tracking (FID, username, pfp)
- ✅ Game statistics and leaderboards
- ✅ Win/loss records and earnings tracking
- ✅ Achievement and performance metrics

## 📦 Tech Stack

- **Smart Contracts**: Solidity ^0.8.28
- **Framework**: Hardhat
- **Frontend**: Next.js 15 + Tailwind CSS
- **Wallet Integration**: wagmi + viem
- **Farcaster**: @farcaster/miniapp-sdk
- **Base Network**: USDC payments
- **Testing**: Hardhat + Chai

## 🚀 Quick Start

### Prerequisites

```bash
node >= 18.0.0
npm >= 8.0.0
```

### Installation

```bash
# Clone and install dependencies
npm install

# Create .env file (update with your private key)
cp .env.example .env
```

### Environment Setup

Update `.env` with your private key:

```env
PRIVATE_KEY=your_private_key_here
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### Compile Contracts

```bash
npm run compile
```

### Run Tests

```bash
npm test
```

### Deploy to Base Sepolia

```bash
npm run deploy:baseSepolia
```

## 📋 Contract Addresses

### Base Sepolia Testnet
- **USDC**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **SlitherMatch**: *Deploy to get address*
- **SlitherUser**: *Deploy to get address*

### Base Mainnet
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **SlitherMatch**: *TBD*
- **SlitherUser**: *TBD*

## 🎮 Game Logic

### Scoring System
- 🔴 **Red Dots**: 3 points
- 🟢 **Green Dots**: 6 points  
- 🟣 **Purple Dots**: 12 points

### Win Conditions
1. **Last Snake Standing**: Survive while others crash
2. **Highest Score**: If multiple snakes survive 5 minutes

### Game Flow
1. Players join lobby and pay 1 USDC entry fee
2. 30-second countdown starts when 3rd player joins
3. Up to 2 more players can join during countdown
4. Game runs for maximum 5 minutes
5. Winner gets 100% of prize pool
6. Automatic refunds available if lobby doesn't fill in 5 minutes

## 🔧 Smart Contract Functions

### SlitherMatch Key Functions

```solidity
// Create a new lobby
function createLobby() external returns (uint256)

// Join existing lobby with USDC payment
function joinLobby(uint256 _lobbyId) external

// Start game (owner only)
function markGameStarted(uint256 _lobbyId) external onlyOwner

// Declare winner (owner only) 
function declareWinner(uint256 _lobbyId, address _winner) external onlyOwner

// Request refund for unfilled lobby
function refundIfUnstarted(uint256 _lobbyId, address _player) external
```

### SlitherUser Key Functions

```solidity
// Register Farcaster user
function registerUser(uint256 _fid, string _username, string _displayName, string _pfpUrl, address _wallet) external

// Record game results (owner only)
function recordGameResult(address _wallet, uint256 _score, bool _won, uint256 _earnings, ...) external onlyOwner

// Get user profile and stats
function getUserProfile(address _wallet) external view returns (UserProfile memory)
function getUserStats(address _wallet) external view returns (GameStats memory)
```

## 🧪 Testing

Comprehensive test suite covering:
- ✅ Contract deployment and initialization
- ✅ Lobby creation and player joining
- ✅ USDC payment handling
- ✅ Game flow and winner declaration
- ✅ Refund mechanisms
- ✅ User registration and statistics
- ✅ Edge cases and error conditions

Run tests:
```bash
npm test
```

## 🔐 Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Ownable**: Secure admin functions
- **USDC Integration**: Battle-tested ERC20 token
- **Input Validation**: Comprehensive parameter checking
- **State Management**: Proper game state transitions

## 📱 Farcaster Integration

The miniapp integrates with Farcaster to:
- Fetch real user data (FID, username, profile picture)
- Support both Farcaster Wallet and Coinbase Wallet
- Enable sharing wins to Farcaster feeds
- Work seamlessly in Coinbase environment

## 🌐 Base Network Benefits

- **Low Fees**: Minimal transaction costs
- **Fast Finality**: Quick confirmation times
- **USDC Native**: Seamless stablecoin integration
- **Builder Rewards**: Track onchain usage

## 📊 Frontend Features

- 🎮 Snake game with real-time multiplayer
- 👥 Live lobby management
- 👀 Spectator mode for ongoing games
- 🤖 Bot mode for practice
- 🏆 Leaderboards and stats
- 💰 Win sharing to Farcaster

## 🛠️ Development

### Project Structure
```
├── contracts/          # Smart contracts
├── scripts/           # Deployment scripts  
├── test/              # Test files
├── pages/             # Next.js pages
├── components/        # React components
├── styles/            # CSS files
└── types/             # TypeScript definitions
```

### NPM Scripts
```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run compile       # Compile contracts
npm run test          # Run contract tests
npm run deploy:baseSepolia  # Deploy to Base Sepolia
npm run deploy:baseMainnet  # Deploy to Base Mainnet
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

- Create an issue for bugs or feature requests
- Join our community for discussions
- Check documentation for detailed guides

---

**Ready to slither your way to victory? Deploy and play SlitherMatch!** 🐍🎮
