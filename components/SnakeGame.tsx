import React, { useEffect, useRef, useState, useCallback } from 'react'

interface GameProps {
  isPlaying: boolean
  isBot?: boolean
  onScoreChange?: (score: number) => void
  onGameOver?: () => void
  onGameWin?: (finalScore: number, isWinner: boolean) => void
}

interface Position {
  x: number
  y: number
}

interface Snake {
  id: string
  segments: Position[]
  angle: number // Direction in radians
  speed: number
  color: string
  score: number
  isPlayer?: boolean
  radius: number
  isDead?: boolean
}

interface Food {
  position: Position
  color: string
  points: number
  radius: number
}

interface Camera {
  x: number
  y: number
}

interface JoystickState {
  isDragging: boolean
  knobPosition: { x: number, y: number }
  targetAngle: number | null
}

// Game constants
const VIEWPORT_SIZE = 400
const WORLD_SIZE = VIEWPORT_SIZE * 3 // 3x larger world
const GAME_SPEED = 60 // 60 FPS
const GAME_DURATION = 180 // 3 minutes in seconds

// Snake constants
const BASE_SNAKE_RADIUS = 8 // Base snake thickness
const MAX_SNAKE_RADIUS = 20 // Maximum snake thickness (1.5cm equivalent)
const SNAKE_SPEED = 2 // Base movement speed
const SEGMENT_SPACING = 6 // Distance between segments

// Joystick constants
const JOYSTICK_SIZE = 80
const KNOB_SIZE = 30

// Food constants
const FOOD_COUNT = 100
const FOOD_RADIUS = 3

export const SnakeGame: React.FC<GameProps> = ({ 
  isPlaying, 
  isBot = false, 
  onScoreChange, 
  onGameOver,
  onGameWin
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const miniMapRef = useRef<HTMLCanvasElement>(null)
  const joystickRef = useRef<HTMLDivElement>(null)
  const gameLoopRef = useRef<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  const [snakes, setSnakes] = useState<Snake[]>([])
  const [food, setFood] = useState<Food[]>([])
  const [playerScore, setPlayerScore] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0 })
  const [joystick, setJoystick] = useState<JoystickState>({
    isDragging: false,
    knobPosition: { x: 0, y: 0 },
    targetAngle: null
  })

  // Colors for different elements
  const COLORS = {
    PLAYER: '#3b82f6',  // Blue
    BOT1: '#eab308',    // Yellow  
    BOT2: '#8b5cf6',    // Purple
    BOT3: '#f97316',    // Orange
    BOT4: '#ef4444',    // Red
    BOT5: '#22c55e',    // Green
    FOOD_RED: '#ef4444',
    FOOD_GREEN: '#22c55e',
    FOOD_PURPLE: '#8b5cf6'
  }

  // Generate random position in world
  const generateRandomPosition = useCallback((): Position => {
    return {
      x: Math.random() * (WORLD_SIZE - 100) + 50,
      y: Math.random() * (WORLD_SIZE - 100) + 50
    }
  }, [])

  // Generate food
  const generateFood = useCallback((): Food => {
    const colors = [
      { color: COLORS.FOOD_RED, points: 3 },
      { color: COLORS.FOOD_GREEN, points: 6 },
      { color: COLORS.FOOD_PURPLE, points: 12 }
    ]
    const foodType = colors[Math.floor(Math.random() * colors.length)]
    
    return {
      position: generateRandomPosition(),
      color: foodType.color,
      points: foodType.points,
      radius: FOOD_RADIUS + Math.random() * 2
    }
  }, [generateRandomPosition])

  // Calculate snake radius based on score
  const calculateSnakeRadius = useCallback((score: number): number => {
    const radiusIncrease = Math.floor(score / 30) * 2
    return Math.min(BASE_SNAKE_RADIUS + radiusIncrease, MAX_SNAKE_RADIUS)
  }, [])

  // Create initial snake segments
  const createSnakeSegments = useCallback((headPosition: Position, length: number): Position[] => {
    const segments: Position[] = [headPosition]
    for (let i = 1; i < length; i++) {
      segments.push({
        x: headPosition.x - i * SEGMENT_SPACING,
        y: headPosition.y
      })
    }
    return segments
  }, [])

  // Initialize game
  const initializeGame = useCallback(() => {
    const initialSnakes: Snake[] = []
    
    // Player snake
    if (!isBot) {
      const playerStart = { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 }
      initialSnakes.push({
        id: 'player',
        segments: createSnakeSegments(playerStart, 5),
        angle: 0,
        speed: SNAKE_SPEED,
        color: COLORS.PLAYER,
        score: 0,
        isPlayer: true,
        radius: BASE_SNAKE_RADIUS,
        isDead: false
      })
      
      // Set camera to follow player
      setCamera({
        x: playerStart.x - VIEWPORT_SIZE / 2,
        y: playerStart.y - VIEWPORT_SIZE / 2
      })
    }

    // Bot snakes
    const botColors = [COLORS.BOT1, COLORS.BOT2, COLORS.BOT3, COLORS.BOT4, COLORS.BOT5]
    const numBots = isBot ? 5 : 4
    
    for (let i = 0; i < numBots; i++) {
      const startPos = generateRandomPosition()
      initialSnakes.push({
        id: `bot${i}`,
        segments: createSnakeSegments(startPos, 4),
        angle: Math.random() * Math.PI * 2,
        speed: SNAKE_SPEED + Math.random() * 0.5,
        color: botColors[i],
        score: 0,
        radius: BASE_SNAKE_RADIUS,
        isDead: false
      })
    }

    setSnakes(initialSnakes)

    // Generate initial food
    const initialFood: Food[] = []
    for (let i = 0; i < FOOD_COUNT; i++) {
      initialFood.push(generateFood())
    }
    setFood(initialFood)
    setPlayerScore(0)
    setGameStarted(true)
    setGameEnded(false)
    setTimeLeft(GAME_DURATION)
  }, [isBot, generateRandomPosition, generateFood, createSnakeSegments])

  // Smooth angle interpolation
  const interpolateAngle = useCallback((current: number, target: number, factor: number): number => {
    let diff = target - current
    while (diff > Math.PI) diff -= 2 * Math.PI
    while (diff < -Math.PI) diff += 2 * Math.PI
    return current + diff * factor
  }, [])

  // Move snake with smooth movement
  const moveSnake = useCallback((snake: Snake, targetAngle?: number): Snake => {
    if (snake.isDead) return snake

    const newSnake = { ...snake }
    
    // Update angle based on input (smooth turning)
    if (targetAngle !== undefined && targetAngle !== null) {
      newSnake.angle = interpolateAngle(snake.angle, targetAngle, 0.1)
    }

    // Move head
    const head = snake.segments[0]
    const newHead = {
      x: head.x + Math.cos(newSnake.angle) * snake.speed,
      y: head.y + Math.sin(newSnake.angle) * snake.speed
    }

    // Wrap around world edges
    if (newHead.x < 0) newHead.x = WORLD_SIZE
    if (newHead.x > WORLD_SIZE) newHead.x = 0
    if (newHead.y < 0) newHead.y = WORLD_SIZE
    if (newHead.y > WORLD_SIZE) newHead.y = 0

    // Update segments (follow the head smoothly)
    const newSegments = [newHead]
    for (let i = 1; i < snake.segments.length; i++) {
      const prevSegment = newSegments[i - 1]
      const currentSegment = snake.segments[i]
      
      const dx = prevSegment.x - currentSegment.x
      const dy = prevSegment.y - currentSegment.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > SEGMENT_SPACING) {
        const ratio = SEGMENT_SPACING / distance
        newSegments.push({
          x: prevSegment.x - dx * ratio,
          y: prevSegment.y - dy * ratio
        })
      } else {
        newSegments.push(currentSegment)
      }
    }

    // Calculate length based on score
    const baseLength = 5
    const scoreLength = Math.floor(snake.score / 20)
    const targetLength = baseLength + scoreLength
    
    // Add or remove segments
    while (newSegments.length < targetLength) {
      const lastSegment = newSegments[newSegments.length - 1]
      const secondLast = newSegments[newSegments.length - 2] || lastSegment
      const dx = lastSegment.x - secondLast.x
      const dy = lastSegment.y - secondLast.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 0) {
        newSegments.push({
          x: lastSegment.x + (dx / distance) * SEGMENT_SPACING,
          y: lastSegment.y + (dy / distance) * SEGMENT_SPACING
        })
      } else {
        newSegments.push({ ...lastSegment })
      }
    }
    
    if (newSegments.length > targetLength) {
      newSegments.splice(targetLength)
    }

    return {
      ...newSnake,
      segments: newSegments,
      radius: calculateSnakeRadius(snake.score)
    }
  }, [interpolateAngle, calculateSnakeRadius])

  // Update camera to follow player
  const updateCamera = useCallback((playerPosition: Position) => {
    const targetX = playerPosition.x - VIEWPORT_SIZE / 2
    const targetY = playerPosition.y - VIEWPORT_SIZE / 2
    
    // Smooth camera movement
    setCamera(prev => ({
      x: prev.x + (targetX - prev.x) * 0.1,
      y: prev.y + (targetY - prev.y) * 0.1
    }))
  }, [])

  // AI for bot snakes
  const updateBotAngle = useCallback((snake: Snake, allFood: Food[]): number => {
    if (snake.isDead) return snake.angle

    const head = snake.segments[0]
    
    // Find nearest food
    let nearestFood = allFood[0]
    let minDistance = Infinity
    
    allFood.forEach(f => {
      const dx = head.x - f.position.x
      const dy = head.y - f.position.y
      const distance = dx * dx + dy * dy
      if (distance < minDistance) {
        minDistance = distance
        nearestFood = f
      }
    })

    if (nearestFood) {
      // Calculate angle to food
      const dx = nearestFood.position.x - head.x
      const dy = nearestFood.position.y - head.y
      let targetAngle = Math.atan2(dy, dx)
      
      // Add some randomness to movement
      if (Math.random() < 0.05) {
        targetAngle += (Math.random() - 0.5) * 0.5
      }
      
      return targetAngle
    }

    return snake.angle
  }, [])

  // Check food collision
  const checkFoodCollision = useCallback((snake: Snake, currentFood: Food[]): { newFood: Food[], points: number } => {
    let points = 0
    const head = snake.segments[0]
    
    const newFood = currentFood.filter(f => {
      const dx = head.x - f.position.x
      const dy = head.y - f.position.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < snake.radius + f.radius) {
        points += f.points
        return false
      }
      return true
    })

    // Add new food to replace eaten food
    while (newFood.length < FOOD_COUNT) {
      newFood.push(generateFood())
    }

    return { newFood, points }
  }, [generateFood])

  // Check snake collision
  const checkSnakeCollision = useCallback((snake: Snake, allSnakes: Snake[]): boolean => {
    if (snake.isDead) return false

    const head = snake.segments[0]
    
    // Check collision with other snakes
    for (const otherSnake of allSnakes) {
      if (otherSnake.isDead || otherSnake.id === snake.id) continue
      
      // Check collision with body segments (skip head)
      for (let i = 1; i < otherSnake.segments.length; i++) {
        const segment = otherSnake.segments[i]
        const dx = head.x - segment.x
        const dy = head.y - segment.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < snake.radius + otherSnake.radius - 2) {
          return true
        }
      }
    }
    
    // Check collision with own body (skip first few segments)
    for (let i = 4; i < snake.segments.length; i++) {
      const segment = snake.segments[i]
      const dx = head.x - segment.x
      const dy = head.y - segment.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < snake.radius - 2) {
        return true
      }
    }
    
    return false
  }, [])

  // Check game end conditions
  const checkGameEnd = useCallback((currentSnakes: Snake[]) => {
    if (gameEnded) return

    const aliveSnakes = currentSnakes.filter(snake => !snake.isDead)
    const playerSnake = currentSnakes.find(snake => snake.isPlayer)
    
    // Check if player is dead
    if (playerSnake?.isDead) {
      setGameEnded(true)
      onGameOver?.()
      return
    }

    // Check if time is up or only player is alive
    if (timeLeft <= 0 || aliveSnakes.length <= 1) {
      setGameEnded(true)
      
      // Find winner by highest score
      const sortedSnakes = [...currentSnakes].sort((a, b) => b.score - a.score)
      const winner = sortedSnakes[0]
      const isPlayerWinner = winner.isPlayer

      if (isPlayerWinner) {
        onGameWin?.(winner.score, true)
      } else {
        onGameWin?.(playerSnake?.score || 0, false)
      }
      return
    }
  }, [gameEnded, timeLeft, onGameOver, onGameWin])

  // Timer effect
  useEffect(() => {
    if (isPlaying && gameStarted && !gameEnded) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1
          if (newTime <= 0) {
            return 0
          }
          return newTime
        })
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isPlaying, gameStarted, gameEnded])

  // Joystick event handlers
  const handleJoystickStart = useCallback((clientX: number, clientY: number) => {
    if (!joystickRef.current || gameEnded) return
    
    const rect = joystickRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const deltaX = clientX - centerX
    const deltaY = clientY - centerY
    
    setJoystick(prev => ({
      ...prev,
      isDragging: true,
      knobPosition: { x: deltaX, y: deltaY }
    }))
  }, [gameEnded])

  const handleJoystickMove = useCallback((clientX: number, clientY: number) => {
    if (!joystick.isDragging || !joystickRef.current || gameEnded) return
    
    const rect = joystickRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const deltaX = clientX - centerX
    const deltaY = clientY - centerY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const maxDistance = (JOYSTICK_SIZE - KNOB_SIZE) / 2
    
    let knobX = deltaX
    let knobY = deltaY
    
    if (distance > maxDistance) {
      knobX = (deltaX / distance) * maxDistance
      knobY = (deltaY / distance) * maxDistance
    }
    
    // Calculate target angle for snake movement
    const targetAngle = distance > 10 ? Math.atan2(deltaY, deltaX) : null
    
    setJoystick(prev => ({
      ...prev,
      knobPosition: { x: knobX, y: knobY },
      targetAngle
    }))
  }, [joystick.isDragging, gameEnded])

  const handleJoystickEnd = useCallback(() => {
    setJoystick(prev => ({
      ...prev,
      isDragging: false,
      knobPosition: { x: 0, y: 0 },
      targetAngle: null
    }))
  }, [])

  // Touch and mouse events
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (!isPlaying || isBot || gameEnded) return
      e.preventDefault()
      const touch = e.touches[0]
      handleJoystickStart(touch.clientX, touch.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPlaying || isBot || gameEnded) return
      e.preventDefault()
      const touch = e.touches[0]
      handleJoystickMove(touch.clientX, touch.clientY)
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isPlaying || isBot || gameEnded) return
      e.preventDefault()
      handleJoystickEnd()
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (!isPlaying || isBot || gameEnded) return
      e.preventDefault()
      handleJoystickStart(e.clientX, e.clientY)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPlaying || isBot || gameEnded) return
      handleJoystickMove(e.clientX, e.clientY)
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!isPlaying || isBot || gameEnded) return
      handleJoystickEnd()
    }

    const joystickEl = joystickRef.current
    if (joystickEl) {
      joystickEl.addEventListener('touchstart', handleTouchStart, { passive: false })
      joystickEl.addEventListener('touchmove', handleTouchMove, { passive: false })
      joystickEl.addEventListener('touchend', handleTouchEnd, { passive: false })
      joystickEl.addEventListener('mousedown', handleMouseDown)
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      if (joystickEl) {
        joystickEl.removeEventListener('touchstart', handleTouchStart)
        joystickEl.removeEventListener('touchmove', handleTouchMove)
        joystickEl.removeEventListener('touchend', handleTouchEnd)
        joystickEl.removeEventListener('mousedown', handleMouseDown)
      }
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isPlaying, isBot, gameEnded, handleJoystickStart, handleJoystickMove, handleJoystickEnd])

  // Game loop
  const gameLoop = useCallback(() => {
    if (!isPlaying || !gameStarted || gameEnded) return

    setSnakes(currentSnakes => {
      const newSnakes = currentSnakes.map(snake => {
        if (snake.isDead) return snake

        let targetAngle = undefined
        
        // Update movement direction
        if (snake.isPlayer) {
          targetAngle = joystick.targetAngle || undefined
        } else {
          targetAngle = updateBotAngle(snake, food)
        }

        // Move snake
        const movedSnake = moveSnake(snake, targetAngle)

        // Update camera for player
        if (snake.isPlayer) {
          updateCamera(movedSnake.segments[0])
        }

        // Check food collision
        const { newFood, points } = checkFoodCollision(movedSnake, food)
        if (points > 0) {
          setFood(newFood)
          movedSnake.score += points
          
          if (snake.isPlayer) {
            setPlayerScore(prev => {
              const newScore = prev + points
              onScoreChange?.(newScore)
              return newScore
            })
          }
        }

        // Check snake collision
        if (checkSnakeCollision(movedSnake, currentSnakes)) {
          movedSnake.isDead = true
        }

        return movedSnake
      })

      // Check game end conditions
      checkGameEnd(newSnakes)

      return newSnakes
    })
  }, [isPlaying, gameStarted, gameEnded, joystick.targetAngle, food, moveSnake, updateCamera, updateBotAngle, checkFoodCollision, checkSnakeCollision, onScoreChange, checkGameEnd])

  // Game loop effect
  useEffect(() => {
    if (isPlaying && gameStarted && !gameEnded) {
      const loop = () => {
        gameLoop()
        gameLoopRef.current = requestAnimationFrame(loop)
      }
      gameLoopRef.current = requestAnimationFrame(loop)
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [isPlaying, gameStarted, gameEnded, gameLoop])

  // Initialize game
  useEffect(() => {
    if (isPlaying) {
      initializeGame()
    }
  }, [isPlaying, initializeGame])

  // Format time display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Main canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#f8f8f8'
    ctx.fillRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE)

    // Draw grid dots
    ctx.fillStyle = '#e0e0e0'
    const gridSize = 30
    for (let x = 0; x < VIEWPORT_SIZE; x += gridSize) {
      for (let y = 0; y < VIEWPORT_SIZE; y += gridSize) {
        const worldX = camera.x + x
        const worldY = camera.y + y
        if (worldX >= 0 && worldX <= WORLD_SIZE && worldY >= 0 && worldY <= WORLD_SIZE) {
          ctx.fillRect(x, y, 1, 1)
        }
      }
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
    snakes.forEach(snake => {
      if (snake.isDead) return

      snake.segments.forEach((segment, index) => {
        const screenX = segment.x - camera.x
        const screenY = segment.y - camera.y
        
        if (screenX >= -snake.radius && screenX <= VIEWPORT_SIZE + snake.radius && 
            screenY >= -snake.radius && screenY <= VIEWPORT_SIZE + snake.radius) {
          
          // Draw snake segment
          ctx.fillStyle = snake.color
          ctx.beginPath()
          ctx.arc(screenX, screenY, snake.radius, 0, 2 * Math.PI)
          ctx.fill()
          
          // Draw eyes on head
          if (index === 0) {
            const eyeSize = snake.radius * 0.15
            const eyeDistance = snake.radius * 0.4
            
            ctx.fillStyle = 'white'
            ctx.beginPath()
            ctx.arc(
              screenX + Math.cos(snake.angle - 0.5) * eyeDistance,
              screenY + Math.sin(snake.angle - 0.5) * eyeDistance,
              eyeSize, 0, 2 * Math.PI
            )
            ctx.fill()
            
            ctx.beginPath()
            ctx.arc(
              screenX + Math.cos(snake.angle + 0.5) * eyeDistance,
              screenY + Math.sin(snake.angle + 0.5) * eyeDistance,
              eyeSize, 0, 2 * Math.PI
            )
            ctx.fill()
          }
        }
      })
    })

    // Draw game end overlay
    if (gameEnded) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE)
      
      ctx.fillStyle = 'white'
      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Game Over!', VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2)
    }
  }, [snakes, food, camera, gameEnded])

  // Mini-map drawing
  useEffect(() => {
    const canvas = miniMapRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const mapSize = 100
    const scale = mapSize / WORLD_SIZE

    // Clear mini-map
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, 0, mapSize, mapSize)

    // Draw viewport indicator
    ctx.strokeStyle = '#666'
    ctx.lineWidth = 1
    ctx.strokeRect(
      camera.x * scale,
      camera.y * scale,
      VIEWPORT_SIZE * scale,
      VIEWPORT_SIZE * scale
    )

    // Draw snakes as dots
    snakes.forEach(snake => {
      if (snake.segments.length > 0 && !snake.isDead) {
        const head = snake.segments[0]
        ctx.fillStyle = snake.color
        ctx.beginPath()
        ctx.arc(
          head.x * scale,
          head.y * scale,
          Math.max(2, snake.radius * scale),
          0,
          2 * Math.PI
        )
        ctx.fill()
      }
    })
  }, [snakes, camera])

  return (
    <div className="snake-game-container">
      {/* Timer display */}
      {!isBot && !gameEnded && (
        <div className="game-timer-display">
          Time: {formatTime(timeLeft)}
        </div>
      )}

      <div className="game-viewport-container">
        {/* Main game canvas */}
        <canvas
          ref={canvasRef}
          width={VIEWPORT_SIZE}
          height={VIEWPORT_SIZE}
          style={{
            border: '2px solid #ddd',
            borderRadius: '8px',
            background: '#f8f8f8'
          }}
        />
        
        {/* Mini-map */}
        <div className="mini-map">
          <canvas
            ref={miniMapRef}
            width={100}
            height={100}
            style={{
              border: '1px solid #999',
              borderRadius: '4px',
              background: '#f0f0f0'
            }}
          />
        </div>
      </div>

      {/* Joystick controls */}
      {!isBot && !gameEnded && (
        <div className="joystick-container">
          <div 
            ref={joystickRef}
            className="joystick-base"
            style={{
              width: JOYSTICK_SIZE,
              height: JOYSTICK_SIZE,
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              border: '2px solid rgba(0, 0, 0, 0.2)',
              position: 'relative',
              cursor: 'pointer'
            }}
          >
            <div 
              className="joystick-knob"
              style={{
                width: KNOB_SIZE,
                height: KNOB_SIZE,
                borderRadius: '50%',
                backgroundColor: '#8b5cf6',
                border: '2px solid #7c3aed',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(${-KNOB_SIZE/2 + joystick.knobPosition.x}px, ${-KNOB_SIZE/2 + joystick.knobPosition.y}px)`,
                transition: joystick.isDragging ? 'none' : 'transform 0.2s ease'
              }}
            />
          </div>
        </div>
      )}

      {!isBot && (
        <div className="game-controls mt-4 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Use joystick to control your snake
          </p>
          <p className="text-lg font-bold text-purple-800">
            Score: {playerScore}
          </p>
        </div>
      )}
    </div>
  )
}