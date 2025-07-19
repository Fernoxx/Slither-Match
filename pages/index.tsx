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
      <div className="homepage-container">
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
          <div className="rules-header">
            <span className="rules-icon">🎮</span>
            <span>Game Rules</span>
          </div>
          <div className="rules-list">
            <div className="rule">
              <span className="rule-icon">💰</span>
              <span>$1 USDC entry fee</span>
            </div>
            <div className="rule">
              <span className="rule-icon">🏆</span>
              <span>Winner takes all</span>
            </div>
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
          .homepage-container {
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

          .homepage-container::before {
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
            margin-bottom: 40px;
            z-index: 1;
          }

          .header h1 {
            font-size: 3rem;
            margin: 0;
            text-shadow: 0 0 30px rgba(255, 255, 255, 0.5);
            background: linear-gradient(45deg, #ffffff, #e0e7ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .subtitle {
            font-size: 1.2rem;
            margin: 15px 0 0 0;
            opacity: 0.9;
            text-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
          }

          .lobby-buttons {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            justify-content: center;
            margin-bottom: 40px;
            z-index: 1;
          }

          .bot-lobby-btn, .paid-lobby-btn {
            padding: 15px 30px;
            border: none;
            border-radius: 16px;
            font-size: 1.1rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            min-width: 200px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
          }

          .paid-lobby-btn {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
            border: 2px solid rgba(245, 158, 11, 0.3);
            box-shadow: 
              0 8px 25px rgba(245, 158, 11, 0.3),
              0 0 20px rgba(245, 158, 11, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }

          .paid-lobby-btn:hover {
            background: linear-gradient(135deg, #d97706, #b45309);
            transform: translateY(-3px);
            box-shadow: 
              0 12px 35px rgba(245, 158, 11, 0.4),
              0 0 30px rgba(245, 158, 11, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
          }

          .bot-lobby-btn {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: 2px solid rgba(16, 185, 129, 0.3);
            box-shadow: 
              0 8px 25px rgba(16, 185, 129, 0.3),
              0 0 20px rgba(16, 185, 129, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.2);
          }

          .bot-lobby-btn:hover {
            background: linear-gradient(135deg, #059669, #047857);
            transform: translateY(-3px);
            box-shadow: 
              0 12px 35px rgba(16, 185, 129, 0.4),
              0 0 30px rgba(16, 185, 129, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.3);
          }

          .game-rules {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 25px;
            margin-bottom: 40px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 
              0 8px 32px rgba(0, 0, 0, 0.1),
              0 0 20px rgba(255, 255, 255, 0.1);
            z-index: 1;
          }

          .rules-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin-bottom: 20px;
            font-size: 1.3rem;
            font-weight: bold;
            color: #e0e7ff;
          }

          .rules-icon {
            font-size: 1.5rem;
          }

          .rules-list {
            display: flex;
            gap: 25px;
            justify-content: center;
            flex-wrap: wrap;
          }

          .rule {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(10px);
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 0.95rem;
            border: 1px solid rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          }

          .rule-icon {
            font-size: 1.1rem;
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
              font-size: 2.5rem;
            }
            
            .game-preview {
              width: 320px;
              height: 320px;
            }
            
            .lobby-buttons {
              flex-direction: column;
              width: 100%;
              max-width: 300px;
            }

            .rules-list {
              flex-direction: column;
              gap: 15px;
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
            <h3>🎮 Ready to Play?</h3>
            <p>Practice your skills against AI opponents!</p>
            <button onClick={() => setGameStarted(true)} className="start-btn">
              🚀 Start Game
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
            position: relative;
            overflow: hidden;
          }

          .game-container::before {
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

          .game-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            max-width: 500px;
            margin-bottom: 30px;
            z-index: 1;
          }

          .game-header h2 {
            margin: 0;
            color: #ffffff;
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
            font-size: 1.8rem;
          }

          .back-btn {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            padding: 10px 20px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          }

          .back-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
          }

          .lobby-status {
            text-align: center;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            padding: 40px;
            border-radius: 20px;
            margin-bottom: 30px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            z-index: 1;
          }

          .lobby-status h3 {
            margin: 0 0 15px 0;
            font-size: 1.5rem;
            text-shadow: 0 0 15px rgba(255, 255, 255, 0.3);
          }

          .lobby-status p {
            margin: 0 0 25px 0;
            opacity: 0.9;
          }

          .start-btn {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1.1rem;
            box-shadow: 
              0 8px 25px rgba(16, 185, 129, 0.3),
              0 0 20px rgba(16, 185, 129, 0.2);
          }

          .start-btn:hover {
            background: linear-gradient(135deg, #059669, #047857);
            transform: translateY(-3px);
            box-shadow: 
              0 12px 35px rgba(16, 185, 129, 0.4),
              0 0 30px rgba(16, 185, 129, 0.3);
          }

          .game-end-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .game-end-modal {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 400px;
            width: 90%;
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .final-score {
            font-size: 1.5rem;
            color: #fbbf24;
            margin: 15px 0;
            font-weight: bold;
            text-shadow: 0 0 15px rgba(251, 191, 36, 0.5);
          }

          .end-buttons {
            display: flex;
            gap: 15px;
            margin-top: 25px;
            justify-content: center;
            flex-wrap: wrap;
          }

          .play-again-btn, .paid-lobby-btn {
            padding: 12px 24px;
            border: none;
            border-radius: 12px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          }

          .play-again-btn {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
          }

          .play-again-btn:hover {
            background: linear-gradient(135deg, #059669, #047857);
            transform: translateY(-2px);
          }

          .paid-lobby-btn {
            background: linear-gradient(135deg, #f59e0b, #d97706);
            color: white;
          }

          .paid-lobby-btn:hover {
            background: linear-gradient(135deg, #d97706, #b45309);
            transform: translateY(-2px);
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

        <style jsx>{`
          .game-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
            color: white;
            padding: 20px;
            position: relative;
            overflow: hidden;
          }

          .game-container::before {
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

          .game-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            max-width: 500px;
            margin-bottom: 30px;
            z-index: 1;
          }

          .game-header h2 {
            margin: 0;
            color: #ffffff;
            text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
            font-size: 1.8rem;
          }

          .back-btn {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            padding: 10px 20px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          }

          .back-btn:hover {
            background: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
          }

          .wallet-connect {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 40px;
            margin-bottom: 30px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            z-index: 1;
          }

          .connect-desc {
            color: #ffffff;
            font-size: 1.2rem;
            margin-bottom: 15px;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
          }

          .connect-btn {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1.1rem;
            box-shadow: 
              0 8px 25px rgba(16, 185, 129, 0.3),
              0 0 20px rgba(16, 185, 129, 0.2);
          }

          .connect-btn:hover {
            background: linear-gradient(135deg, #059669, #047857);
            transform: translateY(-3px);
            box-shadow: 
              0 12px 35px rgba(16, 185, 129, 0.4),
              0 0 30px rgba(16, 185, 129, 0.3);
          }

          .lobby-content {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            z-index: 1;
          }

          .lobby-info {
            text-align: center;
          }

          .lobby-desc {
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

          .game-over {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 40px;
            margin-bottom: 30px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            z-index: 1;
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

          .game-container > div {
            width: 100%;
            max-width: 500px;
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
            .game-header {
              flex-direction: column;
              gap: 10px;
            }

            .game-header h2 {
              font-size: 1.5rem;
            }

            .wallet-connect, .lobby-content, .game-over {
              padding: 20px;
              margin: 10px;
            }

            .connect-btn {
              width: 100%;
              max-width: 300px;
            }
          }
        `}</style>
      </div>
    )
  }
}
