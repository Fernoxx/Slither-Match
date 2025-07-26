import { useState, useCallback, useEffect } from 'react'
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
  const [currentView, setCurrentView] = useState<'home' | 'bot-lobby' | 'paid-lobby' | 'casual-lobby' | 'casual-waiting'>('home')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [players, setPlayers] = useState<string[]>([])
  const [countdown, setCountdown] = useState<number | null>(null)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameScore, setGameScore] = useState(0)
  const [gameEnded, setGameEnded] = useState(false)
  const [isPaidLobby, setIsPaidLobby] = useState(false)
  const [isWinner, setIsWinner] = useState(false)
  const [gameStartTime, setGameStartTime] = useState<number | null>(null)
  
  // Casual lobby specific states
  const [casualLobbyId, setCasualLobbyId] = useState<string | null>(null)
  const [isSearchingPlayers, setIsSearchingPlayers] = useState(false)
  const [casualPlayers, setCasualPlayers] = useState<Array<{id: string, username: string, pfp?: string}>>([])
  const [casualCountdown, setCasualCountdown] = useState<number | null>(null)
  const [isCasualLobby, setIsCasualLobby] = useState(false)

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

  // Join bot lobby
  const joinBotLobby = useCallback(() => {
    setCurrentView('bot-lobby')
    setIsPaidLobby(false)
    setPlayers([])
    setGameStartTime(Date.now()) // Track start time
    setGameStarted(true) // Start immediately
  }, [])

  // Join paid lobby
  const joinPaidLobby = useCallback(async () => {
    await connectWallet()
    if (walletAddress || currentView === 'paid-lobby') {
      setCurrentView('paid-lobby')
      setIsPaidLobby(true)
      setPlayers(['You'])
      // Simulate more players joining
      setTimeout(() => setPlayers(['You', 'Player Alpha']), 2000)
      setTimeout(() => setPlayers(['You', 'Player Alpha', 'Player Beta']), 4000)
      
      // Start game when 3+ players
      setTimeout(() => setCountdown(3), 6000)
      setTimeout(() => setCountdown(2), 7000)
      setTimeout(() => setCountdown(1), 8000)
      setTimeout(() => {
        setCountdown(null)
        setGameStarted(true)
      }, 9000)
    }
  }, [connectWallet, walletAddress, currentView])

  // Join casual lobby
  const joinCasualLobby = useCallback(() => {
    setCurrentView('casual-waiting')
    setIsCasualLobby(true)
    setIsSearchingPlayers(true)
    
    // Generate a unique lobby ID
    const lobbyId = Math.random().toString(36).substring(2, 15)
    setCasualLobbyId(lobbyId)
    
    // Get user info from Farcaster if available
    const currentUser = {
      id: 'user-' + Math.random().toString(36).substring(2, 9),
      username: 'You',
      pfp: undefined
    }
    setCasualPlayers([currentUser])
    
    // Check URL params to see if joining existing lobby
    const urlParams = new URLSearchParams(window.location.search)
    const joinLobbyId = urlParams.get('lobby')
    
    if (joinLobbyId) {
      // Joining existing lobby
      setCasualLobbyId(joinLobbyId)
      // Simulate joining existing lobby
      setTimeout(() => {
        setCasualPlayers(prev => [...prev, 
          { id: 'player-2', username: 'Player Alpha', pfp: undefined }
        ])
      }, 1000)
    }
    
    // Simulate players joining
    if (!joinLobbyId) {
      setTimeout(() => {
        setCasualPlayers(prev => [...prev, 
          { id: 'player-2', username: 'Player Beta', pfp: undefined }
        ])
      }, 3000)
      
      setTimeout(() => {
        setCasualPlayers(prev => [...prev, 
          { id: 'player-3', username: 'Player Gamma', pfp: undefined }
        ])
        // Start countdown when 3 players
        setCasualCountdown(30)
      }, 6000)
    }
  }, [])

  // Share casual lobby link
  const shareCasualLobby = useCallback(() => {
    if (!casualLobbyId) return
    
    const shareUrl = `${window.location.origin}?lobby=${casualLobbyId}`
    const currentUser = casualPlayers[0] || { username: 'Player' }
    const previewUrl = `${window.location.origin}/api/preview?username=${encodeURIComponent(currentUser.username)}&mode=casual`
    const castText = `Join me for a SlitherMatch!\n\nFree casual lobby - ${casualPlayers.length}/5 players\n\nPlay now: ${shareUrl}`
    
    // Create preview data for the share
    const previewData = {
      type: 'share_cast',
      text: castText,
      preview: {
        title: 'SlitherMatch',
        description: 'Join me for a slither match',
        image: previewUrl,
        players: casualPlayers,
        mode: 'casual'
      }
    }
    
    try {
      if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
        window.parent.postMessage(previewData, '*')
      } else {
        // Fallback to copy to clipboard
        navigator.clipboard.writeText(castText)
        alert('Lobby link copied to clipboard! Share it to invite players!')
      }
    } catch (error) {
      navigator.clipboard.writeText(castText)
      alert('Lobby link copied to clipboard! Share it to invite players!')
    }
  }, [casualLobbyId, casualPlayers])

  // Handle casual countdown
  useEffect(() => {
    if (casualCountdown !== null && casualCountdown > 0) {
      const timer = setTimeout(() => {
        setCasualCountdown(casualCountdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (casualCountdown === 0) {
      setCurrentView('casual-lobby')
      setGameStarted(true)
      setIsSearchingPlayers(false)
      setGameStartTime(Date.now())
    }
  }, [casualCountdown])

  // Check URL params on load
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const lobbyId = urlParams.get('lobby')
    
    if (lobbyId) {
      // Auto-join casual lobby if URL has lobby parameter
      joinCasualLobby()
    }
  }, [joinCasualLobby])

  // Handle game end
  const handleGameEnd = useCallback((score: number, winner: boolean = false) => {
    setGameScore(score)
    setIsWinner(winner)
    setGameEnded(true)
    setGameStarted(false)
  }, [])

  // Share win to Farcaster
  const shareWin = useCallback(() => {
    const gameTime = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : 0
    const castText = `I won the SlitherMatch bot lobby in ${gameTime} seconds!\n\nPlay now: ${window.location.origin}`
    
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
  }, [gameStartTime])

  // Reset to home
  const resetToHome = useCallback(() => {
    setCurrentView('home')
    setGameStarted(false)
    setGameEnded(false)
    setCountdown(null)
    setPlayers([])
    setGameScore(0)
    setIsWinner(false)
    setGameStartTime(null)
    // Reset casual lobby states
    setCasualLobbyId(null)
    setIsSearchingPlayers(false)
    setCasualPlayers([])
    setCasualCountdown(null)
    setIsCasualLobby(false)
  }, [])

  return (
    <div className="min-h-screen bg-[#06010a] text-white font-mono flex flex-col items-center justify-center p-5 relative">
      {/* Background Game Animation - Only on Homepage */}
      {currentView === 'home' && (
        <div className="absolute inset-0 opacity-20 pointer-events-none">
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
      )}
      
      {/* Header - always visible */}
      <div className="text-center mb-8 z-10">
        <h1 className="text-5xl font-bold mb-4 text-transparent bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text">
          SlitherMatch
        </h1>
        <p className="text-xl text-gray-300">
          Eat. Grow. Win.
        </p>
      </div>

      {currentView === 'home' && (
        <div className="flex flex-col items-center z-10">
          {/* Main Buttons - Vertical Layout */}
          <div className="flex flex-col gap-4 mb-8 w-64">
            <button
              onClick={joinPaidLobby}
              disabled={isConnecting}
              className="bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 
                         text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 
                         transform hover:scale-105 hover:shadow-xl disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Paid Lobby ($1 USDC)'}
            </button>
            <button
              onClick={joinCasualLobby}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 
                         text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 
                         transform hover:scale-105 hover:shadow-xl"
            >
              Casual Lobby
            </button>
            <button
              onClick={joinBotLobby}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 
                         text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 
                         transform hover:scale-105 hover:shadow-xl"
            >
              Bot Lobby
            </button>
          </div>

          {/* Game Rules */}
          <div className="bg-[#1a1a2e] border border-[#2d2d5e] rounded-lg p-6 mb-8 max-w-md">
            <h3 className="text-xl font-bold mb-4 text-purple-400 flex items-center">
              Game Rules
            </h3>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-start">
                <span className="text-yellow-400 mr-2">•</span>
                Paid Lobby: $1 USDC entry fee
              </div>
              <div className="flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                Casual Lobby: Free (3-5 players)
              </div>
              <div className="flex items-start">
                <span className="text-green-400 mr-2">•</span>
                Winner takes all
              </div>
            </div>
          </div>
        </div>
      )}

                           {currentView === 'paid-lobby' && !gameStarted && !gameEnded && (
         <div className="text-center z-10">
           <div className="bg-[#1a1a2e] border border-[#2d2d5e] rounded-lg p-8 mb-6 min-w-[400px]">
             <h2 className="text-2xl font-bold mb-6 text-cyan-400">
               Paid Lobby
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

      {/* Casual Waiting Room */}
      {currentView === 'casual-waiting' && !gameStarted && !gameEnded && (
        <div className="text-center z-10">
          <div className="bg-[#1a1a2e] border border-[#2d2d5e] rounded-lg p-8 mb-6 min-w-[400px]">
            <h2 className="text-2xl font-bold mb-6 text-cyan-400">
              Casual Match
            </h2>
            
            <div className="text-sm text-gray-400 mb-4">
              5 min
            </div>

            {/* Loading spinner */}
            <div className="mb-6">
              <div className="relative w-24 h-24 mx-auto">
                <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl">•</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-bold mb-2">Finding opponent...</h3>
              <p className="text-gray-400">Searching for players...</p>
            </div>

            {/* Player count and stats */}
            <div className="flex justify-around mb-6 text-sm">
              <div>
                <div className="text-blue-500 text-2xl font-bold">{casualPlayers.length}</div>
                <div className="text-gray-400">Players in queue</div>
              </div>
              <div>
                <div className="text-blue-500 text-2xl font-bold">
                  {casualCountdown !== null ? `0:${casualCountdown.toString().padStart(2, '0')}` : '1:01'}
                </div>
                <div className="text-gray-400">Time in queue</div>
              </div>
              <div>
                <div className="text-blue-500 text-2xl font-bold">FREE</div>
                <div className="text-gray-400">Entry fee</div>
              </div>
            </div>

            {/* Players list */}
            {casualPlayers.length > 1 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2 text-purple-400">Players joined:</h3>
                <div className="space-y-1">
                  {casualPlayers.map((player, index) => (
                    <div key={player.id} className="text-sm text-gray-300">
                      {player.username}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Countdown message */}
            {casualCountdown !== null && casualCountdown <= 30 && (
              <div className="mb-4 text-yellow-400">
                Game starting in {casualCountdown} seconds...
                {casualCountdown > 10 && <div className="text-sm text-gray-400 mt-1">More players can still join!</div>}
              </div>
            )}

            {/* Share button */}
            <button
              onClick={shareCasualLobby}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 
                         text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-300 
                         transform hover:scale-105 hover:shadow-xl mb-4 flex items-center justify-center gap-2"
            >
              Share
            </button>

            {/* Cancel button */}
            <button
              onClick={resetToHome}
              className="w-full bg-transparent border border-red-500 text-red-500 hover:bg-red-500/10
                         font-bold py-3 px-6 rounded-lg transition-all duration-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {gameStarted && !gameEnded && (
        <div className="z-10">
          <SnakeGame 
            isPlaying={true}
            isBot={false}
            isPreview={false}
            isPaidLobby={isPaidLobby}
            isCasualLobby={isCasualLobby}
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
               {isWinner ? "You Won!" : "Game Over!"}
             </h2>
             <div className="text-2xl font-bold text-cyan-400 mb-4">
               Final Score: {gameScore}
             </div>
             <div className="text-lg text-gray-300 mb-6">
               {isPaidLobby 
                 ? (isWinner ? "Congratulations! You won the prize pool!" : "Better luck next time!") 
                 : (isCasualLobby 
                   ? (isWinner ? "You won the casual match!" : "Good game! Try again?")
                   : (isWinner ? "You defeated all the bots!" : "Thanks for playing with the bots!")
                 )
               }
             </div>
             
             {/* Share button for winners */}
             {isWinner && (
               <button
                 onClick={shareWin}
                 className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg 
                            transition-all duration-300 transform hover:scale-105 mb-4"
               >
                 Share Win
               </button>
             )}
           </div>

           <div className="flex gap-4 justify-center">
             <button
               onClick={resetToHome}
               className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg 
                          transition-all duration-300 transform hover:scale-105"
             >
               Back to Home
             </button>
             <button
               onClick={() => {
                 setGameEnded(false)
                 if (currentView === 'bot-lobby') {
                   joinBotLobby()
                 } else if (currentView === 'casual-lobby') {
                   joinCasualLobby()
                 } else {
                   joinPaidLobby()
                 }
               }}
               className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg 
                          transition-all duration-300 transform hover:scale-105"
             >
               Play Again
             </button>
           </div>
         </div>
       )}
    </div>
  )
}
