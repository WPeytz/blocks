import { COLORS, SHAPES } from '../game/pieces'
import type { PieceType } from '../game/types'

interface PieceMiniProps {
  type: PieceType | null
  dimmed?: boolean
}

/**
 * Renders a single tetromino inside a fixed 4x4 mini-grid, used for the hold
 * slot and the next-queue. Trims the piece's bounding box so each piece appears
 * visually centered regardless of where its cells sit in the rotation box.
 */
export function PieceMini({ type, dimmed }: PieceMiniProps) {
  const cells = type ? SHAPES[type][0] : []
  const filled = new Set(cells.map(([x, y]) => `${x}-${y}`))
  const color = type ? COLORS[type] : undefined

  // Compute bounds to center the shape within the mini box.
  let minX = 4, maxX = -1, minY = 4, maxY = -1
  for (const [x, y] of cells) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  const w = type ? maxX - minX + 1 : 0
  const h = type ? maxY - minY + 1 : 0

  // Render every piece into a fixed 4x4 grid so all pieces share one uniform
  // cell size. Centering the trimmed bounding box keeps the piece visually
  // centered without stretching its tracks (which made the flat I-piece huge).
  const BOX = 4
  const offX = Math.floor((BOX - w) / 2)
  const offY = Math.floor((BOX - h) / 2)

  return (
    <div className={`piece-mini ${dimmed ? 'dimmed' : ''}`}>
      {type && (
        <div className="piece-mini-grid">
          {Array.from({ length: BOX }, (_, gy) =>
            Array.from({ length: BOX }, (_, gx) => {
              const on = filled.has(`${gx - offX + minX}-${gy - offY + minY}`)
              return (
                <div
                  key={`${gx}-${gy}`}
                  className={`mini-cell ${on ? 'on' : ''}`}
                  style={on && color ? ({ '--cell-color': color } as React.CSSProperties) : undefined}
                />
              )
            }),
          )}
        </div>
      )}
    </div>
  )
}
