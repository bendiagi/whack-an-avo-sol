import { useEffect, useRef, useState } from 'react'
import './App.css'
import whackAvoBg from '../asset/whack-avo-b1-01.svg'
import avo from '../asset/avo.png'
import hammer from '../asset/whack-hammer-3.svg'
import startGameSound from '../asset/start-game-sound.wav'
import hammerHitSound from '../asset/hammer-hit-sound-2.wav'
import gameOverSound from '../asset/game-over.wav'
import { useGameStore } from './store/gameStore'

function App() {
  const {
    isPlaying,
    isGameOver,
    score,
    currentTime,
    activeAvocados,
    startGame,
    resetGame,
    updateTimer,
    spawnAvocado,
    checkHit
  } = useGameStore()

  const [screenFeedback, setScreenFeedback] = useState<'hit' | 'miss' | null>(null)
  const [hammerDisplay, setHammerDisplay] = useState<{ holeNumber: number; show: boolean } | null>(null)
  const spawnIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [globalHighScore, setGlobalHighScore] = useState<number | null>(null)

  const HIGHSCORE_URL = (import.meta as any).env?.VITE_HIGHSCORE_URL as string | undefined

  const fetchGlobalHighScore = async () => {
    try {
      if (!HIGHSCORE_URL) return
      const res = await fetch(HIGHSCORE_URL, { method: 'GET' })
      if (!res.ok) return
      const data = await res.json()
      const value = typeof data?.highScore === 'number' ? data.highScore : Number(data?.highScore)
      if (!Number.isNaN(value)) {
        setGlobalHighScore(value)
      }
    } catch (err) {
      // noop
    }
  }

  const maybeSubmitNewScore = async (finalScore: number) => {
    try {
      if (!HIGHSCORE_URL) return
      await fetch(HIGHSCORE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: finalScore })
      })
      // Refresh after submit
      fetchGlobalHighScore()
    } catch (err) {
      // noop
    }
  }

  const clearIntervalSafe = (id: ReturnType<typeof setInterval> | null) => {
    if (!id) return
    // Cast through unknown to satisfy DOM vs Node typings
    clearInterval(id as unknown as number)
  }

  const clearTimeoutSafe = (id: ReturnType<typeof setTimeout> | null) => {
    if (!id) return
    clearTimeout(id as unknown as number)
  }

  // Timer effect
  useEffect(() => {
    if (isPlaying) {
      timerIntervalRef.current = setInterval(() => {
        updateTimer(Date.now())
      }, 100)
    } else {
      clearIntervalSafe(timerIntervalRef.current)
    }

    return () => {
      clearIntervalSafe(timerIntervalRef.current)
    }
  }, [isPlaying, updateTimer])

  // Spawn system - uses store-driven interval (starts 1500ms, minus 100ms every 5 hits, min 500ms)
  useEffect(() => {
    if (isPlaying && !isGameOver) {
      const spawnNext = () => {
        const holeNumber = Math.floor(Math.random() * 7) + 1
        const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26)) // A-Z
        spawnAvocado(holeNumber, letter)
        
        // Schedule next spawn using current store interval
        const nextSpawnDelay = useGameStore.getState().spawnInterval
        spawnIntervalRef.current = setTimeout(spawnNext, nextSpawnDelay)
      }

      // Start spawning after current interval
      spawnIntervalRef.current = setTimeout(spawnNext, useGameStore.getState().spawnInterval)

      return () => {
        clearTimeoutSafe(spawnIntervalRef.current)
      }
    }
  }, [isPlaying, isGameOver, spawnAvocado])

  // Handle start game with sound
  const handleStartGame = () => {
    // Play start game sound
    const audio = new Audio(startGameSound)
    audio.play().catch(error => {
      console.log('Could not play start game sound:', error)
    })
    
    // Start the game
    startGame()
  }

  // Play game over sound when game ends
  useEffect(() => {
    if (isGameOver) {
      const audio = new Audio(gameOverSound)
      audio.play().catch(error => {
        console.log('Could not play game over sound:', error)
      })
      // Submit score to global board
      if (typeof score === 'number') {
        maybeSubmitNewScore(score)
      }
    }
  }, [isGameOver])

  // Keyboard input
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isPlaying || isGameOver) return

      const key = event.key.toLowerCase()
      if (key.length === 1 && key >= 'a' && key <= 'z') {
        // Find which hole has the matching letter
        const matchingAvocado = activeAvocados.find(avo => 
          avo.letter.toLowerCase() === key && avo.isVisible
        )
        
        const isHit = checkHit(key)
        
        if (isHit && matchingAvocado) {
          // Play hammer hit sound
          const audio = new Audio(hammerHitSound)
          audio.play().catch(error => {
            console.log('Could not play hammer hit sound:', error)
          })
          
          // Show hammer in the correct hole
          setHammerDisplay({ holeNumber: matchingAvocado.holeNumber, show: true })
          setScreenFeedback('hit')
          // Trigger vibration if supported
          if (navigator.vibrate) {
            navigator.vibrate(200)
          }
        } else {
          // Show hammer in a random hole for miss feedback
          const randomHole = Math.floor(Math.random() * 7) + 1
          setHammerDisplay({ holeNumber: randomHole, show: true })
          setScreenFeedback('miss')
          // Trigger vibration if supported
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100])
          }
        }

        // Clear feedback and hammer after animation
        setTimeout(() => {
          setScreenFeedback(null)
          setHammerDisplay(null)
        }, 500)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying, isGameOver, checkHit, activeAvocados])

  // Format timer
  const formatTime = (time: number) => {
    const seconds = Math.floor(time / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Get timer display
  const getTimerDisplay = () => {
    if (!isPlaying || !useGameStore.getState().startTime) return '00:00'
    const elapsed = currentTime - (useGameStore.getState().startTime || 0)
    return formatTime(elapsed)
  }

  // Load global high score on mount and periodically
  useEffect(() => {
    fetchGlobalHighScore()
    const intervalId: ReturnType<typeof setInterval> = setInterval(fetchGlobalHighScore, 30000)
    return () => clearIntervalSafe(intervalId)
  }, [])

  return (
    <div className="app">
      {/* Global High Score Badge */}
      <div className="global-highscore-badge">
        <span className="badge-label">World Best</span>
        <span className="badge-value">{globalHighScore ?? '—'}</span>
      </div>
      {/* Game Controls */}
      <div className="game-controls">
        <div className="control-buttons">
          <button 
            className="game-button" 
            onClick={handleStartGame}
            disabled={isPlaying}
          >
            {isPlaying ? 'Playing...' : 'Start Game'}
          </button>
          <button 
            className="game-button" 
            onClick={resetGame}
          >
            Reset
          </button>
        </div>
        
        <div className="game-stats">
          <div className="stat-item">
            <div className="stat-label">Score</div>
            <div className="stat-value">{score}</div>
          </div>
          <div className="stat-item">
            <div className="stat-label">Time</div>
            <div className="stat-value">{getTimerDisplay()}</div>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="main-content">
        <div className="table-container">
          <img src={whackAvoBg} alt="Whack Avo" className="whack-avo-image" />
          <div className="avocados-container">
            {/* Individual positioned avocados with letters */}
            {activeAvocados.find(avo => avo.holeNumber === 1 && avo.isVisible) ? (
              <img src={avo} alt="Avocado" className="avocado avocado-1" />
            ) : (
              <div className="avocado avocado-1"></div>
            )}
            {activeAvocados.find(avo => avo.holeNumber === 2 && avo.isVisible) ? (
              <img src={avo} alt="Avocado" className="avocado avocado-2" />
            ) : (
              <div className="avocado avocado-2"></div>
            )}
            {activeAvocados.find(avo => avo.holeNumber === 3 && avo.isVisible) ? (
              <img src={avo} alt="Avocado" className="avocado avocado-3" />
            ) : (
              <div className="avocado avocado-3"></div>
            )}
            {activeAvocados.find(avo => avo.holeNumber === 4 && avo.isVisible) ? (
              <img src={avo} alt="Avocado" className="avocado avocado-4" />
            ) : (
              <div className="avocado avocado-4"></div>
            )}
            {activeAvocados.find(avo => avo.holeNumber === 5 && avo.isVisible) ? (
              <img src={avo} alt="Avocado" className="avocado avocado-5" />
            ) : (
              <div className="avocado avocado-5"></div>
            )}
            {activeAvocados.find(avo => avo.holeNumber === 6 && avo.isVisible) ? (
              <img src={avo} alt="Avocado" className="avocado avocado-6" />
            ) : (
              <div className="avocado avocado-6"></div>
            )}
            {activeAvocados.find(avo => avo.holeNumber === 7 && avo.isVisible) ? (
              <img src={avo} alt="Avocado" className="avocado avocado-7" />
            ) : (
              <div className="avocado avocado-7"></div>
            )}
            
            {/* Letter displays - positioned directly above each avocado */}
            {activeAvocados.find(avo => avo.holeNumber === 1 && avo.isVisible) && (
              <div className="letter-display" style={{top: 'calc(45.0% - 1.945vw - 30px)', left: 'calc(20.4% - 1.945vw)'}}>
                {activeAvocados.find(avo => avo.holeNumber === 1 && avo.isVisible)?.letter}
              </div>
            )}
            {activeAvocados.find(avo => avo.holeNumber === 2 && avo.isVisible) && (
              <div className="letter-display" style={{top: 'calc(45.1% - 1.945vw - 30px)', left: 'calc(40.2% - 1.945vw)'}}>
                {activeAvocados.find(avo => avo.holeNumber === 2 && avo.isVisible)?.letter}
              </div>
            )}
            {activeAvocados.find(avo => avo.holeNumber === 3 && avo.isVisible) && (
              <div className="letter-display" style={{top: 'calc(45.1% - 1.945vw - 30px)', left: 'calc(60.9% - 1.945vw)'}}>
                {activeAvocados.find(avo => avo.holeNumber === 3 && avo.isVisible)?.letter}
              </div>
            )}
            {activeAvocados.find(avo => avo.holeNumber === 4 && avo.isVisible) && (
              <div className="letter-display" style={{top: 'calc(44.9% - 1.945vw - 30px)', left: 'calc(79.7% - 1.945vw)'}}>
                {activeAvocados.find(avo => avo.holeNumber === 4 && avo.isVisible)?.letter}
              </div>
            )}
            {activeAvocados.find(avo => avo.holeNumber === 5 && avo.isVisible) && (
              <div className="letter-display" style={{top: 'calc(62.6% - 1.945vw - 30px)', left: 'calc(28.9% - 1.945vw)'}}>
                {activeAvocados.find(avo => avo.holeNumber === 5 && avo.isVisible)?.letter}
              </div>
            )}
            {activeAvocados.find(avo => avo.holeNumber === 6 && avo.isVisible) && (
              <div className="letter-display" style={{top: 'calc(62.7% - 1.945vw - 30px)', left: 'calc(50.7% - 1.945vw)'}}>
                {activeAvocados.find(avo => avo.holeNumber === 6 && avo.isVisible)?.letter}
              </div>
            )}
            {activeAvocados.find(avo => avo.holeNumber === 7 && avo.isVisible) && (
              <div className="letter-display" style={{top: 'calc(62.4% - 1.945vw - 30px)', left: 'calc(71.6% - 1.945vw)'}}>
                {activeAvocados.find(avo => avo.holeNumber === 7 && avo.isVisible)?.letter}
              </div>
            )}
            
            {/* Hammer displays */}
            {hammerDisplay?.holeNumber === 1 && hammerDisplay.show && (
              <img src={hammer} alt="Hammer" className="hammer hammer-1" />
            )}
            {hammerDisplay?.holeNumber === 2 && hammerDisplay.show && (
              <img src={hammer} alt="Hammer" className="hammer hammer-2" />
            )}
            {hammerDisplay?.holeNumber === 3 && hammerDisplay.show && (
              <img src={hammer} alt="Hammer" className="hammer hammer-3" />
            )}
            {hammerDisplay?.holeNumber === 4 && hammerDisplay.show && (
              <img src={hammer} alt="Hammer" className="hammer hammer-4" />
            )}
            {hammerDisplay?.holeNumber === 5 && hammerDisplay.show && (
              <img src={hammer} alt="Hammer" className="hammer hammer-5" />
            )}
            {hammerDisplay?.holeNumber === 6 && hammerDisplay.show && (
              <img src={hammer} alt="Hammer" className="hammer hammer-6" />
            )}
            {hammerDisplay?.holeNumber === 7 && hammerDisplay.show && (
              <img src={hammer} alt="Hammer" className="hammer hammer-7" />
            )}
          </div>
        </div>
      </div>

      {/* Visual Feedback */}
      {screenFeedback && (
        <div className={`screen-feedback ${screenFeedback}`} />
      )}

      {/* Game Over Overlay */}
      {isGameOver && (
        <div className="game-over-overlay">
          <div className="game-over-title">GAME OVER</div>
          <div className="game-over-score">Final Score: {score}</div>
          <button className="game-over-button" onClick={resetGame}>
            Play Again
          </button>
        </div>
      )}
    </div>
  )
}

export default App
