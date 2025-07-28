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
      alert('Please install Farcaster app or Coinbase Wallet to join paid lobby')
    } finally {
      setIsConnecting(false)
    }
  }, [currentView])

  // Share win to Farcaster
  const shareWin = useCallback(() => {
    const gameTime = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0
    const castText = `🐍 I won the SlitherMatch bot lobby in ${gameTime} seconds! 🏆\n\nPlay now: ${window.location.origin}`
    
        // Fallback to copy to clipboard
        navigator.clipboard.writeText(castText)
        alert('Win message copied to clipboard! Share it on Farcaster!')
      }
    } catch (error) {
      // Fallback to copy to clipboard
      navigator.clipboard.writeText(castText)
      alert('Win message copied to clipboard! Share it on Farcaster!')
    }
  }, [gameStartTime])

  return (
    <div className="min-h-screen bg-[#06010a] text-white font-mono flex flex-col items-center justify-center p-5 relative">
      {/* Header - always visible */}
      <div className="text-center mb-8 z-10">
        <h1 className="text-5xl font-bold mb-4 text-transparent bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text">
          🐍 SlitherMatch
        </h1>
        <p className="text-xl text-gray-300">
          Eat. Grow. Win. 🏆
        </p>
      </div>

      {currentView === 'home' && (
        <div className="flex flex-col items-center z-10">
          {/* Main Buttons */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={joinPaidLobby}
              disabled={isConnecting}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 
                         text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 
                         transform hover:scale-105 hover:shadow-xl disabled:opacity-50"
            >
              {isConnecting ? '⏳ Connecting...' : '💰 Join Paid Lobby ($1 USDC)'}
            </button>
            <button
              onClick={joinBotLobby}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 
                         text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 
                         transform hover:scale-105 hover:shadow-xl"
            >
              🤖 Play with Bots
            </button>
          </div>

          {/* Game Rules */}
          <div className="bg-[#1a1a2e] border border-[#2d2d5e] rounded-lg p-6 mb-8 max-w-md">
            <h3 className="text-xl font-bold mb-4 text-purple-400 flex items-center">
              🎮 Game Rules
            </h3>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-center">
                <span className="text-yellow-400 mr-2">💰</span>
                $1 USDC entry fee
              </div>
              <div className="flex items-center">
                <span className="text-green-400 mr-2">🏆</span>
                Winner takes all
              </div>
            </div>
          </div>

                     {/* Preview Game Box - 444x444px */}
           <div className="bg-[#0a0c1a] rounded-lg overflow-hidden" style={{ width: '444px', height: '444px' }}>
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
        </div>
      )}

                           {currentView === 'paid-lobby' && !gameStarted && !gameEnded && (
         <div className="text-center z-10">
           <div className="bg-[#1a1a2e] border border-[#2d2d5e] rounded-lg p-8 mb-6 min-w-[400px]">
             <h2 className="text-2xl font-bold mb-6 text-cyan-400">
               💰 Paid Lobby
             </h2>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-purple-400">Players ({players.length}/5):</h3>
              <div className="space-y-2">
                {players.map((player, index) => (
                  <div 
                    key={index} 
                    className={`p-2 rounded ${index === 0 ? 'bg-green-900 text-green-300' : 'bg-gray-800 text-gray-300'}`}
                  >
                    {player} {index === 0 && '(You)'}
                  </div>
                ))}
              </div>
            </div>

            {countdown !== null ? (
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-400 mb-2">
                  {countdown}
                </div>
                <div className="text-lg text-yellow-300">
                  Game starting...
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="text-lg text-yellow-400 font-semibold">
                  Waiting for players...
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  {currentView === 'paid-lobby' ? 'Need 3+ players to start' : 'Starting soon...'}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={resetToHome}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg 
                       transition-all duration-300"
          >
            ← Back to Home
          </button>
        </div>
      )}

      {gameStarted && !gameEnded && (
        <div className="z-10">
          <SnakeGame 
            isPlaying={true}
            isBot={false}
            isPreview={false}
            isPaidLobby={isPaidLobby}
            onScoreChange={(score) => setGameScore(score)}
            onGameOver={(score) => {
              handleGameEnd(score, false)
            }}
            onGameWin={(score, isWinner) => {
              handleGameEnd(score, isWinner || false)
            }}
          />
        </div>
      )}

             {gameEnded && (
         <div className="text-center z-10">
           <div className="bg-[#1a1a2e] border border-[#2d2d5e] rounded-lg p-8 mb-6">
             <h2 className="text-3xl font-bold mb-4 text-green-400">
               {isWinner ? "🎉 You Won!" : "🎮 Game Over!"}
             </h2>
             <div className="text-2xl font-bold text-cyan-400 mb-4">
               Final Score: {gameScore}
             </div>
             <div className="text-lg text-gray-300 mb-6">
               {isPaidLobby 
                 ? (isWinner ? "🏆 Congratulations! You won the prize pool!" : "Better luck next time!") 
                 : (isWinner ? "🏆 You defeated all the bots!" : "Thanks for playing with the bots!")
               }
             </div>
             
             {/* Share button for winners */}
             {isWinner && (
               <button
                 onClick={shareWin}
                 className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg 
                            transition-all duration-300 transform hover:scale-105 mb-4"
               >
                 📤 Share Win
               </button>
             )}
           </div>

           <div className="flex gap-4 justify-center">
             <button
               onClick={resetToHome}
               className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg 
                          transition-all duration-300 transform hover:scale-105"
             >
               🏠 Back to Home
             </button>
             <button
               onClick={() => {
                 setGameEnded(false)
                 if (currentView === 'bot-lobby') {
                   joinBotLobby()
                 } else {
                   joinPaidLobby()
                 }
               }}
               className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg 
                          transition-all duration-300 transform hover:scale-105"
             >
               🔄 Play Again
             </button>
           </div>
         </div>
       )}
    </div>
  )
}
