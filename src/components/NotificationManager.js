/* src/components/NotificationManager.js */

class NotificationManager {
  constructor() {
    this.notifications = []; // Current active notifications in container
    this.pendingQueue = [];  // Queue for sequential animations
    this.listeners = new Set();
    this.lastNotificationTime = 0;
    this.queueDelay = 1000; // 1 second between notifications
    this.queueTimer = null;

    // Track focus state robustly via events (more reliable than just hasFocus())
    this.isWindowFocused = typeof document !== 'undefined' ? document.hasFocus() : true;
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => { this.isWindowFocused = true; });
      window.addEventListener('blur', () => { this.isWindowFocused = false; });
    }

    // Bind public API methods
    this.success = this.success.bind(this);
    this.error = this.error.bind(this);
    this.warning = this.warning.bind(this);
    this.info = this.info.bind(this);
    this.message = this.message.bind(this);
    this.update = this.update.bind(this);
    this.connection = this.connection.bind(this);

    // Global keyboard listener for Escape key to dismiss the newest notification
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.dismissNewest();
        }
      });
    }
  }

  // State subscription helper for React container
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((listener) => listener([...this.notifications]));
  }

  // Check if conversation is muted
  isConversationMuted(senderId) {
    if (!senderId) return false;
    try {
      const mutedList = JSON.parse(localStorage.getItem('octave_muted_conversations') || '[]');
      return mutedList.includes(Number(senderId)) || mutedList.includes(String(senderId));
    } catch (e) {
      console.error('Failed to read muted conversations:', e);
      return false;
    }
  }

  // Toggle mute for a conversation
  toggleMuteConversation(senderId) {
    if (!senderId) return;
    try {
      const mutedList = JSON.parse(localStorage.getItem('octave_muted_conversations') || '[]');
      const idStr = String(senderId);
      let nextMuted;
      if (mutedList.includes(idStr)) {
        nextMuted = mutedList.filter(id => id !== idStr);
      } else {
        nextMuted = [...mutedList, idStr];
      }
      localStorage.setItem('octave_muted_conversations', JSON.stringify(nextMuted));
      return nextMuted.includes(idStr);
    } catch (e) {
      console.error('Failed to toggle mute conversation:', e);
      return false;
    }
  }

  // Core enqueue method
  enqueue(notification) {
    // If notification belongs to a muted conversation, suppress it
    if (notification.type === 'message' && notification.senderId && this.isConversationMuted(notification.senderId)) {
      return;
    }

    // Send via Electron IPC to the standalone desktop notification window
    try {
      const electron = window.require ? window.require('electron') : null;
      if (electron && electron.ipcRenderer) {
        electron.ipcRenderer.send('show-desktop-notification', notification);
        return;
      }
    } catch (err) {
      // Fallback if not in Electron context
    }

    // Fallback to local in-app rendering
    this.pendingQueue.push(notification);
    this.processQueue();
  }

  // Queue runner enforcing 1s spacing between notifications
  processQueue() {
    if (this.pendingQueue.length === 0) return;

    const elapsed = Date.now() - this.lastNotificationTime;

    if (elapsed >= this.queueDelay) {
      const nextNotification = this.pendingQueue.shift();
      this.showNotification(nextNotification);
      this.lastNotificationTime = Date.now();
    }

    // If there are still items in the queue, schedule the next run
    if (this.pendingQueue.length > 0 && !this.queueTimer) {
      const waitTime = Math.max(0, this.queueDelay - (Date.now() - this.lastNotificationTime));
      this.queueTimer = setTimeout(() => {
        this.queueTimer = null;
        this.processQueue();
      }, waitTime);
    }
  }

  // Show a notification in the UI container
  showNotification(notification) {
    // Check if we should group message notifications from same sender
    if (notification.type === 'message' && notification.senderId) {
      const existing = this.notifications.find(
        (n) => n.type === 'message' && String(n.senderId) === String(notification.senderId) && !n.exiting
      );

      if (existing) {
        // Group messages from same sender
        existing.messageCount = (existing.messageCount || 1) + 1;
        existing.messageText = `${existing.messageCount} новых сообщений`;
        existing.time = Date.now();
        existing.isUpdated = true;
        this.notifyListeners();
        return;
      }
    }

    const newNotification = {
      id: Math.random().toString(36).slice(2, 9),
      time: Date.now(),
      duration: notification.duration || 5000,
      messageCount: 1,
      entering: true,
      ...notification
    };

    // Stacking limit: max 4 notifications. Dismiss oldest if exceeded
    const activeToasts = this.notifications.filter(n => !n.exiting);
    if (activeToasts.length >= 4) {
      this.dismiss(activeToasts[0].id);
    }

    this.notifications.push(newNotification);
    this.notifyListeners();

    // Clear entering flag after slide animation completes
    setTimeout(() => {
      const found = this.notifications.find(n => n.id === newNotification.id);
      if (found) {
        found.entering = false;
        this.notifyListeners();
      }
    }, 280);
  }

  // Trigger HTML5 notification when application is unfocused or minimized
  triggerNativeNotification(notification) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    let title = notification.title || 'Octave';
    let body = notification.message || notification.messageText || '';

    if (notification.type === 'message') {
      title = notification.senderName || 'New Message';
      body = notification.messageText || '';
    }

    try {
      const showIt = () => {
        const n = new window.Notification(title, { body, silent: false });
        n.onclick = () => {
          if (notification.onClick) notification.onClick();
          window.focus();
        };
      };

      if (window.Notification.permission === 'granted') {
        showIt();
      } else if (window.Notification.permission !== 'denied') {
        window.Notification.requestPermission().then(permission => {
          if (permission === 'granted') showIt();
        });
      }
    } catch (err) {
      console.error('Failed to show native notification:', err);
    }
  }

  // Dismiss a notification smoothly
  dismiss(id) {
    const found = this.notifications.find((n) => n.id === id);
    if (!found || found.exiting) return;

    found.exiting = true;
    this.notifyListeners();

    // Remove from array after exit transition completes (220ms)
    setTimeout(() => {
      this.notifications = this.notifications.filter((n) => n.id !== id);
      this.notifyListeners();
    }, 220);
  }

  // Dismiss the newest active notification (handles Escape key)
  dismissNewest() {
    const active = this.notifications.filter((n) => !n.exiting);
    if (active.length > 0) {
      this.dismiss(active[active.length - 1].id);
    }
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  success(title, message, options = {}) {
    this.enqueue({ type: 'success', title, message, ...options });
  }

  error(title, message, options = {}) {
    this.enqueue({ type: 'error', title, message, ...options });
  }

  warning(title, message, options = {}) {
    this.enqueue({ type: 'warning', title, message, ...options });
  }

  info(title, message, options = {}) {
    this.enqueue({ type: 'info', title, message, ...options });
  }

  // senderId used for grouping and mute checks
  message(senderName, messageText, senderId, options = {}) {
    this.enqueue({ type: 'message', senderName, messageText, senderId, ...options });
  }

  // updateType: 'available' | 'downloaded'
  update(updateType, version, options = {}) {
    const isDownloaded = updateType === 'downloaded';
    this.enqueue({
      type: 'update',
      updateType,
      version,
      title: isDownloaded ? 'Update Ready' : 'Update Available',
      message: isDownloaded
        ? `Version ${version} is downloaded. Restart to install.`
        : `Version ${version} is ready.`,
      duration: 10000,
      ...options
    });
  }

  // status: 'lost' | 'restored'
  connection(status, options = {}) {
    this.enqueue({
      type: 'connection',
      connectionStatus: status,
      title: status === 'lost' ? 'Connection Lost' : 'Connected',
      message: status === 'lost' ? 'Trying to reconnect...' : 'Secure connection restored.',
      duration: status === 'lost' ? 60000 : 4000,
      ...options
    });
  }
}

// Instantiate and expose globally
const notifyInstance = new NotificationManager();
if (typeof window !== 'undefined') {
  window.notify = notifyInstance;
}

export default notifyInstance;
export { NotificationManager };
