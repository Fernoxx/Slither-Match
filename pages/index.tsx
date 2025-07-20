import { useState, useCallback } from 'react'
import SnakeGame from '../components/SnakeGame'

// Wallet integration for Farcaster miniapps
declare global {
  interface Window {
    farcaster?: {
      isConnected: boolean
      connect: () => Promise<{ address: string }>
    }
  }
}

export default function Home() {
  const [currentView, setCurrentView] = useState<'home' | 'bot-lobby' | 'paid-lobby'>('home')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [players, setPlayers] = useState<string[]>([])
  const [countdown, setCountdown] = useState<number | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameScore, setGameScore] = useState(0)
  const [gameEnded, setGameEnded] = useState(false)
  const [isPaidLobby, setIsPaidLobby] = useState(false)

  // Connect Farcaster wallet (only for paid lobby)
  const connectWallet = useCallback(async () => {
    if (currentView === 'bot-lobby') {
      // No wallet needed for bot lobby
      return
    }

    setIsConnecting(true)
    try {
      // Try Farcaster SDK first
      if (typeof window !== 'undefined' && window.farcaster) {
        const result = await window.farcaster.connect()
        setWalletAddress(result.address)
      } else {
        // Fallback to Coinbase Smart Wallet
        const { createBaseAccountSDK } = await import('@base-org/account')
        const sdk = createBaseAccountSDK({
          appName: 'SlitherMatch',
        })
        
        await sdk.getProvider().request({ method: 'wallet_connect' })
        const accounts = await sdk.getProvider().request({ method: 'eth_accounts' }) as string[]
        setWalletAddress(accounts[0])
      }
    } catch (error) {
      console.error('Wallet connection failed:', error)
      alert('Please connect your Farcaster wallet or Coinbase Smart Wallet to join the paid lobby')
    } finally {
      setIsConnecting(false)
    }
  }, [currentView])

  // Join paid lobby (requires wallet + payment)
  const joinPaidLobby = useCallback(async () => {
    setIsPaidLobby(true)
    setCurrentView('paid-lobby')
    
    if (!walletAddress) {
      await connectWallet()
      if (!walletAddress) return
    }

    // Simulate adding player to lobby
    setPlayers(prev => [...prev, walletAddress])
    
    // Start countdown when 3+ players
    if (players.length >= 2) { // 2 + current = 3
      let count = 30
      setCountdown(count)
      
      const timer = setInterval(() => {
        count--
        setCountdown(count)
        
        if (count <= 0) {
          clearInterval(timer)
          setCountdown(null)
          setGameStarted(true)
        }
      }, 1000)
    }
  }, [walletAddress, connectWallet, players.length])

  // Join bot lobby (no wallet needed)
  const joinBotLobby = useCallback(() => {
    setIsPaidLobby(false)
    setCurrentView('bot-lobby')
    setGameStarted(false) // Show start button first
    setGameEnded(false)
    setGameScore(0)
  }, [])

  // Handle game end
  const handleGameEnd = useCallback((finalScore: number, isWinner: boolean) => {
    setGameScore(finalScore)
    setGameEnded(true)
    
    if (isPaidLobby && isWinner) {
      // Share cast for paid lobby win
      sharePaidLobbyWin(finalScore)
    }
  }, [isPaidLobby])

  // Share paid lobby win to Farcaster
  const sharePaidLobbyWin = useCallback((score: number) => {
    const castText = `🐍 I just won SlitherMatch with ${score} points and earned $3! 🏆\n\nPlay now: ${window.location.origin}`
    
    // Try to post to Farcaster via parent frame
    try {
      if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'share_cast',
          text: castText
        }, '*')
      } else {
        // Fallback to copy to clipboard
        navigator.clipboard.writeText(castText)
        alert('Win message copied to clipboard! Share it on Farcaster!')
      }
    } catch (error) {
      // Fallback to copy to clipboard
      navigator.clipboard.writeText(castText)
      alert('Win message copied to clipboard! Share it on Farcaster!')
    }
  }, [])

  // Reset game
  const resetGame = useCallback(() => {
    setGameStarted(false)
    setGameEnded(false)
    setGameScore(0)
    setPlayers([])
    setCountdown(null)
    setCurrentView('home')
  }, [])

  if (currentView === 'home') {
    return (
      <div className="container">
        <div className="header">
          <h1>🐍 SlitherMatch</h1>
          <p className="subtitle">Compete, grow, and earn crypto rewards!</p>
        </div>

        <div className="lobby-buttons">
          <button onClick={joinPaidLobby} className="paid-lobby-btn">
            💰 Join Paid Lobby ($1 USDC)
          </button>
          <button onClick={joinBotLobby} className="bot-lobby-btn">
            🤖 Play with Bots
          </button>
        </div>

        <div className="game-rules">
          <h3>🎮 Game Rules</h3>
          <div className="rules-list">
            <div className="rule">💰 $1 USDC entry fee</div>
            <div className="rule">🏆 Winner takes all</div>
          </div>
        </div>

        <div className="game-preview">
          <SnakeGame 
            isPlaying={true}
            isBot={true} 
            isPreview={true}
            isPaidLobby={false}
            onScoreChange={() => {}}
            onGameOver={() => {}}
            onGameWin={() => {}}
          />
        </div>

        <style jsx>{`
          .container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
            position: relative;
            overflow: hidden;
          }

          .container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: 
              radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.2) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.2) 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, rgba(99, 102, 241, 0.2) 0%, transparent 50%);
            pointer-events: none;
          }

          .header {
            text-align: center;
            margin-bottom: 30px;
            z-index: 1;
          }

          .header h1 {
            font-size: 3rem;
            margin: 0;
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
          }

          .subtitle {
            font-size: 1.2rem;
            margin: 10px 0;
            opacity: 0.9;
          }

          .lobby-buttons {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            justify-content: center;
            margin-bottom: 30px;
            z-index: 1;
          }

          .bot-lobby-btn, .paid-lobby-btn {
            padding: 15px 30px;
            border: none;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 200px;
          }

          .paid-lobby-btn {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
          }

          .paid-lobby-btn:hover {
            background: linear-gradient(135deg, #d97706, #b45309);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
          }

          .bot-lobby-btn {
            background: linear-gradient(135deg, #4ade80, #22c55e);
            color: white;
          }

          .bot-lobby-btn:hover {
            background: linear-gradient(135deg, #22c55e, #16a34a);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(74, 222, 128, 0.4);
          }

          .game-rules {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.2);
            z-index: 1;
          }

          .game-rules h3 {
            margin: 0 0 15px 0;
            font-size: 1.3rem;
          }

          .rules-list {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
          }

          .rule {
            background: rgba(255,255,255,0.2);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.9rem;
          }

          .game-preview {
            width: 444px;
            height: 444px;
            border: none;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 
              0 20px 60px rgba(0, 0, 0, 0.3),
              0 0 40px rgba(139, 92, 246, 0.2),
              inset 0 0 20px rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 255, 255, 0.1);
            z-index: 1;
          }

          @media (max-width: 768px) {
            .header h1 {
              font-size: 2rem;
            }
            
            .game-preview {
              width: 300px;
              height: 300px;
            }
            
            .lobby-buttons {
              flex-direction: column;
              width: 100%;
              max-width: 300px;
            }
          }
        `}</style>
      </div>
    )
  }

  // Bot lobby view - keep existing functionality
  if (currentView === 'bot-lobby') {
    return (
      <div className="game-container">
        <div className="game-header">
          <h2>🤖 Bot Lobby</h2>
          <button onClick={resetGame} className="back-btn">← Back to Home</button>
        </div>

        {!gameStarted && (
          <div className="lobby-status">
            <p>Starting bot game...</p>
            <button onClick={() => setGameStarted(true)} className="start-btn">
              🎮 Start Game
            </button>
          </div>
        )}

        {gameStarted && (
          <SnakeGame 
            isPlaying={true}
            isBot={false}
            isPreview={false}
            isPaidLobby={false}
            onScoreChange={setGameScore}
            onGameOver={(score) => {
              setGameScore(score)
              setGameEnded(true)
            }}
            onGameWin={(score) => {
              setGameScore(score)
              setGameEnded(true)
            }}
          />
        )}

        {gameEnded && (
          <div className="game-end-overlay">
            <div className="game-end-modal">
              <h2>🎮 Game Over!</h2>
              <p className="final-score">Final Score: {gameScore}</p>
              <p>Good practice! Ready for the paid lobby?</p>
              <div className="end-buttons">
                <button onClick={resetGame} className="play-again-btn">
                  🔄 Play Again
                </button>
                <button onClick={joinPaidLobby} className="paid-lobby-btn">
                  💰 Join Paid Lobby
                </button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          .game-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
            color: white;
            padding: 20px;
          }

          .game-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            max-width: 500px;
            margin-bottom: 20px;
          }

          .game-header h2 {
            margin: 0;
            color: white;
          }

          .back-btn {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .back-btn:hover {
            background: rgba(255,255,255,0.2);
          }

          .lobby-status {
            text-align: center;
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 20px;
          }

          .start-btn {
            background: #4ade80;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: 15px;
            font-size: 1.1rem;
          }

          .start-btn:hover {
            background: #22c55e;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(74, 222, 128, 0.4);
          }

          .game-end-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .game-end-modal {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 30px;
            text-align: center;
            max-width: 400px;
            width: 90%;
          }

          .final-score {
            font-size: 1.5rem;
            color: #a855f7;
            margin: 15px 0;
            font-weight: bold;
          }

          .end-buttons {
            display: flex;
            gap: 15px;
            margin-top: 20px;
            justify-content: center;
            flex-wrap: wrap;
          }

          .play-again-btn, .paid-lobby-btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .play-again-btn {
            background: #4ade80;
            color: white;
          }

          .play-again-btn:hover {
            background: #22c55e;
          }

          .paid-lobby-btn {
            background: #f59e0b;
            color: white;
          }

          .paid-lobby-btn:hover {
            background: #d97706;
          }
        `}</style>
      </div>
    )
  }

  // Paid lobby view - keep existing functionality
  if (currentView === 'paid-lobby') {
    return (
      <div className="game-container">
        <div className="game-header">
          <h2>💰 Paid Lobby</h2>
          <button onClick={resetGame} className="back-btn">← Back to Home</button>
        </div>

        {!walletAddress ? (
          <div className="wallet-connect">
            <p className="connect-desc">Connect your wallet to join the paid lobby!</p>
            <button 
              onClick={connectWallet}
              disabled={isConnecting}
              className="connect-btn"
            >
              {isConnecting ? '🔄 Connecting...' : '🔗 Connect Wallet'}
            </button>
          </div>
        ) : !gameStarted ? (
          <div className="lobby-content">
            <div className="lobby-info">
              <p className="lobby-desc">Entry Fee: $1 USDC • Winner takes all!</p>
              <p className="player-count">Players: {players.length}/5</p>
              <p className="wallet-info">Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
            </div>
            
            {countdown !== null ? (
              <div className="countdown">
                <h3 className="countdown-text">Game starts in {countdown}s!</h3>
              </div>
            ) : players.length < 5 ? (
              <div className="waiting">
                <p className="waiting-text">Waiting for more players...</p>
              </div>
            ) : null}
          </div>
        ) : gameEnded ? (
          <div className="game-over">
            <h3 className="final-score">
              {gameScore > 50 ? '🎉 You Won!' : '💀 Game Over'}
            </h3>
            <p className="score-text">Final Score: {gameScore}</p>
            {gameScore > 50 && (
              <button 
                onClick={() => sharePaidLobbyWin(gameScore)}
                className="share-btn"
              >
                📤 Share Victory on Farcaster
              </button>
            )}
            <button 
              onClick={resetGame}
              className="back-btn"
            >
              ← Back to Home
            </button>
          </div>
        ) : (
          <SnakeGame 
            isPlaying={true}
            isBot={false}
            isPreview={false}
            isPaidLobby={true}
            onScoreChange={setGameScore}
            onGameOver={(score) => {
              setGameScore(score)
              setGameEnded(true)
            }}
            onGameWin={(score, isWinner) => {
              handleGameEnd(score, isWinner || false)
            }}
          />
        )}

        <style jsx>{`
          .game-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
            color: white;
            padding: 20px;
          }

          .game-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            max-width: 500px;
            margin-bottom: 30px;
          }

          .game-header h2 {
            margin: 0;
            color: white;
          }

          .back-btn {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .back-btn:hover {
            background: rgba(255,255,255,0.2);
          }

          .wallet-connect, .lobby-content, .game-over {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 20px;
            text-align: center;
          }

          .connect-desc, .lobby-desc {
            color: white;
            font-size: 1.1rem;
            margin-bottom: 20px;
          }

          .connect-btn, .share-btn {
            background: #10b981;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .connect-btn:hover, .share-btn:hover {
            background: #059669;
          }

          .player-count, .wallet-info {
            color: #fbbf24;
            font-weight: bold;
            margin: 10px 0;
          }

          .countdown-text, .waiting-text {
            color: #fbbf24;
            font-size: 1.3rem;
            font-weight: bold;
          }

          .final-score {
            color: #10b981;
            font-size: 1.8rem;
            font-weight: bold;
            margin-bottom: 15px;
          }

          .score-text {
            color: white;
            font-size: 1.2rem;
            margin-bottom: 20px;
          }
        `}</style>
      </div>
    )
  }
}
