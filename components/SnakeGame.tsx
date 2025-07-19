import React, { useEffect, useRef, useState, useCallback } from 'react'

interface GameProps {
  isPlaying: boolean
  isBot?: boolean
  onScoreChange?: (score: number) => void
  onGameOver?: () => void
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
}

interface Food {
  position: Position
  color: string
  points: number
}

const GRID_SIZE = 400
const CELL_SIZE = 4
const GRID_CELLS = GRID_SIZE / CELL_SIZE
const GAME_SPEED = 100

export const SnakeGame: React.FC<GameProps> = ({ 
  isPlaying, 
  isBot = false, 
  onScoreChange, 
  onGameOver 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null)
  const [snakes, setSnakes] = useState<Snake[]>([])
  const [food, setFood] = useState<Food[]>([])
  const [playerScore, setPlayerScore] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [direction, setDirection] = useState({ x: 1, y: 0 })

  // Colors for different elements
  const COLORS = {
    PLAYER: '#3b82f6',
    BOT1: '#f97316',
    BOT2: '#22c55e', 
    BOT3: '#ef4444',
    BOT4: '#8b5cf6',
    FOOD_RED: '#ef4444',
    FOOD_GREEN: '#22c55e',
    FOOD_PURPLE: '#8b5cf6'
  }

  // Generate random position
  const generateRandomPosition = useCallback((): Position => {
    return {
      x: Math.floor(Math.random() * (GRID_CELLS - 2)) + 1,
      y: Math.floor(Math.random() * (GRID_CELLS - 2)) + 1
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

  // Initialize game
  const initializeGame = useCallback(() => {
    const initialSnakes: Snake[] = []
    
    // Player snake
    if (!isBot) {
      initialSnakes.push({
        id: 'player',
        positions: [{ x: 50, y: 50 }],
        direction: { x: 1, y: 0 },
        color: COLORS.PLAYER,
        score: 0,
        isPlayer: true
      })
    }

    // Bot snakes
    const botColors = [COLORS.BOT1, COLORS.BOT2, COLORS.BOT3, COLORS.BOT4]
    const numBots = isBot ? 4 : 3
    
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
        score: 0
      })
    }

    setSnakes(initialSnakes)

    // Generate initial food
    const initialFood: Food[] = []
    for (let i = 0; i < 15; i++) {
      initialFood.push(generateFood())
    }
    setFood(initialFood)
    setPlayerScore(0)
    setGameStarted(true)
  }, [isBot, generateRandomPosition, generateFood])

  // Move snake
  const moveSnake = useCallback((snake: Snake): Snake => {
    const head = snake.positions[0]
    const newHead = {
      x: head.x + snake.direction.x,
      y: head.y + snake.direction.y
    }

    // Check bounds - wrap around
    if (newHead.x < 0) newHead.x = GRID_CELLS - 1
    if (newHead.x >= GRID_CELLS) newHead.x = 0
    if (newHead.y < 0) newHead.y = GRID_CELLS - 1
    if (newHead.y >= GRID_CELLS) newHead.y = 0

    const newPositions = [newHead, ...snake.positions]
    
    // Remove tail (snake doesn't grow unless eating food)
    if (newPositions.length > 3 + Math.floor(snake.score / 10)) {
      newPositions.pop()
    }

    return {
      ...snake,
      positions: newPositions
    }
  }, [])

  // AI for bot snakes
  const updateBotDirection = useCallback((snake: Snake, allFood: Food[], allSnakes: Snake[]): { x: number, y: number } => {
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
      // Move towards food
      const dx = nearestFood.position.x - head.x
      const dy = nearestFood.position.y - head.y
      
      // Add some randomness
      if (Math.random() < 0.1) {
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
    while (newFood.length < 15) {
      newFood.push(generateFood())
    }

    return { newFood, points }
  }, [generateFood])

  // Check snake collision
  const checkSnakeCollision = useCallback((snake: Snake, allSnakes: Snake[]): boolean => {
    const head = snake.positions[0]
    
    // Check collision with other snakes
    for (const otherSnake of allSnakes) {
      if (otherSnake.id === snake.id) continue
      
      for (const segment of otherSnake.positions) {
        if (head.x === segment.x && head.y === segment.y) {
          return true
        }
      }
    }
    
    return false
  }, [])

  // Game loop
  const gameLoop = useCallback(() => {
    if (!isPlaying || !gameStarted) return

    setSnakes(currentSnakes => {
      const newSnakes = currentSnakes.map(snake => {
        // Update bot direction
        if (!snake.isPlayer) {
          snake.direction = updateBotDirection(snake, food, currentSnakes)
        } else {
          snake.direction = direction
        }

        // Move snake
        const movedSnake = moveSnake(snake)

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
          if (snake.isPlayer) {
            onGameOver?.()
          }
          // Remove collided snake (for bots)
          return null
        }

        return movedSnake
      }).filter(Boolean) as Snake[]

      return newSnakes
    })
  }, [isPlaying, gameStarted, direction, food, moveSnake, updateBotDirection, checkFoodCollision, checkSnakeCollision, onScoreChange, onGameOver])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isPlaying || isBot) return

      switch (e.key) {
        case 'ArrowUp':
          setDirection({ x: 0, y: -1 })
          break
        case 'ArrowDown':
          setDirection({ x: 0, y: 1 })
          break
        case 'ArrowLeft':
          setDirection({ x: -1, y: 0 })
          break
        case 'ArrowRight':
          setDirection({ x: 1, y: 0 })
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying, isBot])

  // Game loop effect
  useEffect(() => {
    if (isPlaying && gameStarted) {
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
  }, [isPlaying, gameStarted, gameLoop])

  // Initialize game when component mounts or isPlaying changes
  useEffect(() => {
    if (isPlaying) {
      initializeGame()
    }
  }, [isPlaying, initializeGame])

  // Drawing function
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#f8f8f8'
    ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE)

    // Draw grid dots
    ctx.fillStyle = '#e0e0e0'
    for (let x = 0; x < GRID_CELLS; x += 5) {
      for (let y = 0; y < GRID_CELLS; y += 5) {
        ctx.fillRect(x * CELL_SIZE + 1, y * CELL_SIZE + 1, 2, 2)
      }
    }

    // Draw food
    food.forEach(f => {
      ctx.fillStyle = f.color
      ctx.beginPath()
      ctx.arc(
        f.position.x * CELL_SIZE + CELL_SIZE / 2,
        f.position.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2,
        0,
        2 * Math.PI
      )
      ctx.fill()
    })

    // Draw snakes
    snakes.forEach(snake => {
      snake.positions.forEach((pos, index) => {
        ctx.fillStyle = snake.color
        if (index === 0) {
          // Draw head as circle
          ctx.beginPath()
          ctx.arc(
            pos.x * CELL_SIZE + CELL_SIZE / 2,
            pos.y * CELL_SIZE + CELL_SIZE / 2,
            CELL_SIZE / 2,
            0,
            2 * Math.PI
          )
          ctx.fill()
        } else {
          // Draw body as rounded rectangle
          ctx.fillRect(pos.x * CELL_SIZE, pos.y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
        }
      })
    })
  }, [snakes, food])

  return (
    <div className="snake-game-container">
      <canvas
        ref={canvasRef}
        width={GRID_SIZE}
        height={GRID_SIZE}
        style={{
          border: '2px solid #ddd',
          borderRadius: '8px',
          background: '#f8f8f8'
        }}
      />
      {!isBot && (
        <div className="game-controls mt-4 text-center">
          <p className="text-sm text-gray-600 mb-2">
            Use arrow keys to control your snake
          </p>
          <p className="text-lg font-bold text-purple-800">
            Score: {playerScore}
          </p>
        </div>
      )}
    </div>
  )
}