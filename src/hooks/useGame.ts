import { useCallback, useEffect, useRef, useState } from 'react'
import { Sfx } from '../game/audio'
import { DEFAULT_SETTINGS, Engine } from '../game/engine'
import {
  loadHighScore,
  loadHighScores,
  loadSettings,
  saveHighScore,
  saveHighScores,
  saveSettings,
} from '../game/storage'
import type { GameState, Settings } from '../game/types'

/** Horizontal auto-shift input state, driven inside the RAF loop for DAS/ARR. */
interface InputState {
  dir: -1 | 0 | 1 // currently held horizontal direction (last pressed wins)
  charged: boolean // DAS delay elapsed → ARR repeating
  dasTimer: number
  arrTimer: number
  soft: boolean // soft-drop key held
  softTimer: number
}

export interface UseGame {
  state: GameState
  settings: Settings
  start: () => void
  updateSettings: (patch: Partial<Settings>) => void
}

export function useGame(): UseGame {
  const engineRef = useRef<Engine | null>(null)
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS)
  const inputRef = useRef<InputState>({
    dir: 0,
    charged: false,
    dasTimer: 0,
    arrTimer: 0,
    soft: false,
    softTimer: 0,
  })

  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [state, setState] = useState<GameState>(() => {
    // Lazy-create the engine so the first render already has a valid snapshot.
    const hs = loadHighScore()
    const top = loadHighScores()
    const loaded = loadSettings()
    settingsRef.current = loaded
    const engine = new Engine(hs, top)
    wireAudio(engine, settingsRef)
    engineRef.current = engine
    return engine.getState()
  })

  // Apply persisted settings to React state once on mount.
  useEffect(() => {
    setSettings(settingsRef.current)
  }, [])

  const sync = useCallback(() => {
    const engine = engineRef.current
    if (engine) setState(engine.getState())
  }, [])

  const start = useCallback(() => {
    engineRef.current?.start()
    sync()
  }, [sync])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    const next = { ...settingsRef.current, ...patch }
    settingsRef.current = next
    saveSettings(next)
    setSettings(next)
  }, [])

  // --- Keyboard input -------------------------------------------------------
  useEffect(() => {
    const engine = engineRef.current!

    const down = (e: KeyboardEvent) => {
      // Prevent the page from scrolling on arrows / space.
      if (
        ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Spacebar'].includes(e.key)
      ) {
        e.preventDefault()
      }
      if (e.repeat) return // our own DAS/ARR handles repeats

      const phase = engine.getState().phase
      const input = inputRef.current

      // Global keys available regardless of phase.
      switch (e.key) {
        case 'Enter':
          if (phase === 'ready' || phase === 'over') {
            engine.start()
            sync()
          }
          return
        case 'p':
        case 'P':
        case 'Escape':
          engine.togglePause()
          sync()
          return
        case 'r':
        case 'R':
          engine.restart()
          sync()
          return
      }

      if (phase !== 'playing') return

      switch (e.key) {
        case 'ArrowLeft':
          input.dir = -1
          input.charged = false
          input.dasTimer = 0
          engine.move(-1)
          if (settingsRef.current.sound) Sfx.move()
          break
        case 'ArrowRight':
          input.dir = 1
          input.charged = false
          input.dasTimer = 0
          engine.move(1)
          if (settingsRef.current.sound) Sfx.move()
          break
        case 'ArrowDown':
          input.soft = true
          input.softTimer = 0
          engine.softDrop()
          break
        case 'ArrowUp':
        case 'x':
        case 'X':
          engine.rotate(1)
          if (settingsRef.current.sound) Sfx.rotate()
          break
        case 'z':
        case 'Z':
          engine.rotate(-1)
          if (settingsRef.current.sound) Sfx.rotate()
          break
        case ' ':
        case 'Spacebar':
          engine.hardDrop()
          break
        case 'c':
        case 'C':
        case 'Shift':
          engine.holdPiece()
          if (settingsRef.current.sound) Sfx.hold()
          break
      }
      sync()
    }

    const up = (e: KeyboardEvent) => {
      const input = inputRef.current
      switch (e.key) {
        case 'ArrowLeft':
          if (input.dir === -1) {
            input.dir = 0
            input.charged = false
          }
          break
        case 'ArrowRight':
          if (input.dir === 1) {
            input.dir = 0
            input.charged = false
          }
          break
        case 'ArrowDown':
          input.soft = false
          break
      }
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [sync])

  // --- requestAnimationFrame game loop --------------------------------------
  useEffect(() => {
    const engine = engineRef.current!
    let raf = 0
    let last = performance.now()

    const frame = (now: number) => {
      const dt = Math.min(now - last, 100) // clamp to avoid huge catch-up jumps
      last = now
      const input = inputRef.current
      const s = settingsRef.current

      if (engine.getState().phase === 'playing') {
        // DAS/ARR horizontal auto-shift.
        if (input.dir !== 0) {
          if (!input.charged) {
            input.dasTimer += dt
            if (input.dasTimer >= s.das) {
              input.charged = true
              input.arrTimer = 0
              engine.move(input.dir)
            }
          } else {
            input.arrTimer += dt
            if (s.arr <= 0) {
              // Instant ARR: shift to the wall this frame.
              for (let i = 0; i < 32; i++) engine.move(input.dir)
              input.arrTimer = 0
            } else {
              while (input.arrTimer >= s.arr) {
                input.arrTimer -= s.arr
                engine.move(input.dir)
              }
            }
          }
        }

        // Soft-drop repeat while held.
        if (input.soft) {
          input.softTimer += dt
          while (input.softTimer >= s.softDrop) {
            input.softTimer -= s.softDrop
            engine.softDrop()
          }
        }

        engine.tick(dt)
        setState(engine.getState())

        // Persist a freshly-set high score immediately.
      }

      raf = requestAnimationFrame(frame)
    }

    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Persist high score whenever it changes.
  useEffect(() => {
    saveHighScore(state.highScore)
  }, [state.highScore])

  // Persist the full leaderboard whenever it changes.
  useEffect(() => {
    saveHighScores(state.topScores)
  }, [state.topScores])

  // When embedded (e.g. on peytzgames.com), report the final score to the
  // host page so it can post it to the online leaderboard.
  useEffect(() => {
    if (state.phase === 'over' && window.parent !== window) {
      window.parent.postMessage(
        { type: 'blocks:gameover', score: state.score },
        '*',
      )
    }
  }, [state.phase])

  return { state, settings, start, updateSettings }
}

/** Wire engine lifecycle callbacks to the Web Audio sound effects. */
function wireAudio(engine: Engine, settingsRef: React.MutableRefObject<Settings>) {
  engine.onLock = () => settingsRef.current.sound && Sfx.lock()
  engine.onHardDrop = () => settingsRef.current.sound && Sfx.hardDrop()
  engine.onClear = (lines) => settingsRef.current.sound && Sfx.clear(lines)
  engine.onLevelUp = () => settingsRef.current.sound && Sfx.levelUp()
  engine.onGameOver = () => settingsRef.current.sound && Sfx.gameOver()
}
