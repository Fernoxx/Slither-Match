import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'

export default function BotLobby() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()

  const [matchStarted, setMatchStarted] = useState(false)
  const [countdown, setCountdown] = useState(3)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)

  useEffect(() => {
    if (matchStarted && countdown > 0) {
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
    if (matchStarted && countdown === 0) {
      // Start scoring simulation
      const scoring = setInterval(() => {
        setScore(s => s + Math.floor(Math.random() * 5))
      }, 1000)
      setTimeout(() => {
        clearInterval(scoring)
        setGameOver(true)
      }, 30000)
    }
  }, [matchStarted, countdown])

  return (
    <main className="game-container min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="lobby-title">🤖 Bot Lobby</h1>
          <p className="text-purple-700 text-lg">
            Practice against AI opponents
          </p>
        </div>

        {/* Main Game Board */}
        <div className="game-board p-8 text-center">
          {!isConnected ? (
            <div className="space-y-4">
              <div className="text-purple-800 font-semibold mb-4">
                Connect your wallet to start playing
              </div>
              <button 
                onClick={() => connect({ connector: injected() })} 
                className="game-button text-lg px-8 py-4"
              >
                🔗 Connect Wallet
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Connection Status */}
              <div className="player-info">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                      ✓
                    </div>
                    <span className="text-purple-800 font-medium">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </div>
                  <button 
                    onClick={() => disconnect()} 
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Disconnect
                  </button>
                </div>
              </div>

              {!matchStarted && !gameOver && (
                <div className="space-y-4">
                  <div className="text-purple-700 font-medium">
                    Ready to challenge the bots?
                  </div>
                  <button 
                    onClick={() => setMatchStarted(true)} 
                    className="game-button text-lg px-8 py-4"
                  >
                    🚀 Start Bot Match
                  </button>
                </div>
              )}

              {matchStarted && countdown > 0 && (
                <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-800 mb-2">
                    ⏰ Match starts in {countdown}...
                  </div>
                  <div className="text-yellow-700">
                    Get ready to slither!
                  </div>
                </div>
              )}

              {matchStarted && countdown === 0 && !gameOver && (
                <div className="space-y-4">
                  <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-2xl font-bold text-green-800 mb-2">
                      🎮 Game Live!
                    </div>
                    <div className="text-3xl font-bold text-purple-800">
                      Score: {score}
                    </div>
                  </div>
                  <div className="text-purple-700">
                    Collecting dots and avoiding collisions...
                  </div>
                </div>
              )}

              {gameOver && (
                <div className="space-y-6">
                  <div className="p-6 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="text-2xl font-bold text-purple-800 mb-2">
                      🏆 Game Over!
                    </div>
                    <div className="text-3xl font-bold text-purple-900">
                      Final Score: {score}
                    </div>
                  </div>
                  
                  <a
                    href="https://warpcast.com/~/compose?text=I%20won%20a%20SlitherMatch%20Bot%20lobby%20match%20🎮%0Ahttps://slithermatch.vercel.app/bot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="game-button text-lg px-8 py-4 inline-block"
                  >
                    🎉 Share your win
                  </a>
                  
                  <button 
                    onClick={() => {
                      setMatchStarted(false)
                      setCountdown(3)
                      setScore(0)
                      setGameOver(false)
                    }}
                    className="game-button text-lg px-8 py-4 ml-4"
                  >
                    🔄 Play Again
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bot Info */}
        <div className="game-rules mt-6">
          <h2 className="text-xl font-bold text-purple-800 mb-4 text-center">
            Bot Match Info
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rule-item">
              <span className="rule-emoji">🤖</span>
              <span>Play against AI opponents</span>
            </div>
            <div className="rule-item">
              <span className="rule-emoji">⚡</span>
              <span>Instant match start</span>
            </div>
            <div className="rule-item">
              <span className="rule-emoji">🆓</span>
              <span>Free to play</span>
            </div>
            <div className="rule-item">
              <span className="rule-emoji">🏋️</span>
              <span>Perfect for practice</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}