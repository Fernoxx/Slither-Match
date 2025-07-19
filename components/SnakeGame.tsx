import React, { useEffect, useRef, useState, useCallback } from 'react'

interface GameProps {
  isPlaying: boolean
  isBot?: boolean
  onScoreChange?: (score: number) => void
  onGameOver?: () => void
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
const WORLD_SIZE = 2400 // 3x larger world
const VIEWPORT_SIZE = 800
const GAME_SPEED = 60 // 60 FPS
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

  // Draw snake eyes based on style
  const drawSnakeEyes = useCallback((ctx: CanvasRenderingContext2D, snake: Snake, screenX: number, screenY: number) => {
    const eyeStyle = getEyeStyle(snake.id)
    const baseEyeSize = snake.radius * 0.15
    const eyeDistance = snake.radius * 0.4
    
    // Calculate eye positions
    const leftEyeX = screenX + Math.cos(snake.angle - 0.5) * eyeDistance
    const leftEyeY = screenY + Math.sin(snake.angle - 0.5) * eyeDistance
    const rightEyeX = screenX + Math.cos(snake.angle + 0.5) * eyeDistance
    const rightEyeY = screenY + Math.sin(snake.angle + 0.5) * eyeDistance

    switch (eyeStyle) {
      case 'normal': // Player - normal round eyes
        ctx.fillStyle = 'white'
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize, 0, 2 * Math.PI)
        ctx.fill()
        
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
        ctx.beginPath()
        ctx.ellipse(leftEyeX, leftEyeY, baseEyeSize * 1.2, baseEyeSize * 0.7, snake.angle - 0.3, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(rightEyeX, rightEyeY, baseEyeSize * 1.2, baseEyeSize * 0.7, snake.angle + 0.3, 0, 2 * Math.PI)
        ctx.fill()
        
        // Red angry pupils
        ctx.fillStyle = '#dc2626'
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize * 0.5, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize * 0.5, 0, 2 * Math.PI)
        ctx.fill()
        break

      case 'sleepy': // Bot2 (Purple) - half-closed sleepy eyes
        ctx.fillStyle = 'white'
        ctx.beginPath()
        ctx.ellipse(leftEyeX, leftEyeY, baseEyeSize, baseEyeSize * 0.4, 0, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(rightEyeX, rightEyeY, baseEyeSize, baseEyeSize * 0.4, 0, 0, 2 * Math.PI)
        ctx.fill()
        
        // Small pupils
        ctx.fillStyle = 'black'
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize * 0.3, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize * 0.3, 0, 2 * Math.PI)
        ctx.fill()
        break

      case 'wide': // Bot3 (Orange) - wide surprised eyes
        ctx.fillStyle = 'white'
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize * 1.5, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize * 1.5, 0, 2 * Math.PI)
        ctx.fill()
        
        // Large pupils
        ctx.fillStyle = 'black'
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize * 0.8, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize * 0.8, 0, 2 * Math.PI)
        ctx.fill()
        break

      case 'evil': // Bot4 (Red) - evil red eyes with small pupils
        ctx.fillStyle = '#fca5a5' // Light red
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize, 0, 2 * Math.PI)
        ctx.fill()
        
        // Small dark red pupils
        ctx.fillStyle = '#7f1d1d'
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize * 0.4, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize * 0.4, 0, 2 * Math.PI)
        ctx.fill()
        break

      case 'crossed': // Bot5 (Green) - cross-eyed silly eyes
        ctx.fillStyle = 'white'
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize, 0, 2 * Math.PI)
        ctx.fill()
        
        // Cross-eyed pupils (looking towards center)
        ctx.fillStyle = 'black'
        ctx.beginPath()
        ctx.arc(leftEyeX + baseEyeSize * 0.3, leftEyeY, baseEyeSize * 0.6, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX - baseEyeSize * 0.3, rightEyeY, baseEyeSize * 0.6, 0, 2 * Math.PI)
        ctx.fill()
        break

      default:
        // Fallback to normal eyes
        ctx.fillStyle = 'white'
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, baseEyeSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, baseEyeSize, 0, 2 * Math.PI)
        ctx.fill()
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
    
    // Check collision with own body (skip many more segments to prevent instant death)
    for (let i = 12; i < snake.segments.length; i++) { // Increased from 8 to 12
      const segment = snake.segments[i]
      const dx = head.x - segment.x
      const dy = head.y - segment.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // EXTREMELY forgiving self-collision
      if (distance < snake.radius * 0.3) { // Reduced from 0.5 to 0.3
        return true
      }
    }
    
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
  }, [gameEnded, isPreview, timeLeft, onGameOver, onGameWin])

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
    const targetAngle = distance > 8 ? Math.atan2(deltaY, deltaX) : null // Reduced deadzone from 15 to 8
    
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
      if (!isPlaying || isBot || gameEnded || isPreview) return
      e.preventDefault()
      const touch = e.touches[0]
      handleJoystickStart(touch.clientX, touch.clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPlaying || isBot || gameEnded || isPreview) return
      e.preventDefault()
      const touch = e.touches[0]
      handleJoystickMove(touch.clientX, touch.clientY)
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isPlaying || isBot || gameEnded || isPreview) return
      e.preventDefault()
      handleJoystickEnd()
    }

    const handleMouseDown = (e: MouseEvent) => {
      if (!isPlaying || isBot || gameEnded || isPreview) return
      e.preventDefault()
      handleJoystickStart(e.clientX, e.clientY)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPlaying || isBot || gameEnded || isPreview) return
      handleJoystickMove(e.clientX, e.clientY)
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!isPlaying || isBot || gameEnded || isPreview) return
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
  }, [isPlaying, isBot, gameEnded, isPreview, handleJoystickStart, handleJoystickMove, handleJoystickEnd])

  // Game loop
  const gameLoop = useCallback(() => {
    if (!isPlaying || !gameStarted || (gameEnded && !isPreview)) return

    setSnakes(currentSnakes => {
      const newSnakes = currentSnakes.map(snake => {
        if (snake.isDead && !isPreview) return snake // In preview, revive dead snakes

        // Revive dead snakes in preview mode
        if (snake.isDead && isPreview) {
          snake.isDead = false
          snake.segments = createSnakeSegments(generateRandomPosition(), 4)
        }

        let targetAngle = undefined
        
        // Update movement direction
        if (snake.isPlayer && !isPreview) {
          targetAngle = joystick.targetAngle || undefined
        } else {
          targetAngle = updateBotAngle(snake, food)
        }

        // Move snake
        const movedSnake = moveSnake(snake, targetAngle)

        // Update camera for player
        if (snake.isPlayer && !isPreview) {
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
          movedSnake.isDead = true
          console.log(`Snake ${movedSnake.id} died from collision at position:`, movedSnake.segments[0])
        }

        return movedSnake
      })

      // Check game end conditions (only if not preview)
      if (!isPreview) {
        checkGameEnd(newSnakes)
      }

      return newSnakes
    })
  }, [isPlaying, gameStarted, gameEnded, isPreview, joystick.targetAngle, food, moveSnake, updateCamera, updateBotAngle, checkFoodCollision, checkSnakeCollision, onScoreChange, checkGameEnd, createSnakeSegments, generateRandomPosition])

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
    <div className="snake-game-container">
      {/* Timer display - only show if not preview and not bot */}
      {!isBot && !gameEnded && !isPreview && (
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
        
        {/* Mini-map - hide in preview */}
        {!isPreview && (
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
        )}
      </div>

      {/* Joystick controls - only show if not preview, not bot, and not game ended */}
      {!isBot && !gameEnded && !isPreview && (
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

      {/* Score display - only show if not preview */}
      {!isBot && !isPreview && (
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