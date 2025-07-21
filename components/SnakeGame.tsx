import React, { useRef, useEffect, useState, useCallback } from 'react'

interface SnakeGameProps {
  isPlaying?: boolean
  onGameOver?: (score: number) => void
  onScoreChange?: (score: number) => void
  onGameWin?: (score: number, isWinner?: boolean) => void
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
  isPlaying = true,
  onGameOver, 
  onScoreChange,
  onGameWin,
  isBot = false, 
  isPreview = false,
  isPaidLobby = false 
}) => {
  // Dynamic constants based on game mode
  const WORLD_SIZE = isPaidLobby ? 1332 : 2500 // Increased for bot lobby
  const BOT_COUNT = isPaidLobby ? 4 : 10
  const FOOD_COUNT = isPaidLobby ? 150 : 400 // Significantly increased food count
  const GAME_DURATION = 180 // 3 minutes
  const SNAKE_SPEED = 1.5 // Reduced speed for better survival
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

  // Colors for different elements - Updated to neon theme
  const COLORS = {
    PLAYER: '#00ffff',  // Cyan for player
    FOOD: ['#00ffd1', '#fc4fff', '#f1ff00', '#ff1f4d'], // Neon colors from your GameUI design
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
    
    // Player snake (always add unless it's a bot-only preview)
    if (!isBot) {
      const playerStart = isPreview 
        ? { x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 }
        : { 
            x: WORLD_SIZE * 0.3 + Math.random() * WORLD_SIZE * 0.4, // More spread out starting position
            y: WORLD_SIZE * 0.3 + Math.random() * WORLD_SIZE * 0.4 
          }
      
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
      
      // Set camera to follow player (unless preview)
      if (!isPreview) {
        setCamera({
          x: Math.max(0, Math.min(WORLD_SIZE - VIEWPORT_SIZE, playerStart.x - VIEWPORT_SIZE / 2)),
          y: Math.max(0, Math.min(WORLD_SIZE - VIEWPORT_SIZE, playerStart.y - VIEWPORT_SIZE / 2))
        })
      }
    }

    // Generate bot snakes with better spacing
    const actualBotCount = BOT_COUNT
    for (let i = 0; i < actualBotCount; i++) {
      let startPos: Position = generateRandomPosition()
      let attempts = 0
      
      // Try to find a position that's not too close to other snakes
      while (attempts < 20 && initialSnakes.some(snake => {
        const distance = Math.sqrt(
          (startPos.x - snake.segments[0].x) ** 2 + 
          (startPos.y - snake.segments[0].y) ** 2
        )
        return distance < 150 // Minimum distance between snakes
      })) {
        startPos = generateRandomPosition()
        attempts++
      }
      
      const segments = createSnakeSegments(startPos, 5)
      
      initialSnakes.push({
        id: `bot${i}`,
        isPlayer: false,
        segments,
        color: getSnakeColor(`bot${i}`),
        score: isPreview ? Math.floor(Math.random() * 50) + 10 : 0,
        speed: SNAKE_SPEED + Math.random() * 0.4 - 0.2, // Vary speed more
        angle: Math.random() * 2 * Math.PI,
        radius: BASE_SNAKE_RADIUS + (isPreview ? Math.floor(Math.random() * 6) : 0),
        isDead: false
      })
    }

    console.log(`Initialized ${initialSnakes.length} snakes (${initialSnakes.filter(s => s.isPlayer).length} player, ${initialSnakes.filter(s => !s.isPlayer).length} bots)`)

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
        if (checkCollision(head, snake.radius * 1.2, newFood[i].position, newFood[i].radius)) {
          // Eat food
          newFood.splice(i, 1)
          newSnake.score += 1
          newSnake.radius = Math.min(snake.radius + 0.2, 15) // Grow but cap size
          
          // Add new segment properly at tail
          const tail = snake.segments[snake.segments.length - 1]
          const secondToTail = snake.segments.length > 1 ? snake.segments[snake.segments.length - 2] : tail
          
          // Calculate direction from second-to-tail to tail
          const dx = tail.x - secondToTail.x
          const dy = tail.y - secondToTail.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          let newSegmentX, newSegmentY
          if (distance > 0) {
            // Place new segment behind the tail
            const unitX = dx / distance
            const unitY = dy / distance
            newSegmentX = tail.x + unitX * snake.radius * 1.5
            newSegmentY = tail.y + unitY * snake.radius * 1.5
          } else {
            // Fallback if segments are too close
            newSegmentX = tail.x + snake.radius * 1.5
            newSegmentY = tail.y
          }
          
          // Add new segment
          newSnake.segments = [...snake.segments, {
            x: newSegmentX,
            y: newSegmentY
          }]

          if (snake.isPlayer) {
            scoreIncrease += 1
          }
          
          // Spawn new food
          newFood.push(generateFood())
          break
        }
      }

      // Check wall collision with margin - but only in non-preview mode
      if (!isPreview && (head.x <= snake.radius || head.x >= WORLD_SIZE - snake.radius ||
          head.y <= snake.radius || head.y >= WORLD_SIZE - snake.radius)) {
        newSnake.isDead = true
        console.log(`Snake ${snake.id} hit wall at (${head.x}, ${head.y})`)
      }

      // Check self-collision (DISABLED FOR ALL SNAKES - no snake can hit itself)
      // Self-collision disabled - snakes can cross their own body
      
      // Check snake-to-snake collision with smaller hitbox - but enable collision in preview mode too
      if (!newSnake.isDead) {
        for (const otherSnake of currentSnakes) {
          if (otherSnake.id === snake.id || otherSnake.isDead) continue
          
          // Check collision with other snake's segments (smaller hitbox for better survival)
          for (let i = 0; i < otherSnake.segments.length; i++) {
            if (checkCollision(head, snake.radius * 0.5, otherSnake.segments[i], otherSnake.radius * 0.5)) {
              newSnake.isDead = true
              console.log(`Snake ${snake.id} collided with snake ${otherSnake.id} at segment ${i}`)
              break
            }
          }
          if (newSnake.isDead) break
        }
      }

      // If snake died, drop food for each segment - works in all modes
      if (newSnake.isDead && !snake.isDead) {
        console.log(`Snake ${snake.id} died, dropping ${snake.segments.length} food pieces`)
        snake.segments.forEach((segment, index) => {
          // Add some randomness to food placement
          const offsetX = (Math.random() - 0.5) * snake.radius * 2
          const offsetY = (Math.random() - 0.5) * snake.radius * 2
          
          newFood.push({
            position: { 
              x: Math.max(10, Math.min(WORLD_SIZE - 10, segment.x + offsetX)), 
              y: Math.max(10, Math.min(WORLD_SIZE - 10, segment.y + offsetY))
            },
            color: COLORS.FOOD[Math.floor(Math.random() * COLORS.FOOD.length)],
            radius: 4 + Math.random() * 2 // Vary food size
          })
        })
      }

      return newSnake
    })

    return [updatedSnakes, newFood, scoreIncrease]
  }, [checkCollision, generateFood])

  // Update bot AI with limited turning radius
  const updateBotAI = useCallback((bot: Snake, allSnakes: Snake[], allFood: Food[]): number | null => {
    if (bot.isDead || allFood.length === 0) return null

    const head = bot.segments[0]
    const currentDirection = bot.angle || 0
    
    // In preview mode, ensure snakes visit center area frequently
    if (isPreview) {
      const centerX = WORLD_SIZE / 2
      const centerY = WORLD_SIZE / 2
      
      // Calculate distance to center
      const distanceToCenter = Math.sqrt(
        (head.x - centerX) ** 2 + (head.y - centerY) ** 2
      )
      
      // Strong bias towards center if far away, or random chance to visit center
      if (distanceToCenter > VIEWPORT_SIZE * 0.6 || Math.random() < 0.3) {
        const centerAngle = Math.atan2(centerY - head.y, centerX - head.x)
        
        // Limit turning radius - max 0.15 radians per frame (realistic turning)
        const angleDiff = centerAngle - currentDirection
        const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff))
        const maxTurn = 0.15
        const limitedTurn = Math.max(-maxTurn, Math.min(maxTurn, normalizedDiff))
        
        return currentDirection + limitedTurn + (Math.random() - 0.5) * 0.1
      }
    }
    
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

    // CRITICAL: Limit turning radius to prevent impossible turns
    const angleDiff = targetAngle - currentDirection
    const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff))
    const maxTurn = 0.12 // Maximum turning radius per frame
    const limitedTurn = Math.max(-maxTurn, Math.min(maxTurn, normalizedDiff))
    
    // Add some randomness but keep it realistic
    const randomOffset = (Math.random() - 0.5) * 0.05 // Reduced randomness
    return currentDirection + limitedTurn + randomOffset
  }, [isPreview, WORLD_SIZE])

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

  // Initialize game
  useEffect(() => {
    if (isPlaying) {
      initializeGame()
    }
  }, [isPlaying, initializeGame])

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

        // In preview mode, respawn dead snakes to keep demo active
        let cleanedSnakes = finalSnakes
        if (isPreview) {
          // Respawn dead snakes in preview mode
          cleanedSnakes = finalSnakes.map(snake => {
            if (snake.isDead && Math.random() < 0.02) { // 2% chance per frame to respawn
              const newStartPos = generateRandomPosition()
              return {
                ...snake,
                isDead: false,
                segments: createSnakeSegments(newStartPos, 5),
                angle: Math.random() * 2 * Math.PI,
                radius: BASE_SNAKE_RADIUS + Math.floor(Math.random() * 6),
                score: Math.floor(Math.random() * 50) + 10
              }
            }
            return snake
          })
        } else {
          // Clean up dead snakes in non-preview mode
          cleanedSnakes = finalSnakes.filter(snake => {
            if (snake.isDead && !snake.isPlayer) {
              // Remove dead bot snakes after they've been dead
              return false
            }
            return true
          })
        }

        // Check win conditions and game end
        const playerSnake = cleanedSnakes.find(s => s.isPlayer)
        const aliveSnakes = cleanedSnakes.filter(s => !s.isDead)
        const aliveBots = aliveSnakes.filter(s => !s.isPlayer)
        
        if (!isPreview) {
          // Check if player died
          if (playerSnake?.isDead) {
            setGameEnded(true)
            onGameOver?.(playerScore + scoreIncrease)
          }
          // Check if player won (last snake alive or highest score when time runs out)
          else if (aliveBots.length === 0 && playerSnake && !playerSnake.isDead) {
            setGameEnded(true)
            onGameWin?.(playerScore + scoreIncrease, true)
          }
        }

        return cleanedSnakes
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
          // Check if player has highest score when time runs out
          const playerSnake = snakes.find(s => s.isPlayer)
          const allScores = snakes.map(s => s.score)
          const maxScore = Math.max(...allScores)
          const isWinner = playerSnake && playerSnake.score === maxScore
          
          if (isWinner) {
            onGameWin?.(playerScore, true)
          } else {
            onGameOver?.(playerScore)
          }
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
      // In preview mode, keep camera static at center
      setCamera({
        x: (WORLD_SIZE - VIEWPORT_SIZE) / 2,
        y: (WORLD_SIZE - VIEWPORT_SIZE) / 2
      })
      return
    }

    const playerSnake = snakes.find(s => s.isPlayer)
    if (playerSnake && playerSnake.segments.length > 0 && !playerSnake.isDead) {
      const head = playerSnake.segments[0]
      
      // Camera follows player smoothly, even when player moves to edges
      const newCameraX = Math.max(0, Math.min(WORLD_SIZE - VIEWPORT_SIZE, head.x - VIEWPORT_SIZE / 2))
      const newCameraY = Math.max(0, Math.min(WORLD_SIZE - VIEWPORT_SIZE, head.y - VIEWPORT_SIZE / 2))
      
      setCamera({
        x: newCameraX,
        y: newCameraY
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
    ctx.fillStyle = '#0a0c1a'
    ctx.fillRect(0, 0, VIEWPORT_SIZE, VIEWPORT_SIZE)

    // Draw world boundaries/walls
    ctx.strokeStyle = '#8b5cf6'
    ctx.lineWidth = 3
    ctx.setLineDash([])
    
    // Draw world border if visible
    const worldLeft = -camera.x
    const worldTop = -camera.y
    const worldRight = WORLD_SIZE - camera.x
    const worldBottom = WORLD_SIZE - camera.y
    
    if (worldLeft >= -10 && worldLeft <= VIEWPORT_SIZE + 10) {
      // Left wall
      ctx.beginPath()
      ctx.moveTo(worldLeft, Math.max(0, worldTop))
      ctx.lineTo(worldLeft, Math.min(VIEWPORT_SIZE, worldBottom))
      ctx.stroke()
    }
    if (worldRight >= -10 && worldRight <= VIEWPORT_SIZE + 10) {
      // Right wall
      ctx.beginPath()
      ctx.moveTo(worldRight, Math.max(0, worldTop))
      ctx.lineTo(worldRight, Math.min(VIEWPORT_SIZE, worldBottom))
      ctx.stroke()
    }
    if (worldTop >= -10 && worldTop <= VIEWPORT_SIZE + 10) {
      // Top wall
      ctx.beginPath()
      ctx.moveTo(Math.max(0, worldLeft), worldTop)
      ctx.lineTo(Math.min(VIEWPORT_SIZE, worldRight), worldTop)
      ctx.stroke()
    }
    if (worldBottom >= -10 && worldBottom <= VIEWPORT_SIZE + 10) {
      // Bottom wall
      ctx.beginPath()
      ctx.moveTo(Math.max(0, worldLeft), worldBottom)
      ctx.lineTo(Math.min(VIEWPORT_SIZE, worldRight), worldBottom)
      ctx.stroke()
    }

    // Draw food with neon glow
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

    // Draw snakes with proper visibility - dead snakes should not be drawn
    snakes.forEach(snake => {
      if (snake.isDead) return // Dead snakes are never drawn, regardless of mode

      snake.segments.forEach((segment, index) => {
        const screenX = segment.x - camera.x
        const screenY = segment.y - camera.y
        
        // More generous bounds checking for better visibility
        if (screenX >= -snake.radius - 20 && screenX <= VIEWPORT_SIZE + snake.radius + 20 && 
            screenY >= -snake.radius - 20 && screenY <= VIEWPORT_SIZE + snake.radius + 20) {
          
          const radius = index === 0 ? snake.radius + 1 : snake.radius
          
          // Draw snake segment
          ctx.fillStyle = snake.color
          ctx.beginPath()
          ctx.arc(screenX, screenY, radius, 0, 2 * Math.PI)
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
    if (!canvas || isPreview) return // Don't draw minimap in preview mode

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const mapSize = 60 // Canvas size is 60x60 as set in JSX
    const scale = mapSize / WORLD_SIZE

    // Clear mini-map with neon theme
    ctx.fillStyle = '#0a0c1a'
    ctx.fillRect(0, 0, mapSize, mapSize)

    // Draw world boundaries on mini-map with neon colors
    ctx.strokeStyle = '#8b5cf6'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, mapSize, mapSize)

    // Draw viewport indicator - show current camera view
    ctx.strokeStyle = '#00ffff'
    ctx.lineWidth = 1
    
    // Calculate viewport position on minimap
    const viewportX = (camera.x * scale)
    const viewportY = (camera.y * scale)
    const viewportWidth = (VIEWPORT_SIZE * scale)
    const viewportHeight = (VIEWPORT_SIZE * scale)
    
    // Draw viewport rectangle - this shows where the player is looking
    ctx.strokeRect(viewportX, viewportY, viewportWidth, viewportHeight)

    // Draw all live snakes as dots on minimap
    snakes.forEach(snake => {
      if (snake.segments.length > 0 && !snake.isDead) {
        const head = snake.segments[0]
        
        // Make sure snake position is within world bounds
        if (head.x >= 0 && head.x <= WORLD_SIZE && head.y >= 0 && head.y <= WORLD_SIZE) {
          ctx.fillStyle = snake.color
          ctx.beginPath()
          
          // Draw snake as a larger dot for better visibility
          const dotSize = snake.isPlayer ? 3 : 2
          ctx.arc(
            head.x * scale,
            head.y * scale,
            dotSize,
            0,
            2 * Math.PI
          )
          ctx.fill()
          
          // Draw player snake with extra white outline for visibility
          if (snake.isPlayer) {
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }
    })
  }, [snakes, camera, isPreview, WORLD_SIZE])

  return (
    <div className={`${isPreview ? 'w-full h-full' : 'relative min-h-screen bg-[#06010a] text-white grid place-items-center font-mono'}`}>
      {/* Top Panel */}
      {!isPreview && (
        <div className="absolute top-4 w-full flex justify-between px-8 items-center">
          <div className="text-green-400 text-lg font-bold">
            🎮 Game Live!
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            className="text-gray-400 hover:text-red-400 transition"
          >
            ← Back to Home
          </button>
        </div>
      )}

      {/* Center Game Canvas */}
      <div className="flex flex-col items-center">
        {!isPreview && (
          <>
            <div className="text-white text-xl font-semibold mb-1">Score: {playerScore}</div>
            <div className="text-purple-400 text-lg mb-3">
              Time: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
          </>
        )}

        <div className="relative w-[444px] h-[444px] bg-[#0a0c1a] border border-[#1c1f2e] rounded">
          <canvas
            ref={canvasRef}
            width={VIEWPORT_SIZE}
            height={VIEWPORT_SIZE}
            className="w-full h-full"
          />
          
          {/* Mini-map */}
          {!isPreview && (
            <div className="absolute bottom-2 right-2 w-[70px] h-[70px] border border-purple-400/50 bg-black/30 rounded p-1">
              <canvas
                ref={miniMapRef}
                width={60}
                height={60}
                className="w-full h-full border border-purple-500/60"
              />
            </div>
          )}

          {/* Joystick positioned inside game area at bottom center */}
          {!isPreview && (
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
        </div>

        {/* Instructions and Score */}
        {!isPreview && (
          <div className="mt-6 flex flex-col items-center">
            <p className="text-teal-400 text-sm mb-2">Use joystick to control your snake</p>
            <p className="text-cyan-300 font-bold">Score: {playerScore}</p>
          </div>
        )}
      </div>


    </div>
  )
}

export default SnakeGame