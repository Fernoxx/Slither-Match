import React, { useEffect, useRef, useState, useCallback } from 'react'

interface GameProps {
  isPlaying: boolean
  isBot?: boolean
  onScoreChange?: (score: number) => void
  onGameOver?: (score: number) => void
  onGameWin?: (finalScore: number, isWinner: boolean) => void
  isPreview?: boolean // New prop for homepage preview
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
const WORLD_SIZE = 1332 // 3x larger world (444 * 3)
const VIEWPORT_SIZE = 444 // Game box size
const GAME_SPEED = 60 // 60 FPS
const GAME_DURATION = 180 // 3 minutes in seconds
const WALLS_WIDTH = 10 // Wall thickness

// Snake constants - MUCH slower and bigger
const BASE_SNAKE_RADIUS = 12 // Increased from 8 to 12 - bigger base size
const MAX_SNAKE_RADIUS = 28 // Increased from 20 to 28 - much bigger max size
const SNAKE_SPEED = 0.8 // Reduced from 1.5 to 0.8 - much slower movement
const SEGMENT_SPACING = 8 // Increased from 6 to 8 - more space between segments

// Joystick constants
const JOYSTICK_SIZE = 80
const KNOB_SIZE = 30

// Food constants
const FOOD_COLORS = ['#ef4444', '#22c55e', '#8b5cf6']
const FOOD_COUNT = 100
const FOOD_RADIUS = 3

export const SnakeGame: React.FC<GameProps> = ({ 
  isPlaying, 
  isBot = false, 
  onScoreChange, 
  onGameOver,
  onGameWin,
  isPreview = false // Default to false
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
  const [camera, setCamera] = useState<Camera>(() => {
    if (isPreview) {
      // Center camera for preview mode
      return {
        x: WORLD_SIZE / 2 - VIEWPORT_SIZE / 2,
        y: WORLD_SIZE / 2 - VIEWPORT_SIZE / 2
      }
    }
    return { x: 0, y: 0 }
  })
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

  // Eye styles for different snakes
  const EYE_STYLES = {
    PLAYER: 'normal',     // Normal round eyes
    BOT1: 'angry',        // Angry slanted eyes  
    BOT2: 'sleepy',       // Half-closed sleepy eyes
    BOT3: 'wide',         // Wide surprised eyes
    BOT4: 'evil',         // Evil red eyes with small pupils
    BOT5: 'crossed'       // Cross-eyed silly eyes
  }

  // Get eye style for snake
  const getEyeStyle = useCallback((snakeId: string) => {
    if (snakeId === 'player') return EYE_STYLES.PLAYER
    if (snakeId === 'bot0') return EYE_STYLES.BOT1
    if (snakeId === 'bot1') return EYE_STYLES.BOT2
    if (snakeId === 'bot2') return EYE_STYLES.BOT3
    if (snakeId === 'bot3') return EYE_STYLES.BOT4
    if (snakeId === 'bot4') return EYE_STYLES.BOT5
    return EYE_STYLES.PLAYER
  }, [])

  // Draw snake eyes based on style - MADE MUCH LARGER AND MORE VISIBLE
  const drawSnakeEyes = useCallback((ctx: CanvasRenderingContext2D, snake: Snake, screenX: number, screenY: number) => {
    const eyeStyle = getEyeStyle(snake.id)
    const baseEyeSize = snake.radius * 0.25 // Increased from 0.15 to 0.25 - much bigger eyes
    const eyeDistance = snake.radius * 0.5   // Increased from 0.4 to 0.5 - spread apart more
    
    // Calculate eye positions
    const leftEyeX = screenX + Math.cos(snake.angle - 0.5) * eyeDistance
    const leftEyeY = screenY + Math.sin(snake.angle - 0.5) * eyeDistance
    const rightEyeX = screenX + Math.cos(snake.angle + 0.5) * eyeDistance
    const rightEyeY = screenY + Math.sin(snake.angle + 0.5) * eyeDistance

    switch (eyeStyle) {
      case 'normal': // Player - normal round eyes
        // White eye background
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        
        // Black pupils
        ctx.fillStyle = 'black'
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize * 0.6, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize * 0.6, 0, 2 * Math.PI)
        ctx.fill()
        break

      case 'angry': // Bot1 (Yellow) - angry slanted eyes
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.ellipse(leftEyeX, leftEyeY, baseEyeSize * 1.3, baseEyeSize * 0.8, snake.angle - 0.3, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.ellipse(rightEyeX, rightEyeY, baseEyeSize * 1.3, baseEyeSize * 0.8, snake.angle + 0.3, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        
        // Red angry pupils
        ctx.fillStyle = '#dc2626'
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize * 0.6, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize * 0.6, 0, 2 * Math.PI)
        ctx.fill()
        
        // Angry eyebrows
        ctx.strokeStyle = '#7f1d1d'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(leftEyeX - baseEyeSize, leftEyeY - baseEyeSize)
        ctx.lineTo(leftEyeX + baseEyeSize * 0.5, leftEyeY - baseEyeSize * 0.5)
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(rightEyeX + baseEyeSize, rightEyeY - baseEyeSize)
        ctx.lineTo(rightEyeX - baseEyeSize * 0.5, rightEyeY - baseEyeSize * 0.5)
        ctx.stroke()
        break

      case 'sleepy': // Bot2 (Purple) - half-closed sleepy eyes
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.ellipse(leftEyeX, leftEyeY, baseEyeSize, baseEyeSize * 0.4, 0, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.ellipse(rightEyeX, rightEyeY, baseEyeSize, baseEyeSize * 0.4, 0, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        
        // Small pupils
        ctx.fillStyle = 'black'
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize * 0.4, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize * 0.4, 0, 2 * Math.PI)
        ctx.fill()
        break

      case 'wide': // Bot3 (Orange) - wide surprised eyes
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize * 1.6, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize * 1.6, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        
        // Large pupils
        ctx.fillStyle = 'black'
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize * 0.9, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize * 0.9, 0, 2 * Math.PI)
        ctx.fill()
        break

      case 'evil': // Bot4 (Red) - evil red eyes with small pupils
        ctx.fillStyle = '#fca5a5' // Light red
        ctx.strokeStyle = '#7f1d1d'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        
        // Small dark red pupils
        ctx.fillStyle = '#7f1d1d'
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize * 0.5, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize * 0.5, 0, 2 * Math.PI)
        ctx.fill()
        break

      case 'crossed': // Bot5 (Green) - cross-eyed silly eyes
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        
        // Cross-eyed pupils (looking towards center)
        ctx.fillStyle = 'black'
        ctx.beginPath()
        ctx.arc(leftEyeX + baseEyeSize * 0.4, leftEyeY, baseEyeSize * 0.6, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX - baseEyeSize * 0.4, rightEyeY, baseEyeSize * 0.6, 0, 2 * Math.PI)
        ctx.fill()
        break

      default:
        // Fallback to normal eyes
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.stroke()
        break
    }
  }, [getEyeStyle])

  // Generate random position in world
  const generateRandomPosition = useCallback((): Position => {
    const wallMargin = 30 // Keep away from walls
    return {
      x: Math.random() * (WORLD_SIZE - 2 * wallMargin) + wallMargin,
      y: Math.random() * (WORLD_SIZE - 2 * wallMargin) + wallMargin
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

  // Calculate snake radius based on score - more gradual growth
  const calculateSnakeRadius = useCallback((score: number): number => {
    const radiusIncrease = Math.floor(score / 20) * 1.5 // More gradual growth (was 30/2)
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
    if (!isBot && !isPreview) {
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
    const numBots = isBot ? 5 : (isPreview ? 3 : 4) // Fewer bots in preview
    
    for (let i = 0; i < numBots; i++) {
      const startPos = generateRandomPosition()
      initialSnakes.push({
        id: `bot${i}`,
        segments: createSnakeSegments(startPos, 4),
        angle: Math.random() * Math.PI * 2,
        speed: SNAKE_SPEED + Math.random() * 0.3, // Reduced randomness
        color: botColors[i],
        score: Math.floor(Math.random() * 50), // Give bots some initial score for preview
        radius: BASE_SNAKE_RADIUS + (isPreview ? Math.floor(Math.random() * 6) : 0),
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
  }, [isBot, isPreview, generateRandomPosition, generateFood, createSnakeSegments])

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
      newSnake.angle = interpolateAngle(snake.angle, targetAngle, 0.08) // Slower turning
    }

    // Move head
    const head = snake.segments[0]
    const newHead = {
      x: head.x + Math.cos(newSnake.angle) * snake.speed,
      y: head.y + Math.sin(newSnake.angle) * snake.speed
    }

    // Check wall collision - die if hitting boundaries (with buffer to prevent false positives)
    const wallBuffer = 2 // Small buffer to prevent false wall collisions
    if (newHead.x < snake.radius + wallBuffer || 
        newHead.x > WORLD_SIZE - snake.radius - wallBuffer || 
        newHead.y < snake.radius + wallBuffer || 
        newHead.y > WORLD_SIZE - snake.radius - wallBuffer) {
      // Mark snake as dead if it hits a wall (unless in preview mode)
      if (!isPreview) {
        newSnake.isDead = true
        console.log(`Snake ${snake.id} hit wall at position:`, newHead.x, newHead.y, 'radius:', snake.radius)
      } else {
        // In preview mode, bounce off walls
        if (newHead.x < snake.radius + wallBuffer) newHead.x = snake.radius + wallBuffer
        if (newHead.x > WORLD_SIZE - snake.radius - wallBuffer) newHead.x = WORLD_SIZE - snake.radius - wallBuffer
        if (newHead.y < snake.radius + wallBuffer) newHead.y = snake.radius + wallBuffer
        if (newHead.y > WORLD_SIZE - snake.radius - wallBuffer) newHead.y = WORLD_SIZE - snake.radius - wallBuffer
        
        // Reverse direction when hitting wall in preview
        newSnake.angle = newSnake.angle + Math.PI + (Math.random() - 0.5) * 0.5
      }
    }

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
  }, [interpolateAngle, calculateSnakeRadius, isPreview])

  // Update camera to follow player (or center in preview mode)
  const updateCamera = useCallback((playerPosition: Position) => {
    if (isPreview) {
      // Center the camera in the world for preview mode
      const centerX = WORLD_SIZE / 2 - VIEWPORT_SIZE / 2
      const centerY = WORLD_SIZE / 2 - VIEWPORT_SIZE / 2
      
      setCamera(prev => ({
        x: prev.x + (centerX - prev.x) * 0.05, // Slower smooth movement for preview
        y: prev.y + (centerY - prev.y) * 0.05
      }))
    } else {
      // Follow player in actual game
      const targetX = playerPosition.x - VIEWPORT_SIZE / 2
      const targetY = playerPosition.y - VIEWPORT_SIZE / 2
      
      // Smooth camera movement
      setCamera(prev => ({
        x: prev.x + (targetX - prev.x) * 0.1,
        y: prev.y + (targetY - prev.y) * 0.1
      }))
    }
  }, [isPreview])

  // AI for bot snakes
  const updateBotAngle = useCallback((snake: Snake, allSnakes: Snake[], allFood: Food[]): number => {
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
      if (Math.random() < 0.03) { // Less randomness
        targetAngle += (Math.random() - 0.5) * 0.3
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

  // Check snake collision - MUCH more forgiving to prevent random deaths
  const checkSnakeCollision = useCallback((snake: Snake, allSnakes: Snake[]): boolean => {
    if (snake.isDead || isPreview) return false // No collisions in preview mode

    const head = snake.segments[0]
    
    // Check collision with other snakes - only body segments, not heads
    for (const otherSnake of allSnakes) {
      if (otherSnake.isDead || otherSnake.id === snake.id) continue
      
      // Check collision with body segments (skip head and many segments for forgiveness)
      for (let i = 5; i < otherSnake.segments.length; i++) { // Increased from 3 to 5
        const segment = otherSnake.segments[i]
        const dx = head.x - segment.x
        const dy = head.y - segment.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        // VERY forgiving collision - need to be VERY close
        if (distance < (snake.radius + otherSnake.radius) * 0.5) { // Reduced from 0.7 to 0.5
          return true
        }
      }
    }
    
    // NO self-collision - hitting your own tail won't kill you!
    // This allows for more creative movement and prevents frustrating deaths
    
    return false
  }, [isPreview])

  // Check game end conditions
  const checkGameEnd = useCallback((currentSnakes: Snake[]) => {
    if (gameEnded || isPreview) return // No game over in preview mode

    const aliveSnakes = currentSnakes.filter(snake => !snake.isDead)
    const playerSnake = currentSnakes.find(snake => snake.isPlayer)
    
    // Check if player is dead
    if (playerSnake?.isDead) {
      setGameEnded(true)
      onGameOver?.(playerSnake.score)
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
  }, [gameEnded, isPreview, timeLeft, onGameOver, onGameWin])

  // Spawn food dots where dead snakes were
  const spawnFoodFromDeadSnake = useCallback((deadSnake: Snake): Food[] => {
    const newFood: Food[] = []
    
    // Spawn food at each segment of the dead snake
    deadSnake.segments.forEach((segment, index) => {
      // Skip some segments to avoid too much food clustering
      if (index % 2 === 0) { // Every other segment
        newFood.push({
          position: {
            x: segment.x + (Math.random() - 0.5) * 10, // Small random offset
            y: segment.y + (Math.random() - 0.5) * 10
          },
          radius: FOOD_RADIUS + Math.random() * 2,
          color: FOOD_COLORS[Math.floor(Math.random() * FOOD_COLORS.length)],
          points: 5 // Each dead snake food piece gives 5 points
        })
      }
    })
    
    return newFood
  }, [])

  // Timer effect
  useEffect(() => {
    if (isPlaying && gameStarted && !gameEnded && !isPreview) { // No timer in preview
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
  }, [isPlaying, gameStarted, gameEnded, isPreview])

  // Handle joystick interaction
  const handleJoystickStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    setJoystick(prev => ({ ...prev, isDragging: true }))
  }, [])

  const handleJoystickMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!joystick.isDragging) return
    
    e.preventDefault()
    
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    
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
    const targetAngle = distance > 8 ? Math.atan2(deltaY, deltaX) : null // Reduced deadzone from 15 to 8
    
    setJoystick(prev => ({
      ...prev,
      knobPosition: { x: knobX, y: knobY },
      targetAngle
    }))
  }, [joystick.isDragging])

  const handleJoystickEnd = useCallback(() => {
    setJoystick(prev => ({
      ...prev,
      isDragging: false,
      knobPosition: { x: 0, y: 0 },
      targetAngle: null
    }))
  }, [])

  // Touch and mouse controls
  useEffect(() => {
    if (isPreview || isBot) return

    // Remove global event listeners since joystick handles events directly
    // The joystick container now handles all touch/mouse events

    return () => {
      // Cleanup if needed
    }
  }, [isPlaying, isBot, gameEnded, isPreview])

  // Game loop
  const gameLoop = useCallback(() => {
    if (!isPlaying || !gameStarted || (gameEnded && !isPreview)) return

    setSnakes(currentSnakes => {
      // Update snakes and track newly dead snakes for food spawning
      const newlyDeadSnakes: Snake[] = []
      
      const newSnakes = currentSnakes.map(snake => {
        if (snake.isDead && !isPreview) return snake // In preview, revive dead snakes

        // Revive dead snakes in preview mode
        if (snake.isDead && isPreview) {
          snake.isDead = false
          snake.segments = createSnakeSegments(generateRandomPosition(), 5)
        }

        // Move snake
        let targetAngle = undefined
        
        // Update movement direction
        if (snake.isPlayer && !isPreview) {
          targetAngle = joystick.targetAngle || undefined
        } else {
          targetAngle = updateBotAngle(snake, currentSnakes, food)
        }
        
        const movedSnake = moveSnake(snake, targetAngle)
        
        // Update camera if this is the player
        if (snake.isPlayer) {
          updateCamera(movedSnake.segments[0])
        }

        // Check food collision
        const { newFood, points } = checkFoodCollision(movedSnake, food)
        if (points > 0) {
          setFood(newFood)
          movedSnake.score += points
          
          if (snake.isPlayer && !isPreview) {
            setPlayerScore(prev => {
              const newScore = prev + points
              onScoreChange?.(newScore)
              return newScore
            })
          }
        }

        // Check snake collision (only if not preview)
        if (!isPreview && checkSnakeCollision(movedSnake, currentSnakes)) {
          const wasAlive = !movedSnake.isDead
          movedSnake.isDead = true
          
          // Track newly dead snake for food spawning
          if (wasAlive) {
            newlyDeadSnakes.push({ ...movedSnake })
            console.log(`Snake ${movedSnake.id} died from collision at position:`, movedSnake.segments[0])
          }
        }

        return movedSnake
      })

      // Spawn food from newly dead snakes
      if (newlyDeadSnakes.length > 0) {
        const newFoodFromDeadSnakes: Food[] = []
        newlyDeadSnakes.forEach(deadSnake => {
          newFoodFromDeadSnakes.push(...spawnFoodFromDeadSnake(deadSnake))
        })
        
        if (newFoodFromDeadSnakes.length > 0) {
          setFood(currentFood => [...currentFood, ...newFoodFromDeadSnakes])
        }
      }

      // Check game end conditions (only if not preview)
      if (!isPreview) {
        checkGameEnd(newSnakes)
      }

      return newSnakes
    })
  }, [isPlaying, gameStarted, gameEnded, isPreview, joystick.targetAngle, food, moveSnake, updateCamera, updateBotAngle, checkFoodCollision, checkSnakeCollision, onScoreChange, checkGameEnd, createSnakeSegments, generateRandomPosition, spawnFoodFromDeadSnake])

  // Game loop effect
  useEffect(() => {
    if (isPlaying && gameStarted && (!gameEnded || isPreview)) { // Always run in preview
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
  }, [isPlaying, gameStarted, gameEnded, isPreview, gameLoop])

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

    // Draw world boundaries/walls
    const wallThickness = 10
    ctx.fillStyle = '#4a5568' // Dark gray walls
    
    // Top wall
    if (camera.y <= wallThickness) {
      ctx.fillRect(0, 0, VIEWPORT_SIZE, wallThickness - camera.y)
    }
    
    // Bottom wall  
    if (camera.y + VIEWPORT_SIZE >= WORLD_SIZE - wallThickness) {
      const wallTop = WORLD_SIZE - wallThickness - camera.y
      ctx.fillRect(0, wallTop, VIEWPORT_SIZE, VIEWPORT_SIZE - wallTop)
    }
    
    // Left wall
    if (camera.x <= wallThickness) {
      ctx.fillRect(0, 0, wallThickness - camera.x, VIEWPORT_SIZE)
    }
    
    // Right wall
    if (camera.x + VIEWPORT_SIZE >= WORLD_SIZE - wallThickness) {
      const wallLeft = WORLD_SIZE - wallThickness - camera.x
      ctx.fillRect(wallLeft, 0, VIEWPORT_SIZE - wallLeft, VIEWPORT_SIZE)
    }

    // Draw grid dots
    ctx.fillStyle = '#e0e0e0'
    const gridSize = 30
    for (let x = 0; x < VIEWPORT_SIZE; x += gridSize) {
      for (let y = 0; y < VIEWPORT_SIZE; y += gridSize) {
        const worldX = camera.x + x
        const worldY = camera.y + y
        if (worldX >= wallThickness && worldX <= WORLD_SIZE - wallThickness && 
            worldY >= wallThickness && worldY <= WORLD_SIZE - wallThickness) {
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
      if (snake.isDead && !isPreview) return // Don't draw dead snakes except in preview

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
            drawSnakeEyes(ctx, snake, screenX, screenY)
          }
        }
      })
    })

    // Draw game end overlay (only if not preview)
    if (gameEnded && !isPreview) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE)
      
      ctx.fillStyle = 'white'
      ctx.font = 'bold 24px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Game Over!', VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2)
    }
  }, [snakes, food, camera, gameEnded, isPreview, drawSnakeEyes])

  // Mini-map drawing
  useEffect(() => {
    const canvas = miniMapRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const mapSize = 100
    const scale = mapSize / WORLD_SIZE
    const wallThickness = 10

    // Clear mini-map
    ctx.fillStyle = '#f0f0f0'
    ctx.fillRect(0, 0, mapSize, mapSize)

    // Draw world boundaries on mini-map
    ctx.fillStyle = '#4a5568'
    ctx.fillRect(0, 0, mapSize, wallThickness * scale) // Top wall
    ctx.fillRect(0, mapSize - wallThickness * scale, mapSize, wallThickness * scale) // Bottom wall  
    ctx.fillRect(0, 0, wallThickness * scale, mapSize) // Left wall
    ctx.fillRect(mapSize - wallThickness * scale, 0, wallThickness * scale, mapSize) // Right wall

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
      if (snake.segments.length > 0 && (!snake.isDead || isPreview)) {
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
  }, [snakes, camera, isPreview])

  return (
    <div className="game-container">
      {/* Game UI - Score and Timer */}
      {!isPreview && (
        <div className="game-ui">
          <div className="game-status">
            <div className="game-live">🎮 Game Live!</div>
            <div className="score-display">Score: {playerScore}</div>
          </div>
          {!isPreview && (
            <div className="timer-display">
              Time: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
      )}

      {/* Main Game Canvas */}
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={VIEWPORT_SIZE}
          height={VIEWPORT_SIZE}
          className="game-canvas"
        />
        
        {/* Mini-map */}
        {!isPreview && (
          <canvas
            ref={miniMapRef}
            width={100}
            height={100}
            className="mini-map"
          />
        )}

        {/* Joystick - Positioned at bottom center of game box */}
        {!isPreview && (
          <div 
            className="joystick-container"
            onMouseDown={handleJoystickStart}
            onMouseMove={handleJoystickMove}
            onMouseUp={handleJoystickEnd}
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
          >
            <div className="joystick-base">
              <div 
                className="joystick-knob"
                style={{
                  transform: `translate(${joystick.knobPosition.x}px, ${joystick.knobPosition.y}px)`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Control Instructions */}
      {!isPreview && (
        <div className="control-instructions">
          Use joystick to control your snake
        </div>
      )}

      <style jsx>{`
        .game-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: ${VIEWPORT_SIZE}px;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          border-radius: 12px;
          overflow: hidden;
          position: relative;
        }

        .game-ui {
          width: 100%;
          padding: 15px 20px;
          background: rgba(0,0,0,0.3);
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: #00ffff;
        }

        .game-status {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .game-live {
          color: #00ff88;
          font-weight: bold;
          font-size: 1.1rem;
          margin-bottom: 5px;
        }

        .score-display {
          color: #00ffff;
          font-size: 1.3rem;
          font-weight: bold;
        }

        .timer-display {
          background: rgba(138, 43, 226, 0.3);
          border: 1px solid #8a2be2;
          padding: 8px 16px;
          border-radius: 8px;
          color: #ffffff;
          font-weight: bold;
        }

        .canvas-container {
          position: relative;
          width: ${VIEWPORT_SIZE}px;
          height: ${VIEWPORT_SIZE}px;
        }

        .game-canvas {
          display: block;
          background: #0a0a1a;
          width: 100%;
          height: 100%;
        }

        .mini-map {
          position: absolute;
          top: 10px;
          right: 10px;
          border: 2px solid #8a2be2;
          border-radius: 8px;
          background: rgba(0,0,0,0.7);
          z-index: 10;
        }

        .joystick-container {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          width: ${JOYSTICK_SIZE}px;
          height: ${JOYSTICK_SIZE}px;
          cursor: pointer;
          z-index: 20;
        }

        .joystick-base {
          width: ${JOYSTICK_SIZE}px;
          height: ${JOYSTICK_SIZE}px;
          border-radius: 50%;
          background: rgba(138, 43, 226, 0.3);
          border: 2px solid #8a2be2;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .joystick-knob {
          width: ${KNOB_SIZE}px;
          height: ${KNOB_SIZE}px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00ffff, #0088ff);
          border: 2px solid #ffffff;
          box-shadow: 0 4px 8px rgba(0,255,255,0.3);
          transition: transform 0.1s ease-out;
        }

        .control-instructions {
          padding: 15px;
          color: #00ffff;
          text-align: center;
          font-size: 0.9rem;
          background: rgba(0,0,0,0.3);
          width: 100%;
        }

        @media (max-width: 768px) {
          .game-container {
            width: 300px;
          }
          
          .canvas-container {
            width: 300px;
            height: 300px;
          }

          .joystick-container {
            bottom: 15px;
          }

          .joystick-base {
            width: 60px;
            height: 60px;
          }

          .joystick-knob {
            width: 20px;
            height: 20px;
          }
        }
      `}</style>
    </div>
  )
}