import type { Offset, PieceType, RotationIndex } from './types'

/** Board dimensions. 10 wide, 20 visible tall, plus hidden spawn rows. */
export const COLS = 10
export const VISIBLE_ROWS = 20
export const HIDDEN_ROWS = 2
export const TOTAL_ROWS = VISIBLE_ROWS + HIDDEN_ROWS

/**
 * Block layouts for each piece at each of the 4 rotation states, expressed as
 * lists of [x, y] cell offsets relative to the piece anchor (top-left of its
 * rotation box). These follow the canonical SRS shapes so that the shared SRS
 * wall-kick tables in collision.ts line up correctly.
 *
 * Each rotation is listed explicitly (rather than computed) for clarity and to
 * keep the O piece trivially rotation-invariant.
 */
export const SHAPES: Record<PieceType, readonly Offset[][]> = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
}

/** Neon palette — distinct, readable hues per piece. */
export const COLORS: Record<PieceType, string> = {
  I: '#22d3ee', // cyan
  O: '#facc15', // yellow
  T: '#c084fc', // purple
  S: '#4ade80', // green
  Z: '#f87171', // red
  J: '#60a5fa', // blue
  L: '#fb923c', // orange
}

export const PIECE_TYPES: readonly PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

/** Absolute block coordinates for a piece at a given anchor + rotation. */
export function pieceCells(
  type: PieceType,
  x: number,
  y: number,
  rotation: RotationIndex,
): Array<[number, number]> {
  return SHAPES[type][rotation].map(([dx, dy]) => [x + dx, y + dy])
}

/**
 * Spawn position: horizontally centered. The 4-wide rotation box starts at
 * column 3 so the piece appears centered across the 10-wide board. Pieces spawn
 * in the hidden rows at the top.
 */
export function spawnPiece(type: PieceType) {
  return { type, x: 3, y: 0, rotation: 0 as RotationIndex }
}
