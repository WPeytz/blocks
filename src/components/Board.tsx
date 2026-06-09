import { useMemo } from 'react'
import { dropDistance } from '../game/collision'
import { COLORS, COLS, HIDDEN_ROWS, VISIBLE_ROWS, pieceCells } from '../game/pieces'
import type { GameState, PieceType } from '../game/types'

interface RenderCell {
  type: PieceType | null
  ghost: boolean
  active: boolean
}

interface BoardProps {
  state: GameState
  showGhost: boolean
}

/**
 * The central playfield. Builds a visible-only render grid each frame by
 * overlaying the ghost (landing preview) and the active piece on top of the
 * locked stack, then renders it as a CSS grid.
 */
export function Board({ state, showGhost }: BoardProps) {
  const { grid, active, phase, clearingRows } = state

  const cells = useMemo<RenderCell[][]>(() => {
    const out: RenderCell[][] = Array.from({ length: VISIBLE_ROWS }, () =>
      Array.from({ length: COLS }, () => ({ type: null, ghost: false, active: false })),
    )

    // Locked blocks (skip hidden spawn rows).
    for (let y = 0; y < VISIBLE_ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        out[y][x].type = grid[y + HIDDEN_ROWS][x]
      }
    }

    if (active) {
      // Ghost piece: same piece dropped to its resting position.
      if (showGhost) {
        const dist = dropDistance(grid, active)
        for (const [cx, cy] of pieceCells(active.type, active.x, active.y + dist, active.rotation)) {
          const vy = cy - HIDDEN_ROWS
          if (vy >= 0 && vy < VISIBLE_ROWS && cx >= 0 && cx < COLS) {
            out[vy][cx] = { type: active.type, ghost: true, active: false }
          }
        }
      }
      // Active piece overlays the ghost.
      for (const [cx, cy] of pieceCells(active.type, active.x, active.y, active.rotation)) {
        const vy = cy - HIDDEN_ROWS
        if (vy >= 0 && vy < VISIBLE_ROWS && cx >= 0 && cx < COLS) {
          out[vy][cx] = { type: active.type, ghost: false, active: true }
        }
      }
    }

    return out
  }, [grid, active, showGhost])

  const clearing = new Set(clearingRows)

  return (
    <div className="board-wrap">
      <div
        className="board"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${VISIBLE_ROWS}, 1fr)`,
        }}
        data-phase={phase}
      >
        {cells.map((row, y) =>
          row.map((cell, x) => {
            const color = cell.type ? COLORS[cell.type] : undefined
            const cls = [
              'cell',
              cell.type ? 'filled' : 'empty',
              cell.ghost ? 'ghost' : '',
              cell.active ? 'active' : '',
              clearing.has(y) ? 'clearing' : '',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <div
                key={`${x}-${y}`}
                className={cls}
                style={color ? ({ '--cell-color': color } as React.CSSProperties) : undefined}
              />
            )
          }),
        )}
      </div>
    </div>
  )
}
