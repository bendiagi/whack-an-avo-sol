import { create } from 'zustand'

export interface ActiveAvocado {
  id: string
  holeNumber: number
  letter: string
  spawnTime: number
  duration: number
  isVisible: boolean
}

export interface GameState {
  // Game Status
  isPlaying: boolean
  isGameOver: boolean
  
  // Score & Timer
  score: number
  startTime: number | null
  currentTime: number
  
  // Difficulty
  difficultyLevel: number
  spawnInterval: number
  avocadoDuration: number
  
  // Active Avocados
  activeAvocados: ActiveAvocado[]
  
  // Actions
  startGame: () => void
  resetGame: () => void
  endGame: () => void
  addScore: () => void
  updateTimer: (time: number) => void
  spawnAvocado: (holeNumber: number, letter: string) => void
  removeAvocado: (id: string) => void
  updateDifficulty: () => void
  checkHit: (key: string) => boolean
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initial State
  isPlaying: false,
  isGameOver: false,
  score: 0,
  startTime: null,
  currentTime: 0,
  difficultyLevel: 1,
  spawnInterval: 1500, // Start at 1.5 seconds
  avocadoDuration: 3500, // 3.5 seconds initially
  activeAvocados: [],

  // Actions
  startGame: () => set({
    isPlaying: true,
    isGameOver: false,
    score: 0,
    startTime: Date.now(),
    currentTime: 0,
    difficultyLevel: 1,
    spawnInterval: 1500,
    avocadoDuration: 3500,
    activeAvocados: []
  }),

  resetGame: () => set({
    isPlaying: false,
    isGameOver: false,
    score: 0,
    startTime: null,
    currentTime: 0,
    difficultyLevel: 1,
    spawnInterval: 1500,
    avocadoDuration: 3500,
    activeAvocados: []
  }),

  endGame: () => set({
    isPlaying: false,
    isGameOver: true,
    activeAvocados: []
  }),

  addScore: () => set((state) => ({
    score: state.score + 1
  })),

  updateTimer: (time: number) => set({
    currentTime: time
  }),

  spawnAvocado: (holeNumber: number, letter: string) => {
    const state = get()
    const id = `avocado-${Date.now()}-${Math.random()}`
    const spawnTime = Date.now()
    
    const newAvocado: ActiveAvocado = {
      id,
      holeNumber,
      letter,
      spawnTime,
      duration: state.avocadoDuration,
      isVisible: true
    }

    set((state) => ({
      activeAvocados: [...state.activeAvocados, newAvocado]
    }))

    // Auto-remove after duration
    setTimeout(() => {
      const currentState = get()
      if (currentState.activeAvocados.find(avo => avo.id === id)?.isVisible) {
        get().removeAvocado(id)
        // Game over if avocado disappears without being hit
        get().endGame()
      }
    }, state.avocadoDuration)
  },

  removeAvocado: (id: string) => set((state) => ({
    activeAvocados: state.activeAvocados.filter(avo => avo.id !== id)
  })),

  updateDifficulty: () => {
    const currentScore = get().score
    const reductions = Math.floor(currentScore / 5) // reduce every 5 successful plays
    const targetInterval = Math.max(500, 1500 - reductions * 100) // floor at 0.5s
    set((state) => ({
      difficultyLevel: state.difficultyLevel + 1,
      spawnInterval: targetInterval,
      // Keep avocadoDuration unchanged for now
      avocadoDuration: state.avocadoDuration
    }))
  },

  checkHit: (key: string) => {
    const state = get()
    const matchingAvocado = state.activeAvocados.find(avo => 
      avo.letter.toLowerCase() === key.toLowerCase() && avo.isVisible
    )

    if (matchingAvocado) {
      // Correct hit
      get().addScore()
      get().removeAvocado(matchingAvocado.id)
      get().updateDifficulty()
      return true
    } else {
      // Miss - game over
      get().endGame()
      return false
    }
  }
}))
