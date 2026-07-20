const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const fs = require('fs');

// Log file configuration
const logFilePath = path.join(app.getPath('userData'), 'updater.log');
const log = (level, message) => {
  const logStr = `[${level}] ${new Date().toISOString()} - ${message}\n`;
  try {
    fs.appendFileSync(logFilePath, logStr);
  } catch (e) {
    console.error('Failed to write log:', e);
  }
  console.log(logStr.trim());
};

autoUpdater.logger = {
  info: (msg) => log('INFO', msg),
  warn: (msg) => log('WARN', msg),
  error: (msg) => log('ERROR', msg)
};

// Configure autoUpdater
autoUpdater.autoDownload = false; // Do not download automatically, ask the user first

let mainWindow = null;

autoUpdater.on('checking-for-update', () => {
  log('STATUS', 'Проверка наличия обновлений...');
});

autoUpdater.on('update-available', (info) => {
  log('STATUS', `Найдено обновление: версия ${info.version}`);
  if (mainWindow) {
    mainWindow.webContents.send('update-available', info.version);
  }
});

autoUpdater.on('update-not-available', (info) => {
  log('STATUS', `Обновлений не найдено. Текущая версия: ${app.getVersion()}`);
});

autoUpdater.on('download-progress', (progressObj) => {
  log('STATUS', `Прогресс загрузки: ${Math.round(progressObj.percent)}% (${Math.round(progressObj.bytesPerSecond / 1024)} KB/s)`);
});

autoUpdater.on('update-downloaded', (info) => {
  log('STATUS', `Обновление версии ${info.version} загружено и готово к установке.`);
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info.version);
  }
});

autoUpdater.on('error', (err) => {
  const errMsg = err.stack || err.message || String(err);
  log('ERROR', `Ошибка автоматического обновления: ${errMsg}`);
  if (mainWindow) {
    mainWindow.webContents.send('update-error', errMsg);
  }
});

// IPC handlers for updater actions
ipcMain.on('download-update', () => {
  log('STATUS', 'Пользователь запросил загрузку обновления через IPC.');
  autoUpdater.downloadUpdate().then(() => {
    log('STATUS', 'Загрузка успешно инициализирована.');
  }).catch((err) => {
    log('ERROR', `Исключение при вызове downloadUpdate: ${err.message}`);
  });
});

ipcMain.on('restart-and-install', () => {
  log('STATUS', 'Пользователь запросил установку и перезапуск через IPC.');
  autoUpdater.quitAndInstall();
});

let notificationWindow = null;

function createNotificationWindow() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  const winWidth = 360;
  const winHeight = 500;

  notificationWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: width - winWidth - 20,
    y: height - winHeight - 10,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    notificationWindow.loadURL('http://localhost:5173/?windowType=notification');
  } else {
    // Load local file with search parameters
    const fileUrl = `file://${path.join(__dirname, 'dist', 'index.html')}?windowType=notification`;
    notificationWindow.loadURL(fileUrl);
  }

  // Allow clicks to pass through transparent areas
  notificationWindow.setIgnoreMouseEvents(true, { forward: true });

  notificationWindow.on('closed', () => {
    notificationWindow = null;
  });
}

// Forward notifications to the desktop notification window
ipcMain.on('show-desktop-notification', (event, notification) => {
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.webContents.send('desktop-notification-add', notification);
    notificationWindow.showInactive();
  }
});

// Toggle mouse ignoring for the notification window
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.setIgnoreMouseEvents(ignore, options);
  }
});

// Hide the notification window when empty
ipcMain.on('hide-desktop-notification-window', () => {
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.hide();
  }
});

// Forward action click back to the main window
ipcMain.on('desktop-notification-action', (event, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('desktop-notification-action-triggered', data);
  }
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1a1a1a',
      symbolColor: '#ffffff',
      height: 36
    },
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    // Close the notification window as well
    if (notificationWindow && !notificationWindow.isDestroyed()) {
      notificationWindow.close();
    }
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Set AppUserModelId for Windows native notifications to function properly
  app.setAppUserModelId('com.octave.app');
  
  createWindow();
  createNotificationWindow();

  // Trigger check for updates
  log('STATUS', `Приложение готово. Версия: ${app.getVersion()}. Упаковано: ${app.isPackaged}`);
  autoUpdater.checkForUpdatesAndNotify().catch(err => {
    log('ERROR', `Не удалось запустить проверку обновлений: ${err.stack || err.message}`);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      createNotificationWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
