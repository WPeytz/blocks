import { collides, dropDistance, tryRotate } from './collision'
import { COLS, HIDDEN_ROWS, TOTAL_ROWS, VISIBLE_ROWS, pieceCells, spawnPiece } from './pieces'
import { SevenBag } from './randomizer'
import {
  HARD_DROP_POINTS,
  SOFT_DROP_POINTS,
  clearTypeFor,
  gravityForLevel,
  levelForLines,
  scoreClear,
} from './scoring'
import type { ActivePiece, GameState, Grid, PieceType, Settings } from './types'

const QUEUE_SIZE = 5
/** Number of scores retained on the leaderboard. */
const MAX_SCORES = 5
/** Lock delay window (ms) before a grounded piece locks. */
const LOCK_DELAY = 500
/** Max times the lock timer may reset from movement before forcing a lock. */
const MAX_LOCK_RESETS = 15

export const DEFAULT_SETTINGS: Settings = {
  das: 130,
  arr: 30,
  softDrop: 25,
  sound: true,
  ghost: true,
}

function emptyGrid(): Grid {
  return Array.from({ length: TOTAL_ROWS }, () => Array<null>(COLS).fill(null))
}

/**
 * The headless game engine. Holds all mutable state and exposes intent methods
 * plus a `tick(dt)` that advances gravity / lock timers. It knows nothing about
 * React or the DOM; callers read a snapshot via `getState()`.
 */
export class Engine {
  private grid: Grid = emptyGrid()
  private bag = new SevenBag()
  private active: ActivePiece | null = null
  private hold: PieceType | null = null
  private queue: PieceType[] = []
  private canHold = true

  private phase: GameState['phase'] = 'ready'
  private score = 0
  private lines = 0
  private level = 1
  private combo = -1
  private backToBack = false

  private highScore = 0
  private topScores: number[] = []
  private isNewHighScore = false

  // Timers (ms).
  private gravityTimer = 0
  private lockTimer = 0
  private lockResets = 0
  private grounded = false

  // Animation signal counters surfaced to the UI.
  private hardDropTick = 0
  private clearTick = 0
  private clearingRows: number[] = []

  /** Optional callbacks for sound effects, set by the host. */
  onLock?: () => void
  onClear?: (lines: number) => void
  onHardDrop?: () => void
  onLevelUp?: () => void
  onGameOver?: () => void

  constructor(highScore = 0, topScores: number[] = []) {
    this.topScores = [...topScores].sort((a, b) => b - a).slice(0, MAX_SCORES)
    this.highScore = this.topScores[0] ?? highScore
  }

  /** Begin a fresh game from the ready/over screen. */
  start(): void {
    this.grid = emptyGrid()
    this.bag = new SevenBag()
    this.queue = this.bag.fill(QUEUE_SIZE)
    this.hold = null
    this.canHold = true
    this.score = 0
    this.lines = 0
    this.level = 1
    this.combo = -1
    this.backToBack = false
    this.isNewHighScore = false
    this.gravityTimer = 0
    this.clearingRows = []
    this.phase = 'playing'
    this.spawnNext()
  }

  restart(): void {
    this.start()
  }

  togglePause(): void {
    if (this.phase === 'playing') this.phase = 'paused'
    else if (this.phase === 'paused') this.phase = 'playing'
  }

  /** Pull the next piece from the queue and refill the bag. */
  private spawnNext(): void {
    const type = this.queue.shift()!
    this.queue.push(this.bag.next())
    this.placeNewPiece(type)
  }

  /** Spawn `type` at the top; top-out if it immediately collides. */
  private placeNewPiece(type: PieceType): void {
    const p = spawnPiece(type)
    this.active = p
    this.canHold = true
    this.gravityTimer = 0
    this.resetLockState()
    if (collides(this.grid, p.type, p.x, p.y, p.rotation)) {
      this.endGame()
    }
  }

  private resetLockState(): void {
    this.grounded = false
    this.lockTimer = 0
    this.lockResets = 0
  }

  private endGame(): void {
    this.phase = 'over'
    this.active = null
    const prevBest = this.topScores[0] ?? 0
    if (this.score > 0) {
      this.topScores = [...this.topScores, this.score]
        .sort((a, b) => b - a)
        .slice(0, MAX_SCORES)
    }
    this.highScore = this.topScores[0] ?? this.score
    this.isNewHighScore = this.score > 0 && this.score > prevBest
    this.onGameOver?.()
  }

  // --- Player actions -------------------------------------------------------

  private isGrounded(p: ActivePiece): boolean {
    return collides(this.grid, p.type, p.x, p.y + 1, p.rotation)
  }

  /**
   * After any successful move/rotation, refresh grounded state. If the piece is
   * resting on the stack, (re)start the lock timer — but only allow a limited
   * number of resets so a player can't stall a piece forever.
   */
  private afterMove(moved: boolean): void {
    if (!this.active) return
    const grounded = this.isGrounded(this.active)
    if (grounded) {
      if (!this.grounded) {
        this.grounded = true
        this.lockTimer = 0
      } else if (moved && this.lockResets < MAX_LOCK_RESETS) {
        // Reset the lock timer to reward last-moment adjustments, up to the cap.
        this.lockTimer = 0
        this.lockResets++
      }
    } else {
      this.grounded = false
      this.lockTimer = 0
    }
  }

  move(dir: -1 | 1): void {
    if (this.phase !== 'playing' || !this.active) return
    const nx = this.active.x + dir
    if (!collides(this.grid, this.active.type, nx, this.active.y, this.active.rotation)) {
      this.active = { ...this.active, x: nx }
      this.afterMove(true)
    }
  }

  rotate(dir: 1 | -1): void {
    if (this.phase !== 'playing' || !this.active) return
    const rotated = tryRotate(this.grid, this.active, dir)
    if (rotated) {
      this.active = rotated
      this.afterMove(true)
    }
  }

  /** Soft drop one cell; awards points and resets gravity accumulation. */
  softDrop(): void {
    if (this.phase !== 'playing' || !this.active) return
    const ny = this.active.y + 1
    if (!collides(this.grid, this.active.type, this.active.x, ny, this.active.rotation)) {
      this.active = { ...this.active, y: ny }
      this.score += SOFT_DROP_POINTS
      this.gravityTimer = 0
      this.afterMove(false)
    }
  }

  hardDrop(): void {
    if (this.phase !== 'playing' || !this.active) return
    const dist = dropDistance(this.grid, this.active)
    if (dist > 0) {
      this.active = { ...this.active, y: this.active.y + dist }
      this.score += dist * HARD_DROP_POINTS
    }
    this.hardDropTick++
    this.onHardDrop?.()
    this.lockPiece()
  }

  /** Swap the active piece with the hold slot (once per placed piece). */
  holdPiece(): void {
    if (this.phase !== 'playing' || !this.active || !this.canHold) return
    const current = this.active.type
    if (this.hold === null) {
      this.hold = current
      this.spawnNext()
    } else {
      const swap = this.hold
      this.hold = current
      this.placeNewPiece(swap)
    }
    this.canHold = false
  }

  // --- Locking & line clears ------------------------------------------------

  private lockPiece(): void {
    if (!this.active) return
    const { type } = this.active
    for (const [cx, cy] of pieceCells(this.active.type, this.active.x, this.active.y, this.active.rotation)) {
      if (cy >= 0 && cy < TOTAL_ROWS && cx >= 0 && cx < COLS) {
        this.grid[cy][cx] = type
      }
    }
    this.onLock?.()
    this.active = null

    const cleared = this.clearLines()
    if (cleared === 0) {
      this.combo = -1
    }
    this.spawnNext()
  }

  /** Remove full rows, update score/level/combo, return number cleared. */
  private clearLines(): number {
    const full: number[] = []
    for (let y = 0; y < TOTAL_ROWS; y++) {
      if (this.grid[y].every((c) => c !== null)) full.push(y)
    }
    if (full.length === 0) return 0

    // Surface clearing rows (visible-space indices) for the flash animation.
    this.clearingRows = full.map((y) => y - HIDDEN_ROWS).filter((y) => y >= 0)
    this.clearTick++

    // Rebuild grid without the cleared rows, padding empty rows on top.
    const remaining = this.grid.filter((_, y) => !full.includes(y))
    while (remaining.length < TOTAL_ROWS) {
      remaining.unshift(Array<null>(COLS).fill(null))
    }
    this.grid = remaining

    const count = full.length
    this.lines += count
    this.combo++

    const clearType = clearTypeFor(count)
    if (clearType) {
      const { points, backToBack } = scoreClear(clearType, this.level, this.combo, this.backToBack)
      this.score += points
      this.backToBack = backToBack
    }

    const newLevel = levelForLines(this.lines)
    if (newLevel > this.level) {
      this.level = newLevel
      this.onLevelUp?.()
    }

    this.onClear?.(count)
    return count
  }

  // --- Game loop ------------------------------------------------------------

  /** Advance timers by `dt` ms. Called every animation frame while playing. */
  tick(dt: number): void {
    if (this.phase !== 'playing' || !this.active) return

    // Gravity: step down one cell each time the interval elapses.
    this.gravityTimer += dt
    const interval = gravityForLevel(this.level)
    while (this.gravityTimer >= interval) {
      this.gravityTimer -= interval
      this.stepGravity()
      if (!this.active) return // locked & respawned mid-step
    }

    // Lock delay: once grounded, count down to lock.
    if (this.active && this.isGrounded(this.active)) {
      this.grounded = true
      this.lockTimer += dt
      if (this.lockTimer >= LOCK_DELAY) {
        this.lockPiece()
      }
    }
  }

  private stepGravity(): void {
    if (!this.active) return
    const ny = this.active.y + 1
    if (!collides(this.grid, this.active.type, this.active.x, ny, this.active.rotation)) {
      this.active = { ...this.active, y: ny }
      this.grounded = false
    }
    // If it can't fall, the lock-delay logic in tick() handles locking.
  }

  // --- Snapshot -------------------------------------------------------------

  getState(): GameState {
    return {
      grid: this.grid,
      active: this.active,
      hold: this.hold,
      queue: this.queue.slice(0, QUEUE_SIZE),
      canHold: this.canHold,
      phase: this.phase,
      score: this.score,
      level: this.level,
      lines: this.lines,
      highScore: this.highScore,
      topScores: this.topScores,
      isNewHighScore: this.isNewHighScore,
      combo: this.combo,
      backToBack: this.backToBack,
      clearingRows: this.clearingRows,
      hardDropTick: this.hardDropTick,
      clearTick: this.clearTick,
    }
  }

  /** Clear the transient clearing-rows flag once the UI has animated it. */
  clearFlash(): void {
    this.clearingRows = []
  }

  setHighScore(value: number): void {
    this.highScore = value
  }

  setTopScores(scores: number[]): void {
    this.topScores = [...scores].sort((a, b) => b - a).slice(0, MAX_SCORES)
    this.highScore = this.topScores[0] ?? this.highScore
  }
}

export { COLS, VISIBLE_ROWS, HIDDEN_ROWS, TOTAL_ROWS }
