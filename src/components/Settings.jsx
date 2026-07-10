import React, { useEffect, useState } from 'react';
import { fetchSessions, removeSession, removeAllOtherSessions, fetchBlockedUsers, unblockUser } from '../api';
import Avatar from './Avatar';

const TRANSLATIONS = {
  ru: {
    settings: 'Настройки',
    profile: 'Профиль',
    appearance: 'Оформление',
    notifications: 'Уведомления',
    privacy: 'Конфиденциальность',
    security: 'Безопасность',
    devices: 'Устройства',
    storage: 'Данные и память',
    accessibility: 'Универсальный доступ',
    language: 'Язык',
    theme: 'Тема',
    theme_desc: 'Выберите оформление интерфейса',
    theme_dark: 'Темная',
    theme_light: 'Светлая',
    theme_system: 'Как в системе',
    accent: 'Акцентный цвет',
    accent_desc: 'Цвет кнопок и активных элементов',
    compact: 'Компактный режим',
    compact_desc: 'Плотнее список чатов и сообщений',
    animations: 'Анимации',
    animations_desc: 'Плавные переходы и эффекты',
    fontSize: 'Размер шрифта',
    fontSize_desc: 'Масштаб текста сообщений',
    bubbleStyle: 'Стиль сообщений',
    bubbleStyle_desc: 'Форма облачков сообщений',
    bubbleStyle_rounded: 'Скругленный',
    bubbleStyle_sharp: 'Острый',
    bubbleStyle_modern: 'Современный',
    chatBackground: 'Фон чата',
    chatBackground_desc: 'Задний план в окне чата',
    chatBg_solid: 'Сплошной',
    chatBg_gradient: 'Градиент',
    chatBg_pattern: 'Узор',
    notifyMode: 'Уведомлять о',
    notifyMode_desc: 'Какие сообщения будут показывать баннер',
    notify_all: 'Все сообщения',
    notify_contacts: 'Только контакты',
    notify_none: 'Не уведомлять',
    sound: 'Звук',
    sound_desc: 'Проигрывать звук при новом сообщении',
    soundVol: 'Громкость звука',
    soundVol_desc: 'Громкость сигналов уведомлений',
    desktopNotifications: 'Системные уведомления',
    desktopNotifications_desc: 'Показывать уведомления рабочего стола',
    messagePreview: 'Превью текста',
    messagePreview_desc: 'Показывать начало сообщения в уведомлении',
    dnd: 'Режим «Не беспокоить»',
    dnd_desc: 'Отключить все уведомления и звуки',
    onlineStatus: 'Статус онлайн',
    onlineStatus_desc: 'Показывать другим, что вы в сети',
    readReceipts: 'Отчеты о прочтении',
    readReceipts_desc: 'Показывать собеседнику, что сообщение прочитано',
    profileVisibility: 'Профиль виден',
    profileVisibility_desc: 'Кто может видеть описание и аватар',
    callsAllowed: 'Звонки разрешены',
    callsAllowed_desc: 'Кто может начать звонок',
    twoFactor: 'Двухфакторная защита',
    twoFactor_desc: 'Запрашивать дополнительный код при входе',
    loginAlerts: 'Предупреждения о входе',
    loginAlerts_desc: 'Сообщать о входе с нового устройства',
    autoLock: 'Автоблокировка',
    autoLock_desc: 'Когда приложение должно блокироваться',
    autoLock_never: 'Никогда',
    autoLock_5: 'Через 5 минут',
    autoLock_15: 'Через 15 минут',
    autoLock_60: 'Через 1 час',
    autoDownload: 'Автозагрузка медиа',
    autoDownload_desc: 'Когда автоматически скачивать вложения',
    autoDownload_always: 'Всегда',
    autoDownload_wifi: 'Только Wi-Fi',
    autoDownload_never: 'Никогда',
    cacheLimit: 'Лимит кеша',
    cacheLimit_desc: 'Максимальный размер локальных данных',
    clearCache: 'Очистить кеш',
    downloadData: 'Скачать данные',
    downloadData_desc: 'Экспортировать историю сообщений и профиль',
    largeText: 'Крупный текст',
    largeText_desc: 'Увеличить размер текста в интерфейсе',
    reduceMotion: 'Меньше движения',
    reduceMotion_desc: 'Отключить лишние анимации',
    highContrast: 'Высокий контраст',
    highContrast_desc: 'Сделать границы и текст заметнее',
    spellcheck: 'Проверка орфографии',
    spellcheck_desc: 'Подчеркивать возможные ошибки при вводе',
    resetSettings: 'Сбросить все настройки',
    terminateOthers: 'Завершить другие сеансы',
    currentSession: 'Текущая сессия',
    blockedUsers: 'Заблокированные пользователи',
    blockedUsers_desc: 'Управление черным списком',
    noBlocked: 'Черный список пуст',
    unblock: 'Разблокировать',
    loading: 'Загрузка...',
    save: 'Сохранить',
    saved: 'Сохранено',
    reset_feedback: 'Настройки сброшены'
  },
  en: {
    settings: 'Settings',
    profile: 'Profile',
    appearance: 'Appearance',
    notifications: 'Notifications',
    privacy: 'Privacy',
    security: 'Security',
    devices: 'Devices',
    storage: 'Data & Storage',
    accessibility: 'Accessibility',
    language: 'Language',
    theme: 'Theme',
    theme_desc: 'Choose application theme',
    theme_dark: 'Dark',
    theme_light: 'Light',
    theme_system: 'System default',
    accent: 'Accent Color',
    accent_desc: 'Color for buttons and active elements',
    compact: 'Compact Mode',
    compact_desc: 'Denser spacing for chats and messages',
    animations: 'Animations',
    animations_desc: 'Smooth transitions and effects',
    fontSize: 'Font Size',
    fontSize_desc: 'Scale for message text size',
    bubbleStyle: 'Message Style',
    bubbleStyle_desc: 'Shape of message bubbles',
    bubbleStyle_rounded: 'Rounded',
    bubbleStyle_sharp: 'Sharp',
    bubbleStyle_modern: 'Modern',
    chatBackground: 'Chat Background',
    chatBackground_desc: 'Background style in chat window',
    chatBg_solid: 'Solid',
    chatBg_gradient: 'Gradient',
    chatBg_pattern: 'Pattern',
    notifyMode: 'Notify For',
    notifyMode_desc: 'Which messages trigger notification banner',
    notify_all: 'All messages',
    notify_contacts: 'Contacts only',
    notify_none: 'None',
    sound: 'Sound',
    sound_desc: 'Play sound for new messages',
    soundVol: 'Sound Volume',
    soundVol_desc: 'Volume for notification sounds',
    desktopNotifications: 'Desktop Notifications',
    desktopNotifications_desc: 'Show system desktop notifications',
    messagePreview: 'Message Preview',
    messagePreview_desc: 'Show message preview in notification banner',
    dnd: 'Do Not Disturb',
    dnd_desc: 'Mute all notifications and sounds',
    onlineStatus: 'Online Status',
    onlineStatus_desc: 'Show when you are active to others',
    readReceipts: 'Read Receipts',
    readReceipts_desc: 'Show when you have read messages',
    profileVisibility: 'Profile Visibility',
    profileVisibility_desc: 'Who can see your bio and avatar',
    callsAllowed: 'Calls Allowed',
    callsAllowed_desc: 'Who can call you',
    twoFactor: 'Two-Factor Auth',
    twoFactor_desc: 'Ask for verification code on login',
    loginAlerts: 'Login Alerts',
    loginAlerts_desc: 'Alert when logged in from new device',
    autoLock: 'Auto-Lock',
    autoLock_desc: 'Lock application after inactivity',
    autoLock_never: 'Never',
    autoLock_5: 'After 5 minutes',
    autoLock_15: 'After 15 minutes',
    autoLock_60: 'After 1 hour',
    autoDownload: 'Auto-Download Media',
    autoDownload_desc: 'When to automatically download attachments',
    autoDownload_always: 'Always',
    autoDownload_wifi: 'Wi-Fi only',
    autoDownload_never: 'Never',
    cacheLimit: 'Cache Limit',
    cacheLimit_desc: 'Maximum size of local cached data',
    clearCache: 'Clear Cache',
    downloadData: 'Download Data',
    downloadData_desc: 'Export message history and profile settings',
    largeText: 'Large Text',
    largeText_desc: 'Increase text size throughout the app',
    reduceMotion: 'Reduce Motion',
    reduceMotion_desc: 'Disable layout animations',
    highContrast: 'High Contrast',
    highContrast_desc: 'Make borders and text more visible',
    spellcheck: 'Spell Check',
    spellcheck_desc: 'Underline typing errors',
    resetSettings: 'Reset All Settings',
    terminateOthers: 'Terminate Other Sessions',
    currentSession: 'Current session',
    blockedUsers: 'Blocked Users',
    blockedUsers_desc: 'Manage your blacklist',
    noBlocked: 'No blocked users',
    unblock: 'Unblock',
    loading: 'Loading...',
    save: 'Save',
    saved: 'Saved',
    reset_feedback: 'Settings reset'
  }
};

const DEFAULT_SETTINGS = {
  theme: 'dark',
  accent: '#6b4cff',
  compactMode: false,
  animations: true,
  fontSize: 15,
  bubbleStyle: 'rounded',
  chatBackground: 'solid',
  notificationMode: 'all',
  sound: true,
  soundVolume: 70,
  desktopNotifications: true,
  messagePreview: true,
  doNotDisturb: false,
  onlineStatus: true,
  readReceipts: true,
  profileVisibility: 'contacts',
  callsAllowed: 'contacts',
  twoFactor: false,
  loginAlerts: true,
  autoLock: 'never',
  autoDownload: 'wifi',
  cacheLimit: 512,
  largeText: false,
  reduceMotion: false,
  highContrast: false,
  language: 'ru',
  spellcheck: true
};

const Settings = ({ token, user, onClose, profileComponent, securityComponent, settings, onUpdateSettings, onLogout }) => {
  const [activeCat, setActiveCat] = useState('profile');
  const [feedback, setFeedback] = useState('');
  
  // Dynamic categories states
  const [sessions, setSessions] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [cacheSize, setCacheSize] = useState(12.4);

  // Localization translation helper
  const lang = settings?.language === 'en' ? 'en' : 'ru';
  const t = (key) => TRANSLATIONS[lang][key] || key;

  const currentSettings = settings || DEFAULT_SETTINGS;

  useEffect(() => {
    if (activeCat === 'devices') {
      fetchSessions(token).then(setSessions).catch(console.error);
    } else if (activeCat === 'privacy') {
      fetchBlockedUsers(token).then(setBlockedUsers).catch(console.error);
    }
  }, [activeCat, token]);

  const updateSetting = (key, value) => {
    const updated = { ...currentSettings, [key]: value };
    onUpdateSettings(updated);
    setFeedback(t('saved'));
    window.clearTimeout(updateSetting.timer);
    updateSetting.timer = window.setTimeout(() => setFeedback(''), 1200);
  };

  const resetSettings = () => {
    onUpdateSettings(DEFAULT_SETTINGS);
    setFeedback(t('reset_feedback'));
    window.setTimeout(() => setFeedback(''), 1200);
  };

  const handleTerminateSession = async (sessionId) => {
    try {
      await removeSession(token, sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setFeedback(t('saved'));
      setTimeout(() => setFeedback(''), 1200);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTerminateOthers = async () => {
    try {
      await removeAllOtherSessions(token);
      setSessions(prev => prev.filter(s => s.is_current));
      setFeedback(t('saved'));
      setTimeout(() => setFeedback(''), 1200);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      await unblockUser(token, userId);
      setBlockedUsers(prev => prev.filter(u => u.id !== userId));
      setFeedback(t('saved'));
      setTimeout(() => setFeedback(''), 1200);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearCache = () => {
    setCacheSize(0);
    setFeedback(t('saved'));
    setTimeout(() => setFeedback(''), 1200);
  };

  const handleDownloadData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ user, settings: currentSettings }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `octave_data_${user?.username || 'user'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const categories = [
    { id: 'profile', name: t('profile'), icon: '👤' },
    { id: 'appearance', name: t('appearance'), icon: '🎨' },
    { id: 'notifications', name: t('notifications'), icon: '🔔' },
    { id: 'privacy', name: t('privacy'), icon: '🔒' },
    { id: 'security', name: t('security'), icon: '🛡️' },
    { id: 'devices', name: t('devices'), icon: '💻' },
    { id: 'storage', name: t('storage'), icon: '💾' },
    { id: 'accessibility', name: t('accessibility'), icon: '♿' },
    { id: 'language', name: t('language'), icon: '🌐' }
  ];

  const renderToggle = (key) => (
    <input
      type="checkbox"
      className="settings-toggle"
      checked={Boolean(currentSettings[key])}
      onChange={e => updateSetting(key, e.target.checked)}
    />
  );

  const renderSelect = (key, options) => (
    <select className="settings-select" value={currentSettings[key]} onChange={e => updateSetting(key, e.target.value)}>
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );

  const renderRange = (key, min, max, step, suffix = '') => (
    <div className="settings-range-wrap">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentSettings[key]}
        onChange={e => updateSetting(key, Number(e.target.value))}
      />
      <span>{currentSettings[key]}{suffix}</span>
    </div>
  );

  const renderRow = (title, description, control) => (
    <div className="settings-row">
      <div className="settings-row-info">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      {control}
    </div>
  );

  const renderContent = () => {
    switch (activeCat) {
      case 'profile':
        return (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>{t('profile')}</h2>
              <p>Управление личной информацией и статусом</p>
            </div>
            {profileComponent}
          </div>
        );
      case 'appearance':
        return (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>{t('appearance')}</h2>
              <p>{t('theme_desc')}</p>
            </div>
            <div className="settings-block">
              {renderRow(t('theme'), t('theme_desc'), renderSelect('theme', [
                { value: 'dark', label: t('theme_dark') },
                { value: 'system', label: t('theme_system') },
                { value: 'light', label: t('theme_light') }
              ]))}
              {renderRow(t('accent'), t('accent_desc'), (
                <div className="settings-swatches">
                  {['#6b4cff', '#31d0aa', '#ff6b6b', '#2f80ed'].map(color => (
                    <button
                      key={color}
                      className={`settings-swatch ${currentSettings.accent === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => updateSetting('accent', color)}
                      title={color}
                    />
                  ))}
                </div>
              ))}
              {renderRow(t('fontSize'), t('fontSize_desc'), renderRange('fontSize', 12, 20, 1, ' px'))}
              {renderRow(t('bubbleStyle'), t('bubbleStyle_desc'), renderSelect('bubbleStyle', [
                { value: 'rounded', label: t('bubbleStyle_rounded') },
                { value: 'sharp', label: t('bubbleStyle_sharp') },
                { value: 'modern', label: t('bubbleStyle_modern') }
              ]))}
              {renderRow(t('chatBackground'), t('chatBackground_desc'), renderSelect('chatBackground', [
                { value: 'solid', label: t('chatBg_solid') },
                { value: 'gradient', label: t('chatBg_gradient') },
                { value: 'pattern', label: t('chatBg_pattern') }
              ]))}
              {renderRow(t('compact'), t('compact_desc'), renderToggle('compactMode'))}
              {renderRow(t('animations'), t('animations_desc'), renderToggle('animations'))}
            </div>
          </div>
        );
      case 'notifications':
        return (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>{t('notifications')}</h2>
              <p>Звуки, баннеры и превью сообщений</p>
            </div>
            <div className="settings-block">
              {renderRow(t('notifyMode'), t('notifyMode_desc'), renderSelect('notificationMode', [
                { value: 'all', label: t('notify_all') },
                { value: 'contacts', label: t('notify_contacts') },
                { value: 'none', label: t('notify_none') }
              ]))}
              {renderRow(t('sound'), t('sound_desc'), renderToggle('sound'))}
              {renderRow(t('soundVol'), t('soundVol_desc'), renderRange('soundVolume', 0, 100, 5, '%'))}
              {renderRow(t('desktopNotifications'), t('desktopNotifications_desc'), renderToggle('desktopNotifications'))}
              {renderRow(t('messagePreview'), t('messagePreview_desc'), renderToggle('messagePreview'))}
              {renderRow(t('dnd'), t('dnd_desc'), renderToggle('doNotDisturb'))}
            </div>
          </div>
        );
      case 'privacy':
        return (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>{t('privacy')}</h2>
              <p>Кто видит вашу активность и данные профиля</p>
            </div>
            <div className="settings-block">
              {renderRow(t('onlineStatus'), t('onlineStatus_desc'), renderToggle('onlineStatus'))}
              {renderRow(t('readReceipts'), t('readReceipts_desc'), renderToggle('readReceipts'))}
              {renderRow(t('profileVisibility'), t('profileVisibility_desc'), renderSelect('profileVisibility', [
                { value: 'all', label: 'Все пользователи' },
                { value: 'contacts', label: 'Мои контакты' },
                { value: 'none', label: 'Никто' }
              ]))}
              {renderRow(t('callsAllowed'), t('callsAllowed_desc'), renderSelect('callsAllowed', [
                { value: 'contacts', label: 'Мои контакты' },
                { value: 'all', label: 'Все пользователи' },
                { value: 'none', label: 'Никто' }
              ]))}
            </div>
            <div className="settings-block">
              <h3>{t('blockedUsers')}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>{t('blockedUsers_desc')}</p>
              {blockedUsers.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)', fontSize: 14, fontStyle: 'italic', padding: '10px 0' }}>{t('noBlocked')}</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {blockedUsers.map(bu => (
                    <div key={bu.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar src={bu.avatar_base64} name={bu.display_name || bu.username} size={32} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{bu.display_name || bu.username}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>@{bu.username}</div>
                        </div>
                      </div>
                      <button className="settings-action-btn danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleUnblockUser(bu.id)}>{t('unblock')}</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>{t('security')}</h2>
              <p>Пароль, входы и защита приложения</p>
            </div>
            <div className="settings-block">
              {renderRow(t('twoFactor'), t('twoFactor_desc'), renderToggle('twoFactor'))}
              {renderRow(t('loginAlerts'), t('loginAlerts_desc'), renderToggle('loginAlerts'))}
              {renderRow(t('autoLock'), t('autoLock_desc'), renderSelect('autoLock', [
                { value: 'never', label: t('autoLock_never') },
                { value: '5', label: t('autoLock_5') },
                { value: '15', label: t('autoLock_15') },
                { value: '60', label: t('autoLock_60') }
              ]))}
            </div>
            {securityComponent}
          </div>
        );
      case 'devices':
        return (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>{t('devices')}</h2>
              <p>Активные сессии и подключенные клиенты</p>
            </div>
            <div className="settings-block" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {sessions.map(s => (
                <div key={s.id} className="device-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8 }}>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 600 }}>{s.device_info}</h4>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{s.is_current ? t('currentSession') : new Date(s.last_active).toLocaleString('ru-RU')}</p>
                  </div>
                  {s.is_current ? (
                    <span className="settings-badge" style={{ fontSize: 11, background: 'rgba(34,197,94,0.1)', color: 'var(--success)', padding: '2px 8px', borderRadius: 4 }}>Текущая</span>
                  ) : (
                    <button className="settings-action-btn danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleTerminateSession(s.id)}>{t('unblock')}</button>
                  )}
                </div>
              ))}
              {sessions.length > 1 && (
                <button className="settings-action-btn" style={{ marginTop: 10 }} onClick={handleTerminateOthers}>{t('terminateOthers')}</button>
              )}
            </div>
          </div>
        );
      case 'storage':
        return (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>{t('storage')}</h2>
              <p>Загрузка файлов и размер локального кеша</p>
            </div>
            <div className="settings-block">
              {renderRow(t('autoDownload'), t('autoDownload_desc'), renderSelect('autoDownload', [
                { value: 'always', label: t('autoDownload_always') },
                { value: 'wifi', label: t('autoDownload_wifi') },
                { value: 'never', label: t('autoDownload_never') }
              ]))}
              {renderRow(t('cacheLimit'), t('cacheLimit_desc'), renderRange('cacheLimit', 128, 2048, 128, ' МБ'))}
              
              <div style={{ display: 'flex', gap: 12, marginTop: 18 }}>
                <button className="settings-action-btn" onClick={handleClearCache}>
                  {t('clearCache')} ({cacheSize.toFixed(1)} МБ)
                </button>
                <button className="settings-action-btn" onClick={handleDownloadData}>
                  {t('downloadData')}
                </button>
              </div>
            </div>
          </div>
        );
      case 'accessibility':
        return (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>{t('accessibility')}</h2>
              <p>Читаемость и поведение интерфейса</p>
            </div>
            <div className="settings-block">
              {renderRow(t('largeText'), t('largeText_desc'), renderToggle('largeText'))}
              {renderRow(t('reduceMotion'), t('reduceMotion_desc'), renderToggle('reduceMotion'))}
              {renderRow(t('highContrast'), t('highContrast_desc'), renderToggle('highContrast'))}
            </div>
          </div>
        );
      case 'language':
        return (
          <div className="settings-card">
            <div className="settings-card-header">
              <h2>{t('language')}</h2>
              <p>Язык интерфейса и проверка ввода</p>
            </div>
            <div className="settings-block">
              {renderRow(t('language'), 'Выберите язык интерфейса / Select application language', renderSelect('language', [
                { value: 'ru', label: 'Русский (Russian)' },
                { value: 'en', label: 'English' }
              ]))}
              {renderRow(t('spellcheck'), t('spellcheck_desc'), renderToggle('spellcheck'))}
              <button className="settings-action-btn" style={{ marginTop: 18 }} onClick={resetSettings}>{t('resetSettings')}</button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="settings-container" onClick={(e) => e.stopPropagation()}>
      <div className="settings-sidebar">
        <div className="settings-sidebar-header">
          <button className="settings-close-btn" onClick={onClose} title="Закрыть">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <h2>{t('settings')}</h2>
        </div>
        <div className="settings-cat-list">
          {categories.map(cat => (
            <button
              key={cat.id}
              className={`settings-cat-btn ${activeCat === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCat(cat.id)}
            >
              <span className="settings-cat-icon">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>
      <div className="settings-content">
        {feedback && <div className="settings-feedback">{feedback}</div>}
        {renderContent()}
      </div>
    </div>
  );
};

export default Settings;
