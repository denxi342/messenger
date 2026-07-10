import React, { useState, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import MyProfile from './MyProfile';
import { fetchMyContacts, fetchMyProfile, fetchSettings, updateSettings } from '../api';

const MainApp = ({ user, onLogout, onUserUpdate }) => {
  const [contacts, setContacts] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messagesData, setMessagesData] = useState({});
  const [historyLoaded, setHistoryLoaded] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [showMyProfile, setShowMyProfile] = useState(false);
  const [myAvatar, setMyAvatar] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [settings, setSettings] = useState(null);

  const lastMessages = useMemo(() => {
    const lasts = {};
    contacts.forEach(c => {
      const msgs = messagesData[Number(c.id)];
      if (msgs && msgs.length > 0) {
        lasts[c.id] = msgs[msgs.length - 1];
      }
    });
    return lasts;
  }, [messagesData, contacts]);

  const socketRef = useRef(null);
  const activeChatRef = useRef(null);

  const loadContacts = async () => {
    try {
      const data = await fetchMyContacts(user.token);
      setContacts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);

  // Global settings application
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;

    // Theme
    let theme = settings.theme;
    if (theme === 'system') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (theme === 'light') {
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
    }

    // Accent Color
    if (settings.accent) {
      root.style.setProperty('--accent', settings.accent);
      root.style.setProperty('--accent-hover', settings.accent);
      root.style.setProperty('--accent-glow', `${settings.accent}33`);
      root.style.setProperty('--border-active', `${settings.accent}80`);
    }

    // Font Size
    if (settings.fontSize) {
      root.style.setProperty('--base-font-size', `${settings.fontSize}px`);
    }

    // Large Text
    if (settings.largeText) root.classList.add('large-text');
    else root.classList.remove('large-text');

    // Reduce Motion / Animations
    if (settings.reduceMotion || !settings.animations) root.classList.add('reduce-motion');
    else root.classList.remove('reduce-motion');

    // High Contrast
    if (settings.highContrast) root.classList.add('high-contrast');
    else root.classList.remove('high-contrast');

    // Compact Mode
    if (settings.compactMode) root.classList.add('compact-mode');
    else root.classList.remove('compact-mode');

  }, [settings]);

  useEffect(() => {
    loadContacts();
    fetchMyProfile(user.token).then(p => {
      if (p && p.avatar_base64) setMyAvatar(p.avatar_base64);
    }).catch(console.error);

    fetchSettings(user.token).then(setSettings).catch(console.error);

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL === undefined ? 'http://localhost:3001' : import.meta.env.VITE_SOCKET_URL;
    socketRef.current = io(SOCKET_URL, { auth: { token: user.token } });

    socketRef.current.on('connect_error', (err) => {
      if (err.message === 'Authentication error') onLogout();
    });

    socketRef.current.on('onlineUsers', (users) => setOnlineUsers(users));

    socketRef.current.on('privateHistory', ({ contactId, messages }) => {
      const cid = Number(contactId);
      setMessagesData(prev => ({ ...prev, [cid]: messages }));
      setHistoryLoaded(prev => ({ ...prev, [cid]: true }));
    });

    socketRef.current.on('newPrivateMessage', (msg) => {
      const senderId = Number(msg.sender_id);
      const recipientId = Number(msg.recipient_id);
      const myId = Number(user.userId);
      const contactId = senderId === myId ? recipientId : senderId;

      setMessagesData(prev => ({
        ...prev,
        [contactId]: [...(prev[contactId] || []), msg]
      }));

      // Update last message on contact
      setContacts(prev => prev.map(c =>
        Number(c.id) === contactId
          ? { ...c, last_message_text: msg.text, last_message_time: msg.time, last_message_sender_id: senderId }
          : c
      ));

      const isIncoming = senderId !== myId;
      const chatIsOpen = activeChatRef.current && Number(activeChatRef.current.id) === contactId;
      if (isIncoming && !chatIsOpen) {
        setUnreadCounts(prev => ({ ...prev, [contactId]: (prev[contactId] || 0) + 1 }));
      }

      // Clear typing indicator when message arrives
      if (isIncoming) {
        setTypingUsers(prev => ({ ...prev, [contactId]: false }));
      }
    });

    socketRef.current.on('typing', ({ userId, isTyping }) => {
      setTypingUsers(prev => ({ ...prev, [Number(userId)]: isTyping }));
    });

    socketRef.current.on('contactProfileUpdated', (updated) => {
      const cid = Number(updated.id);
      setContacts(prev => prev.map(c => Number(c.id) === cid ? {
        ...c,
        display_name: updated.display_name,
        bio: updated.bio,
        avatar_base64: updated.avatar_base64
      } : c));
      if (activeChatRef.current && Number(activeChatRef.current.id) === cid) {
        setActiveChat(prev => ({
          ...prev,
          display_name: updated.display_name,
          bio: updated.bio,
          avatar_base64: updated.avatar_base64
        }));
      }
    });

    return () => { if (socketRef.current) socketRef.current.disconnect(); };
  }, []);

  useEffect(() => {
    if (activeChat && socketRef.current) {
      const cid = Number(activeChat.id);
      if (!historyLoaded[cid]) {
        socketRef.current.emit('getPrivateHistory', cid);
      }
      setUnreadCounts(prev => ({ ...prev, [cid]: 0 }));
    }
  }, [activeChat]);

  const handleSendMessage = (text) => {
    if (!activeChat || !text.trim()) return;
    socketRef.current.emit('sendPrivateMessage', {
      recipientId: Number(activeChat.id),
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isE2ee: true
    });
  };

  const handleProfileUpdate = (updates) => {
    if (updates.avatar) setMyAvatar(updates.avatar);
  };

  const handleUpdateSettings = async (newSettings) => {
    try {
      const updated = await updateSettings(user.token, newSettings);
      setSettings(updated);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="app-container">
      {showMyProfile && (
        <div className="profile-overlay" onClick={() => setShowMyProfile(false)}>
          <MyProfile
            user={user}
            token={user.token}
            onClose={() => setShowMyProfile(false)}
            onLogout={onLogout}
            onProfileUpdate={handleProfileUpdate}
            onUserUpdate={onUserUpdate}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
          />
        </div>
      )}

      <Sidebar
        contacts={contacts}
        activeChat={activeChat}
        setActiveChat={setActiveChat}
        onlineUsers={onlineUsers}
        token={user.token}
        onContactAdded={loadContacts}
        unreadCounts={unreadCounts}
        onOpenMyProfile={() => setShowMyProfile(true)}
        lastMessages={lastMessages}
        typingUsers={typingUsers}
      />
      <ChatArea
        activeChat={activeChat}
        messages={activeChat ? (messagesData[Number(activeChat.id)] || []) : []}
        onSendMessage={handleSendMessage}
        currentUser={user}
        onLogout={onLogout}
        myAvatar={myAvatar}
        setTypingUsers={setTypingUsers}
        settings={settings}
        socket={socketRef.current}
      />
    </div>
  );
};

export default MainApp;
