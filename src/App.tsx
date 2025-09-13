import { useEffect, useRef, useState } from 'react'
import './App.css'
import whackAvoBg from '../asset/whack-avo-b1-01.svg'
import avo from '../asset/avo.png'
import hammer from '../asset/whack-hammer-3.svg'
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
  const spawnIntervalRef = useRef<number | null>(null)
  const timerIntervalRef = useRef<number | null>(null)

  // Timer effect
  useEffect(() => {
    if (isPlaying) {
      timerIntervalRef.current = setInterval(() => {
        updateTimer(Date.now())
      }, 100)
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [isPlaying, updateTimer])

  // Spawn system
  useEffect(() => {
    if (isPlaying && !isGameOver) {
      const spawnNext = () => {
        const holeNumber = Math.floor(Math.random() * 7) + 1
        const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26)) // A-Z
        spawnAvocado(holeNumber, letter)
        
        // Schedule next spawn
        const nextSpawnDelay = Math.random() * 700 + 800 // 0.8-1.5 seconds
        spawnIntervalRef.current = setTimeout(spawnNext, nextSpawnDelay)
      }

      // Start spawning after initial delay
      spawnIntervalRef.current = setTimeout(spawnNext, 1000)

      return () => {
        if (spawnIntervalRef.current) {
          clearTimeout(spawnIntervalRef.current)
        }
      }
    }
  }, [isPlaying, isGameOver, spawnAvocado])

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

  return (
    <div className="app">
      {/* Game Controls */}
      <div className="game-controls">
        <div className="control-buttons">
          <button 
            className="game-button" 
            onClick={startGame}
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
              <img src={hammer} alt="Hammer" className="avocado avocado-1" />
            )}
            {hammerDisplay?.holeNumber === 2 && hammerDisplay.show && (
              <img src={hammer} alt="Hammer" className="avocado avocado-2" />
            )}
            {hammerDisplay?.holeNumber === 3 && hammerDisplay.show && (
              <img src={hammer} alt="Hammer" className="avocado avocado-3" />
            )}
            {hammerDisplay?.holeNumber === 4 && hammerDisplay.show && (
              <img src={hammer} alt="Hammer" className="avocado avocado-4" />
            )}
            {hammerDisplay?.holeNumber === 5 && hammerDisplay.show && (
              <img src={hammer} alt="Hammer" className="avocado avocado-5" />
            )}
            {hammerDisplay?.holeNumber === 6 && hammerDisplay.show && (
              <img src={hammer} alt="Hammer" className="avocado avocado-6" />
            )}
            {hammerDisplay?.holeNumber === 7 && hammerDisplay.show && (
              <img src={hammer} alt="Hammer" className="avocado avocado-7" />
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
