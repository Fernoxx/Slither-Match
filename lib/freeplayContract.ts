import { ethers } from 'ethers'

// FreeplayLeaderboard contract address from your deployment
const FREEPLAY_CONTRACT_ADDRESS = '0x278db35874c805b27a709ba3777e99e09e812063'

// ABI for FreeplayLeaderboard contract (simplified)
const FREEPLAY_CONTRACT_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_player",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "_farcasterUsername",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_score",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_kills",
        "type": "uint256"
      }
    ],
    "name": "updatePlayerStats",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_count",
        "type": "uint256"
      }
    ],
    "name": "getLeaderboard",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "player",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "username",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "score",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "kills",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "rank",
            "type": "uint256"
          }
        ],
        "internalType": "struct FreeplayLeaderboard.LeaderboardEntry[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_player",
        "type": "address"
      }
    ],
    "name": "getPlayerStats",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "walletAddress",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "farcasterUsername",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "highestScore",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalKills",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "gamesPlayed",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastUpdateTime",
            "type": "uint256"
          }
        ],
        "internalType": "struct FreeplayLeaderboard.PlayerStats",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "player",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "score",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "kills",
        "type": "uint256"
      }
    ],
    "name": "StatsUpdated",
    "type": "event"
  }
]

export interface PlayerStats {
  walletAddress: string
  farcasterUsername: string
  highestScore: number
  totalKills: number
  gamesPlayed: number
  lastUpdateTime: number
}

export interface LeaderboardEntry {
  player: string
  username: string
  score: number
  kills: number
  rank: number
}

class FreeplayContractService {
  private contract: ethers.Contract | null = null
  private provider: ethers.providers.Web3Provider | null = null
  private signer: ethers.Signer | null = null

  async connect() {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask or Web3 wallet not found')
    }

    this.provider = new ethers.providers.Web3Provider(window.ethereum)
    await this.provider.send('eth_requestAccounts', [])
    this.signer = this.provider.getSigner()
    
    this.contract = new ethers.Contract(
      FREEPLAY_CONTRACT_ADDRESS,
      FREEPLAY_CONTRACT_ABI,
      this.signer
    )
  }

  async saveScore(
    playerAddress: string,
    farcasterUsername: string,
    score: number,
    kills: number = 0
  ): Promise<ethers.ContractTransaction> {
    if (!this.contract) {
      throw new Error('Contract not connected')
    }

    try {
      const tx = await this.contract.updatePlayerStats(
        playerAddress,
        farcasterUsername,
        score,
        kills
      )
      
      return tx
    } catch (error) {
      console.error('Error saving score:', error)
      throw error
    }
  }

  async getPlayerStats(playerAddress: string): Promise<PlayerStats> {
    if (!this.contract) {
      throw new Error('Contract not connected')
    }

    try {
      const stats = await this.contract.getPlayerStats(playerAddress)
      
      return {
        walletAddress: stats.walletAddress,
        farcasterUsername: stats.farcasterUsername,
        highestScore: stats.highestScore.toNumber(),
        totalKills: stats.totalKills.toNumber(),
        gamesPlayed: stats.gamesPlayed.toNumber(),
        lastUpdateTime: stats.lastUpdateTime.toNumber()
      }
    } catch (error) {
      console.error('Error getting player stats:', error)
      throw error
    }
  }

  async getLeaderboard(count: number = 10): Promise<LeaderboardEntry[]> {
    if (!this.contract) {
      throw new Error('Contract not connected')
    }

    try {
      const leaderboard = await this.contract.getLeaderboard(count)
      
      return leaderboard.map((entry: any) => ({
        player: entry.player,
        username: entry.username,
        score: entry.score.toNumber(),
        kills: entry.kills.toNumber(),
        rank: entry.rank.toNumber()
      }))
    } catch (error) {
      console.error('Error getting leaderboard:', error)
      throw error
    }
  }

  async waitForTransaction(tx: ethers.ContractTransaction): Promise<ethers.ContractReceipt> {
    if (!this.provider) {
      throw new Error('Provider not connected')
    }

    return await tx.wait()
  }

  get isConnected(): boolean {
    return this.contract !== null && this.signer !== null
  }

  get contractAddress(): string {
    return FREEPLAY_CONTRACT_ADDRESS
  }
}

// Export singleton instance
export const freeplayContract = new FreeplayContractService()
export default freeplayContract