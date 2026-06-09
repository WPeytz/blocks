// Electron main process. Wraps the built React app in a native macOS window so
// "Blocks" runs as a standalone .app in the dock — fully offline.
const { app, BrowserWindow, Menu, shell } = require('electron')
const path = require('node:path')

const isDev = process.env.ELECTRON_DEV === '1'
const DEV_URL = 'http://localhost:5173'

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 900,
    minWidth: 720,
    minHeight: 640,
    backgroundColor: '#07080f', // matches the app background, avoids white flash
    title: 'Blocks',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.once('ready-to-show', () => win.show())

  if (isDev) {
    win.loadURL(DEV_URL)
  } else {
    // Vite is built with base './', so the file:// load resolves assets relatively.
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // Open any external links in the default browser, never in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// A minimal app menu: standard quit/edit/window roles plus a reload in dev.
function buildMenu() {
  const template = [
    { role: 'appMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        ...(isDev ? [{ role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' }, { type: 'separator' }] : []),
        { role: 'togglefullscreen' },
        { role: 'resetZoom' },
      ],
    },
    { role: 'windowMenu' },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  buildMenu()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Standard macOS behavior: stay alive until Cmd+Q, but a single-window game
  // is fine to quit fully when closed.
  app.quit()
})
