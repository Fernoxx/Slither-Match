import { useEffect, useState } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { slitherMatchABI } from '../lib/slitherMatchABI'

const CONTRACT_ADDRESS_MAINNET = '0xdE5aC11A48f6bAaCd45b6907D4701979743Bf08c'
// const CONTRACT_ADDRESS_SEPOLIA = '0x0ca8ea8190c62d5ac132a55d1968728f003220bf'
const CONTRACT_ADDRESS = CONTRACT_ADDRESS_MAINNET // use sepolia if needed

export default function Home() {
  const { address, isConnected } = useAccount()
  const [lobbyId, setLobbyId] = useState(1)
  const [players, setPlayers] = useState<any[]>([])
  const [joinTime, setJoinTime] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [refundable, setRefundable] = useState(false)
  const [currentTime, setCurrentTime] = useState<number>(Date.now())

  const { data: playersInLobby, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: slitherMatchABI,
    functionName: 'getPlayers',
    args: [lobbyId],
    query: {
      watch: true,
      onSuccess(data) {
        setPlayers(data as any[])
      }
    }
  })

  const { writeContract: joinLobby } = useWriteContract()
  const { writeContract: markRefundable } = useWriteContract()
  const { writeContract: refund } = useWriteContract()

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (players.length === 3 && joinTime !== null) {
      const countdownStart = setInterval(() => {
        const diff = 30000 - (Date.now() - joinTime)
        if (diff <= 0) {
          clearInterval(countdownStart)
          setCountdown(null)
        } else {
          setCountdown(Math.floor(diff / 1000))
        }
      }, 1000)
      return () => clearInterval(countdownStart)
    } else {
      setCountdown(null)
    }
  }, [players, joinTime])

  useEffect(() => {
    if (joinTime && Date.now() - joinTime >= 300000 && players.length < 3) {
      setRefundable(true)
    } else {
      setRefundable(false)
    }
  }, [currentTime, joinTime, players])

  return (
    <div className="game-container min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="lobby-title">SlitherMatch</h1>
          <p className="text-purple-700 text-lg font-semibold">
            Lobby ID: <span className="text-purple-900">{lobbyId}</span>
          </p>
        </div>

        {/* Main Game Board */}
        <div className="game-board p-8 mb-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center space-x-2 mb-4">
              <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
              <span className="text-xl font-bold text-purple-800">
                Players: {players.length} / 5
              </span>
              <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
            </div>
            
            {/* Players List */}
            <div className="space-y-2 mb-6">
              {players.map((player, index) => (
                <div key={index} className="player-info">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <span className="text-purple-800 font-medium truncate">
                        {player.slice(0, 6)}...{player.slice(-4)}
                      </span>
                    </div>
                    <div className="text-green-600 font-semibold">
                      ✓ Ready
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Empty slots */}
              {Array.from({ length: 5 - players.length }, (_, index) => (
                <div key={`empty-${index}`} className="player-info opacity-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-500 font-bold">
                      {players.length + index + 1}
                    </div>
                    <span className="text-gray-500 font-medium">
                      Waiting for player...
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Countdown */}
            {countdown !== null && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="countdown-text">
                  🎮 Game starts in: {countdown}s
                </div>
              </div>
            )}

            {/* Join Button */}
            <button
              className="game-button text-lg px-8 py-4 mb-4"
              onClick={() => {
                joinLobby({
                  address: CONTRACT_ADDRESS,
                  abi: slitherMatchABI,
                  functionName: 'joinLobby',
                  args: [lobbyId],
                  value: BigInt(1e15)
                })
                setJoinTime(Date.now())
              }}
            >
              🚀 Join Lobby
            </button>

            {/* Refund Section */}
            {refundable && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-red-700 font-semibold mb-3">
                  ⚠️ Lobby inactive for 5+ minutes. You can claim a refund.
                </div>
                <button
                  className="refund-button"
                  onClick={() => {
                    markRefundable({
                      address: CONTRACT_ADDRESS,
                      abi: slitherMatchABI,
                      functionName: 'markRefundable',
                      args: [lobbyId]
                    })
                    refund({
                      address: CONTRACT_ADDRESS,
                      abi: slitherMatchABI,
                      functionName: 'refund',
                      args: [lobbyId]
                    })
                  }}
                >
                  💰 Claim Refund
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Game Rules */}
        <div className="game-rules">
          <h2 className="text-xl font-bold text-purple-800 mb-4 text-center">
            Game Rules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rule-item">
              <span className="rule-emoji">🔴</span>
              <span>Red dots = 3 points</span>
            </div>
            <div className="rule-item">
              <span className="rule-emoji">🟢</span>
              <span>Green dots = 6 points</span>
            </div>
            <div className="rule-item">
              <span className="rule-emoji">🟣</span>
              <span>Purple dots = 12 points</span>
            </div>
            <div className="rule-item">
              <span className="rule-emoji">⏰</span>
              <span>Game lasts 3 minutes max</span>
            </div>
            <div className="rule-item">
              <span className="rule-emoji">🏆</span>
              <span>Winner: Last alive OR highest score</span>
            </div>
            <div className="rule-item">
              <span className="rule-emoji">💰</span>
              <span>Winner takes 100% of entry fees</span>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="text-center mt-6">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white/80 rounded-full border border-purple-200">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium text-purple-800">
              {isConnected ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Not Connected'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
