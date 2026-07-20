/* src/components/NotificationContainer.jsx */
import React, { useState, useEffect, useRef } from 'react';
import notifyInstance from './NotificationManager';
import './notifications.css';

const Toast = ({ notification, onDismiss }) => {
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
  };

  const handleMouseLeave = () => {
    setHovered(false);
    startTimer();
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
    if (notification.onClick) {
      notification.onClick();
    }
    onDismiss(id);
  };

  // Handle specific action button clicks
  const handleReplyClick = (e) => {
    e.stopPropagation();
    if (notification.onReply) {
      notification.onReply();
    }
    onDismiss(id);
  };

  const handleMarkAsReadClick = (e) => {
    e.stopPropagation();
    if (notification.onMarkAsRead) {
      notification.onMarkAsRead();
    }
    onDismiss(id);
  };

  const handleRestartClick = (e) => {
    e.stopPropagation();
    // Try to trigger quitAndInstall via electron if available
    try {
      const electron = window.require ? window.require('electron') : null;
      if (electron && electron.ipcRenderer) {
        electron.ipcRenderer.send('restart-and-install');
      } else {
        console.warn('Electron IPC not available. Falling back to updater action.');
        if (notification.onRestart) {
          notification.onRestart();
        }
      }
    } catch (err) {
      console.error('Error invoking restart:', err);
      if (notification.onRestart) {
        notification.onRestart();
      }
    }
    onDismiss(id);
  };

  const handleDownloadClick = (e) => {
    e.stopPropagation();
    if (notification.onDownload) {
      notification.onDownload();
    }
    onDismiss(id);
  };

  const handleDismissClick = (e) => {
    e.stopPropagation();
    onDismiss(id);
  };

  // Keyboard navigation on individual toasts
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
      {/* Progress Bar (resets key when count or time resets) */}
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
              Reply
            </button>
            <button className="notification-btn" onClick={handleMarkAsReadClick}>
              Mark as read
            </button>
          </>
        )}

        {type === 'update' && updateType === 'available' && (
          <button className="notification-btn btn-primary" onClick={handleDownloadClick}>
            Download
          </button>
        )}

        {type === 'update' && updateType === 'downloaded' && (
          <button className="notification-btn btn-primary" onClick={handleRestartClick}>
            Restart
          </button>
        )}

        <button className="notification-btn btn-danger" onClick={handleDismissClick}>
          Dismiss
        </button>
      </div>
    </div>
  );
};

export default function NotificationContainer() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Subscribe to global NotificationManager state
    const unsubscribe = notifyInstance.subscribe((newNotifications) => {
      setNotifications(newNotifications);
    });

    return () => unsubscribe();
  }, []);

  const handleDismiss = (id) => {
    notifyInstance.dismiss(id);
  };

  return (
    <div className="notifications-container">
      {/* Reverse rendering order so new messages appear at the top */}
      {[...notifications].reverse().map((n) => (
        <Toast key={n.id} notification={n} onDismiss={handleDismiss} />
      ))}
    </div>
  );
}
