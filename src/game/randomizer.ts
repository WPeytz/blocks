import { PIECE_TYPES } from './pieces'
import type { PieceType } from './types'

/**
 * 7-bag randomizer.
 *
 * Modern falling-block games avoid long droughts/floods of any single piece by
 * shuffling all seven pieces into a "bag" and dealing them out before refilling.
 * Over any 7 consecutive pieces you are guaranteed exactly one of each, which
 * makes play feel fair and predictable without being deterministic.
 */
export class SevenBag {
  private bag: PieceType[] = []

  /** Fisher–Yates shuffle of a fresh copy of all seven piece types. */
  private refill(): void {
    const next = [...PIECE_TYPES]
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[next[i], next[j]] = [next[j], next[i]]
    }
    this.bag = next
  }

  /** Draw the next piece, refilling the bag when it empties. */
  next(): PieceType {
    if (this.bag.length === 0) this.refill()
    return this.bag.shift()!
  }

  /** Pre-fill a queue with at least `count` upcoming pieces. */
  fill(count: number): PieceType[] {
    const out: PieceType[] = []
    while (out.length < count) out.push(this.next())
    return out
  }
}
