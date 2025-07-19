import { useState, useCallback } from 'react'
import { SnakeGame } from '../components/SnakeGame'

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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 20px;
          }

          .header {
            text-align: center;
            margin-bottom: 30px;
          }

          .header h1 {
            font-size: 3rem;
            margin: 0;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
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
            background: #f59e0b;
            color: white;
          }

          .paid-lobby-btn:hover {
            background: #d97706;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
          }

          .bot-lobby-btn {
            background: #4ade80;
            color: white;
          }

          .bot-lobby-btn:hover {
            background: #22c55e;
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
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            background: white;
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
            background: #1a1a1a;
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
            color: #4ade80;
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
            background: #2a2a2a;
            border-radius: 16px;
            padding: 30px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
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

  if (currentView === 'paid-lobby') {
    return (
      <div className="game-container">
        <div className="game-header">
          <h2>💰 Paid Lobby</h2>
          <button onClick={resetGame} className="back-btn">← Back to Home</button>
        </div>

        {!walletAddress && (
          <div className="wallet-connect">
            <p>Connect your Farcaster wallet to join</p>
            <button onClick={connectWallet} disabled={isConnecting} className="connect-btn">
              {isConnecting ? 'Connecting...' : '🔗 Connect Wallet'}
            </button>
          </div>
        )}

        {walletAddress && !gameStarted && (
          <div className="lobby-status">
            <p>Players: {players.length}/5</p>
            {countdown && <p className="countdown">Starting in {countdown}s</p>}
            {players.length < 3 && <p>Waiting for at least 3 players...</p>}
          </div>
        )}

        {gameStarted && (
          <SnakeGame 
            isPlaying={true}
            isBot={false} 
            isPreview={false}
            isPaidLobby={true}
            onScoreChange={setGameScore}
            onGameOver={(score) => handleGameEnd(score, false)}
            onGameWin={(score) => handleGameEnd(score, true)}
          />
        )}

        {gameEnded && (
          <div className="game-end-overlay">
            <div className="game-end-modal">
              <h2>🏆 You Won!</h2>
              <p className="final-score">Final Score: {gameScore}</p>
              <p>You earned $3 USDC! 🎉</p>
              <div className="end-buttons">
                <button onClick={() => sharePaidLobbyWin(gameScore)} className="share-btn">
                  📱 Share Your Win
                </button>
                <button onClick={resetGame} className="play-again-btn">
                  🔄 Play Again
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
            background: #1a1a1a;
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
            color: #f59e0b;
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

          .wallet-connect {
            text-align: center;
            background: rgba(255,255,255,0.1);
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 20px;
          }

          .connect-btn {
            background: #a855f7;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: 15px;
          }

          .connect-btn:hover:not(:disabled) {
            background: #9333ea;
          }

          .connect-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .lobby-status {
            text-align: center;
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
          }

          .countdown {
            font-size: 1.5rem;
            color: #f59e0b;
            font-weight: bold;
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
            background: #2a2a2a;
            border-radius: 16px;
            padding: 30px;
            text-align: center;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5);
            max-width: 400px;
            width: 90%;
          }

          .final-score {
            font-size: 1.5rem;
            color: #f59e0b;
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

          .share-btn, .play-again-btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .share-btn {
            background: #a855f7;
            color: white;
          }

          .share-btn:hover {
            background: #9333ea;
          }

          .play-again-btn {
            background: #4ade80;
            color: white;
          }

          .play-again-btn:hover {
            background: #22c55e;
          }
        `}</style>
      </div>
    )
  }

  return null
}
