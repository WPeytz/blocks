// Dev launcher: starts Vite, waits for it to serve, then opens the Electron
// window pointed at the dev server (with hot reload). No external deps.
import { spawn } from 'node:child_process'

const DEV_URL = 'http://localhost:5173'
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const vite = spawn(npmCmd, ['run', 'dev'], { stdio: 'inherit' })

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  return false
}

const ok = await waitForServer(DEV_URL)
if (!ok) {
  console.error('Vite dev server did not start in time.')
  vite.kill()
  process.exit(1)
}

// `electron` resolves to the platform binary installed by the electron package.
const { default: electronPath } = await import('electron')
const electron = spawn(electronPath, ['.'], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_DEV: '1' },
})

const shutdown = () => {
  vite.kill()
  electron.kill()
  process.exit(0)
}

electron.on('close', shutdown)
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
