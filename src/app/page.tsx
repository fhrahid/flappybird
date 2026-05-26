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
const GRAVITY = 0.35
const JUMP_FORCE = -7
const PIPE_SPEED = 2
const PIPE_GAP = 160
const PIPE_WIDTH = 60
const PIPE_SPAWN_RATE = 120
const BIRD_SIZE = 30
const GROUND_HEIGHT = 80
const BIRD_X_POSITION = 100

type GameState = 'NAME_INPUT' | 'READY' | 'PLAYING' | 'GAME_OVER'

const PLAYER_STORAGE_KEY = 'flappybird_player'
const MESSAGES_STORAGE_KEY = 'flappybird_messages'
const MAX_MESSAGES = 100

// Sound manager
class SoundManager {
  private audioContext: AudioContext | null = null

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return this.audioContext
  }

  playJump() {
    try {
      const ctx = this.getContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.setValueAtTime(400, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1)
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.1)
    } catch (e) {}
  }

  playClick() {
    try {
      const ctx = this.getContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(800, ctx.currentTime)
      gainNode.gain.setValueAtTime(0.15, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.05)
    } catch (e) {}
  }

  playGameOver() {
    try {
      const ctx = this.getContext()
      const frequencies = [300, 250, 200]
      frequencies.forEach((freq, i) => {
        const oscillator = ctx.createOscillator()
        const gainNode = ctx.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(ctx.destination)
        oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15)
        oscillator.type = 'sawtooth'
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15)
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.15)
        oscillator.start(ctx.currentTime + i * 0.15)
        oscillator.stop(ctx.currentTime + i * 0.15 + 0.15)
      })
    } catch (e) {}
  }

  playScore() {
    try {
      const ctx = this.getContext()
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      oscillator.frequency.setValueAtTime(880, ctx.currentTime)
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.05)
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.1)
    } catch (e) {}
  }
}

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
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameContainerRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const gameLoopRef = useRef<number | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const soundManagerRef = useRef<SoundManager>(new SoundManager())

  const birdRef = useRef({ y: 180, velocity: 0 })
  const pipesRef = useRef<Array<{ x: number; gapY: number; passed: boolean }>>([])
  const frameCountRef = useRef(0)
  const isPlayingRef = useRef(false)
  const gameOverTriggeredRef = useRef(false)
  const lastScoreRef = useRef(0)

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024 || 'ontouchstart' in window)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fullscreen functions
  const enterFullscreen = () => {
    const elem = document.documentElement
    if (elem.requestFullscreen) {
      elem.requestFullscreen()
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen()
    }
    setIsFullscreen(true)
  }

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen()
    }
    setIsFullscreen(false)
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Load player and messages
  useEffect(() => {
    const stored = localStorage.getItem(PLAYER_STORAGE_KEY)
    if (stored) {
      try {
        const playerData = JSON.parse(stored)
        setPlayer(playerData)
        setGameState('READY')
      } catch {
        localStorage.removeItem(PLAYER_STORAGE_KEY)
      }
    }

    const cachedMessages = localStorage.getItem(MESSAGES_STORAGE_KEY)
    if (cachedMessages) {
      try {
        setChatMessages(JSON.parse(cachedMessages))
      } catch {
        localStorage.removeItem(MESSAGES_STORAGE_KEY)
      }
    }
  }, [])

  useEffect(() => {
    if (player) localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify(player))
  }, [player])

  useEffect(() => {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(chatMessages))
  }, [chatMessages])

  const playSound = (sound: 'jump' | 'click' | 'gameOver' | 'score') => {
    if (!soundEnabled) return
    const manager = soundManagerRef.current
    switch (sound) {
      case 'jump': manager.playJump(); break
      case 'click': manager.playClick(); break
      case 'gameOver': manager.playGameOver(); break
      case 'score': manager.playScore(); break
    }
  }

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard')
      if (res.ok) setLeaderboard(await res.json())
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error)
    }
  }, [])

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
        // Update player highScore locally
        setPlayer(prev => prev ? { ...prev, highScore: data.highScore } : prev)
        fetchLeaderboard()
      }
    } catch (error) {
      console.error('Failed to submit score:', error)
    }
  }, [fetchLeaderboard])

  const [nameError, setNameError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    playSound('click')
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

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      const res = await fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      const data = await res.json()
      if (res.ok) {
        setPlayer(data)
        setGameState('READY')
      } else {
        setNameError(data.error || 'Failed to submit name')
        setIsSubmitting(false)
      }
    } catch (error: any) {
      clearTimeout(timeoutId)
      setNameError(error.name === 'AbortError' ? 'Server timeout.' : 'Network error.')
      setIsSubmitting(false)
    }
  }

  const startGame = () => {
    playSound('jump')
    setScore(0)
    birdRef.current = { y: 180, velocity: 0 }
    pipesRef.current = []
    frameCountRef.current = 0
    isPlayingRef.current = true
    gameOverTriggeredRef.current = false
    lastScoreRef.current = 0
    setGameState('PLAYING')

    // Auto fullscreen on mobile
    if (isMobile && !isFullscreen) {
      setTimeout(enterFullscreen, 100)
    }
  }

  const handleGameOver = useCallback(() => {
    if (gameOverTriggeredRef.current) return
    gameOverTriggeredRef.current = true
    playSound('gameOver')

    isPlayingRef.current = false
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
    setFinalScore(score)
    if (player) submitScore(player.id, score)
    setGameState('GAME_OVER')
  }, [score, player, submitScore])

  const sendMessage = async () => {
    playSound('click')
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

  useEffect(() => {
    if (!player) return

    const eventSource = new EventSource('/api/chat/stream')
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type !== 'connected') {
          setChatMessages(prev => {
            const newMessages = [...prev, data]
            return newMessages.length > MAX_MESSAGES ? newMessages.slice(-MAX_MESSAGES) : newMessages
          })
        }
      } catch {}
    }

    eventSource.onerror = () => eventSource.close()
    return () => eventSource.close()
  }, [player])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages])

  useEffect(() => {
    fetchLeaderboard()
    const interval = setInterval(fetchLeaderboard, 5000)
    return () => clearInterval(interval)
  }, [fetchLeaderboard])

  // Canvas dimensions
  const getCanvasDimensions = () => {
    if (isFullscreen) {
      return { width: window.innerWidth, height: window.innerHeight, isFullscreen: true }
    }
    const maxWidth = Math.min(window.innerWidth - 32, 400)
    const maxHeight = Math.min(window.innerHeight - 250, 600)
    let width = maxWidth
    let height = width * 1.5
    if (height > maxHeight) {
      height = maxHeight
      width = height / 1.5
    }
    return { width: Math.floor(width), height: Math.floor(height), isFullscreen: false }
  }

  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 600, isFullscreen: false })

  useEffect(() => {
    const updateSize = () => {
      setCanvasSize(getCanvasDimensions())
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    window.addEventListener('orientationchange', updateSize)
    return () => {
      window.removeEventListener('resize', updateSize)
      window.removeEventListener('orientationchange', updateSize)
    }
  }, [isFullscreen])

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const scaleX = canvasSize.width / 400
    const scaleY = canvasSize.height / 600
    const scaledBirdX = BIRD_X_POSITION * scaleX
    const scaledGroundHeight = GROUND_HEIGHT * scaleY

    const gameLoop = () => {
      const width = canvas.width
      const height = canvas.height

      ctx.fillStyle = '#87CEEB'
      ctx.fillRect(0, 0, width, height)

      // Clouds
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      for (let i = 0; i < 5; i++) {
        const cloudX = ((frameCountRef.current * 0.5 + i * 200) % (width + 100)) - 50
        const cloudY = 50 + i * 40
        ctx.beginPath()
        ctx.arc(cloudX * scaleX, cloudY * scaleY, 30 * scaleX, 0, Math.PI * 2)
        ctx.arc((cloudX + 30) * scaleX, (cloudY - 10) * scaleY, 25 * scaleX, 0, Math.PI * 2)
        ctx.arc((cloudX + 60) * scaleX, cloudY * scaleY, 30 * scaleX, 0, Math.PI * 2)
        ctx.fill()
      }

      if (gameState === 'PLAYING' && isPlayingRef.current) {
        frameCountRef.current++

        birdRef.current.velocity += GRAVITY
        birdRef.current.y += birdRef.current.velocity

        // Ceiling
        if (birdRef.current.y < 0) {
          birdRef.current.y = 0
          birdRef.current.velocity = 0
        }

        // Ground
        if (birdRef.current.y + BIRD_SIZE > height - scaledGroundHeight) {
          birdRef.current.y = height - scaledGroundHeight - BIRD_SIZE
          handleGameOver()
          gameLoopRef.current = requestAnimationFrame(gameLoop)
          return
        }

        // Spawn pipes
        if (frameCountRef.current % PIPE_SPAWN_RATE === 0) {
          const minGapY = 100 * scaleY
          const maxGapY = height - scaledGroundHeight - PIPE_GAP * scaleY - 100 * scaleY
          pipesRef.current.push({
            x: width,
            gapY: minGapY + Math.random() * (maxGapY - minGapY),
            passed: false
          })
        }

        // Update pipes
        pipesRef.current = pipesRef.current.filter(pipe => {
          pipe.x -= PIPE_SPEED * scaleX

          if (!pipe.passed && pipe.x + PIPE_WIDTH * scaleX < scaledBirdX) {
            pipe.passed = true
            setScore(s => {
              if (s >= lastScoreRef.current) {
                lastScoreRef.current = s + 1
                playSound('score')
              }
              return s + 1
            })
          }

          const birdLeft = scaledBirdX - 10 * scaleX
          const birdRight = scaledBirdX + 15 * scaleX
          const birdTop = birdRef.current.y + 5 * scaleY
          const birdBottom = birdRef.current.y + BIRD_SIZE * scaleY - 5 * scaleY

          const pipeLeft = pipe.x + 3 * scaleX
          const pipeRight = pipe.x + PIPE_WIDTH * scaleX - 3 * scaleX

          if (birdRight > pipeLeft && birdLeft < pipeRight) {
            if (birdTop < pipe.gapY || birdBottom > pipe.gapY + PIPE_GAP * scaleY) {
              handleGameOver()
              return false
            }
          }

          return pipe.x > -PIPE_WIDTH * scaleX
        })

        // Draw pipes
        pipesRef.current.forEach(pipe => {
          ctx.fillStyle = '#2E8B57'
          ctx.strokeStyle = '#1a5a3a'
          ctx.lineWidth = 3

          ctx.fillRect(pipe.x, 0, PIPE_WIDTH * scaleX, pipe.gapY)
          ctx.strokeRect(pipe.x, 0, PIPE_WIDTH * scaleX, pipe.gapY)

          ctx.fillStyle = '#3CB371'
          ctx.fillRect(pipe.x - 5 * scaleX, pipe.gapY - 25 * scaleY, PIPE_WIDTH * scaleX + 10 * scaleX, 25 * scaleY)
          ctx.strokeRect(pipe.x - 5 * scaleX, pipe.gapY - 25 * scaleY, PIPE_WIDTH * scaleX + 10 * scaleX, 25 * scaleY)

          ctx.fillStyle = '#2E8B57'
          const bottomY = pipe.gapY + PIPE_GAP * scaleY
          ctx.fillRect(pipe.x, bottomY, PIPE_WIDTH * scaleX, height - bottomY - scaledGroundHeight)
          ctx.strokeRect(pipe.x, bottomY, PIPE_WIDTH * scaleX, height - bottomY - scaledGroundHeight)

          ctx.fillStyle = '#3CB371'
          ctx.fillRect(pipe.x - 5 * scaleX, bottomY, PIPE_WIDTH * scaleX + 10 * scaleX, 25 * scaleY)
          ctx.strokeRect(pipe.x - 5 * scaleX, bottomY, PIPE_WIDTH * scaleX + 10 * scaleX, 25 * scaleY)
        })

        // Draw bird
        const birdY = birdRef.current.y
        const rotation = Math.min(Math.max(birdRef.current.velocity * 3, -30), 90)

        ctx.save()
        ctx.translate(scaledBirdX, birdY + (BIRD_SIZE * scaleY) / 2)
        ctx.rotate((rotation * Math.PI) / 180)

        const s = scaleX

        ctx.fillStyle = '#FFD700'
        ctx.beginPath()
        ctx.ellipse(0, 0, 15 * s, 12 * s, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#FFC800'
        ctx.beginPath()
        ctx.ellipse(-3 * s, 3 * s, 8 * s, 6 * s, -0.3, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = 'white'
        ctx.beginPath()
        ctx.arc(8 * s, -3 * s, 6 * s, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'black'
        ctx.beginPath()
        ctx.arc(10 * s, -3 * s, 3 * s, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#FF8C00'
        ctx.beginPath()
        ctx.moveTo(15 * s, 0)
        ctx.lineTo(25 * s, 3 * s)
        ctx.lineTo(15 * s, 6 * s)
        ctx.closePath()
        ctx.fill()

        ctx.restore()
      } else {
        // Idle bird
        const idleY = height / 3 + Math.sin(Date.now() / 300) * 10

        ctx.save()
        ctx.translate(scaledBirdX, idleY)

        const s = scaleX

        ctx.fillStyle = '#FFD700'
        ctx.beginPath()
        ctx.ellipse(0, 0, 15 * s, 12 * s, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#FFC800'
        ctx.beginPath()
        ctx.ellipse(-3 * s, 3 * s, 8 * s, 6 * s, -0.3, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = 'white'
        ctx.beginPath()
        ctx.arc(8 * s, -3 * s, 6 * s, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'black'
        ctx.beginPath()
        ctx.arc(10 * s, -3 * s, 3 * s, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#FF8C00'
        ctx.beginPath()
        ctx.moveTo(15 * s, 0)
        ctx.lineTo(25 * s, 3 * s)
        ctx.lineTo(15 * s, 6 * s)
        ctx.closePath()
        ctx.fill()

        ctx.restore()
      }

      // Ground
      ctx.fillStyle = '#228B22'
      ctx.fillRect(0, height - scaledGroundHeight, width, 20)
      ctx.fillStyle = '#8B4513'
      ctx.fillRect(0, height - scaledGroundHeight + 20, width, scaledGroundHeight - 20)
      ctx.fillStyle = '#6B3410'
      for (let i = 0; i < width + 40; i += 40) {
        const offsetX = (frameCountRef.current * 2) % 40
        ctx.fillRect(i - offsetX, height - scaledGroundHeight + 25, 20, 10)
      }

      // Score
      if (gameState === 'PLAYING') {
        ctx.fillStyle = 'white'
        ctx.strokeStyle = 'black'
        ctx.lineWidth = 4 * scaleX
        ctx.font = `bold ${48 * scaleX}px monospace`
        ctx.textAlign = 'center'
        ctx.strokeText(score.toString(), width / 2, 60 * scaleY)
        ctx.fillText(score.toString(), width / 2, 60 * scaleY)
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
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
    }
  }, [gameState, handleGameOver, score, canvasSize])

  const handleJump = useCallback(() => {
    if (gameState === 'PLAYING') {
      playSound('jump')
      birdRef.current.velocity = JUMP_FORCE
    } else if (gameState === 'READY') {
      startGame()
    }
    // Don't restart on click in GAME_OVER - only button should work
  }, [gameState])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        if (gameState === 'PLAYING' || gameState === 'READY') {
          handleJump()
        } else if (gameState === 'GAME_OVER') {
          startGame()
        }
      }
      if (e.code === 'Enter' && gameState !== 'NAME_INPUT' && document.activeElement?.id !== 'chat-input') {
        e.preventDefault()
        if (gameState === 'READY') startGame()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameState, handleJump])

  const getPlayerColor = (name: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F']
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return colors[Math.abs(hash) % colors.length]
  }

  const handleLogout = () => {
    playSound('click')
    localStorage.removeItem(PLAYER_STORAGE_KEY)
    setPlayer(null)
    setGameState('NAME_INPUT')
    setPlayerName('')
  }

  return (
    <main className={`min-h-screen flex flex-col items-center p-2 sm:p-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : ''}`}>
      {/* Header */}
      {!isFullscreen && (
        <header className="glass-panel w-full max-w-4xl p-2 sm:p-4 mb-2 sm:mb-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-4">
            <h1 className="text-neon text-sm sm:text-xl font-pixel text-shadow-glow">
              FLAPPY BIRD
            </h1>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-white text-xs sm:text-sm hover:text-neon transition-colors"
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {player && (
              <>
                <span className="text-white text-xs sm:text-sm font-pixel">
                  {player.name}
                </span>
                {player.highScore > 0 && (
                  <span className="text-yellow-400 text-xs font-pixel hidden sm:inline">
                    BEST: {player.highScore}
                  </span>
                )}
                <button onClick={handleLogout} className="text-gray-400 hover:text-white text-xs font-pixel">
                  LOGOUT
                </button>
              </>
            )}
            {/* Fullscreen button in header */}
            <button
              onClick={isFullscreen ? exitFullscreen : enterFullscreen}
              className="bg-neon/20 text-neon px-2 sm:px-3 py-1 sm:py-2 rounded text-xs sm:text-sm font-pixel hover:bg-neon/30"
            >
              {isFullscreen ? '⛶ EXIT' : '⛶ FULL'}
            </button>
          </div>
        </header>
      )}

      {/* Main content */}
      <div className={`flex flex-col lg:flex-row gap-2 sm:gap-4 w-full max-w-4xl ${isFullscreen ? 'flex-1 justify-center' : ''}`}>
        {/* Game area */}
        <div className={`flex-1 flex flex-col items-center ${isFullscreen ? 'w-full h-full' : ''}`}>
          <div className="relative" ref={gameContainerRef}>
            {/* Clickable wrapper for game area */}
            <div
              onClick={handleJump}
              onTouchStart={(e) => { e.preventDefault(); handleJump() }}
              className="cursor-pointer select-none"
            >
              <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className={`rounded-lg border-4 border-dark shadow-2xl ${isFullscreen ? 'w-full h-full rounded-none border-0' : 'max-w-[400px]'}`}
                style={{ touchAction: 'none', display: 'block' }}
              />
            </div>

            {/* READY overlay */}
            {gameState === 'READY' && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-lg p-4 pointer-events-auto"
                onClick={handleJump}
              >
                <p className="text-white text-xs sm:text-sm font-pixel mb-2 sm:mb-4 animate-pulse text-center">
                  TAP TO START
                </p>
                <div className="text-neon text-xs font-pixel">READY!</div>
              </div>
            )}

            {/* GAME OVER overlay - completely separate, outside clickable area */}
            {gameState === 'GAME_OVER' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 pointer-events-auto"
                style={{ zIndex: 100 }}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-red-500 text-lg sm:text-xl font-pixel mb-2 sm:mb-4">GAME OVER</h2>
                <p className="text-white text-sm font-pixel mb-2">Score: {finalScore}</p>
                {currentRank && (
                  <p className="text-neon text-xs font-pixel mb-2 sm:mb-4">Rank: #{currentRank}</p>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); startGame() }}
                  className="bg-neon text-dark px-6 py-3 rounded font-pixel text-sm hover:bg-green-400 transition-colors"
                  style={{ touchAction: 'manipulation' }}
                >
                  PLAY AGAIN
                </button>
                <p className="text-gray-400 text-xs font-pixel mt-4">Press SPACE</p>
                {isFullscreen && (
                  <button
                    onClick={(e) => { e.stopPropagation(); exitFullscreen() }}
                    className="mt-4 bg-black/70 text-white px-4 py-2 rounded font-pixel text-xs"
                    style={{ touchAction: 'manipulation' }}
                  >
                    EXIT FULLSCREEN
                  </button>
                )}
              </div>
            )}

            {/* Exit fullscreen button during PLAYING */}
            {isFullscreen && gameState === 'PLAYING' && (
              <button
                onClick={(e) => { e.stopPropagation(); exitFullscreen() }}
                className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded font-pixel text-xs"
                style={{ touchAction: 'manipulation', zIndex: 50 }}
              >
                ✕ EXIT
              </button>
            )}
          </div>

          {/* Score below canvas on mobile */}
          <div className="lg:hidden glass-panel px-4 py-2 mt-2">
            <span className="text-white text-xs font-pixel">SCORE: </span>
            <span className="text-neon text-sm font-pixel text-shadow-glow">{score}</span>
          </div>
        </div>

        {/* Side panels - hide in fullscreen */}
        {!isFullscreen && (
          <div className="flex flex-col gap-2 sm:gap-4 w-full lg:w-80">
            {/* Leaderboard */}
            <div className="glass-panel p-3 sm:p-4">
              <h2 className="text-neon text-xs font-pixel mb-2 sm:mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-neon rounded-full animate-pulse"></span>
                TOP PLAYERS
              </h2>
              <div className="space-y-2 max-h-32 sm:max-h-48 overflow-y-auto">
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
                        <span className={entry.rank === 1 ? 'text-yellow-400' : entry.rank === 2 ? 'text-gray-300' : entry.rank === 3 ? 'text-amber-600' : ''}>
                          #{entry.rank}
                        </span>
                        <span className="truncate max-w-16 sm:max-w-24">{entry.name}</span>
                      </span>
                      <span className="text-white">{entry.highScore}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Chat */}
            <div className="glass-panel p-3 sm:p-4 flex-1 flex flex-col">
              <h2 className="text-neon text-xs font-pixel mb-2 sm:mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-neon rounded-full animate-pulse"></span>
                LIVE CHAT
              </h2>
              <div
                ref={chatContainerRef}
                className="flex-1 min-h-32 sm:min-h-48 max-h-40 sm:max-h-64 overflow-y-auto mb-2 sm:mb-3 space-y-2"
              >
                {chatMessages.length === 0 ? (
                  <p className="text-gray-500 text-xs font-pixel">No messages yet</p>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className="animate-slide-in">
                      <span className="font-pixel text-xs" style={{ color: getPlayerColor(msg.playerName) }}>
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
                    onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
                    placeholder={canSendMessage ? 'Type...' : 'Wait...'}
                    disabled={!canSendMessage}
                    className="flex-1 bg-dark/50 text-white text-xs font-pixel px-2 sm:px-3 py-2 rounded border border-gray-700 focus:border-neon transition-colors"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!canSendMessage || !chatInput.trim()}
                    className="bg-neon text-dark px-2 sm:px-4 py-2 rounded font-pixel text-xs hover:bg-green-400 transition-colors disabled:opacity-50"
                  >
                    SEND
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Name input modal */}
      {gameState === 'NAME_INPUT' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-6 sm:p-8 max-w-md w-full mx-4 animate-float">
            <h2 className="text-neon text-sm sm:text-lg font-pixel text-center mb-4 sm:mb-6 text-shadow-glow">
              ENTER YOUR NAME
            </h2>
            <form onSubmit={handleNameSubmit}>
              <input
                type="text"
                value={playerName}
                onChange={(e) => { setPlayerName(e.target.value); setNameError('') }}
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
                className="w-full bg-neon text-dark py-3 rounded font-pixel text-sm hover:bg-green-400 transition-colors disabled:opacity-50"
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