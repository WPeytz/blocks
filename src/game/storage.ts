import { DEFAULT_SETTINGS } from './engine'
import type { Settings } from './types'

// Thin localStorage wrappers with safe fallbacks (private mode / disabled storage).

const HIGH_SCORE_KEY = 'offline-blocks:highscore'
const HIGH_SCORES_KEY = 'offline-blocks:highscores'
const SETTINGS_KEY = 'offline-blocks:settings'

/** How many top scores we keep on the leaderboard. */
export const MAX_SCORES = 5

export function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY)
    const n = raw ? parseInt(raw, 10) : 0
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

export function saveHighScore(value: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(value))
  } catch {
    /* ignore */
  }
}

/** Load the descending top-N leaderboard, migrating any legacy single score. */
export function loadHighScores(): number[] {
  try {
    const raw = localStorage.getItem(HIGH_SCORES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return parsed
          .filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
          .sort((a, b) => b - a)
          .slice(0, MAX_SCORES)
      }
    }
    // Migrate a pre-leaderboard single high score into the list.
    const legacy = loadHighScore()
    return legacy > 0 ? [legacy] : []
  } catch {
    return []
  }
}

export function saveHighScores(scores: number[]): void {
  try {
    localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(scores.slice(0, MAX_SCORES)))
  } catch {
    /* ignore */
  }
}

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* ignore */
  }
}
