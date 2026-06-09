import type { GameState } from '../game/types'
import { PieceMini } from './Preview'

/** Left panel: the hold slot. */
export function HoldPanel({ state }: { state: GameState }) {
  return (
    <aside className="panel hold-panel">
      <h2 className="panel-title">Hold</h2>
      <div className="slot">
        <PieceMini type={state.hold} dimmed={!state.canHold} />
      </div>
      <ControlsRef />
    </aside>
  )
}

/** Right panel: next queue + stats. */
export function InfoPanel({ state }: { state: GameState }) {
  return (
    <aside className="panel info-panel">
      <h2 className="panel-title">Next</h2>
      <div className="queue">
        {state.queue.map((type, i) => (
          <div className="slot small" key={`${type}-${i}`}>
            <PieceMini type={type} />
          </div>
        ))}
      </div>

      <div className="stats">
        <Stat label="Score" value={state.score.toLocaleString()} />
        <Stat label="High" value={state.highScore.toLocaleString()} highlight={state.isNewHighScore} />
        <Stat label="Level" value={String(state.level)} />
        <Stat label="Lines" value={String(state.lines)} />
        {state.combo > 0 && <Stat label="Combo" value={`×${state.combo}`} />}
        {state.backToBack && <Stat label="B2B" value="✦" />}
      </div>
    </aside>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`stat ${highlight ? 'highlight' : ''}`}>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  )
}

const CONTROLS: Array<[string, string]> = [
  ['← →', 'Move'],
  ['↓', 'Soft drop'],
  ['Space', 'Hard drop'],
  ['↑ / X', 'Rotate CW'],
  ['Z', 'Rotate CCW'],
  ['C / Shift', 'Hold'],
  ['P / Esc', 'Pause'],
  ['R', 'Restart'],
]

function ControlsRef() {
  return (
    <div className="controls-ref">
      <h3 className="controls-title">Controls</h3>
      <ul>
        {CONTROLS.map(([key, action]) => (
          <li key={key}>
            <kbd>{key}</kbd>
            <span>{action}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
