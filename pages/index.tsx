import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract } from 'wagmi'
import { parseUnits } from 'viem'
import { slitherMatchABI } from '../lib/slitherMatchABI'
import { SnakeGame } from '../components/SnakeGame'
import Link from 'next/link'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`

export default function Home() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContract: joinLobby } = useWriteContract()
  
  const [currentView, setCurrentView] = useState<'menu' | 'lobby' | 'game'>('menu')
  const [currentLobby, setCurrentLobby] = useState<number | null>(null)
  const [gameCountdown, setGameCountdown] = useState(30) // 30 seconds after 3+ players
  const [playersInLobby, setPlayersInLobby] = useState<string[]>([])
  const [gameScore, setGameScore] = useState(0)
  const [gameResult, setGameResult] = useState<{ isWinner: boolean, finalScore: number } | null>(null)
  const [lobbyStatus, setLobbyStatus] = useState<'waiting' | 'countdown' | 'playing'>('waiting')

  // Read lobby data when in a lobby
  const { data: lobbyPlayers } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: slitherMatchABI,
    functionName: 'getPlayers',
    args: currentLobby ? [BigInt(currentLobby)] : undefined,
  })

  useEffect(() => {
    if (lobbyPlayers) {
      const players = lobbyPlayers as string[]
      setPlayersInLobby(players)
      
      // Update lobby status based on player count
      if (players.length >= 3 && lobbyStatus === 'waiting') {
        setLobbyStatus('countdown')
        setGameCountdown(30)
      } else if (players.length < 3) {
        setLobbyStatus('waiting')
        setGameCountdown(30)
      }
    }
  }, [lobbyPlayers, lobbyStatus])

  // Countdown timer for game start (only when 3+ players)
  useEffect(() => {
    if (lobbyStatus === 'countdown' && gameCountdown > 0) {
      const timer = setInterval(() => {
        setGameCountdown(prev => {
          if (prev <= 1) {
            setLobbyStatus('playing')
            setCurrentView('game')
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [lobbyStatus, gameCountdown])

  const handleJoinLobby = async () => {
    // Auto-connect Farcaster wallet
    if (!isConnected) {
      try {
        // For Farcaster frames, we need to handle wallet connection properly
        if (typeof window !== 'undefined') {
          // Check if we're in a Farcaster frame
          const isInFarcaster = window.parent !== window
          
          if (isInFarcaster && window.ethereum) {
            // Request account access in Farcaster
            await window.ethereum.request({ method: 'eth_requestAccounts' })
          } else {
            // Fallback for non-Farcaster environments
            alert('This app works best in Farcaster! Please open in Farcaster client.')
            return
          }
        }
      } catch (error) {
        console.error('Failed to connect Farcaster wallet:', error)
        alert('Failed to connect wallet. Please try opening this app in Farcaster.')
        return
      }
    }
    
    // Switch to lobby view
    setCurrentLobby(1) // Default lobby
    setCurrentView('lobby')
    setLobbyStatus('waiting')
    setGameCountdown(30)
  }

  const handleConfirmJoin = async () => {
    if (!currentLobby || !isConnected) return
    
    try {
      await joinLobby({
        address: CONTRACT_ADDRESS,
        abi: slitherMatchABI,
        functionName: 'joinLobby',
        args: [BigInt(currentLobby)],
      })
      // Player will be added to lobby, triggering the effect above
    } catch (error) {
      console.error('Failed to join lobby:', error)
      alert('Failed to join lobby. Make sure you have 1 USDC and approve the transaction.')
    }
  }

  const handleBackToMenu = () => {
    setCurrentView('menu')
    setCurrentLobby(null)
    setGameCountdown(30)
    setGameScore(0)
    setGameResult(null)
    setLobbyStatus('waiting')
  }

  const handleGameOver = () => {
    // Game over logic - player died
    alert(`Game Over! You died. Final Score: ${gameScore}`)
    setTimeout(() => {
      setCurrentView('menu')
    }, 2000)
  }

  const handleGameWin = (finalScore: number, isWinner: boolean) => {
    // Game win logic - game ended (time up or last snake standing)
    setGameResult({ isWinner, finalScore })
    
    if (isWinner) {
      alert(`🎉 You Won! Final Score: ${finalScore}\n\nYou get ${playersInLobby.length} USDC!`)
    } else {
      alert(`Game Ended! Your Score: ${finalScore}\n\nBetter luck next time!`)
    }
    
    setTimeout(() => {
      setCurrentView('menu')
    }, 3000)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (currentView === 'menu') {
    return (
      <main className="game-container">
        <div className="menu-container">
          {/* Title */}
          <h1 className="game-title">SlitherMatch</h1>
          
          {/* Show last game result if available */}
          {gameResult && (
            <div className={`game-result-banner ${gameResult.isWinner ? 'winner' : 'loser'}`}>
              {gameResult.isWinner ? (
                <div className="result-content">
                  🏆 You Won! Score: {gameResult.finalScore}
                </div>
              ) : (
                <div className="result-content">
                  😔 Game Over! Score: {gameResult.finalScore}
                </div>
              )}
            </div>
          )}
          
          {/* Join Lobby Button */}
          <div className="menu-section">
            <button 
              onClick={handleJoinLobby}
              className="join-lobby-btn"
            >
              <div className="btn-content">
                <span className="btn-title">Join Lobby</span>
                <span className="btn-subtitle">$1 entry • Farcaster only</span>
              </div>
            </button>
          </div>

          {/* Game Preview - Updated with new features */}
          <div className="game-preview">
            <div className="game-board-container">
              <SnakeGame isPlaying={true} isBot={true} isPreview={true} />
            </div>
            
            {/* Game Rules */}
            <div className="preview-info">
              <div className="game-rules-simple">
                <div className="rule-item">💰 $1 USDC entry fee</div>
                <div className="rule-item">🏆 Winner takes all</div>
                <div className="rule-item">🔴 Red dots = 3 points</div>
                <div className="rule-item">🟢 Green dots = 6 points</div>
                <div className="rule-item">🟣 Purple dots = 12 points</div>
              </div>
            </div>
          </div>

          {/* Bot Lobby Link */}
          <div className="menu-section">
            <Link href="/bot" className="bot-lobby-btn">
              🤖 Practice vs Bots
            </Link>
          </div>
        </div>
      </main>
    )
  }

  if (currentView === 'lobby') {
    return (
      <main className="game-container">
        <div className="lobby-container">
          <button onClick={handleBackToMenu} className="back-btn">
            ← Back
          </button>
          
          <h1 className="game-title">Lobby {currentLobby}</h1>
          
          <div className="lobby-info">
            <div className="entry-fee">$1 USDC Entry</div>
            <div className="players-count">{playersInLobby.length}/5 Players</div>
          </div>

          {/* Players List */}
          <div className="players-list">
            <h3 className="players-list-title">Players in Lobby:</h3>
            {playersInLobby.length > 0 ? (
              playersInLobby.map((player, index) => (
                <div key={index} className="player-item">
                  <div className="player-avatar">👤</div>
                  <div className="player-address">
                    {player.slice(0, 6)}...{player.slice(-4)}
                  </div>
                  <div className="player-status">✅ Paid</div>
                </div>
              ))
            ) : (
              <div className="no-players">No players yet. Be the first to join!</div>
            )}
          </div>

          {/* Lobby Status */}
          <div className="lobby-status">
            {lobbyStatus === 'waiting' && (
              <div className="waiting-section">
                <div className="waiting-text">
                  Need {Math.max(0, 3 - playersInLobby.length)} more players to start
                </div>
                <div className="waiting-subtext">
                  Minimum 3 players required • Maximum 5 players
                </div>
              </div>
            )}
            
            {lobbyStatus === 'countdown' && (
              <div className="countdown-section">
                <div className="countdown-text">
                  🎮 Game starting in {gameCountdown} seconds!
                </div>
                <div className="countdown-subtext">
                  {5 - playersInLobby.length > 0 ? 
                    `${5 - playersInLobby.length} more players can still join!` : 
                    'Lobby is full!'
                  }
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="lobby-actions">
            {!playersInLobby.includes(address || '') ? (
              <button onClick={handleConfirmJoin} className="confirm-join-btn">
                💰 Pay $1 USDC & Join Lobby
              </button>
            ) : (
              <div className="joined-status">
                <div className="joined-text">✅ You're in the lobby!</div>
                <div className="joined-subtext">
                  {lobbyStatus === 'waiting' ? 
                    'Waiting for more players...' : 
                    'Get ready to play!'
                  }
                </div>
              </div>
            )}
          </div>

          {/* Lobby Rules */}
          <div className="lobby-rules">
            <h4>🎯 How it Works:</h4>
            <ul>
              <li>💰 Entry fee: $1 USDC per player</li>
              <li>👥 3-5 players per match</li>
              <li>⏰ 30 second countdown after 3+ players</li>
              <li>🎮 3 minute gameplay</li>
              <li>🏆 Winner takes all USDC (minus platform fee)</li>
            </ul>
          </div>
        </div>
      </main>
    )
  }

  if (currentView === 'game') {
    return (
      <main className="game-container">
        <div className="game-active-container">
          <div className="game-header">
            <h1 className="game-title small">SlitherMatch</h1>
            <div className="game-status">
              <span>Players: {playersInLobby.length}</span>
              <span>•</span>
              <span>Prize: ${playersInLobby.length} USDC</span>
            </div>
          </div>

          {/* Active Game */}
          <div className="active-game">
            <SnakeGame 
              isPlaying={true} 
              isBot={false}
              onScoreChange={setGameScore}
              onGameOver={handleGameOver}
              onGameWin={handleGameWin}
            />
          </div>

          {/* Game Info */}
          <div className="game-info">
            <div className="score-display">
              <span className="score-label">Your Score:</span>
              <span className="score-value">{gameScore}</span>
            </div>
            <div className="game-rules-quick">
              <div className="rule-item">🔴 Red dots = 3 points</div>
              <div className="rule-item">🟢 Green dots = 6 points</div>
              <div className="rule-item">🟣 Purple dots = 12 points</div>
            </div>
          </div>

          {/* Game Controls */}
          <div className="game-controls">
            <div className="control-instructions">
              Use joystick to control your snake
            </div>
            <button onClick={handleBackToMenu} className="leave-game-btn">
              Leave Game
            </button>
          </div>
        </div>
      </main>
    )
  }

  return null
}
