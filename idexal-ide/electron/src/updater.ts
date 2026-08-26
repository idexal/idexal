/**
 * Auto-updater for Idexal IDE
 * Uses electron-updater with GitHub Releases as the update source.
 */

import { autoUpdater, UpdateInfo } from 'electron-updater'
import { BrowserWindow, dialog } from 'electron'

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

let mainWindow: BrowserWindow | null = null

export function initAutoUpdater(window: BrowserWindow) {
  mainWindow = window

  autoUpdater.on('checking-for-update', () => {
    sendToRenderer('update-checking')
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    sendToRenderer('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    })

    // Prompt user to download
    dialog
      .showMessageBox(window, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available.`,
        detail: 'Would you like to download and install it?',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadUpdate()
        }
      })
  })

  autoUpdater.on('update-not-available', () => {
    sendToRenderer('update-not-available')
  })

  autoUpdater.on('download-progress', (progress: { percent: number; transferred: number; total: number }) => {
    sendToRenderer('update-download-progress', {
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
    })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    sendToRenderer('update-downloaded', { version: info.version })

    dialog
      .showMessageBox(window, {
        type: 'info',
        title: 'Update Ready',
        message: `Version ${info.version} has been downloaded.`,
        detail: 'The application will restart to apply the update.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall()
        }
      })
  })

  autoUpdater.on('error', (err: Error) => {
    sendToRenderer('update-error', { message: err.message })
  })
}

export function checkForUpdates() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    autoUpdater.checkForUpdates().catch(() => {
      // Silently fail if offline or no updates available
    })
  }
}

export function downloadUpdate() {
  autoUpdater.downloadUpdate()
}

export function installUpdate() {
  autoUpdater.quitAndInstall()
}

function sendToRenderer(channel: string, data?: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}
