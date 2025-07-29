# Smart Contract Deployments

## Deployed Contracts

### FreeplayLeaderboard.sol
- **Contract Address**: `0x278db35874c805b27a709ba3777e99e09e812063`
- **Purpose**: Tracks high scores and kill counts for freeplay mode
- **Features**:
  - Composite leaderboard (score + kills * 10)
  - Separate top scorers leaderboard
  - Separate top killers leaderboard
  - Player stats tracking
  - Farcaster username integration

### PaidLobbyHighlights.sol
- **Contract Address**: `TBD`
- **Purpose**: Saves winner highlights and prize amounts for paid lobbies
- **Features**:
  - Winner records with prize amounts
  - Player statistics tracking
  - Recent highlights management
  - Farcaster username integration

### CasualLobbyLeaderboard.sol
- **Contract Address**: `TBD`
- **Purpose**: Records fastest game wins for casual lobbies
- **Features**:
  - Fastest win time tracking
  - Leaderboard by speed
  - Player records management
  - Farcaster username integration

## Network Information
- **Network**: Base (assumed)
- **Deployment Date**: Current
- **Owner**: Contract deployer address

## Usage Notes
- All contracts include owner-only functions for updating data
- Events are emitted for transparency and off-chain tracking
- Farcaster usernames are stored for social integration
- Comprehensive getter functions for frontend integration