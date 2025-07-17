import { useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { InjectedConnector } from 'wagmi/connectors/injected'

export default function BotLobby() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect({ connector: new InjectedConnector() })
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
    <main className="min-h-screen bg-[#f3e8ff] flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-4">Bot Lobby</h1>

      {!isConnected ? (
        <button onClick={() => connect()} className="px-4 py-2 bg-purple-600 text-white rounded">
          Connect Wallet
        </button>
      ) : (
        <>
          <p className="mb-2">Connected: {address}</p>
          <button onClick={() => disconnect()} className="px-4 py-2 bg-red-600 text-white rounded mb-4">
            Disconnect
          </button>

          {!matchStarted && !gameOver && (
            <button onClick={() => setMatchStarted(true)} className="px-4 py-2 bg-green-600 text-white rounded">
              Start Bot Match
            </button>
          )}

          {matchStarted && countdown > 0 && (
            <p className="text-lg mt-4">Match starts in {countdown}...</p>
          )}

          {matchStarted && countdown === 0 && !gameOver && (
            <p className="text-lg mt-4">Game Live — Score: {score}</p>
          )}

          {gameOver && (
            <>
              <p className="text-lg mt-4">Game Over! Your Score: {score}</p>
              <a
                href="https://warpcast.com/~/compose?text=I%20won%20a%20SlitherMatch%20Bot%20lobby%20match%20🎮%0Ahttps://slithermatch.vercel.app/bot"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
              >
                Share your win 🎉
              </a>
            </>
          )}
        </>
      )}
    </main>
  )
}
