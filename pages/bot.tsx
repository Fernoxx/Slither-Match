import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import SnakeGame from '../components/SnakeGame'

export default function BotLobby() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [score, setScore] = useState(0)
  const [gameEnded, setGameEnded] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore)
    setGameEnded(true)
  }

  const startNewGame = () => {
    setGameStarted(true)
    setGameEnded(false)
    setScore(0)
  }

  const goHome = () => {
    window.location.href = '/'
  }

  if (gameStarted && !gameEnded) {
    return (
      <div className="game-page">
        <SnakeGame
          onGameOver={handleGameOver}
          isBot={false}
          isPreview={false}
          isPaidLobby={false}
        />
        <button onClick={goHome} className="back-button">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-6">🤖 Bot Lobby</h1>
          
          {gameEnded ? (
            <div className="space-y-4">
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <h2 className="text-xl font-bold text-green-400 mb-2">Game Over!</h2>
                <p className="text-white">Final Score: <span className="text-yellow-400 font-bold">{score}</span></p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={startNewGame}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  🎮 Play Again
                </button>
                
                <button
                  onClick={goHome}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  🏠 Back to Home
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-300 text-lg">Practice your snake skills against AI opponents!</p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={startNewGame}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  🚀 Start Game
                </button>
                
                <button
                  onClick={goHome}
                  className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  ← Back to Home
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}