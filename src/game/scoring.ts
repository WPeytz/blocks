import type { ClearType } from './types'

/** Base points per line-clear category (multiplied by current level). */
const LINE_SCORES: Record<ClearType, number> = {
  single: 100,
  double: 300,
  triple: 500,
  quad: 800,
}

export function clearTypeFor(lines: number): ClearType | null {
  switch (lines) {
    case 1: return 'single'
    case 2: return 'double'
    case 3: return 'triple'
    case 4: return 'quad'
    default: return null
  }
}

export interface ClearScore {
  points: number
  /** Whether this clear continues a back-to-back chain (quad only). */
  backToBack: boolean
}

/**
 * Score a line clear at the given level, applying combo and back-to-back bonuses.
 *
 * - Back-to-back: consecutive "difficult" clears (here: quads) earn a 1.5x bonus.
 * - Combo: each consecutive piece that clears at least one line adds 50 × combo
 *   × level, a small reward for sustained clearing.
 */
export function scoreClear(
  clear: ClearType,
  level: number,
  combo: number,
  prevBackToBack: boolean,
): ClearScore {
  let points = LINE_SCORES[clear] * level

  const isDifficult = clear === 'quad'
  const backToBack = isDifficult
  if (isDifficult && prevBackToBack) {
    points = Math.floor(points * 1.5)
  }

  // Combo bonus (combo is the count of prior consecutive clears).
  if (combo > 0) {
    points += 50 * combo * level
  }

  return { points, backToBack }
}

/** Soft drop awards 1 point per cell descended. */
export const SOFT_DROP_POINTS = 1
/** Hard drop awards 2 points per cell dropped. */
export const HARD_DROP_POINTS = 2

/** Level advances every 10 cleared lines, starting at level 1. */
export function levelForLines(lines: number): number {
  return Math.floor(lines / 10) + 1
}

/**
 * Gravity interval (ms per cell) for a level, following a classic curve that
 * accelerates toward a floor so high levels stay playable but intense.
 */
export function gravityForLevel(level: number): number {
  // Roughly the classic "Tetris Worlds" curve, clamped to a sane minimum.
  const seconds = Math.pow(0.8 - (level - 1) * 0.007, level - 1)
  return Math.max(seconds * 1000, 25)
}
