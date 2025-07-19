import React, { useRef, useEffect, useState, useCallback } from 'react'

interface SnakeGameProps {
  onGameOver?: (score: number) => void
  isBot?: boolean
  isPreview?: boolean
  isPaidLobby?: boolean
}

// Game constants
const VIEWPORT_SIZE = 444 // Fixed game box size as requested

interface Position {
  x: number
  y: number
}

interface Snake {
  id: string
  segments: Position[]
  angle: number
  speed: number
  color: string
  score: number
  isPlayer: boolean
  radius: number
  isDead: boolean
}

interface Food {
  position: Position
  color: string
  radius: number
}

interface JoystickState {
  isDragging: boolean
  knobPosition: Position
  targetAngle: number | null
}

const SnakeGame: React.FC<SnakeGameProps> = ({ 
  onGameOver, 
  isBot = false, 
  isPreview = false,
  isPaidLobby = false 
}) => {
  // Dynamic constants based on game mode
  const WORLD_SIZE = isPaidLobby ? 1332 : 2000
  const BOT_COUNT = isPaidLobby ? 4 : 9
  const FOOD_COUNT = isPaidLobby ? 80 : 150
  const GAME_DURATION = 180 // 3 minutes
  const SNAKE_SPEED = 1.8 // Slightly reduced from 2
  const BASE_SNAKE_RADIUS = 8 // Slightly increased from 7
  const JOYSTICK_SIZE = 80
  const KNOB_SIZE = 30

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const miniMapRef = useRef<HTMLCanvasElement>(null)

  const [snakes, setSnakes] = useState<Snake[]>([])
  const [food, setFood] = useState<Food[]>([])
  const [camera, setCamera] = useState<Position>({ x: 0, y: 0 })
  const [gameStarted, setGameStarted] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)
  const [playerScore, setPlayerScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION)
  
  // Joystick state - using useRef to avoid stale closure issues
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

  // Colors for different elements
  const COLORS = {
    PLAYER: '#3b82f6',  // Blue
    FOOD: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'], // Various colors
    BOTS: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'] // Bot colors
  }

  // Enhanced snake eyes with expressions
  const drawSnakeEyes = useCallback((ctx: CanvasRenderingContext2D, snake: Snake, headX: number, headY: number) => {
    const eyeSize = snake.radius * 0.4
    const eyeOffsetX = snake.radius * 0.5
    const eyeOffsetY = snake.radius * 0.3

    // Calculate eye positions based on snake direction
    const leftEyeX = headX + Math.cos(snake.angle + 0.6) * eyeOffsetX
    const leftEyeY = headY + Math.sin(snake.angle + 0.6) * eyeOffsetX
    const rightEyeX = headX + Math.cos(snake.angle - 0.6) * eyeOffsetX
    const rightEyeY = headY + Math.sin(snake.angle - 0.6) * eyeOffsetX

    // Draw eye whites (larger and more prominent)
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2

    // Left eye
    ctx.beginPath()
    ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()

    // Right eye  
    ctx.beginPath()
    ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()

    // Draw pupils with different expressions for each snake
    const pupilSize = eyeSize * 0.6
    const expressionIndex = parseInt(snake.id.replace(/\D/g, '') || '0') % 6
    
    ctx.fillStyle = '#000000'
    
    // Different eye expressions
    switch (expressionIndex) {
      case 0: // Normal centered
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, pupilSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, pupilSize, 0, 2 * Math.PI)
        ctx.fill()
        break
      case 1: // Looking right
        ctx.beginPath()
        ctx.arc(leftEyeX + eyeSize * 0.3, leftEyeY, pupilSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX + eyeSize * 0.3, rightEyeY, pupilSize, 0, 2 * Math.PI)
        ctx.fill()
        break
      case 2: // Looking left
        ctx.beginPath()
        ctx.arc(leftEyeX - eyeSize * 0.3, leftEyeY, pupilSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX - eyeSize * 0.3, rightEyeY, pupilSize, 0, 2 * Math.PI)
        ctx.fill()
        break
      case 3: // Cross-eyed
        ctx.beginPath()
        ctx.arc(leftEyeX + eyeSize * 0.2, leftEyeY, pupilSize, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX - eyeSize * 0.2, rightEyeY, pupilSize, 0, 2 * Math.PI)
        ctx.fill()
        break
      case 4: // Sleepy (half closed)
        ctx.fillRect(leftEyeX - pupilSize, leftEyeY - pupilSize/2, pupilSize * 2, pupilSize)
        ctx.fillRect(rightEyeX - pupilSize, rightEyeY - pupilSize/2, pupilSize * 2, pupilSize)
        break
      case 5: // Wide open (surprised)
        ctx.beginPath()
        ctx.arc(leftEyeX, leftEyeY, pupilSize * 1.2, 0, 2 * Math.PI)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(rightEyeX, rightEyeY, pupilSize * 1.2, 0, 2 * Math.PI)
        ctx.fill()
        break
    }

    // Add angry eyebrows for some snakes
    if (expressionIndex === 1 || expressionIndex === 3 || expressionIndex === 5) {
      ctx.strokeStyle = '#ff0000'
      ctx.lineWidth = 3
      
      // Left eyebrow
      ctx.beginPath()
      ctx.moveTo(leftEyeX - eyeSize, leftEyeY - eyeSize * 1.2)
      ctx.lineTo(leftEyeX + eyeSize * 0.5, leftEyeY - eyeSize * 0.8)
      ctx.stroke()
      
      // Right eyebrow
      ctx.beginPath()
      ctx.moveTo(rightEyeX - eyeSize * 0.5, rightEyeY - eyeSize * 0.8)
      ctx.lineTo(rightEyeX + eyeSize, rightEyeY - eyeSize * 1.2)
      ctx.stroke()
    }
  }, [])

  // Generate random position within world bounds
  const generateRandomPosition = useCallback((): Position => {
    const margin = 50
    return {
      x: margin + Math.random() * (WORLD_SIZE - 2 * margin),
      y: margin + Math.random() * (WORLD_SIZE - 2 * margin)
    }
  }, [WORLD_SIZE])

  // Generate food
  const generateFood = useCallback((): Food => {
    return {
      position: generateRandomPosition(),
      color: COLORS.FOOD[Math.floor(Math.random() * COLORS.FOOD.length)],
      radius: 4
    }
  }, [generateRandomPosition])

  // Get snake color
  const getSnakeColor = useCallback((id: string): string => {
    if (id === 'player') return COLORS.PLAYER
    const index = parseInt(id.replace('bot', '')) % COLORS.BOTS.length
    return COLORS.BOTS[index]
  }, [])

  // Create snake segments
  const createSnakeSegments = useCallback((startPos: Position, length: number): Position[] => {
    const segments: Position[] = []
    for (let i = 0; i < length; i++) {
      segments.push({
        x: startPos.x - i * 10,
        y: startPos.y
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

    // Generate bot snakes
    const bots: Snake[] = []
    for (let i = 0; i < BOT_COUNT; i++) {
      const startPos = generateRandomPosition()
      const segments = createSnakeSegments(startPos, 5)
      
      bots.push({
        id: `bot${i}`,
        isPlayer: false,
        segments,
        color: getSnakeColor(`bot${i}`),
        score: isPreview ? Math.floor(Math.random() * 50) + 10 : 0,
        speed: SNAKE_SPEED + Math.random() * 0.3,
        angle: Math.random() * 2 * Math.PI,
        radius: BASE_SNAKE_RADIUS + (isPreview ? Math.floor(Math.random() * 6) : 0),
        isDead: false
      })
    }

    // Add bots to initial snakes
    initialSnakes.push(...bots)

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
  }, [isBot, isPreview, generateRandomPosition, generateFood, createSnakeSegments, getSnakeColor, WORLD_SIZE, BOT_COUNT, FOOD_COUNT])

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
        // In preview mode, wrap around or bounce
        if (newHead.x < snake.radius) newHead.x = WORLD_SIZE - snake.radius
        if (newHead.x > WORLD_SIZE - snake.radius) newHead.x = snake.radius
        if (newHead.y < snake.radius) newHead.y = WORLD_SIZE - snake.radius
        if (newHead.y > WORLD_SIZE - snake.radius) newHead.y = snake.radius
      }
    }

    // Create new segments array following head
    const newSegments = [newHead, ...snake.segments.slice(0, -1)]
    
    // Update segments to follow smoothly
    for (let i = 1; i < newSegments.length; i++) {
      const current = newSegments[i]
      const previous = newSegments[i - 1]
      
      const dx = previous.x - current.x
      const dy = previous.y - current.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      const targetDistance = snake.radius * 1.8 // Slightly closer segments
      
      if (distance > targetDistance) {
        const ratio = targetDistance / distance
        newSegments[i] = {
          x: previous.x - dx * ratio,
          y: previous.y - dy * ratio
        }
      }
    }

    newSnake.segments = newSegments
    return newSnake
  }, [interpolateAngle, isPreview, WORLD_SIZE])

  // Check collision between two circles
  const checkCollision = useCallback((pos1: Position, radius1: number, pos2: Position, radius2: number): boolean => {
    const dx = pos1.x - pos2.x
    const dy = pos1.y - pos2.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < (radius1 + radius2) * 0.9 // Slightly more forgiving collision
  }, [])

  // Update snake collisions
  const updateCollisions = useCallback((currentSnakes: Snake[], currentFood: Food[]): [Snake[], Food[], number] => {
    let newFood = [...currentFood]
    let scoreIncrease = 0

    const updatedSnakes = currentSnakes.map(snake => {
      if (snake.isDead) return snake

      const head = snake.segments[0]
      const newSnake = { ...snake }

      // Check food collision
      for (let i = newFood.length - 1; i >= 0; i--) {
        if (checkCollision(head, snake.radius, newFood[i].position, newFood[i].radius)) {
          // Eat food
          newFood.splice(i, 1)
          newSnake.score += 1
          newSnake.radius = Math.min(snake.radius + 0.3, 15) // Grow but cap size
          
          // Add new segment
          const tail = snake.segments[snake.segments.length - 1]
          const secondToTail = snake.segments[snake.segments.length - 2] || tail
          const dx = tail.x - secondToTail.x
          const dy = tail.y - secondToTail.y
          const length = Math.sqrt(dx * dx + dy * dy) || 1
          newSnake.segments.push({
            x: tail.x + (dx / length) * snake.radius * 1.8,
            y: tail.y + (dy / length) * snake.radius * 1.8
          })

          if (snake.isPlayer) {
            scoreIncrease += 1
          }
          
          // Spawn new food
          newFood.push(generateFood())
          break
        }
      }

      // Check snake-to-snake collision (but NOT self-collision)
      for (const otherSnake of currentSnakes) {
        if (otherSnake.id === snake.id || otherSnake.isDead) continue // Skip self and dead snakes
        
        // Check collision with other snake's segments
        for (let i = 0; i < otherSnake.segments.length; i++) {
          if (checkCollision(head, snake.radius, otherSnake.segments[i], otherSnake.radius)) {
            newSnake.isDead = true
            console.log(`Snake ${snake.id} collided with snake ${otherSnake.id}`)
            
            // Add food at death location
            newFood.push({
              position: { x: head.x, y: head.y },
              color: COLORS.FOOD[Math.floor(Math.random() * COLORS.FOOD.length)],
              radius: 6
            })
            break
          }
        }
        if (newSnake.isDead) break
      }

      return newSnake
    })

    return [updatedSnakes, newFood, scoreIncrease]
  }, [checkCollision, generateFood])

  // Update bot AI
  const updateBotAI = useCallback((bot: Snake, allSnakes: Snake[], allFood: Food[]): number | null => {
    if (bot.isDead || allFood.length === 0) return null

    const head = bot.segments[0]
    
    // Find nearest food
    let nearestFood = allFood[0]
    let minDistance = Infinity
    
    for (const food of allFood) {
      const distance = Math.sqrt(
        Math.pow(head.x - food.position.x, 2) + 
        Math.pow(head.y - food.position.y, 2)
      )
      if (distance < minDistance) {
        minDistance = distance
        nearestFood = food
      }
    }

    // Calculate angle to nearest food
    const targetAngle = Math.atan2(
      nearestFood.position.y - head.y,
      nearestFood.position.x - head.x
    )

    // Add some randomness to make bots less predictable
    const randomOffset = (Math.random() - 0.5) * 0.3 // Reduced randomness
    return targetAngle + randomOffset
  }, [])

  // Improved joystick handlers with global event listening for smooth control
  const joystickContainerRef = useRef<HTMLDivElement>(null)

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
    const maxDistance = (JOYSTICK_SIZE - KNOB_SIZE) / 2
    
    let knobX = deltaX
    let knobY = deltaY
    
    if (distance > maxDistance) {
      knobX = (deltaX / distance) * maxDistance
      knobY = (deltaY / distance) * maxDistance
    }

    // Calculate target angle for snake movement with smaller deadzone for better responsiveness
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
    if (isPreview || isBot) return

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

    // Add global event listeners for smooth dragging
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
  }, [isPreview, isBot, updateJoystickPosition, handleJoystickEnd])

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameEnded) return

    const gameLoop = setInterval(() => {
      setSnakes(currentSnakes => {
        const updatedSnakes = currentSnakes.map(snake => {
          if (snake.isPlayer) {
            return moveSnake(snake, joystickRef.current.targetAngle || undefined)
          } else {
            const botTargetAngle = updateBotAI(snake, currentSnakes, food)
            return moveSnake(snake, botTargetAngle || undefined)
          }
        })

        const [finalSnakes, newFood, scoreIncrease] = updateCollisions(updatedSnakes, food)
        setFood(newFood)
        
        if (scoreIncrease > 0) {
          setPlayerScore(prev => prev + scoreIncrease)
        }

        // Check if player died
        const playerSnake = finalSnakes.find(s => s.isPlayer)
        if (playerSnake?.isDead && !isPreview) {
          setGameEnded(true)
          onGameOver?.(playerScore + scoreIncrease)
        }

        return finalSnakes
      })
    }, 16) // ~60 FPS

    return () => clearInterval(gameLoop)
  }, [gameStarted, gameEnded, moveSnake, updateBotAI, updateCollisions, food, onGameOver, playerScore, isPreview])

  // Timer countdown
  useEffect(() => {
    if (!gameStarted || gameEnded || isPreview) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameEnded(true)
          onGameOver?.(playerScore)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStarted, gameEnded, isPreview, onGameOver, playerScore])

  // Camera follow player
  useEffect(() => {
    if (isPreview) {
      // Center camera in preview mode
      setCamera({
        x: (WORLD_SIZE - VIEWPORT_SIZE) / 2,
        y: (WORLD_SIZE - VIEWPORT_SIZE) / 2
      })
      return
    }

    const playerSnake = snakes.find(s => s.isPlayer)
    if (playerSnake && playerSnake.segments.length > 0 && !playerSnake.isDead) {
      const head = playerSnake.segments[0]
      setCamera({
        x: Math.max(0, Math.min(WORLD_SIZE - VIEWPORT_SIZE, head.x - VIEWPORT_SIZE / 2)),
        y: Math.max(0, Math.min(WORLD_SIZE - VIEWPORT_SIZE, head.y - VIEWPORT_SIZE / 2))
      })
    }
  }, [snakes, isPreview, WORLD_SIZE])

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE)

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
  }, [snakes, camera, isPreview, WORLD_SIZE])

  return (
    <div className="game-container">
      {/* Game UI matching the exact reference image layout */}
      <div className="game-status-bar">
        <div className="status-left">
          <div className="game-live">🎮 Game Live!</div>
        </div>
        <div className="status-center">
          <div className="main-score">Score: {playerScore}</div>
        </div>
        <div className="status-right">
          {!isPreview && (
            <div className="timer-box">
              Time: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          )}
        </div>
      </div>

      {/* Game Canvas */}
      <div className="game-box">
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

        {/* Joystick - Smooth responsive handling */}
        {!isPreview && (
          <div 
            ref={joystickContainerRef}
            className="joystick-container"
            onMouseDown={handleJoystickStart}
            onTouchStart={handleJoystickStart}
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

      {/* Bottom Instructions */}
      {!isPreview && (
        <div className="bottom-instructions">
          Use joystick to control your snake
          <div className="bottom-score">Score: {playerScore}</div>
        </div>
      )}

      <style jsx>{`
        .game-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%);
          min-height: 100vh;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .game-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(168, 85, 247, 0.2) 0%, transparent 50%),
            radial-gradient(circle at 40% 80%, rgba(99, 102, 241, 0.2) 0%, transparent 50%);
          pointer-events: none;
        }

        .game-status-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: ${VIEWPORT_SIZE}px;
          margin-bottom: 20px;
          z-index: 1;
        }

        .status-left, .status-center, .status-right {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .game-live {
          color: #00ff88;
          font-size: 1.2rem;
          font-weight: bold;
          text-shadow: 0 0 15px rgba(0, 255, 136, 0.6);
          animation: pulse 2s ease-in-out infinite;
        }

        .main-score {
          color: #00ffff;
          font-size: 2rem;
          font-weight: bold;
          text-shadow: 0 0 20px rgba(0, 255, 255, 0.8);
          animation: glow 3s ease-in-out infinite alternate;
        }

        .timer-box {
          background: linear-gradient(135deg, rgba(138, 43, 226, 0.3), rgba(75, 0, 130, 0.3));
          border: 2px solid #8a2be2;
          padding: 8px 16px;
          border-radius: 8px;
          color: #ffffff;
          font-weight: bold;
          text-shadow: 0 0 10px rgba(138, 43, 226, 0.6);
          box-shadow: 0 0 20px rgba(138, 43, 226, 0.4);
        }

        .game-box {
          position: relative;
          width: ${VIEWPORT_SIZE}px;
          height: ${VIEWPORT_SIZE}px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 
            0 20px 60px rgba(0, 0, 0, 0.3),
            0 0 40px rgba(139, 92, 246, 0.2),
            inset 0 0 20px rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
          z-index: 1;
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
          border-radius: 4px;
          background: rgba(0,0,0,0.8);
          z-index: 10;
          box-shadow: 0 0 15px rgba(138, 43, 226, 0.4);
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
          background: linear-gradient(135deg, rgba(138, 43, 226, 0.3), rgba(75, 0, 130, 0.2));
          border: 2px solid #8a2be2;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(138, 43, 226, 0.4);
        }

        .joystick-knob {
          width: ${KNOB_SIZE}px;
          height: ${KNOB_SIZE}px;
          border-radius: 50%;
          background: linear-gradient(135deg, #00ffff, #0088ff);
          border: 2px solid #ffffff;
          box-shadow: 0 4px 8px rgba(0,255,255,0.3), 0 0 15px rgba(0,255,255,0.5);
          transition: transform 0.1s ease-out;
        }

        .bottom-instructions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: ${VIEWPORT_SIZE}px;
          margin-top: 20px;
          color: #00ffff;
          text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
          z-index: 1;
        }

        .bottom-score {
          font-size: 1.2rem;
          font-weight: bold;
        }

        @keyframes backgroundMove {
          0% { transform: translateX(0) translateY(0); }
          100% { transform: translateX(-60px) translateY(-60px); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes glow {
          from { text-shadow: 0 0 20px rgba(0, 255, 255, 0.8); }
          to { text-shadow: 0 0 30px rgba(0, 255, 255, 1); }
        }

        @media (max-width: 768px) {
          .game-container {
            padding: 10px;
          }

          .game-box {
            width: 320px;
            height: 320px;
          }

          .game-status-bar, .bottom-instructions {
            width: 320px;
          }

          .main-score {
            font-size: 1.5rem;
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

export default SnakeGame