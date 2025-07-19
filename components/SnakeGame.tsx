import React, { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react'

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
  positions: Position[]
  direction: { x: number, y: number }
  color: string
  score: number
  isPlayer?: boolean
  width: number
  isDead?: boolean
}

interface Food {
  position: Position
  color: string
  points: number
}

interface Camera {
  x: number
  y: number
}

interface JoystickState {
  isDragging: boolean
  knobPosition: { x: number, y: number }
  direction: { x: number, y: number }
}

// Game constants
const VIEWPORT_SIZE = 400
const CELL_SIZE = 3
const WORLD_SIZE = VIEWPORT_SIZE * 3 // 3x larger world
const WORLD_CELLS = Math.floor(WORLD_SIZE / CELL_SIZE)
const VIEWPORT_CELLS = Math.floor(VIEWPORT_SIZE / CELL_SIZE)
const GAME_SPEED = 120
const MAX_SNAKE_WIDTH = 15 // 1.5cm at 96dpi ≈ 15px
const MIN_SNAKE_WIDTH = 4
const GAME_DURATION = 180 // 3 minutes in seconds

// Joystick constants
const JOYSTICK_SIZE = 80
const KNOB_SIZE = 30

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
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)
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
    direction: { x: 1, y: 0 }
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

  // Format time display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Generate random position in world
  const generateRandomPosition = useCallback((): Position => {
    return {
      x: Math.floor(Math.random() * (WORLD_CELLS - 4)) + 2,
      y: Math.floor(Math.random() * (WORLD_CELLS - 4)) + 2
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
      points: foodType.points
    }
  }, [generateRandomPosition])

  // Calculate snake width based on score
  const calculateSnakeWidth = useCallback((score: number): number => {
    const widthIncrease = Math.floor(score / 30) // Increase width every 30 points
    return Math.min(MIN_SNAKE_WIDTH + widthIncrease, MAX_SNAKE_WIDTH)
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

  // Initialize game
  const initializeGame = useCallback(() => {
    const initialSnakes: Snake[] = []
    
    // Player snake
    if (!isBot) {
      const playerStart = { x: Math.floor(WORLD_CELLS / 2), y: Math.floor(WORLD_CELLS / 2) }
      initialSnakes.push({
        id: 'player',
        positions: [playerStart],
        direction: { x: 1, y: 0 },
        color: COLORS.PLAYER,
        score: 0,
        isPlayer: true,
        width: MIN_SNAKE_WIDTH,
        isDead: false
      })
      
      // Set camera to follow player
      setCamera({
        x: playerStart.x * CELL_SIZE - VIEWPORT_SIZE / 2,
        y: playerStart.y * CELL_SIZE - VIEWPORT_SIZE / 2
      })
    }

    // Bot snakes
    const botColors = [COLORS.BOT1, COLORS.BOT2, COLORS.BOT3, COLORS.BOT4, COLORS.BOT5]
    const numBots = isBot ? 5 : 4
    
    for (let i = 0; i < numBots; i++) {
      const startPos = generateRandomPosition()
      initialSnakes.push({
        id: `bot${i}`,
        positions: [startPos],
        direction: { 
          x: Math.random() > 0.5 ? 1 : -1, 
          y: Math.random() > 0.5 ? 1 : -1 
        },
        color: botColors[i],
        score: 0,
        width: MIN_SNAKE_WIDTH,
        isDead: false
      })
    }

    setSnakes(initialSnakes)

    // Generate initial food (more food for larger world)
    const initialFood: Food[] = []
    for (let i = 0; i < 50; i++) {
      initialFood.push(generateFood())
    }
    setFood(initialFood)
    setPlayerScore(0)
    setGameStarted(true)
    setGameEnded(false)
    setTimeLeft(GAME_DURATION)
  }, [isBot, generateRandomPosition, generateFood])

  // Move snake
  const moveSnake = useCallback((snake: Snake): Snake => {
    if (snake.isDead) return snake

    const head = snake.positions[0]
    const newHead = {
      x: head.x + snake.direction.x,
      y: head.y + snake.direction.y
    }

    // Check bounds - wrap around world
    if (newHead.x < 0) newHead.x = WORLD_CELLS - 1
    if (newHead.x >= WORLD_CELLS) newHead.x = 0
    if (newHead.y < 0) newHead.y = WORLD_CELLS - 1
    if (newHead.y >= WORLD_CELLS) newHead.y = 0

    const newPositions = [newHead, ...snake.positions]
    
    // Calculate snake length based on score and width
    const baseLength = 3
    const scoreLength = Math.floor(snake.score / 15)
    const maxLength = baseLength + scoreLength
    
    if (newPositions.length > maxLength) {
      newPositions.pop()
    }

    return {
      ...snake,
      positions: newPositions,
      width: calculateSnakeWidth(snake.score)
    }
  }, [calculateSnakeWidth])

  // Update camera to follow player
  const updateCamera = useCallback((playerPosition: Position) => {
    const targetX = playerPosition.x * CELL_SIZE - VIEWPORT_SIZE / 2
    const targetY = playerPosition.y * CELL_SIZE - VIEWPORT_SIZE / 2
    
    // Clamp camera to world bounds
    const clampedX = Math.max(0, Math.min(WORLD_SIZE - VIEWPORT_SIZE, targetX))
    const clampedY = Math.max(0, Math.min(WORLD_SIZE - VIEWPORT_SIZE, targetY))
    
    setCamera({ x: clampedX, y: clampedY })
  }, [])

  // AI for bot snakes
  const updateBotDirection = useCallback((snake: Snake, allFood: Food[], allSnakes: Snake[]): { x: number, y: number } => {
    if (snake.isDead) return snake.direction

    const head = snake.positions[0]
    
    // Find nearest food
    let nearestFood = allFood[0]
    let minDistance = Infinity
    
    allFood.forEach(f => {
      const distance = Math.abs(head.x - f.position.x) + Math.abs(head.y - f.position.y)
      if (distance < minDistance) {
        minDistance = distance
        nearestFood = f
      }
    })

    if (nearestFood) {
      // Move towards food with some randomness
      const dx = nearestFood.position.x - head.x
      const dy = nearestFood.position.y - head.y
      
      if (Math.random() < 0.15) {
        return {
          x: Math.random() > 0.5 ? 1 : -1,
          y: Math.random() > 0.5 ? 1 : -1
        }
      }
      
      if (Math.abs(dx) > Math.abs(dy)) {
        return { x: dx > 0 ? 1 : -1, y: 0 }
      } else {
        return { x: 0, y: dy > 0 ? 1 : -1 }
      }
    }

    return snake.direction
  }, [])

  // Check food collision
  const checkFoodCollision = useCallback((snakeHead: Position, currentFood: Food[]): { newFood: Food[], points: number } => {
    let points = 0
    const newFood = currentFood.filter(f => {
      if (f.position.x === snakeHead.x && f.position.y === snakeHead.y) {
        points += f.points
        return false
      }
      return true
    })

    // Add new food to replace eaten food
    while (newFood.length < 50) {
      newFood.push(generateFood())
    }

    return { newFood, points }
  }, [generateFood])

  // Check snake collision
  const checkSnakeCollision = useCallback((snake: Snake, allSnakes: Snake[]): boolean => {
    if (snake.isDead) return false

    const head = snake.positions[0]
    
    // Check collision with other snakes (including their own body after head)
    for (const otherSnake of allSnakes) {
      if (otherSnake.isDead) continue
      
      const segments = otherSnake.id === snake.id ? otherSnake.positions.slice(1) : otherSnake.positions
      
      for (const segment of segments) {
        if (head.x === segment.x && head.y === segment.y) {
          return true
        }
      }
    }
    
    return false
  }, [])

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
    
    setJoystick(prev => ({
      ...prev,
      isDragging: true,
      knobPosition: { x: clientX - centerX, y: clientY - centerY }
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
    
    // Calculate direction
    const threshold = 10
    let dirX = 0, dirY = 0
    
    if (Math.abs(knobX) > threshold || Math.abs(knobY) > threshold) {
      if (Math.abs(knobX) > Math.abs(knobY)) {
        dirX = knobX > 0 ? 1 : -1
        dirY = 0
      } else {
        dirX = 0
        dirY = knobY > 0 ? 1 : -1
      }
    }
    
    setJoystick(prev => ({
      ...prev,
      knobPosition: { x: knobX, y: knobY },
      direction: { x: dirX, y: dirY }
    }))
  }, [joystick.isDragging, gameEnded])

  const handleJoystickEnd = useCallback(() => {
    setJoystick(prev => ({
      ...prev,
      isDragging: false,
      knobPosition: { x: 0, y: 0 }
    }))
  }, [])

  // Touch events
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

    // Mouse events for desktop
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

        // Update bot direction
        if (!snake.isPlayer) {
          snake.direction = updateBotDirection(snake, food, currentSnakes)
        } else {
          // Use joystick direction for player
          if (joystick.direction.x !== 0 || joystick.direction.y !== 0) {
            snake.direction = joystick.direction
          }
        }

        // Move snake
        const movedSnake = moveSnake(snake)

        // Update camera for player
        if (snake.isPlayer) {
          updateCamera(movedSnake.positions[0])
        }

        // Check food collision
        const { newFood, points } = checkFoodCollision(movedSnake.positions[0], food)
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
  }, [isPlaying, gameStarted, gameEnded, joystick.direction, food, moveSnake, updateCamera, updateBotDirection, checkFoodCollision, checkSnakeCollision, onScoreChange, checkGameEnd])

  // Game loop effect
  useEffect(() => {
    if (isPlaying && gameStarted && !gameEnded) {
      gameLoopRef.current = setInterval(gameLoop, GAME_SPEED)
    } else {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
    }
  }, [isPlaying, gameStarted, gameEnded, gameLoop])

  // Initialize game
  useEffect(() => {
    if (isPlaying) {
      initializeGame()
    }
  }, [isPlaying, initializeGame])

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
    for (let x = 0; x < VIEWPORT_CELLS; x += 8) {
      for (let y = 0; y < VIEWPORT_CELLS; y += 8) {
        const worldX = (camera.x / CELL_SIZE) + x
        const worldY = (camera.y / CELL_SIZE) + y
        if (worldX >= 0 && worldX < WORLD_CELLS && worldY >= 0 && worldY < WORLD_CELLS) {
          ctx.fillRect(x * CELL_SIZE - (camera.x % CELL_SIZE) + 1, y * CELL_SIZE - (camera.y % CELL_SIZE) + 1, 1, 1)
        }
      }
    }

    // Draw food
    food.forEach(f => {
      const screenX = f.position.x * CELL_SIZE - camera.x
      const screenY = f.position.y * CELL_SIZE - camera.y
      
      if (screenX >= -CELL_SIZE && screenX <= VIEWPORT_SIZE && screenY >= -CELL_SIZE && screenY <= VIEWPORT_SIZE) {
        ctx.fillStyle = f.color
        ctx.beginPath()
        ctx.arc(screenX + CELL_SIZE / 2, screenY + CELL_SIZE / 2, CELL_SIZE, 0, 2 * Math.PI)
        ctx.fill()
      }
    })

    // Draw snakes
    snakes.forEach(snake => {
      if (snake.isDead) return // Don't draw dead snakes

      snake.positions.forEach((pos, index) => {
        const screenX = pos.x * CELL_SIZE - camera.x
        const screenY = pos.y * CELL_SIZE - camera.y
        
        if (screenX >= -snake.width && screenX <= VIEWPORT_SIZE && screenY >= -snake.width && screenY <= VIEWPORT_SIZE) {
          ctx.fillStyle = snake.color
          
          if (index === 0) {
            // Draw head as circle
            ctx.beginPath()
            ctx.arc(screenX + CELL_SIZE / 2, screenY + CELL_SIZE / 2, snake.width / 2, 0, 2 * Math.PI)
            ctx.fill()
          } else {
            // Draw body as rectangle
            const size = Math.max(CELL_SIZE, snake.width)
            ctx.fillRect(
              screenX + (CELL_SIZE - size) / 2, 
              screenY + (CELL_SIZE - size) / 2, 
              size, 
              size
            )
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
      if (snake.positions.length > 0 && !snake.isDead) {
        const head = snake.positions[0]
        ctx.fillStyle = snake.color
        ctx.beginPath()
        ctx.arc(
          head.x * CELL_SIZE * scale,
          head.y * CELL_SIZE * scale,
          Math.max(2, snake.width * scale / 2),
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