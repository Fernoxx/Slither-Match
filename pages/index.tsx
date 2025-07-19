import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import SnakeGame from '../components/SnakeGame'

declare global {
  interface Window {
    farcaster?: {
      connect: () => Promise<{ address: string }>
      cast: (text: string) => Promise<void>
    }
  }
}

export default function Home() {
  const router = useRouter()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [inBotLobby, setInBotLobby] = useState(false)
  const [gameMode, setGameMode] = useState<'home' | 'bot' | 'paid'>('home')

  const connectWallet = async () => {
    setIsConnecting(true)
    try {
      if (typeof window !== 'undefined') {
        if (window.farcaster) {
          const result = await window.farcaster.connect()
          setWalletAddress(result.address)
        } else {
          // Fallback to Coinbase Smart Wallet
          const { createBaseAccountSDK } = await import('@base-org/account')
          const sdk = createBaseAccountSDK({ appName: 'SlitherMatch' })
          await sdk.getProvider().request({ method: 'wallet_connect' })
          const accounts = await sdk.getProvider().request({ method: 'eth_accounts' }) as string[]
          if (accounts.length > 0) {
            setWalletAddress(accounts[0])
          }
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  const joinPaidLobby = async () => {
    if (!walletAddress) {
      await connectWallet()
      return
    }
    setGameMode('paid')
    setGameStarted(true)
  }

  const joinBotLobby = () => {
    setGameMode('bot')
    setInBotLobby(true)
  }

  const startBotGame = () => {
    setGameStarted(true)
  }

  const handleGameOver = (score: number) => {
    if (gameMode === 'paid') {
      // Show winner message and share option for paid lobby
      if (typeof window !== 'undefined' && window.farcaster) {
        window.farcaster.cast(`🐍 Just scored ${score} points in SlitherMatch! Can you beat my score? 🎮`)
      } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(`🐍 Just scored ${score} points in SlitherMatch! Can you beat my score? 🎮`)
        alert('Score copied to clipboard!')
      }
    }
    // Reset game
    setGameStarted(false)
    setInBotLobby(false)
    setGameMode('home')
  }

  const goBackHome = () => {
    setGameStarted(false)
    setInBotLobby(false)
    setGameMode('home')
  }

  if (gameStarted) {
    return (
      <div className="game-page">
        <SnakeGame
          onGameOver={handleGameOver}
          isBot={gameMode === 'bot'}
          isPreview={false}
          isPaidLobby={gameMode === 'paid'}
        />
        <button onClick={goBackHome} className="back-button">
          ← Back to Menu
        </button>

        <style jsx>{`
          .game-page {
            position: relative;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
            min-height: 100vh;
          }

          .back-button {
            position: absolute;
            top: 20px;
            left: 20px;
            padding: 12px 24px;
            background: linear-gradient(135deg, rgba(138, 43, 226, 0.3), rgba(75, 0, 130, 0.3));
            border: 2px solid #8a2be2;
            border-radius: 8px;
            color: #ffffff;
            font-weight: bold;
            cursor: pointer;
            z-index: 100;
            transition: all 0.3s ease;
            box-shadow: 0 0 15px rgba(138, 43, 226, 0.4);
          }

          .back-button:hover {
            background: linear-gradient(135deg, rgba(138, 43, 226, 0.5), rgba(75, 0, 130, 0.5));
            box-shadow: 0 0 25px rgba(138, 43, 226, 0.6);
          }
        `}</style>
      </div>
    )
  }

  if (inBotLobby && !gameStarted) {
    return (
      <div className="lobby-container">
        <div className="neon-background">
          <div className="lobby-header">
            <h1 className="lobby-title">🤖 Bot Lobby</h1>
            <p className="lobby-subtitle">Play against AI snakes for practice</p>
          </div>

          <div className="game-preview">
            <SnakeGame
              onGameOver={() => {}}
              isBot={false}
              isPreview={true}
              isPaidLobby={false}
            />
          </div>

          <div className="lobby-controls">
            <button onClick={startBotGame} className="start-game-btn">
              🎮 Start Game
            </button>
            <button onClick={goBackHome} className="back-btn">
              ← Back to Menu
            </button>
          </div>
        </div>

        <style jsx>{`
          .lobby-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            position: relative;
            overflow: hidden;
          }

          .lobby-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: 
              linear-gradient(45deg, transparent 25%, rgba(138, 43, 226, 0.05) 25%, rgba(138, 43, 226, 0.05) 50%, transparent 50%),
              linear-gradient(-45deg, transparent 25%, rgba(138, 43, 226, 0.05) 25%, rgba(138, 43, 226, 0.05) 50%, transparent 50%);
            background-size: 60px 60px;
            animation: backgroundMove 20s linear infinite;
            pointer-events: none;
          }

          .neon-background {
            display: flex;
            flex-direction: column;
            align-items: center;
            z-index: 1;
            position: relative;
          }

          .lobby-header {
            text-align: center;
            margin-bottom: 30px;
          }

          .lobby-title {
            color: #00ff88;
            font-size: 2.5rem;
            font-weight: bold;
            text-shadow: 0 0 25px rgba(0, 255, 136, 0.8);
            margin-bottom: 10px;
            animation: pulse 2s ease-in-out infinite;
          }

          .lobby-subtitle {
            color: #00ffff;
            font-size: 1.2rem;
            text-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
          }

          .game-preview {
            margin-bottom: 30px;
          }

          .lobby-controls {
            display: flex;
            gap: 20px;
            flex-direction: column;
            align-items: center;
          }

          .start-game-btn {
            padding: 16px 32px;
            background: linear-gradient(135deg, #00ff88, #00cc66);
            border: 3px solid #00ff88;
            border-radius: 12px;
            color: #000000;
            font-size: 1.3rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 0 25px rgba(0, 255, 136, 0.5);
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .start-game-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 0 35px rgba(0, 255, 136, 0.8);
          }

          .back-btn {
            padding: 12px 24px;
            background: linear-gradient(135deg, rgba(138, 43, 226, 0.3), rgba(75, 0, 130, 0.3));
            border: 2px solid #8a2be2;
            border-radius: 8px;
            color: #ffffff;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 0 15px rgba(138, 43, 226, 0.4);
          }

          .back-btn:hover {
            background: linear-gradient(135deg, rgba(138, 43, 226, 0.5), rgba(75, 0, 130, 0.5));
            box-shadow: 0 0 25px rgba(138, 43, 226, 0.6);
          }

          @keyframes backgroundMove {
            0% { transform: translateX(0) translateY(0); }
            100% { transform: translateX(-60px) translateY(-60px); }
          }

          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }

          @media (max-width: 768px) {
            .lobby-title {
              font-size: 2rem;
            }

            .lobby-controls {
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="homepage">
      <div className="neon-background">
        <div className="header">
          <h1 className="title">🐍 SlitherMatch</h1>
          <p className="subtitle">Multiplayer Snake Battle on Base</p>
        </div>

        <div className="main-buttons">
          <button onClick={joinPaidLobby} className="paid-lobby-btn" disabled={isConnecting}>
            {isConnecting ? '🔗 Connecting...' : '💎 Join Paid Lobby'}
          </button>
          
          <button onClick={joinBotLobby} className="bot-lobby-btn">
            🤖 Play with Bots
          </button>
        </div>

        <div className="game-rules">
          <h3 className="rules-title">🎮 Game Rules</h3>
          <ul className="rules-list">
            <li>🍎 Eat food to grow and increase your score</li>
            <li>💀 Avoid hitting other snakes</li>
            <li>🧱 Don't crash into walls</li>
            <li>⏰ Survive 3 minutes to win</li>
            <li>🏆 Highest score wins!</li>
          </ul>
        </div>

        <div className="game-preview">
          <SnakeGame
            onGameOver={() => {}}
            isBot={false}
            isPreview={true}
            isPaidLobby={false}
          />
        </div>
      </div>

      <style jsx>{`
        .homepage {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }

        .homepage::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            linear-gradient(45deg, transparent 25%, rgba(138, 43, 226, 0.05) 25%, rgba(138, 43, 226, 0.05) 50%, transparent 50%),
            linear-gradient(-45deg, transparent 25%, rgba(138, 43, 226, 0.05) 25%, rgba(138, 43, 226, 0.05) 50%, transparent 50%);
          background-size: 60px 60px;
          animation: backgroundMove 20s linear infinite;
          pointer-events: none;
        }

        .neon-background {
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 1;
          position: relative;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
        }

        .title {
          color: #00ff88;
          font-size: 3.5rem;
          font-weight: bold;
          text-shadow: 0 0 30px rgba(0, 255, 136, 0.8);
          margin-bottom: 15px;
          animation: pulse 2s ease-in-out infinite;
        }

        .subtitle {
          color: #00ffff;
          font-size: 1.3rem;
          text-shadow: 0 0 15px rgba(0, 255, 255, 0.6);
        }

        .main-buttons {
          display: flex;
          gap: 20px;
          margin-bottom: 40px;
          flex-direction: column;
          align-items: center;
        }

        .paid-lobby-btn {
          padding: 20px 40px;
          background: linear-gradient(135deg, #ff6b35, #f7931e);
          border: 3px solid #ff6b35;
          border-radius: 15px;
          color: #000000;
          font-size: 1.4rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 0 30px rgba(255, 107, 53, 0.5);
          text-transform: uppercase;
          letter-spacing: 1px;
          min-width: 250px;
        }

        .paid-lobby-btn:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 0 40px rgba(255, 107, 53, 0.8);
        }

        .paid-lobby-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .bot-lobby-btn {
          padding: 16px 32px;
          background: linear-gradient(135deg, #00ff88, #00cc66);
          border: 3px solid #00ff88;
          border-radius: 12px;
          color: #000000;
          font-size: 1.2rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 0 25px rgba(0, 255, 136, 0.5);
          text-transform: uppercase;
          letter-spacing: 1px;
          min-width: 250px;
        }

        .bot-lobby-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 35px rgba(0, 255, 136, 0.8);
        }

        .game-rules {
          background: linear-gradient(135deg, rgba(138, 43, 226, 0.2), rgba(75, 0, 130, 0.2));
          border: 2px solid #8a2be2;
          border-radius: 15px;
          padding: 25px;
          margin-bottom: 40px;
          max-width: 500px;
          box-shadow: 0 0 25px rgba(138, 43, 226, 0.4);
        }

        .rules-title {
          color: #8a2be2;
          font-size: 1.5rem;
          font-weight: bold;
          text-align: center;
          margin-bottom: 20px;
          text-shadow: 0 0 15px rgba(138, 43, 226, 0.6);
        }

        .rules-list {
          list-style: none;
          padding: 0;
        }

        .rules-list li {
          color: #ffffff;
          font-size: 1.1rem;
          margin-bottom: 10px;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }

        .game-preview {
          margin-top: 20px;
        }

        @keyframes backgroundMove {
          0% { transform: translateX(0) translateY(0); }
          100% { transform: translateX(-60px) translateY(-60px); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @media (max-width: 768px) {
          .title {
            font-size: 2.5rem;
          }

          .subtitle {
            font-size: 1.1rem;
          }

          .main-buttons {
            flex-direction: column;
          }

          .paid-lobby-btn, .bot-lobby-btn {
            min-width: 200px;
            font-size: 1rem;
          }

          .game-rules {
            margin: 20px;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  )
}
