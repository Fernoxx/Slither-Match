import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract } from 'wagmi'
import { injected, metaMask, coinbaseWallet } from 'wagmi/connectors'
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
  const [gameTime, setGameTime] = useState(180) // 3 minutes
  const [playersInLobby, setPlayersInLobby] = useState<string[]>([])
  const [gameScore, setGameScore] = useState(0)
  const [gameResult, setGameResult] = useState<{ isWinner: boolean, finalScore: number } | null>(null)

  // Read lobby data when in a lobby
  const { data: lobbyPlayers } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: slitherMatchABI,
    functionName: 'getPlayers',
    args: currentLobby ? [BigInt(currentLobby)] : undefined,
  })

  useEffect(() => {
    if (lobbyPlayers) {
      setPlayersInLobby(lobbyPlayers as string[])
    }
  }, [lobbyPlayers])

  useEffect(() => {
    if (currentView === 'game' && gameTime > 0) {
      const timer = setInterval(() => {
        setGameTime(prev => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [currentView, gameTime])

  const handleJoinLobby = () => {
    if (!isConnected) {
      connect({ connector: coinbaseWallet() })
      return
    }
    
    // Switch to lobby view
    setCurrentLobby(1) // Default lobby
    setCurrentView('lobby')
  }

  const handleConfirmJoin = async () => {
    if (!currentLobby) return
    
    try {
      await joinLobby({
        address: CONTRACT_ADDRESS,
        abi: slitherMatchABI,
        functionName: 'joinLobby',
        args: [BigInt(currentLobby)],
      })
      setCurrentView('game')
    } catch (error) {
      console.error('Failed to join lobby:', error)
    }
  }

  const handleBackToMenu = () => {
    setCurrentView('menu')
    setCurrentLobby(null)
    setGameTime(180)
    setGameScore(0)
    setGameResult(null)
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
                <span className="btn-subtitle">$1 entry</span>
              </div>
            </button>
          </div>

          {/* Game Preview */}
          <div className="game-preview">
            <div className="game-board-container">
              <div className="game-board-header">
                <div className="game-timer">Time: 3:00</div>
              </div>
              <SnakeGame isPlaying={true} isBot={true} />
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
            {playersInLobby.map((player, index) => (
              <div key={index} className="player-item">
                <div className="player-avatar">👤</div>
                <div className="player-address">
                  {player.slice(0, 6)}...{player.slice(-4)}
                </div>
              </div>
            ))}
          </div>

          {/* Game Preview */}
          <div className="lobby-game-preview">
            <div className="game-board-container">
              <SnakeGame isPlaying={true} isBot={true} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="lobby-actions">
            {playersInLobby.length >= 3 ? (
              <div className="countdown-section">
                <div className="countdown-text">Game starting in 30s...</div>
                <button onClick={handleConfirmJoin} className="confirm-join-btn">
                  Confirm Join
                </button>
              </div>
            ) : (
              <div className="waiting-section">
                <div className="waiting-text">
                  Waiting for {3 - playersInLobby.length} more players...
                </div>
                <button onClick={handleConfirmJoin} className="confirm-join-btn">
                  Pay $1 USDC & Join
                </button>
              </div>
            )}
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
