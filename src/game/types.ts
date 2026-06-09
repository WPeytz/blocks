// Core shared types for the game engine. Kept free of any React imports so the
// game logic can be unit-tested / reused independently of rendering.

/** The seven tetromino identities. */
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'

/**
 * A board cell is either empty (null) or carries the `PieceType` that filled it,
 * which we use purely to pick the cell's color when rendering.
 */
export type Cell = PieceType | null

/** The playfield matrix: row-major, `grid[y][x]`. Includes hidden spawn rows. */
export type Grid = Cell[][]

/** Rotation state 0..3 (0 = spawn). Used to index wall-kick tables. */
export type RotationIndex = 0 | 1 | 2 | 3

/** A relative block offset within a piece's 4x4 bounding logic, as [x, y]. */
export type Offset = readonly [number, number]

/** An active, falling piece. */
export interface ActivePiece {
  type: PieceType
  /** Top-left anchor of the piece's rotation box, in board coordinates. */
  x: number
  y: number
  rotation: RotationIndex
}

export type GamePhase = 'ready' | 'playing' | 'paused' | 'over'

/** A line-clear category, used for scoring. */
export type ClearType = 'single' | 'double' | 'triple' | 'quad'

/** Persisted user settings (localStorage). */
export interface Settings {
  /** Delayed Auto Shift, ms before auto-repeat kicks in while holding L/R. */
  das: number
  /** Auto Repeat Rate, ms between repeats once DAS has elapsed. */
  arr: number
  /** Soft-drop interval in ms (lower = faster). */
  softDrop: number
  /** Master toggle for generated Web Audio sound effects. */
  sound: boolean
  /** Whether to render the ghost (landing preview) piece. */
  ghost: boolean
}

/** The full game snapshot the UI renders from. */
export interface GameState {
  grid: Grid
  active: ActivePiece | null
  hold: PieceType | null
  /** Upcoming pieces (front = soonest). At least 5 shown in the UI. */
  queue: PieceType[]
  canHold: boolean
  phase: GamePhase
  score: number
  level: number
  lines: number
  highScore: number
  /** Descending leaderboard of the best scores (top 5). */
  topScores: number[]
  isNewHighScore: boolean
  combo: number
  backToBack: boolean
  /** Rows currently flashing from a clear, for the line-clear animation. */
  clearingRows: number[]
  /** Increments on hard drop so the UI can trigger an impact animation. */
  hardDropTick: number
  /** Increments whenever lines are cleared, for clear flash keying. */
  clearTick: number
}
