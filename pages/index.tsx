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

  // Start bot game (for bot lobby)
  const startBotGame = useCallback(() => {
    setGameStarted(true)
    setGameEnded(false)
    setGameScore(0)
  }, [])

  // Share win (for paid lobby)
  const shareWin = useCallback(() => {
    const castText = `🐍 I just won SlitherMatch with ${gameScore} points! 🏆\n\nPlay now: ${window.location.origin}`
    sharePaidLobbyWin(gameScore)
  }, [gameScore, sharePaidLobbyWin])

  return (
    <div className="app-container">
      {currentView === 'home' && (
        <div className="home-page">
          {/* Join Paid Lobby Button - First */}
          <button
            onClick={() => {
              setCurrentView('paid-lobby')
              setIsPaidLobby(true)
            }}
            className="primary-btn paid-lobby-btn"
          >
            💰 Join Paid Lobby ($5 USDC)
          </button>

          {/* Play with Bots Button - Second */}
          <button
            onClick={() => {
              setCurrentView('bot-lobby')
              setIsPaidLobby(false)
            }}
            className="primary-btn bot-lobby-btn"
          >
            🤖 Play with Bots
          </button>

          {/* Game Rules - Third */}
          <div className="rules-section">
            <h3>🎮 Game Rules</h3>
            <ul>
              <li>🐍 Control your snake using the joystick</li>
              <li>🍎 Eat food to grow larger and gain points</li>
              <li>💥 Avoid hitting other snakes and walls</li>
              <li>🏆 Survive 3 minutes to win the prize pool!</li>
            </ul>
          </div>

          {/* Live Game Preview - Fourth */}
          <div className="preview-section">
            <h3>🎯 Live Game Preview</h3>
            <div className="preview-container">
              <SnakeGame 
                isPlaying={true}
                isBot={true}
                isPreview={true}
                isPaidLobby={false}
              />
            </div>
          </div>
        </div>
      )}

      {currentView === 'bot-lobby' && (
        <div className="lobby-page">
          <h2 className="lobby-title">🤖 Bot Lobby</h2>
          
          {!gameStarted ? (
            <div className="lobby-content">
              <div className="lobby-info">
                <p className="lobby-desc">Practice with AI opponents!</p>
                <p className="player-count">Players: 10 (You + 9 Bots)</p>
              </div>
              
              <button 
                onClick={startBotGame}
                className="start-btn"
              >
                🚀 Start Game
              </button>
              
              <button 
                onClick={() => setCurrentView('home')}
                className="back-btn"
              >
                ← Back to Home
              </button>
            </div>
          ) : gameEnded ? (
            <div className="game-over">
              <h3 className="final-score">Game Over!</h3>
              <p className="score-text">Final Score: {gameScore}</p>
              <button 
                onClick={() => {
                  setGameStarted(false)
                  setGameEnded(false)
                  setGameScore(0)
                }}
                className="play-again-btn"
              >
                🔄 Play Again
              </button>
              <button 
                onClick={() => setCurrentView('home')}
                className="back-btn"
              >
                ← Back to Home
              </button>
            </div>
          ) : (
            <div className="game-container">
              <SnakeGame 
                isPlaying={gameStarted}
                isBot={false}
                onScoreChange={setGameScore}
                onGameOver={(score) => {
                  setGameScore(score)
                  setGameEnded(true)
                }}
                isPaidLobby={false}
              />
            </div>
          )}
        </div>
      )}

      {currentView === 'paid-lobby' && (
        <div className="lobby-page">
          <h2 className="lobby-title">💰 Paid Lobby</h2>
          
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
              <button 
                onClick={() => setCurrentView('home')}
                className="back-btn"
              >
                ← Back to Home
              </button>
            </div>
          ) : !gameStarted ? (
            <div className="lobby-content">
              <div className="lobby-info">
                <p className="lobby-desc">Entry Fee: $5 USDC • Winner takes 80% of pool!</p>
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
              
              <button 
                onClick={() => setCurrentView('home')}
                className="back-btn"
              >
                ← Back to Home
              </button>
            </div>
          ) : gameEnded ? (
            <div className="game-over">
              <h3 className="final-score">
                {gameScore > 50 ? '🎉 You Won!' : '💀 Game Over'}
              </h3>
              <p className="score-text">Final Score: {gameScore}</p>
              {gameScore > 50 && (
                <button 
                  onClick={shareWin}
                  className="share-btn"
                >
                  📤 Share Victory on Farcaster
                </button>
              )}
              <button 
                onClick={() => setCurrentView('home')}
                className="back-btn"
              >
                ← Back to Home
              </button>
            </div>
          ) : (
            <div className="game-container">
              <SnakeGame 
                isPlaying={gameStarted}
                isBot={false}
                onScoreChange={setGameScore}
                onGameOver={(score) => {
                  setGameScore(score)
                  setGameEnded(true)
                }}
                onGameWin={(finalScore, isWinner) => {
                  setGameScore(finalScore)
                  setGameEnded(true)
                }}
                isPaidLobby={true}
              />
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .app-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        .app-container::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(45deg, transparent 25%, rgba(138, 43, 226, 0.1) 25%, rgba(138, 43, 226, 0.1) 50%, transparent 50%),
            linear-gradient(-45deg, transparent 25%, rgba(138, 43, 226, 0.1) 25%, rgba(138, 43, 226, 0.1) 50%, transparent 50%);
          background-size: 60px 60px;
          animation: backgroundMove 20s linear infinite;
          pointer-events: none;
          z-index: 0;
        }

        .home-page, .lobby-page {
          position: relative;
          z-index: 1;
          padding: 40px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100vh;
          justify-content: center;
        }

        .primary-btn {
          background: linear-gradient(135deg, rgba(0, 255, 255, 0.2), rgba(0, 136, 255, 0.2));
          border: 3px solid #00ffff;
          color: #00ffff;
          padding: 18px 36px;
          border-radius: 15px;
          font-size: 1.3rem;
          font-weight: bold;
          cursor: pointer;
          margin: 15px;
          transition: all 0.3s ease;
          text-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
          box-shadow: 
            0 0 25px rgba(0, 255, 255, 0.4),
            inset 0 0 15px rgba(0, 255, 255, 0.1);
          width: 280px;
        }

        .primary-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 
            0 8px 30px rgba(0, 255, 255, 0.6),
            inset 0 0 20px rgba(0, 255, 255, 0.2);
          text-shadow: 0 0 20px rgba(0, 255, 255, 1);
        }

        .paid-lobby-btn {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 165, 0, 0.2));
          border-color: #ffd700;
          color: #ffd700;
          text-shadow: 0 0 15px rgba(255, 215, 0, 0.8);
          box-shadow: 
            0 0 25px rgba(255, 215, 0, 0.4),
            inset 0 0 15px rgba(255, 215, 0, 0.1);
        }

        .paid-lobby-btn:hover {
          box-shadow: 
            0 8px 30px rgba(255, 215, 0, 0.6),
            inset 0 0 20px rgba(255, 215, 0, 0.2);
          text-shadow: 0 0 20px rgba(255, 215, 0, 1);
        }

        .rules-section {
          background: linear-gradient(135deg, rgba(138, 43, 226, 0.2), rgba(75, 0, 130, 0.2));
          border: 2px solid #8a2be2;
          border-radius: 15px;
          padding: 25px;
          margin: 20px;
          max-width: 500px;
          text-align: left;
          box-shadow: 
            0 0 25px rgba(138, 43, 226, 0.4),
            inset 0 0 15px rgba(138, 43, 226, 0.1);
        }

        .rules-section h3 {
          color: #8a2be2;
          font-size: 1.4rem;
          margin-bottom: 15px;
          text-shadow: 0 0 15px rgba(138, 43, 226, 0.8);
          text-align: center;
        }

        .rules-section ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .rules-section li {
          color: #ffffff;
          margin: 10px 0;
          font-size: 1rem;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }

        .preview-section {
          margin-top: 30px;
          text-align: center;
        }

        .preview-section h3 {
          color: #00ff88;
          font-size: 1.4rem;
          margin-bottom: 20px;
          text-shadow: 0 0 15px rgba(0, 255, 136, 0.8);
        }

        .preview-container {
          border: 3px solid rgba(0, 255, 255, 0.6);
          border-radius: 15px;
          overflow: hidden;
          box-shadow: 
            0 0 30px rgba(0, 255, 255, 0.4),
            inset 0 0 20px rgba(0, 255, 255, 0.1);
        }

        .lobby-title {
          color: #00ffff;
          font-size: 2.5rem;
          font-weight: bold;
          text-shadow: 0 0 25px rgba(0, 255, 255, 0.8);
          margin-bottom: 30px;
          animation: glow 3s ease-in-out infinite alternate;
        }

        .lobby-content, .wallet-connect, .game-over {
          background: linear-gradient(135deg, rgba(138, 43, 226, 0.2), rgba(75, 0, 130, 0.2));
          border: 2px solid #8a2be2;
          border-radius: 15px;
          padding: 30px;
          margin: 20px;
          text-align: center;
          box-shadow: 
            0 0 25px rgba(138, 43, 226, 0.4),
            inset 0 0 15px rgba(138, 43, 226, 0.1);
        }

        .lobby-desc, .connect-desc {
          color: #ffffff;
          font-size: 1.2rem;
          margin-bottom: 15px;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }

        .player-count, .wallet-info {
          color: #00ff88;
          font-size: 1.1rem;
          font-weight: bold;
          margin: 10px 0;
          text-shadow: 0 0 15px rgba(0, 255, 136, 0.8);
        }

        .start-btn, .connect-btn, .share-btn, .play-again-btn {
          background: linear-gradient(135deg, rgba(0, 255, 136, 0.2), rgba(0, 200, 100, 0.2));
          border: 3px solid #00ff88;
          color: #00ff88;
          padding: 15px 30px;
          border-radius: 12px;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          margin: 15px;
          transition: all 0.3s ease;
          text-shadow: 0 0 15px rgba(0, 255, 136, 0.8);
          box-shadow: 
            0 0 25px rgba(0, 255, 136, 0.4),
            inset 0 0 15px rgba(0, 255, 136, 0.1);
        }

        .start-btn:hover, .connect-btn:hover, .share-btn:hover, .play-again-btn:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 8px 30px rgba(0, 255, 136, 0.6),
            inset 0 0 20px rgba(0, 255, 136, 0.2);
        }

        .back-btn {
          background: linear-gradient(135deg, rgba(255, 100, 100, 0.2), rgba(200, 50, 50, 0.2));
          border: 2px solid #ff6464;
          color: #ff6464;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 1rem;
          cursor: pointer;
          margin: 10px;
          transition: all 0.3s ease;
          text-shadow: 0 0 10px rgba(255, 100, 100, 0.8);
          box-shadow: 
            0 0 20px rgba(255, 100, 100, 0.3),
            inset 0 0 10px rgba(255, 100, 100, 0.1);
        }

        .back-btn:hover {
          transform: translateY(-1px);
          box-shadow: 
            0 6px 25px rgba(255, 100, 100, 0.5),
            inset 0 0 15px rgba(255, 100, 100, 0.2);
        }

        .countdown, .waiting {
          margin: 20px 0;
        }

        .countdown-text, .waiting-text {
          color: #ffd700;
          font-size: 1.5rem;
          font-weight: bold;
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
          animation: pulse 1s ease-in-out infinite;
        }

        .final-score {
          color: #00ff88;
          font-size: 2rem;
          font-weight: bold;
          text-shadow: 0 0 25px rgba(0, 255, 136, 0.8);
          margin-bottom: 15px;
        }

        .score-text {
          color: #00ffff;
          font-size: 1.3rem;
          font-weight: bold;
          text-shadow: 0 0 15px rgba(0, 255, 255, 0.8);
          margin-bottom: 20px;
        }

        .game-container {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        @keyframes backgroundMove {
          0% { transform: translateX(0) translateY(0); }
          100% { transform: translateX(-60px) translateY(-60px); }
        }

        @keyframes glow {
          from { text-shadow: 0 0 25px rgba(0, 255, 255, 0.8); }
          to { text-shadow: 0 0 35px rgba(0, 255, 255, 1); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @media (max-width: 768px) {
          .home-page, .lobby-page {
            padding: 20px 10px;
          }

          .primary-btn {
            width: 250px;
            font-size: 1.1rem;
            padding: 15px 25px;
          }

          .lobby-title {
            font-size: 2rem;
          }

          .rules-section {
            max-width: 90%;
            padding: 20px;
          }

          .lobby-content, .wallet-connect, .game-over {
            padding: 20px;
            margin: 10px;
          }
        }
      `}</style>
    </div>
  )
}
