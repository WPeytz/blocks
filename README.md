# Offline Blocks

A polished, offline-first, single-player falling-block puzzle game built with
Vite + React + TypeScript. Original game inspired by common genre mechanics — no
official branding, logos, music, or copyrighted assets.

## Run it

```bash
npm install
npm run dev
```

Open the printed local URL and press **Enter** to start. Everything runs locally
in the browser — no backend, no network calls, no CDN assets.

### Production build

```bash
npm run build
npm run preview
```

## Controls

| Key | Action |
| --- | --- |
| ← / → | Move |
| ↓ | Soft drop |
| Space | Hard drop |
| ↑ / X | Rotate clockwise |
| Z | Rotate counter-clockwise |
| C / Shift | Hold |
| P / Esc | Pause / resume |
| R | Restart |

## Features

- 10×20 board with hidden spawn rows
- 7-bag randomizer, 5-piece preview, hold (once per piece)
- Ghost piece, hard/soft drop, SRS-style wall kicks
- DAS/ARR tuned movement, gravity that scales with level
- Lock delay with reset cap (no infinite stalling)
- Modern scoring with combo + back-to-back bonuses
- High score & settings persisted to `localStorage`
- Generated Web Audio sound effects (no audio files)
- Line-clear flash, hard-drop impact, pause/game-over overlays

## Where the game logic lives

All gameplay is decoupled from React rendering:

| File | Responsibility |
| --- | --- |
| `src/game/types.ts` | Shared TypeScript types |
| `src/game/pieces.ts` | Tetromino shapes, colors, board dimensions |
| `src/game/randomizer.ts` | 7-bag piece generation |
| `src/game/collision.ts` | Collision checks + SRS wall kicks |
| `src/game/scoring.ts` | Scoring, level curve, gravity curve |
| `src/game/engine.ts` | Headless game engine (state machine, lock delay) |
| `src/game/audio.ts` | Web Audio sound synthesis |
| `src/game/storage.ts` | localStorage persistence |
| `src/hooks/useGame.ts` | RAF game loop + keyboard input (DAS/ARR) |
| `src/components/*` | Board, panels, and piece previews |
| `src/App.tsx` | Layout + overlays |

The engine (`src/game/engine.ts`) is the heart: it owns the grid, active piece,
timers, scoring, and line clears, and exposes a plain `getState()` snapshot that
the React layer renders.
