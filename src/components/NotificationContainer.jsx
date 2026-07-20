/* src/components/NotificationContainer.jsx */
import React, { useState, useEffect, useRef } from 'react';
import notifyInstance from './NotificationManager';
import './notifications.css';

const Toast = ({ notification, onDismiss, isStandalone }) => {
  const { id, type, title, message, duration, messageCount, entering, exiting, senderName, messageText, updateType, connectionStatus } = notification;
  
  const remainingTimeRef = useRef(duration);
  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  // Start auto-close timer
  const startTimer = () => {
    if (remainingTimeRef.current <= 0) return;
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss(id);
    }, remainingTimeRef.current);
  };

  // Pause auto-close timer
  const pauseTimer = () => {
    clearTimeout(timerRef.current);
    remainingTimeRef.current -= (Date.now() - startTimeRef.current);
  };

  useEffect(() => {
    startTimer();
    return () => clearTimeout(timerRef.current);
  }, []);

  // Reset timer if the notification gets grouped/updated
  useEffect(() => {
    if (notification.isUpdated) {
      clearTimeout(timerRef.current);
      remainingTimeRef.current = duration;
      startTimer();
      notification.isUpdated = false;
    }
  }, [messageCount, notification.time]);

  const handleMouseEnter = () => {
    setHovered(true);
    pauseTimer();
    
    // In standalone mode, enable mouse events so user can hover/click elements
    if (isStandalone) {
      try {
        const electron = window.require ? window.require('electron') : null;
        if (electron) {
          electron.ipcRenderer.send('set-ignore-mouse-events', false);
        }
      } catch (err) {
        console.error('Failed to send set-ignore-mouse-events:', err);
      }
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
    startTimer();

    // In standalone mode, disable mouse events with forward so clicks pass through transparent window
    if (isStandalone) {
      try {
        const electron = window.require ? window.require('electron') : null;
        if (electron) {
          electron.ipcRenderer.send('set-ignore-mouse-events', true, { forward: true });
        }
      } catch (err) {
        console.error('Failed to send set-ignore-mouse-events:', err);
      }
    }
  };

  // Icon mapping
  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '⚠';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      case 'message':
        return '💬';
      case 'update':
        return updateType === 'downloaded' ? '✓' : '⬇';
      case 'connection':
        return connectionStatus === 'lost' ? '⚠' : '✓';
      default:
        return '•';
    }
  };

  // Title selector
  const getDisplayTitle = () => {
    if (type === 'message') {
      return senderName;
    }
    return title;
  };

  // Message body selector
  const getDisplayBody = () => {
    if (type === 'message') {
      return messageText;
    }
    return message;
  };

  // Click entire notification to open related content
  const handleToastClick = () => {
    if (isStandalone) {
      try {
        const electron = window.require ? window.require('electron') : null;
        if (electron) {
          electron.ipcRenderer.send('desktop-notification-action', {
            action: 'click',
            contactId: notification.senderId,
            version: notification.version
          });
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      if (notification.onClick) {
        notification.onClick();
      }
    }
    onDismiss(id);
  };

  // Handle specific action button clicks
  const handleReplyClick = (e) => {
    e.stopPropagation();
    if (isStandalone) {
      try {
        const electron = window.require ? window.require('electron') : null;
        if (electron) {
          electron.ipcRenderer.send('desktop-notification-action', {
            action: 'reply',
            contactId: notification.senderId
          });
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      if (notification.onReply) {
        notification.onReply();
      }
    }
    onDismiss(id);
  };

  const handleMarkAsReadClick = (e) => {
    e.stopPropagation();
    if (isStandalone) {
      try {
        const electron = window.require ? window.require('electron') : null;
        if (electron) {
          electron.ipcRenderer.send('desktop-notification-action', {
            action: 'markAsRead',
            contactId: notification.senderId
          });
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      if (notification.onMarkAsRead) {
        notification.onMarkAsRead();
      }
    }
    onDismiss(id);
  };

  const handleRestartClick = (e) => {
    e.stopPropagation();
    try {
      const electron = window.require ? window.require('electron') : null;
      if (electron && electron.ipcRenderer) {
        electron.ipcRenderer.send('restart-and-install');
      } else {
        if (notification.onRestart) notification.onRestart();
      }
    } catch (err) {
      console.error(err);
    }
    onDismiss(id);
  };

  const handleDownloadClick = (e) => {
    e.stopPropagation();
    if (isStandalone) {
      try {
        const electron = window.require ? window.require('electron') : null;
        if (electron) {
          electron.ipcRenderer.send('desktop-notification-action', {
            action: 'download'
          });
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      if (notification.onDownload) {
        notification.onDownload();
      }
    }
    onDismiss(id);
  };

  const handleDismissClick = (e) => {
    e.stopPropagation();
    onDismiss(id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToastClick();
    }
  };

  return (
    <div
      className={`notification-toast type-${type} ${entering ? 'entering' : ''} ${exiting ? 'exiting' : ''}`}
      onClick={handleToastClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="alert"
    >
      {/* Progress Bar */}
      <div className="notification-progress-bar">
        <div 
          key={`${messageCount}-${notification.time}`} 
          className="notification-progress-fill" 
          style={{ '--auto-close-duration': `${duration}ms` }} 
        />
      </div>

      <div className="notification-accent-line" />

      <div className="notification-header">
        <span className="notification-icon">{getIcon()}</span>
        <span className="notification-title">{getDisplayTitle()}</span>
      </div>

      <div className="notification-body">{getDisplayBody()}</div>

      {/* Hover buttons */}
      <div className="notification-actions">
        {type === 'message' && (
          <>
            <button className="notification-btn btn-primary" onClick={handleReplyClick}>
              Ответить
            </button>
            <button className="notification-btn" onClick={handleMarkAsReadClick}>
              Прочитать
            </button>
          </>
        )}

        {type === 'update' && updateType === 'available' && (
          <button className="notification-btn btn-primary" onClick={handleDownloadClick}>
            Скачать обновление
          </button>
        )}

        {type === 'update' && updateType === 'downloaded' && (
          <button className="notification-btn btn-primary" onClick={handleRestartClick}>
            Перезапустить
          </button>
        )}

        <button className="notification-btn btn-danger" onClick={handleDismissClick}>
          Закрыть
        </button>
      </div>
    </div>
  );
};

export default function NotificationContainer({ isStandalone = false }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (isStandalone) {
      // Standalone mode: Receive notifications from Electron main process
      try {
        const electron = window.require ? window.require('electron') : null;
        if (!electron) return;

        const handleAdd = (event, notification) => {
          setNotifications(prev => {
            // Group messages from the same sender
            if (notification.type === 'message' && notification.senderId) {
              const existing = prev.find(
                (n) => n.type === 'message' && String(n.senderId) === String(notification.senderId) && !n.exiting
              );

              if (existing) {
                return prev.map(n => {
                  if (n.id === existing.id) {
                    return {
                      ...n,
                      messageCount: (n.messageCount || 1) + 1,
                      messageText: `${(n.messageCount || 1) + 1} новых сообщений`,
                      time: Date.now(),
                      isUpdated: true
                    };
                  }
                  return n;
                });
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

            // Max 4 notifications
            const activeToasts = prev.filter(n => !n.exiting);
            if (activeToasts.length >= 4) {
              const oldest = activeToasts[0];
              return prev.map(n => n.id === oldest.id ? { ...n, exiting: true } : n).concat(newNotification);
            }

            return [...prev, newNotification];
          });
        };

        electron.ipcRenderer.on('desktop-notification-add', handleAdd);
        return () => {
          electron.ipcRenderer.removeListener('desktop-notification-add', handleAdd);
        };
      } catch (err) {
        console.error('Failed to set up IPC subscription:', err);
      }
    } else {
      // In-app mode: Subscribe to local NotificationManager
      const unsubscribe = notifyInstance.subscribe((newNotifications) => {
        setNotifications(newNotifications);
      });
      return () => unsubscribe();
    }
  }, [isStandalone]);

  // Hide the standalone window when there are no active notifications remaining
  useEffect(() => {
    if (!isStandalone) return;

    try {
      const electron = window.require ? window.require('electron') : null;
      if (!electron) return;

      const activeCount = notifications.filter(n => !n.exiting).length;
      if (activeCount === 0) {
        electron.ipcRenderer.send('hide-desktop-notification-window');
      }
    } catch (err) {
      console.error(err);
    }
  }, [notifications, isStandalone]);

  const handleDismiss = (id) => {
    if (isStandalone) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, exiting: true } : n));
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 220);
    } else {
      notifyInstance.dismiss(id);
    }
  };

  return (
    <div className={`notifications-container ${isStandalone ? 'standalone' : ''}`}>
      {[...notifications].reverse().map((n) => (
        <Toast 
          key={n.id} 
          notification={n} 
          onDismiss={handleDismiss} 
          isStandalone={isStandalone} 
        />
      ))}
    </div>
  );
}
