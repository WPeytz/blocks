// Generates build/icon.png (1024x1024) from scratch — no external image assets.
// Encodes a valid PNG using only Node built-ins (zlib + manual chunk/CRC).
// The icon: a dark squircle with four glossy neon blocks (the game's identity).

import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SIZE = 1024
const __dirname = dirname(fileURLToPath(import.meta.url))

// --- tiny vector helpers ----------------------------------------------------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const mix = (a, b, t) => a + (b - a) * t

// Signed distance to a rounded rectangle centered at (cx,cy).
function roundedRectSDF(px, py, cx, cy, halfW, halfH, r) {
  const qx = Math.abs(px - cx) - (halfW - r)
  const qy = Math.abs(py - cy) - (halfH - r)
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r
}

function hex(h) {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
}

// Alpha-composite src (rgb,a) over dst (rgb,a) in straight-alpha.
function over(dst, r, g, b, a) {
  const da = dst[3] / 255
  const outA = a + da * (1 - a)
  if (outA <= 0) return
  dst[0] = (r * a + dst[0] * da * (1 - a)) / outA
  dst[1] = (g * a + dst[1] * da * (1 - a)) / outA
  dst[2] = (b * a + dst[2] * da * (1 - a)) / outA
  dst[3] = outA * 255
}

const CELLS = [
  { dx: -1, dy: -1, color: '#22d3ee' }, // cyan
  { dx: 1, dy: -1, color: '#c084fc' }, // purple
  { dx: -1, dy: 1, color: '#4ade80' }, // green
  { dx: 1, dy: 1, color: '#fb923c' }, // orange
]

const buf = new Uint8Array(SIZE * SIZE * 4) // RGBA, straight alpha

const center = SIZE / 2
const bgHalf = SIZE / 2 - 8
const bgRadius = SIZE * 0.225 // macOS-style squircle approximation

const cellSize = 300
const gap = 28
const cellHalf = cellSize / 2
const cellR = 56
const step = cellSize / 2 + gap / 2

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const px = x + 0.5
    const py = y + 0.5
    const i = (y * SIZE + x) * 4
    const out = [0, 0, 0, 0]

    // 1) Background squircle with a vertical gradient + top glow.
    const bgSDF = roundedRectSDF(px, py, center, center, bgHalf, bgHalf, bgRadius)
    const bgCov = clamp(0.5 - bgSDF, 0, 1)
    if (bgCov > 0) {
      const t = y / SIZE
      let r = mix(0x12, 0x0a, t)
      let g = mix(0x16, 0x0c, t)
      let b = mix(0x32, 0x1c, t)
      // radial top glow
      const gd = Math.hypot(px - center, py - center * 0.62) / SIZE
      const glow = clamp(0.5 - gd, 0, 0.5) * 0.7
      r = mix(r, 0x3c, glow)
      g = mix(g, 0x50, glow)
      b = mix(b, 0xdc, glow)
      over(out, r, g, b, bgCov)
    }

    // 2) Four glossy neon blocks.
    for (const cell of CELLS) {
      const cx = center + cell.dx * step
      const cy = center + cell.dy * step
      const [cr, cg, cb] = hex(cell.color)

      // Soft outer halo for neon glow.
      const haloSDF = roundedRectSDF(px, py, cx, cy, cellHalf + 18, cellHalf + 18, cellR + 18)
      const halo = clamp(0.5 - haloSDF * 0.04, 0, 1) * 0.35
      if (halo > 0) over(out, cr, cg, cb, halo)

      // The block body.
      const sdf = roundedRectSDF(px, py, cx, cy, cellHalf, cellHalf, cellR)
      const cov = clamp(0.5 - sdf, 0, 1)
      if (cov > 0) {
        // base color
        let r = cr
        let g = cg
        let b = cb
        // top gloss sheen
        const gloss = clamp(1 - (py - (cy - cellHalf)) / (cellSize * 0.5), 0, 1) * 0.5
        r = mix(r, 255, gloss)
        g = mix(g, 255, gloss)
        b = mix(b, 255, gloss)
        // bottom inner shadow
        const shade = clamp(((py - cy) / cellHalf), 0, 1) * 0.28
        r = mix(r, 0, shade)
        g = mix(g, 0, shade)
        b = mix(b, 0, shade)
        over(out, r, g, b, cov)
      }
    }

    buf[i] = clamp(Math.round(out[0]), 0, 255)
    buf[i + 1] = clamp(Math.round(out[1]), 0, 255)
    buf[i + 2] = clamp(Math.round(out[2]), 0, 255)
    buf[i + 3] = clamp(Math.round(out[3]), 0, 255)
  }
}

// --- PNG encoding -----------------------------------------------------------
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBytes, data])
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // color type RGBA
// 10-12 default (compression, filter, interlace) = 0

// Raw image: each scanline prefixed with filter byte 0.
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (SIZE * 4 + 1)
  raw[rowStart] = 0
  Buffer.from(buf.buffer, y * SIZE * 4, SIZE * 4).copy(raw, rowStart + 1)
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])

const outPath = resolve(__dirname, '..', 'build', 'icon.png')
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, png)
console.log(`Wrote ${outPath} (${png.length} bytes)`)
