const { app, BrowserWindow, dialog } = require('electron');
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
autoUpdater.autoDownload = true;

// Programmatically set feed URL to guarantee it points to the correct repo
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'denxi342',
  repo: 'messenger'
});

autoUpdater.on('checking-for-update', () => {
  log('STATUS', 'Проверка наличия обновлений...');
});

autoUpdater.on('update-available', (info) => {
  log('STATUS', `Найдено обновление: версия ${info.version}`);
});

autoUpdater.on('update-not-available', (info) => {
  log('STATUS', `Обновлений не найдено. Текущая версия: ${app.getVersion()}`);
});

autoUpdater.on('download-progress', (progressObj) => {
  log('STATUS', `Прогресс загрузки: ${Math.round(progressObj.percent)}% (${Math.round(progressObj.bytesPerSecond / 1024)} KB/s)`);
});

autoUpdater.on('update-downloaded', (info) => {
  log('STATUS', `Обновление версии ${info.version} загружено и готово к установке.`);
  
  dialog.showMessageBox({
    type: 'info',
    title: 'Обновление готово',
    message: `Новая версия Octave (${info.version}) успешно загружена. Перезапустить приложение для установки?`,
    buttons: ['Установить и перезапустить', 'Позже'],
    defaultId: 0,
    cancelId: 1
  }).then((result) => {
    if (result.response === 0) {
      log('STATUS', 'Пользователь выбрал установку. Перезапуск...');
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  log('ERROR', `Ошибка автоматического обновления: ${err.stack || err.message || err}`);
});

function createWindow() {
  const win = new BrowserWindow({
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
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // Trigger check for updates
  log('STATUS', `Приложение готово. Версия: ${app.getVersion()}. Упаковано: ${app.isPackaged}`);
  autoUpdater.checkForUpdatesAndNotify().catch(err => {
    log('ERROR', `Не удалось запустить проверку обновлений: ${err.stack || err.message}`);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
