import { useEffect, useState } from 'react'
import { useAccount, useContractRead, useContractWrite, useWalletClient } from 'wagmi'
import { slitherMatchABI } from '../lib/slitherMatchABI'

const CONTRACT_ADDRESS_MAINNET = '0xdE5aC11A48f6bAaCd45b6907D4701979743Bf08c'
const CONTRACT_ADDRESS_SEPOLIA = '0x0ca8ea8190c62d5ac132a55d1968728f003220bf'

const CONTRACT_ADDRESS = CONTRACT_ADDRESS_MAINNET // use sepolia if needed

export default function Home() {
  const { address, isConnected } = useAccount()
  const [lobbyId, setLobbyId] = useState(1)
  const [players, setPlayers] = useState([])
  const [joinTime, setJoinTime] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [refundable, setRefundable] = useState(false)
  const [currentTime, setCurrentTime] = useState<number>(Date.now())

  const { data: playersInLobby, refetch: refetchPlayers } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: slitherMatchABI,
    functionName: 'getPlayers',
    args: [lobbyId],
    watch: true,
    onSuccess(data) {
      setPlayers(data as any[])
    }
  })

  const { write: joinLobby } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: slitherMatchABI,
    functionName: 'joinLobby',
    args: [lobbyId],
    value: BigInt(1000000000000000),
    onSuccess() {
      setJoinTime(Date.now())
    }
  })

  const { write: markRefundable } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: slitherMatchABI,
    functionName: 'markRefundable',
    args: [lobbyId]
  })

  const { write: refund } = useContractWrite({
    address: CONTRACT_ADDRESS,
    abi: slitherMatchABI,
    functionName: 'refund',
    args: [lobbyId]
  })

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
          // start game here or trigger backend if needed
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
    <div className="min-h-screen bg-[#F3E8FF] p-6 text-center">
      <h1 className="text-3xl font-bold mb-4">SlitherMatch</h1>
      <p className="mb-4">Lobby ID: {lobbyId}</p>
      <p className="mb-2">Players: {players.length} / 5</p>
      {players.map((p, i) => (
        <div key={i} className="text-sm">{p}</div>
      ))}

      {countdown !== null && (
        <div className="text-lg font-bold text-green-600 my-2">Game starts in: {countdown}s</div>
      )}

      <button
        className="mt-4 bg-purple-600 text-white px-4 py-2 rounded"
        onClick={() => joinLobby()}
      >
        Join Lobby
      </button>

      {refundable && (
        <>
          <div className="my-4 text-red-600">Lobby inactive for 5+ mins. You can refund.</div>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded"
            onClick={() => {
              markRefundable()
              refund()
            }}
          >
            Claim Refund
          </button>
        </>
      )}
    </div>
  )
}