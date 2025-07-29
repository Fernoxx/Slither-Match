import React, { useRef, useEffect, useState, useCallback } from 'react'
import gameSocket, { GameType } from '../lib/gameSocket'

interface MultiplayerSnakeGameProps {
  gameType: GameType
  playerInfo: {
    address: string
    username: string
    profilePic?: string
  }
  onGameEnd?: (data: any) => void
  onPlayerDied?: (score: number, canRespawn: boolean) => void
}

// Game constants
const VIEWPORT_SIZE = 444

interface Position {
  x: number
  y: number
}

interface Snake {
  id: string
  segments: Position[]
  angle: number
  score: number
  radius: number
  color: string
  isDead: boolean
  killCount: number
}

interface Player {
  id: string
  username: string
  snake: Snake
}

interface Food {
  id: string
  position: Position
  color: string
  radius: number
}

interface JoystickState {
  isDragging: boolean
  knobPosition: Position
  targetAngle: number | null
}

const MultiplayerSnakeGame: React.FC<MultiplayerSnakeGameProps> = ({
  gameType,
  playerInfo,
  onGameEnd,
  onPlayerDied
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const miniMapRef = useRef<HTMLCanvasElement>(null)
  const joystickContainerRef = useRef<HTMLDivElement>(null)
  
  // Game state
  const [players, setPlayers] = useState<Player[]>([])
  const [food, setFood] = useState<Food[]>([])
  const [camera, setCamera] = useState<Position>({ x: 0, y: 0 })
  const [worldSize, setWorldSize] = useState(2000)
  const [gameState, setGameState] = useState<'waiting' | 'countdown' | 'playing' | 'ended'>('waiting')
  const [leaderboard, setLeaderboard] = useState<Array<{id: string; username: string; score: number}>>([])
  const [countdown, setCountdown] = useState<number | null>(null)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [myScore, setMyScore] = useState(0)
  const [isDead, setIsDead] = useState(false)
  const [canRespawn, setCanRespawn] = useState(false)
  
  // Joystick state
  const joystickRef = useRef<JoystickState>({
    isDragging: false,
    knobPosition: { x: 0, y: 0 },
    targetAngle: null
  })
  const [joystick, setJoystick] = useState<JoystickState>({
    isDragging: false,
    knobPosition: { x: 0, y: 0 },
    targetAngle: null
  })

  // Connect to game server and join game
  useEffect(() => {
    gameSocket.connect()
    
    // Set up event listeners
    gameSocket.setOnGameJoined((data) => {
      console.log('Joined game:', data)
      setMyPlayerId(data.playerId)
      setPlayers(data.gameState.players)
      setFood(data.gameState.food)
      setWorldSize(data.gameState.worldSize)
      setGameState(data.gameState.state)
      setLeaderboard(data.gameState.leaderboard || [])
    })

    gameSocket.setOnGameState((data) => {
      setPlayers(data.players)
      // Update my score
      const myPlayer = data.players.find((p: Player) => p.id === myPlayerId)
      if (myPlayer) {
        setMyScore(myPlayer.snake.score)
        setIsDead(myPlayer.snake.isDead)
      }
    })

    gameSocket.setOnPlayerJoined((data) => {
      setPlayers(prev => [...prev, data])
    })

    gameSocket.setOnPlayerLeft((data) => {
      setPlayers(prev => prev.filter(p => p.id !== data.playerId))
    })

    gameSocket.setOnPlayerDied((data) => {
      if (data.playerId === myPlayerId) {
        setIsDead(true)
        setCanRespawn(data.canRespawn)
        onPlayerDied?.(myScore, data.canRespawn)
      }
      
      // Update food if dropped
      if (data.droppedFood) {
        setFood(prev => [...prev, ...data.droppedFood])
      }
    })

    gameSocket.setOnPlayerRespawned((data) => {
      setPlayers(prev => prev.map(p => 
        p.id === data.playerId 
          ? { ...p, snake: data.snake }
          : p
      ))
      
      if (data.playerId === myPlayerId) {
        setIsDead(false)
        setMyScore(0)
      }
    })

    gameSocket.setOnFoodEaten((data) => {
      // Remove eaten food and add new food
      setFood(prev => {
        const filtered = prev.filter(f => f.id !== data.foodId)
        return [...filtered, data.newFood]
      })
      
      if (data.playerId === myPlayerId) {
        setMyScore(data.score)
      }
    })

    gameSocket.setOnLeaderboardUpdate((data) => {
      setLeaderboard(data.leaderboard)
    })

    gameSocket.setOnCountdownStarted((data) => {
      setGameState('countdown')
      let timeLeft = data.duration
      setCountdown(timeLeft)
      
      const countdownInterval = setInterval(() => {
        timeLeft--
        setCountdown(timeLeft)
        if (timeLeft <= 0) {
          clearInterval(countdownInterval)
          setCountdown(null)
        }
      }, 1000)
    })

    gameSocket.setOnGameStarted((data) => {
      setGameState('playing')
      setCountdown(null)
    })

    gameSocket.setOnGameEnded((data) => {
      setGameState('ended')
      onGameEnd?.(data)
    })

    gameSocket.setOnGameUnavailable((data) => {
      alert(data.message)
    })

    gameSocket.setOnError((data) => {
      console.error('Game error:', data)
      alert(data.message)
    })

    // Join the game
    try {
      gameSocket.findGame(gameType, playerInfo)
    } catch (error) {
      console.error('Failed to join game:', error)
    }

    return () => {
      gameSocket.disconnect()
    }
  }, [gameType, playerInfo, myPlayerId, myScore, onGameEnd, onPlayerDied])

  // Send movement to server
  useEffect(() => {
    if (joystickRef.current.targetAngle !== null && !isDead) {
      gameSocket.move(joystickRef.current.targetAngle)
    }
  }, [joystick.targetAngle, isDead])

  // Camera follow player
  useEffect(() => {
    const myPlayer = players.find(p => p.id === myPlayerId)
    if (myPlayer && myPlayer.snake.segments.length > 0 && !myPlayer.snake.isDead) {
      const head = myPlayer.snake.segments[0]
      const newCameraX = Math.max(0, Math.min(worldSize - VIEWPORT_SIZE, head.x - VIEWPORT_SIZE / 2))
      const newCameraY = Math.max(0, Math.min(worldSize - VIEWPORT_SIZE, head.y - VIEWPORT_SIZE / 2))
      setCamera({ x: newCameraX, y: newCameraY })
    }
  }, [players, myPlayerId, worldSize])

  // Respawn function
  const handleRespawn = useCallback(() => {
    if (canRespawn) {
      gameSocket.respawn(playerInfo.username)
    }
  }, [canRespawn, playerInfo.username])

  // Joystick handlers
  const handleJoystickStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    joystickRef.current.isDragging = true
    setJoystick(prev => ({ ...prev, isDragging: true }))
  }, [])

  const updateJoystickPosition = useCallback((clientX: number, clientY: number) => {
    if (!joystickContainerRef.current) return
    
    const rect = joystickContainerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const deltaX = clientX - centerX
    const deltaY = clientY - centerY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const maxDistance = 35 // Half of joystick size minus knob
    
    let knobX = deltaX
    let knobY = deltaY
    
    if (distance > maxDistance) {
      knobX = (deltaX / distance) * maxDistance
      knobY = (deltaY / distance) * maxDistance
    }

    const targetAngle = distance > 5 ? Math.atan2(deltaY, deltaX) : null
    
    joystickRef.current.knobPosition = { x: knobX, y: knobY }
    joystickRef.current.targetAngle = targetAngle
    
    setJoystick(prev => ({
      ...prev,
      knobPosition: { x: knobX, y: knobY },
      targetAngle
    }))
  }, [])

  const handleJoystickMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!joystickRef.current.isDragging) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
    updateJoystickPosition(clientX, clientY)
  }, [updateJoystickPosition])

  const handleJoystickEnd = useCallback(() => {
    joystickRef.current.isDragging = false
    joystickRef.current.knobPosition = { x: 0, y: 0 }
    joystickRef.current.targetAngle = null
    
    setJoystick(prev => ({
      ...prev,
      isDragging: false,
      knobPosition: { x: 0, y: 0 },
      targetAngle: null
    }))
  }, [])

  // Global event listeners for smooth joystick control
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent | TouchEvent) => {
      if (!joystickRef.current.isDragging) return
      
      e.preventDefault()
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      
      updateJoystickPosition(clientX, clientY)
    }

    const handleGlobalEnd = () => {
      if (joystickRef.current.isDragging) {
        handleJoystickEnd()
      }
    }

    document.addEventListener('mousemove', handleGlobalMove, { passive: false })
    document.addEventListener('mouseup', handleGlobalEnd, { passive: false })
    document.addEventListener('touchmove', handleGlobalMove, { passive: false })
    document.addEventListener('touchend', handleGlobalEnd, { passive: false })
    document.addEventListener('touchcancel', handleGlobalEnd, { passive: false })

    return () => {
      document.removeEventListener('mousemove', handleGlobalMove)
      document.removeEventListener('mouseup', handleGlobalEnd)
      document.removeEventListener('touchmove', handleGlobalMove)
      document.removeEventListener('touchend', handleGlobalEnd)
      document.removeEventListener('touchcancel', handleGlobalEnd)
    }
  }, [updateJoystickPosition, handleJoystickEnd])

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#0a0c1a'
    ctx.fillRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE)

    // Draw world boundaries
    ctx.strokeStyle = '#8b5cf6'
    ctx.lineWidth = 3
    
    const worldLeft = -camera.x
    const worldTop = -camera.y
    const worldRight = worldSize - camera.x
    const worldBottom = worldSize - camera.y
    
    // Draw walls if visible
    if (worldLeft >= -10 && worldLeft <= VIEWPORT_SIZE + 10) {
      ctx.beginPath()
      ctx.moveTo(worldLeft, Math.max(0, worldTop))
      ctx.lineTo(worldLeft, Math.min(VIEWPORT_SIZE, worldBottom))
      ctx.stroke()
    }
    if (worldRight >= -10 && worldRight <= VIEWPORT_SIZE + 10) {
      ctx.beginPath()
      ctx.moveTo(worldRight, Math.max(0, worldTop))
      ctx.lineTo(worldRight, Math.min(VIEWPORT_SIZE, worldBottom))
      ctx.stroke()
    }
    if (worldTop >= -10 && worldTop <= VIEWPORT_SIZE + 10) {
      ctx.beginPath()
      ctx.moveTo(Math.max(0, worldLeft), worldTop)
      ctx.lineTo(Math.min(VIEWPORT_SIZE, worldRight), worldTop)
      ctx.stroke()
    }
    if (worldBottom >= -10 && worldBottom <= VIEWPORT_SIZE + 10) {
      ctx.beginPath()
      ctx.moveTo(Math.max(0, worldLeft), worldBottom)
      ctx.lineTo(Math.min(VIEWPORT_SIZE, worldRight), worldBottom)
      ctx.stroke()
    }

    // Draw food
    food.forEach(f => {
      const screenX = f.position.x - camera.x
      const screenY = f.position.y - camera.y
      
      if (screenX >= -f.radius && screenX <= VIEWPORT_SIZE + f.radius && 
          screenY >= -f.radius && screenY <= VIEWPORT_SIZE + f.radius) {
        ctx.fillStyle = f.color
        ctx.beginPath()
        ctx.arc(screenX, screenY, f.radius, 0, 2 * Math.PI)
        ctx.fill()
      }
    })

    // Draw snakes
    players.forEach(player => {
      const snake = player.snake
      if (snake.isDead && gameType !== 'freeplay') return // Don't render dead snakes except in freeplay
      
      snake.segments.forEach((segment, index) => {
        const screenX = segment.x - camera.x
        const screenY = segment.y - camera.y
        
        if (screenX >= -snake.radius - 20 && screenX <= VIEWPORT_SIZE + snake.radius + 20 && 
            screenY >= -snake.radius - 20 && screenY <= VIEWPORT_SIZE + snake.radius + 20) {
          
          const radius = index === 0 ? snake.radius + 1 : snake.radius
          
          // Highlight my snake
          if (player.id === myPlayerId) {
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.arc(screenX, screenY, radius + 2, 0, 2 * Math.PI)
            ctx.stroke()
          }
          
          // Draw snake segment
          ctx.fillStyle = snake.isDead ? '#666666' : snake.color
          ctx.beginPath()
          ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI)
          ctx.fill()
          
          // Draw eyes on head
          if (index === 0 && !snake.isDead) {
            const eyeSize = snake.radius * 0.3
            const eyeOffsetX = snake.radius * 0.4
            
            const leftEyeX = screenX + Math.cos(snake.angle + 0.5) * eyeOffsetX
            const leftEyeY = screenY + Math.sin(snake.angle + 0.5) * eyeOffsetX
            const rightEyeX = screenX + Math.cos(snake.angle - 0.5) * eyeOffsetX
            const rightEyeY = screenY + Math.sin(snake.angle - 0.5) * eyeOffsetX
            
            // Eye whites
            ctx.fillStyle = '#ffffff'
            ctx.beginPath()
            ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, 2 * Math.PI)
            ctx.fill()
            ctx.beginPath()
            ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, 2 * Math.PI)
            ctx.fill()
            
            // Pupils
            ctx.fillStyle = '#000000'
            ctx.beginPath()
            ctx.arc(leftEyeX, leftEyeY, eyeSize * 0.6, 0, 2 * Math.PI)
            ctx.fill()
            ctx.beginPath()
            ctx.arc(rightEyeX, rightEyeY, eyeSize * 0.6, 0, 2 * Math.PI)
            ctx.fill()
          }
        }
      })
    })

    // Draw death overlay for my player
    if (isDead && canRespawn) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE)
      
      ctx.fillStyle = 'white'
      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('You Died!', VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2 - 20)
      ctx.font = '16px Arial'
      ctx.fillText('Click Respawn to continue', VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2 + 20)
    }
  }, [players, food, camera, worldSize, myPlayerId, isDead, canRespawn, gameType])

  // Mini-map rendering
  useEffect(() => {
    const canvas = miniMapRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const mapSize = 100
    const scale = mapSize / worldSize

    // Clear mini-map
    ctx.fillStyle = '#0a0c1a'
    ctx.fillRect(0, 0, mapSize, mapSize)

    // Draw world boundaries
    ctx.strokeStyle = '#8b5cf6'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, mapSize, mapSize)

    // Draw viewport indicator
    const viewportX = Math.max(0, Math.min(worldSize - VIEWPORT_SIZE, camera.x)) * scale
    const viewportY = Math.max(0, Math.min(worldSize - VIEWPORT_SIZE, camera.y)) * scale
    const viewportW = VIEWPORT_SIZE * scale
    const viewportH = VIEWPORT_SIZE * scale
    
    ctx.strokeStyle = '#ffffff'
    ctx.strokeRect(viewportX, viewportY, viewportW, viewportH)

    // Draw players as dots
    players.forEach(player => {
      if (player.snake.segments.length > 0 && !player.snake.isDead) {
        const head = player.snake.segments[0]
        ctx.fillStyle = player.id === myPlayerId ? '#ffffff' : player.snake.color
        ctx.beginPath()
        ctx.arc(
          head.x * scale,
          head.y * scale,
          Math.max(2, player.snake.radius * scale),
          0,
          2 * Math.PI
        )
        ctx.fill()
      }
    })
  }, [players, camera, worldSize, myPlayerId])

  return (
    <div className="relative min-h-screen bg-[#06010a] text-white grid place-items-center font-mono">
      {/* Top Panel */}
      <div className="absolute top-4 w-full flex justify-between px-8 items-center">
        {/* Left Panel - Game Info */}
        <div className="bg-[#1a1a2e] border border-[#2d2d5e] rounded-lg p-4 min-w-[200px]">
          <h3 className="text-sm font-semibold text-purple-400 mb-2">
            {gameType === 'freeplay' ? 'Freeplay' : gameType === 'casual' ? 'Casual' : 'Paid'} Lobby
          </h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Players:</span>
              <span>{players.length}{gameType === 'freeplay' ? '/30' : '/5'}</span>
            </div>
            <div className="flex justify-between">
              <span>State:</span>
              <span className="capitalize">{gameState}</span>
            </div>
            {countdown !== null && (
              <div className="flex justify-between">
                <span>Starting in:</span>
                <span>{countdown}s</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Leaderboard */}
        <div className="bg-[#1a1a2e] border border-[#2d2d5e] rounded-lg p-4 min-w-[200px]">
          <h3 className="text-sm font-semibold text-purple-400 mb-2">Top Players</h3>
          <div className="space-y-1 text-xs">
            {leaderboard.slice(0, 5).map((entry, index) => (
              <div key={entry.id} className="flex justify-between">
                <span className={entry.id === myPlayerId ? 'text-cyan-400 font-bold' : ''}>
                  {index + 1}. {entry.username}
                </span>
                <span>{entry.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center Game Canvas */}
      <div className="flex flex-col items-center">
        <div className="text-white text-xl font-semibold mb-1">Score: {myScore}</div>
        
        <div className="relative w-[444px] h-[444px] bg-[#0a0c1a] border border-[#1c1f2e] rounded">
          <canvas 
            ref={canvasRef} 
            width={VIEWPORT_SIZE} 
            height={VIEWPORT_SIZE} 
            className="w-full h-full"
            style={{ imageRendering: 'crisp-edges' }}
          />
      
          {/* Mini-map */}
          <div className="absolute bottom-2 right-2 w-[70px] h-[70px] border border-purple-400/50 bg-black/30 rounded p-1">
            <canvas
              ref={miniMapRef}
              width={60}
              height={60}
              className="w-full h-full border border-purple-500/60"
            />
          </div>

          {/* Joystick */}
          {!isDead && (
            <div 
              ref={joystickContainerRef}
              className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-20 h-20 rounded-full bg-purple-900 border border-purple-500 shadow-lg shadow-purple-500/20 cursor-pointer"
              onMouseDown={handleJoystickStart}
              onTouchStart={handleJoystickStart}
            >
              <div 
                className="absolute w-6 h-6 bg-cyan-400 rounded-full border-2 border-white shadow-lg transition-transform duration-75 ease-out"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: `translate(calc(-50% + ${joystick.knobPosition.x}px), calc(-50% + ${joystick.knobPosition.y}px))`
                }}
              />
            </div>
          )}

          {/* Respawn Button */}
          {isDead && canRespawn && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={handleRespawn}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg 
                           transition-all duration-300 transform hover:scale-105"
              >
                Respawn
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MultiplayerSnakeGame