# 🚀 SlitherMatch Contract Deployment Guide

This guide will help you deploy the SlitherMatch smart contracts to Base Sepolia (testnet) and Base Mainnet.

## 📋 Prerequisites

### 1. Environment Setup
Create a `.env` file in the project root with:

```bash
# Deployer private key (NEVER share this!)
PRIVATE_KEY=your_private_key_here

# Optional: Infura/Alchemy API keys for better RPC reliability
INFURA_API_KEY=your_infura_key
ALCHEMY_API_KEY=your_alchemy_key
```

### 2. Required ETH Balance
- **Base Sepolia**: ~0.01 ETH (free from faucets)
- **Base Mainnet**: ~0.01 ETH (real ETH needed)

### 3. Get Test ETH for Base Sepolia
- Base Sepolia Faucet: https://faucet.quicknode.com/base/sepolia
- Alternative: https://www.alchemy.com/faucets/base-sepolia

## 🧪 Base Sepolia Deployment (Testnet)

### Step 1: Compile Contracts
```bash
npm run compile
```

### Step 2: Deploy to Base Sepolia
```bash
npm run deploy:sepolia
```

### Step 3: Save Contract Addresses
The deployment will output something like:
```
SlitherMatch: 0x1234567890123456789012345678901234567890
SlitherUser: 0x0987654321098765432109876543210987654321
USDC Token: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### Step 4: Update Environment Variables
Create/update `.env.local` for frontend:
```bash
NEXT_PUBLIC_CONTRACT_ADDRESS="0x1234567890123456789012345678901234567890"
NEXT_PUBLIC_USER_CONTRACT_ADDRESS="0x0987654321098765432109876543210987654321"
NEXT_PUBLIC_USDC_ADDRESS="0x036CbD53842c5426634e7929541eC2318f3dCF7e"
NEXT_PUBLIC_NETWORK="baseSepolia"
NEXT_PUBLIC_CHAIN_ID="84532"
```

### Step 5: Verify Contracts (Optional)
```bash
npm run verify:sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>

# Example:
npm run verify:sepolia 0x1234... "0x036CbD53842c5426634e7929541eC2318f3dCF7e" "1000000"
```

### Step 6: Test on Sepolia
1. Add Base Sepolia to your wallet:
   - Network Name: Base Sepolia
   - RPC URL: https://sepolia.base.org
   - Chain ID: 84532
   - Currency: ETH
   - Block Explorer: https://sepolia.basescan.org

2. Get test USDC from Base Sepolia faucet or bridge
3. Test your dApp functionality thoroughly

## 🌐 Base Mainnet Deployment (Production)

### ⚠️ IMPORTANT WARNINGS
- **ONLY deploy to mainnet after thorough testing on Sepolia**
- **Double-check all contract addresses and parameters**
- **Ensure you have sufficient ETH for gas fees**
- **Consider using a hardware wallet for mainnet deployment**

### Step 1: Final Testing
1. Ensure everything works perfectly on Base Sepolia
2. Test all game functions: join lobby, play game, win/lose scenarios
3. Test payment flows with test USDC
4. Verify smart contract functions

### Step 2: Deploy to Base Mainnet
```bash
npm run deploy:mainnet
```

### Step 3: Save Production Contract Addresses
Update your production environment variables:
```bash
NEXT_PUBLIC_CONTRACT_ADDRESS="<MAINNET_SLITHERMATCH_ADDRESS>"
NEXT_PUBLIC_USER_CONTRACT_ADDRESS="<MAINNET_SLITHERUSER_ADDRESS>"
NEXT_PUBLIC_USDC_ADDRESS="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
NEXT_PUBLIC_NETWORK="baseMainnet"
NEXT_PUBLIC_CHAIN_ID="8453"
```

### Step 4: Verify Mainnet Contracts
```bash
npm run verify:mainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Step 5: Production Checklist
- [ ] Contracts verified on BaseScan
- [ ] Environment variables updated
- [ ] Test with small amounts first
- [ ] Set up monitoring/alerts
- [ ] Document contract addresses safely
- [ ] Consider transferring ownership to multisig

## 📊 Contract Addresses Reference

### Base Sepolia (Testnet)
```
USDC Token: 0x036CbD53842c5426634e7929541eC2318f3dCF7e
Chain ID: 84532
Explorer: https://sepolia.basescan.org
RPC: https://sepolia.base.org
```

### Base Mainnet (Production)
```
USDC Token: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
Chain ID: 8453
Explorer: https://basescan.org
RPC: https://mainnet.base.org
```

## 🛟 Troubleshooting

### Common Issues

1. **"Insufficient funds for gas"**
   - Solution: Add more ETH to your deployer wallet

2. **"Network error"**
   - Solution: Check your internet connection and RPC endpoints

3. **"Contract already deployed"**
   - Solution: Use a different account or modify contract slightly

4. **"USDC address invalid"**
   - Solution: Verify you're using the correct USDC address for the network

### Getting Help
- Base Discord: https://discord.gg/buildonbase
- Base Documentation: https://docs.base.org/
- BaseScan Support: https://basescan.org/contactus

## 📈 Post-Deployment

### Monitoring
1. Set up contract event monitoring
2. Monitor gas usage and optimization opportunities
3. Track user adoption and contract interactions

### Security
1. Consider using a multisig wallet for contract ownership
2. Set up automated security monitoring
3. Plan for emergency procedures
4. Regular security audits

### Maintenance
1. Monitor for any smart contract issues
2. Keep track of gas optimization opportunities
3. Plan for potential upgrades (if using proxy pattern)
4. Document all operational procedures

---

## 🔗 Quick Commands Summary

```bash
# Development
npm run compile          # Compile contracts
npm run test:contracts   # Run contract tests
npm run node:local       # Start local hardhat node

# Deployment
npm run deploy:sepolia   # Deploy to Base Sepolia
npm run deploy:mainnet   # Deploy to Base Mainnet

# Verification
npm run verify:sepolia   # Verify on Base Sepolia
npm run verify:mainnet   # Verify on Base Mainnet
```

Good luck with your deployment! 🎮🐍