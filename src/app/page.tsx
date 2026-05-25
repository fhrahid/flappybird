'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Player {
  id: string
  name: string
  highScore: number
}

interface LeaderboardEntry {
  rank: number
  name: string
  highScore: number
}

interface ChatMessage {
  id: string
  playerName: string
  message: string
  timestamp: string
}

// Game constants
const GRAVITY = 0.5
const JUMP_FORCE = -8
const PIPE_SPEED = 3
const PIPE_GAP = 150
const PIPE_WIDTH = 60
const PIPE_SPAWN_RATE = 90
const BIRD_SIZE = 30
const GROUND_HEIGHT = 80

type GameState = 'NAME_INPUT' | 'READY' | 'PLAYING' | 'GAME_OVER'

export default function Home() {
  const [gameState, setGameState] = useState<GameState>('NAME_INPUT')
  const [player, setPlayer] = useState<Player | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [score, setScore] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [canSendMessage, setCanSendMessage] = useState(true)
  const [currentRank, setCurrentRank] = useState<number | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const gameLoopRef = useRef<number | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Game state refs for animation loop
  const birdRef = useRef({ y: 300, velocity: 0 })
  const pipesRef = useRef<Array<{ x: number; gapY: number; passed: boolean }>>([])
  const frameCountRef = useRef(0)
  const isPlayingRef = useRef(false)

  // Fetch leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard')
      if (res.ok) {
        const data = await res.json()
        setLeaderboard(data)
      }
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    }
  }, [])

  // Submit score
  const submitScore = useCallback(async (playerId: string, finalScore: number) => {
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, score: finalScore })
      })
      if (res.ok) {
        const data = await res.json()
        setCurrentRank(data.rank)
        fetchLeaderboard()
      }
    } catch (error) {
      console.error('Failed to submit score:', error)
    }
  }, [fetchLeaderboard])

  const [nameError, setNameError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle name submission
  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = playerName.trim()
    if (trimmedName.length < 2) {
      setNameError('Name must be at least 2 characters')
      return
    }
    if (trimmedName.length > 15) {
      setNameError('Name must be 15 characters or less')
      return
    }

    setIsSubmitting(true)
    setNameError('')

    try {
      const res = await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName })
      })
      const data = await res.json()
      if (res.ok) {
        setPlayer(data)
        setGameState('READY')
      } else {
        setNameError(data.error || 'Failed to submit name')
      }
    } catch (error) {
      console.error('Failed to create player:', error)
      setNameError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Start game
  const startGame = () => {
    setScore(0)
    birdRef.current = { y: 300, velocity: 0 }
    pipesRef.current = []
    frameCountRef.current = 0
    isPlayingRef.current = true
    setGameState('PLAYING')
  }

  // Game over
  const handleGameOver = useCallback(() => {
    isPlayingRef.current = false
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current)
    }
    setFinalScore(score)
    if (player) {
      submitScore(player.id, score)
    }
    setGameState('GAME_OVER')
  }, [score, player, submitScore])

  // Send chat message
  const sendMessage = async () => {
    if (!chatInput.trim() || !player || !canSendMessage) return

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, message: chatInput.trim() })
      })
      setChatInput('')
      setCanSendMessage(false)
      setTimeout(() => setCanSendMessage(true), 2000)
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  // Setup SSE for chat
  useEffect(() => {
    if (!player) return

    const eventSource = new EventSource('/api/chat/stream')
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type !== 'connected') {
          setChatMessages(prev => [...prev.slice(-49), data])
        }
      } catch {
        // Ignore parse errors
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
      // Reconnect after delay
      setTimeout(() => {
        if (player) {
          setChatMessages([])
        }
      }, 3000)
    }

    return () => {
      eventSource.close()
    }
  }, [player])

  // Auto-scroll chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages])

  // Fetch leaderboard periodically
  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 5000)
    return () => clearInterval(interval)
  }, [fetchLeaderboard])

  // Game rendering and loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const gameLoop = () => {
      const width = canvas.width
      const height = canvas.height

      // Clear canvas
      ctx.fillStyle = '#87CEEB'
      ctx.fillRect(0, 0, width, height)

      // Draw clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      for (let i = 0; i < 5; i++) {
        const cloudX = ((frameCountRef.current * 0.5 + i * 200) % (width + 100)) - 50
        const cloudY = 50 + i * 40
        ctx.beginPath()
        ctx.arc(cloudX, cloudY, 30, 0, Math.PI * 2)
        ctx.arc(cloudX + 30, cloudY - 10, 25, 0, Math.PI * 2)
        ctx.arc(cloudX + 60, cloudY, 30, 0, Math.PI * 2)
        ctx.fill()
      }

      if (gameState === 'PLAYING' && isPlayingRef.current) {
        frameCountRef.current++

        // Update bird
        birdRef.current.velocity += GRAVITY
        birdRef.current.y += birdRef.current.velocity

        // Spawn pipes
        if (frameCountRef.current % PIPE_SPAWN_RATE === 0) {
          const minGapY = 100
          const maxGapY = height - GROUND_HEIGHT - PIPE_GAP - 100
          pipesRef.current.push({
            x: width,
            gapY: minGapY + Math.random() * (maxGapY - minGapY),
            passed: false
          })
        }

        // Update pipes
        pipesRef.current = pipesRef.current.filter(pipe => {
          pipe.x -= PIPE_SPEED

          // Check if bird passed pipe
          if (!pipe.passed && pipe.x + PIPE_WIDTH < birdRef.current.y + BIRD_SIZE / 2) {
            pipe.passed = true
            setScore(s => s + 1)
          }

          // Collision detection
          const birdLeft = BIRD_SIZE / 2 - 12
          const birdRight = BIRD_SIZE / 2 + 12
          const birdTop = birdRef.current.y
          const birdBottom = birdRef.current.y + BIRD_SIZE

          const pipeLeft = pipe.x
          const pipeRight = pipe.x + PIPE_WIDTH

          if (birdRight > pipeLeft && birdLeft < pipeRight) {
            if (birdTop < pipe.gapY || birdBottom > pipe.gapY + PIPE_GAP) {
              handleGameOver()
              return false
            }
          }

          // Ground collision
          if (birdRef.current.y + BIRD_SIZE > height - GROUND_HEIGHT) {
            handleGameOver()
            return false
          }

          // Ceiling collision
          if (birdRef.current.y < 0) {
            birdRef.current.y = 0
            birdRef.current.velocity = 0
          }

          return pipe.x > -PIPE_WIDTH
        })

        // Draw pipes
        pipesRef.current.forEach(pipe => {
          ctx.fillStyle = '#2E8B57'
          ctx.strokeStyle = '#1a5a3a'
          ctx.lineWidth = 3

          // Top pipe
          ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY)
          ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY)

          // Top pipe cap
          ctx.fillStyle = '#3CB371'
          ctx.fillRect(pipe.x - 5, pipe.gapY - 25, PIPE_WIDTH + 10, 25)
          ctx.strokeRect(pipe.x - 5, pipe.gapY - 25, PIPE_WIDTH + 10, 25)

          // Bottom pipe
          ctx.fillStyle = '#2E8B57'
          const bottomY = pipe.gapY + PIPE_GAP
          ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH, height - bottomY - GROUND_HEIGHT)
          ctx.strokeRect(pipe.x, bottomY, PIPE_WIDTH, height - bottomY - GROUND_HEIGHT)

          // Bottom pipe cap
          ctx.fillStyle = '#3CB371'
          ctx.fillRect(pipe.x - 5, bottomY, PIPE_WIDTH + 10, 25)
          ctx.strokeRect(pipe.x - 5, bottomY, PIPE_WIDTH + 10, 25)
        })

        // Draw bird
        const birdY = birdRef.current.y
        const rotation = Math.min(Math.max(birdRef.current.velocity * 3, -30), 90)

        ctx.save()
        ctx.translate(width / 4, birdY + BIRD_SIZE / 2)
        ctx.rotate((rotation * Math.PI) / 180)

        // Bird body
        ctx.fillStyle = '#FFD700'
        ctx.beginPath()
        ctx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2)
        ctx.fill()

        // Wing
        ctx.fillStyle = '#FFC800'
        ctx.beginPath()
        ctx.ellipse(-3, 3, 8, 6, -0.3, 0, Math.PI * 2)
        ctx.fill()

        // Eye
        ctx.fillStyle = 'white'
        ctx.beginPath()
        ctx.arc(8, -3, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'black'
        ctx.beginPath()
        ctx.arc(10, -3, 3, 0, Math.PI * 2)
        ctx.fill()

        // Beak
        ctx.fillStyle = '#FF8C00'
        ctx.beginPath()
        ctx.moveTo(15, 0)
        ctx.lineTo(25, 3)
        ctx.lineTo(15, 6)
        ctx.closePath()
        ctx.fill()

        ctx.restore()
      } else {
        // Draw static bird in idle position
        const idleY = height / 2 - 50 + Math.sin(Date.now() / 300) * 10

        ctx.save()
        ctx.translate(width / 2, idleY)
        ctx.rotate(0)

        ctx.fillStyle = '#FFD700'
        ctx.beginPath()
        ctx.ellipse(0, 0, 15, 12, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#FFC800'
        ctx.beginPath()
        ctx.ellipse(-3, 3, 8, 6, -0.3, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = 'white'
        ctx.beginPath()
        ctx.arc(8, -3, 6, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'black'
        ctx.beginPath()
        ctx.arc(10, -3, 3, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#FF8C00'
        ctx.beginPath()
        ctx.moveTo(15, 0)
        ctx.lineTo(25, 3)
        ctx.lineTo(15, 6)
        ctx.closePath()
        ctx.fill()

        ctx.restore()
      }

      // Draw ground
      ctx.fillStyle = '#228B22'
      ctx.fillRect(0, height - GROUND_HEIGHT, width, 20)

      ctx.fillStyle = '#8B4513'
      ctx.fillRect(0, height - GROUND_HEIGHT + 20, width, GROUND_HEIGHT - 20)

      // Ground pattern
      ctx.fillStyle = '#6B3410'
      for (let i = 0; i < width + 40; i += 40) {
        const offsetX = (frameCountRef.current * 2) % 40
        ctx.fillRect(i - offsetX, height - GROUND_HEIGHT + 25, 20, 10)
      }

      if (gameState === 'PLAYING') {
        gameLoopRef.current = requestAnimationFrame(gameLoop)
      }
    }

    if (gameState === 'PLAYING') {
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    } else {
      gameLoop()
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameState, handleGameOver])

  // Handle jump
  const handleJump = useCallback(() => {
    if (gameState === 'PLAYING') {
      birdRef.current.velocity = JUMP_FORCE
    } else if (gameState === 'READY') {
      startGame()
      setTimeout(() => {
        birdRef.current.velocity = JUMP_FORCE
      }, 0)
    }
  }, [gameState])

  // Keyboard and click handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        handleJump()
      }
      if (e.code === 'Enter' && gameState !== 'NAME_INPUT' && document.activeElement?.id !== 'chat-input') {
        e.preventDefault()
        if (gameState === 'READY') {
          startGame()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleJump, gameState])

  // Get player color for chat
  const getPlayerColor = (name: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <main className="min-h-screen flex flex-col items-center p-4">
      {/* Header */}
      <header className="glass-panel w-full max-w-4xl p-4 mb-4 flex items-center justify-between">
        <h1 className="text-neon text-lg md:text-xl font-pixel text-shadow-glow">
          FLAPPY BIRD
        </h1>
        {player && (
          <div className="flex items-center gap-4">
            <span className="text-white text-xs font-pixel">
              {player.name}
            </span>
            {player.highScore > 0 && (
              <span className="text-yellow-400 text-xs font-pixel">
                BEST: {player.highScore}
              </span>
            )}
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-4 w-full max-w-4xl">
        {/* Game area */}
        <div className="flex-1 flex flex-col items-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={400}
              height={600}
              className="rounded-lg border-4 border-dark shadow-2xl cursor-pointer"
              onClick={handleJump}
            />

            {/* Overlay for READY state */}
            {gameState === 'READY' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-lg">
                <p className="text-white text-sm font-pixel mb-4 animate-pulse">
                  CLICK OR PRESS SPACE TO START
                </p>
                <div className="text-neon text-xs font-pixel">
                  {score === 0 ? 'READY!' : `Score: ${score}`}
                </div>
              </div>
            )}

            {/* Game over overlay */}
            {gameState === 'GAME_OVER' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg">
                <h2 className="text-red-500 text-xl font-pixel mb-4">GAME OVER</h2>
                <p className="text-white text-sm font-pixel mb-2">Score: {finalScore}</p>
                {currentRank && (
                  <p className="text-neon text-xs font-pixel mb-4">Rank: #{currentRank}</p>
                )}
                <button
                  onClick={startGame}
                  className="bg-neon text-dark px-6 py-3 rounded font-pixel text-xs hover:bg-green-400 transition-colors"
                >
                  PLAY AGAIN
                </button>
              </div>
            )}
          </div>

          {/* Score display */}
          <div className="glass-panel px-6 py-3 mt-4">
            <span className="text-white text-xs font-pixel">SCORE: </span>
            <span className="text-neon text-lg font-pixel text-shadow-glow">{score}</span>
          </div>
        </div>

        {/* Side panels */}
        <div className="flex flex-col gap-4 w-full lg:w-80">
          {/* Leaderboard */}
          <div className="glass-panel p-4">
            <h2 className="text-neon text-xs font-pixel mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-neon rounded-full animate-pulse"></span>
              TOP PLAYERS
            </h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {leaderboard.length === 0 ? (
                <p className="text-gray-400 text-xs font-pixel">No scores yet</p>
              ) : (
                leaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`flex items-center justify-between text-xs font-pixel ${
                      player && entry.name === player.name ? 'text-neon' : 'text-gray-300'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={
                        entry.rank === 1 ? 'text-yellow-400' :
                        entry.rank === 2 ? 'text-gray-300' :
                        entry.rank === 3 ? 'text-amber-600' : ''
                      }>
                        #{entry.rank}
                      </span>
                      <span className="truncate max-w-24">{entry.name}</span>
                    </span>
                    <span className="text-white">{entry.highScore}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="glass-panel p-4 flex-1 flex flex-col">
            <h2 className="text-neon text-xs font-pixel mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-neon rounded-full animate-pulse"></span>
              LIVE CHAT
            </h2>
            <div
              ref={chatContainerRef}
              className="flex-1 min-h-48 max-h-64 overflow-y-auto mb-3 space-y-2"
            >
              {chatMessages.length === 0 ? (
                <p className="text-gray-500 text-xs font-pixel">No messages yet</p>
              ) : (
                chatMessages.map((msg) => (
                  <div key={msg.id} className="animate-slide-in">
                    <span
                      className="font-pixel text-xs"
                      style={{ color: getPlayerColor(msg.playerName) }}
                    >
                      {msg.playerName}:
                    </span>
                    <span className="text-gray-300 text-xs font-pixel ml-2">
                      {msg.message}
                    </span>
                  </div>
                ))
              )}
            </div>
            {player && (
              <div className="flex gap-2">
                <input
                  id="chat-input"
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value.slice(0, 100))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      sendMessage()
                    }
                  }}
                  placeholder={canSendMessage ? 'Type a message...' : 'Wait...'}
                  disabled={!canSendMessage}
                  className="flex-1 bg-dark/50 text-white text-xs font-pixel px-3 py-2 rounded border border-gray-700 focus:border-neon transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={!canSendMessage || !chatInput.trim()}
                  className="bg-neon text-dark px-4 py-2 rounded font-pixel text-xs hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  SEND
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Name input modal */}
      {gameState === 'NAME_INPUT' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="glass-panel p-8 max-w-md w-full mx-4 animate-float">
            <h2 className="text-neon text-lg font-pixel text-center mb-6 text-shadow-glow">
              ENTER YOUR NAME
            </h2>
            <form onSubmit={handleNameSubmit}>
              <input
                type="text"
                value={playerName}
                onChange={(e) => {
                  setPlayerName(e.target.value)
                  setNameError('')
                }}
                placeholder="Your name..."
                maxLength={15}
                autoFocus
                className="w-full bg-dark/50 text-white text-center font-pixel text-sm px-4 py-3 rounded border border-gray-700 focus:border-neon transition-colors mb-2"
              />
              {nameError && (
                <p className="text-red-400 text-xs font-pixel text-center mb-4">{nameError}</p>
              )}
              <button
                type="submit"
                disabled={isSubmitting || playerName.trim().length < 2}
                className="w-full bg-neon text-dark py-3 rounded font-pixel text-sm hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'PLEASE WAIT...' : 'START PLAYING'}
              </button>
            </form>
            <p className="text-gray-400 text-xs font-pixel text-center mt-4">
              2-15 characters
            </p>
          </div>
        </div>
      )}
    </main>
  )
}
