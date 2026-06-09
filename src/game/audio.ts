// Tiny Web Audio sound engine. All sounds are synthesized on the fly — no audio
// files, no network. Lazily creates an AudioContext on first use (after a user
// gesture, per browser autoplay policy).

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Play a short tone. `type` shapes the timbre; gain envelope avoids clicks. */
function beep(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.06): void {
  const ac = getCtx()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  const now = ac.currentTime
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume, now + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(now)
  osc.stop(now + duration + 0.02)
}

export const Sfx = {
  move: () => beep(220, 0.04, 'square', 0.03),
  rotate: () => beep(330, 0.05, 'square', 0.035),
  lock: () => beep(160, 0.06, 'triangle', 0.05),
  hardDrop: () => beep(110, 0.09, 'sawtooth', 0.05),
  hold: () => beep(440, 0.06, 'sine', 0.04),
  levelUp: () => {
    beep(523, 0.08, 'square', 0.05)
    setTimeout(() => beep(784, 0.12, 'square', 0.05), 90)
  },
  clear: (lines: number) => {
    // Higher / brighter for bigger clears.
    const base = 440 + lines * 80
    beep(base, 0.1, 'square', 0.05)
    setTimeout(() => beep(base * 1.5, 0.12, 'square', 0.045), 70)
  },
  gameOver: () => {
    beep(330, 0.18, 'sawtooth', 0.05)
    setTimeout(() => beep(247, 0.22, 'sawtooth', 0.05), 160)
    setTimeout(() => beep(165, 0.4, 'sawtooth', 0.05), 340)
  },
}
