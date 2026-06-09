import { COLS, TOTAL_ROWS, pieceCells } from './pieces'
import type { ActivePiece, Grid, Offset, PieceType, RotationIndex } from './types'

/**
 * Returns true if placing `piece` at the given anchor/rotation would overlap a
 * wall, the floor, or an existing block. Anything above the top edge (y < 0) is
 * allowed so pieces can spawn / kick partly into the hidden rows.
 */
export function collides(
  grid: Grid,
  type: PieceType,
  x: number,
  y: number,
  rotation: RotationIndex,
): boolean {
  for (const [cx, cy] of pieceCells(type, x, y, rotation)) {
    if (cx < 0 || cx >= COLS) return true // left/right wall
    if (cy >= TOTAL_ROWS) return true // floor
    if (cy >= 0 && grid[cy][cx]) return true // landed block (ignore above-board)
  }
  return false
}

/**
 * Super Rotation System wall-kick data.
 *
 * When a basic rotation collides, SRS tries a short ordered list of positional
 * nudges ("kicks"). The first offset that yields a non-colliding placement wins;
 * if none do, the rotation is rejected. The I piece uses its own table because
 * of its size. Keys are "from>to" rotation transitions.
 *
 * Offsets are expressed in standard SRS [x, y] where +y is UP; we negate y when
 * applying because our grid's +y is DOWN.
 */
const KICKS_JLSTZ: Record<string, readonly Offset[]> = {
  '0>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '1>0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '1>2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '2>1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '2>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '3>2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '3>0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '0>3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
}

const KICKS_I: Record<string, readonly Offset[]> = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
}

/**
 * Attempt to rotate `piece` by `dir` (+1 clockwise, -1 counter-clockwise),
 * applying SRS wall kicks. Returns the new piece if any kick succeeds, else null.
 * The O piece never needs kicks (its cells are rotation-invariant).
 */
export function tryRotate(
  grid: Grid,
  piece: ActivePiece,
  dir: 1 | -1,
): ActivePiece | null {
  const from = piece.rotation
  const to = (((from + dir) % 4) + 4) % 4 as RotationIndex

  if (piece.type === 'O') {
    // O has identical cells in every state; rotation is a no-op success.
    return { ...piece, rotation: to }
  }

  const table = piece.type === 'I' ? KICKS_I : KICKS_JLSTZ
  const kicks = table[`${from}>${to}`] ?? [[0, 0]]

  for (const [kx, ky] of kicks) {
    // Negate ky: SRS tables use +y up, our board uses +y down.
    const nx = piece.x + kx
    const ny = piece.y - ky
    if (!collides(grid, piece.type, nx, ny, to)) {
      return { ...piece, x: nx, y: ny, rotation: to }
    }
  }
  return null
}

/** Drop a piece straight down to its resting row (ghost / hard-drop target). */
export function dropDistance(grid: Grid, piece: ActivePiece): number {
  let dist = 0
  while (!collides(grid, piece.type, piece.x, piece.y + dist + 1, piece.rotation)) {
    dist++
  }
  return dist
}
