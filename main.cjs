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
autoUpdater.autoDownload = false; // Do not download automatically, ask the user first

autoUpdater.on('checking-for-update', () => {
  log('STATUS', 'Проверка наличия обновлений...');
});

autoUpdater.on('update-available', (info) => {
  log('STATUS', `Найдено обновление: версия ${info.version}`);
  
  dialog.showMessageBox({
    type: 'info',
    title: 'Доступно обновление',
    message: `Найдена новая версия Octave App (${info.version}). Хотите скачать обновление?`,
    buttons: ['Скачать обновление', 'Позже'],
    defaultId: 0,
    cancelId: 1
  }).then((result) => {
    if (result.response === 0) {
      log('STATUS', 'Пользователь нажал "Скачать обновление". Запуск загрузки...');
      
      // Call downloadUpdate() and capture any promise rejections
      autoUpdater.downloadUpdate().then((downloadPromise) => {
        log('STATUS', 'Загрузка успешно инициализирована.');
      }).catch((err) => {
        log('ERROR', `Исключение при вызове downloadUpdate: ${err.message}`);
        dialog.showErrorBox('Ошибка загрузки', `Не удалось начать загрузку: ${err.message}\n\n${err.stack || ''}`);
      });
    } else {
      log('STATUS', 'Пользователь отказался от загрузки обновления.');
    }
  });
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
    } else {
      log('STATUS', 'Пользователь отложил установку обновления.');
    }
  });
});

autoUpdater.on('error', (err) => {
  const errMsg = err.stack || err.message || String(err);
  log('ERROR', `Ошибка автоматического обновления: ${errMsg}`);
  dialog.showErrorBox('Ошибка авто-обновления', `Произошла ошибка при обновлении:\n\n${errMsg}`);
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
