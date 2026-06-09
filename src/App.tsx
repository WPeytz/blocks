import { useEffect, useRef, useState } from 'react'
import { Board } from './components/Board'
import { HoldPanel, InfoPanel } from './components/Panel'
import { useGame } from './hooks/useGame'

export default function App() {
  const { state, settings, start } = useGame()
  const { phase } = state

  // Trigger the hard-drop impact shake by keying off the engine's counter.
  const [shake, setShake] = useState(false)
  const lastDrop = useRef(state.hardDropTick)
  useEffect(() => {
    if (state.hardDropTick !== lastDrop.current) {
      lastDrop.current = state.hardDropTick
      setShake(true)
      const t = setTimeout(() => setShake(false), 180)
      return () => clearTimeout(t)
    }
  }, [state.hardDropTick])

  return (
    <div className="app">
      <header className="title-bar">
        <h1 className="game-title">
          <span className="title-blocks">Blocks</span>
        </h1>
        <p className="tagline">A modern falling-block puzzle</p>
      </header>

      <main className="layout">
        <HoldPanel state={state} />

        <div className={`stage ${shake ? 'shake' : ''}`}>
          <Board state={state} showGhost={settings.ghost} />

          {phase === 'ready' && (
            <Overlay>
              <h2 className="overlay-title">Blocks</h2>
              <p className="overlay-sub">Stack, clear, and chase a high score.</p>
              <button className="cta" onClick={start}>
                Press <kbd>Enter</kbd> to Start
              </button>
            </Overlay>
          )}

          {phase === 'paused' && (
            <Overlay>
              <h2 className="overlay-title">Paused</h2>
              <p className="overlay-sub">
                Press <kbd>P</kbd> or <kbd>Esc</kbd> to resume
              </p>
            </Overlay>
          )}

          {phase === 'over' && (
            <Overlay>
              <h2 className="overlay-title gameover">Game Over</h2>
              {state.isNewHighScore && <p className="new-high">★ New High Score! ★</p>}
              <p className="final-score">
                Score <strong>{state.score.toLocaleString()}</strong>
              </p>
              <p className="overlay-sub">
                Level {state.level} · {state.lines} lines
              </p>
              <Leaderboard scores={state.topScores} current={state.score} />
              <button className="cta" onClick={start}>
                Press <kbd>Enter</kbd> to Play Again
              </button>
            </Overlay>
          )}
        </div>

        <InfoPanel state={state} />
      </main>

      <footer className="footer">
        Original puzzle game · no tracking
      </footer>
    </div>
  )
}

/** Top-5 leaderboard shown on the game-over screen. */
function Leaderboard({ scores, current }: { scores: number[]; current: number }) {
  // Highlight the row for the run that just ended (first matching value).
  let highlighted = current > 0 ? scores.indexOf(current) : -1
  const rows = Array.from({ length: 5 }, (_, i) => scores[i])

  return (
    <ol className="leaderboard">
      {rows.map((value, i) => (
        <li
          key={i}
          className={`leaderboard-row ${i === highlighted ? 'you' : ''} ${
            value === undefined ? 'empty' : ''
          }`}
        >
          <span className="lb-rank">{i + 1}</span>
          <span className="lb-score">{value !== undefined ? value.toLocaleString() : '—'}</span>
        </li>
      ))}
    </ol>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="overlay">
      <div className="overlay-card">{children}</div>
    </div>
  )
}
