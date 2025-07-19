import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect, useReadContract, useWriteContract } from 'wagmi'
import { injected, metaMask, coinbaseWallet } from 'wagmi/connectors'
import { parseUnits } from 'viem'
import { slitherMatchABI } from '../lib/slitherMatchABI'
import Link from 'next/link'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`

// Game board component with dots and snakes
const GameBoard = ({ isInLobby = false, timeLeft = 180 }: { isInLobby?: boolean, timeLeft?: number }) => {
  const [snakePositions, setSnakePositions] = useState({
    blue: { x: 7, y: 8, direction: 'right', length: 3 },
    orange: { x: 2, y: 12, direction: 'down', length: 4 },
    green: { x: 17, y: 15, direction: 'left', length: 5 },
    red: { x: 6, y: 18, direction: 'right', length: 3 }
  })

  const [dots] = useState([
    { x: 15, y: 5, color: 'red' },
    { x: 8, y: 14, color: 'green' },
    { x: 12, y: 9, color: 'purple' }
  ])

  useEffect(() => {
    if (!isInLobby) return

    const interval = setInterval(() => {
      setSnakePositions(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(snake => {
          const s = updated[snake as keyof typeof updated]
          // Simple movement simulation
          if (s.direction === 'right') s.x = Math.min(19, s.x + 1)
          else if (s.direction === 'left') s.x = Math.max(0, s.x - 1)
          else if (s.direction === 'down') s.y = Math.min(19, s.y + 1)
          else if (s.direction === 'up') s.y = Math.max(0, s.y - 1)
          
          // Change direction occasionally
          if (Math.random() < 0.1) {
            s.direction = ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)] as any
          }
        })
        return updated
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isInLobby])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="game-board-container">
      <div className="game-board-header">
        {isInLobby && (
          <div className="game-timer">
            Time: {formatTime(timeLeft)}
          </div>
        )}
      </div>
      <div className="game-grid">
        {/* Render dots pattern */}
        {Array.from({ length: 20 }, (_, row) =>
          Array.from({ length: 20 }, (_, col) => (
            <div key={`${row}-${col}`} className="grid-dot" />
          ))
        )}
        
        {/* Render food dots */}
        {dots.map((dot, index) => (
          <div
            key={index}
            className={`food-dot ${dot.color}`}
            style={{
              gridColumn: dot.x + 1,
              gridRow: dot.y + 1
            }}
          />
        ))}

        {/* Render snakes */}
        {Object.entries(snakePositions).map(([color, snake]) => (
          <div key={color}>
            {/* Snake head */}
            <div
              className={`snake-segment ${color} head`}
              style={{
                gridColumn: snake.x + 1,
                gridRow: snake.y + 1
              }}
            />
            {/* Snake body */}
            {Array.from({ length: snake.length - 1 }, (_, i) => (
              <div
                key={i}
                className={`snake-segment ${color} body`}
                style={{
                  gridColumn: Math.max(1, snake.x - i),
                  gridRow: snake.y + 1
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { writeContract: joinLobby } = useWriteContract()
  
  const [currentView, setCurrentView] = useState<'menu' | 'lobby' | 'game'>('menu')
  const [currentLobby, setCurrentLobby] = useState<number | null>(null)
  const [gameTime, setGameTime] = useState(180) // 3 minutes
  const [playersInLobby, setPlayersInLobby] = useState<string[]>([])

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
  }

  if (currentView === 'menu') {
    return (
      <main className="game-container">
        <div className="menu-container">
          {/* Title */}
          <h1 className="game-title">SlitherMatch</h1>
          
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
            <GameBoard />
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
            <GameBoard isInLobby={false} />
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
            <GameBoard isInLobby={true} timeLeft={gameTime} />
          </div>

          {/* Game Controls */}
          <div className="game-controls">
            <div className="control-instructions">
              Use arrow keys or swipe to control your snake
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
