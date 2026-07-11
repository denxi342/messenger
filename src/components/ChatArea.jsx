import React, { useState, useEffect, useRef, useCallback } from 'react';
import Avatar from './Avatar';
import MessageComponent from './Message';

const EMOJI_PICKER = ['😀','😂','😍','🥺','😭','🤔','🔥','❤️','👍','💯','✨','🎉','😎','🥳','👀','💀','😤','🤯','💪','🙏','😁','🤣','😊','😢','😡','🥰','🤩','😴','🤑','😏'];

function groupMessages(messages, currentUserId) {
  if (!messages.length) return [];
  const groups = [];
  let current = null;
  messages.forEach(msg => {
    const sid = Number(msg.sender_id);
    if (!current || current.senderId !== sid) {
      current = { senderId: sid, isOwn: sid === Number(currentUserId), messages: [] };
      groups.push(current);
    }
    current.messages.push(msg);
  });
  return groups;
}

function formatDateSeparator(time) {
  if (!time) return null;
  // time is "HH:MM" — try to use message date from id or a date field
  return null; // We'll implement date separators via a date field when available
}

function ContextMenu({ x, y, msg, currentUserId, onClose, onReply, onEdit, onPin, onForward, onDeleteSelf, onDeleteAll }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const escHandler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', escHandler); };
  }, [onClose]);

  const style = { top: Math.min(y, window.innerHeight - 350), left: Math.min(x, window.innerWidth - 200) };
  const isOwn = Number(msg.sender_id) === Number(currentUserId);
  const isDeleted = !!msg.is_deleted_for_all;

  const items = [
    !isDeleted && { icon: '↩️', label: 'Ответить', action: () => { onReply(msg); onClose(); } },
    !isDeleted && { icon: '📋', label: 'Копировать', action: () => { navigator.clipboard.writeText(msg.text); onClose(); } },
    !isDeleted && { icon: '↗️', label: 'Переслать', action: () => { onForward(msg); onClose(); } },
    !isDeleted && { icon: '📌', label: 'Закрепить', action: () => { onPin(msg); onClose(); } },
    isOwn && !isDeleted && { icon: '✏️', label: 'Редактировать', action: () => { onEdit(msg); onClose(); } },
    { icon: '🗑️', label: 'Удалить у себя', action: () => { onDeleteSelf(msg.id); onClose(); }, className: 'ctx-danger' },
    isOwn && !isDeleted && { icon: '🗑️', label: 'Удалить у всех', action: () => { onDeleteAll(msg.id); onClose(); }, className: 'ctx-danger' },
  ].filter(Boolean);

  return (
    <div className="ctx-menu" style={style} ref={ref}>
      {items.map((item, i) => (
        <button key={i} className={`ctx-item ${item.className || ''}`} onClick={item.action}>
          <span className="ctx-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function ForwardModal({ contacts, onClose, onForward }) {
  const [selected, setSelected] = useState([]);

  const toggle = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 340 }}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        <h3>Переслать сообщение</h3>
        <p className="modal-subtitle">Выберите контакты</p>
        <div className="contacts-list" style={{ maxHeight: 300, overflowY: 'auto' }}>
          {contacts.map(c => (
            <div
              key={c.id}
              className={`contact-item ${selected.includes(c.id) ? 'active' : ''}`}
              onClick={() => toggle(c.id)}
              style={{ cursor: 'pointer', padding: '8px 12px' }}
            >
              <Avatar src={c.avatar_base64 || null} name={c.display_name || c.username} size={36} />
              <div className="contact-info" style={{ marginLeft: 10 }}>
                <span className="contact-name">{c.display_name || c.username}</span>
              </div>
              {selected.includes(c.id) && <span style={{ marginLeft: 'auto', color: 'var(--accent)' }}>✓</span>}
            </div>
          ))}
        </div>
        <button
          className="add-btn"
          style={{ marginTop: 12, width: '100%' }}
          disabled={selected.length === 0}
          onClick={() => { onForward(selected); onClose(); }}
        >
          Переслать ({selected.length})
        </button>
      </div>
    </div>
  );
}

function EditModal({ msg, onClose, onSave }) {
  const [text, setText] = useState(msg.text);
  const taRef = useRef(null);

  useEffect(() => { taRef.current?.focus(); taRef.current?.select(); }, []);

  const handleSave = () => {
    const t = text.trim();
    if (t && t !== msg.text) onSave(msg.id, t);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <button className="modal-close-btn" onClick={onClose}>✕</button>
        <h3>Редактировать сообщение</h3>
        <textarea
          ref={taRef}
          value={text}
          onChange={e => setText(e.target.value)}
          rows={4}
          style={{ width: '100%', marginTop: 12, padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', resize: 'vertical', fontSize: 14 }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button className="add-btn" onClick={handleSave} style={{ flex: 1 }}>Сохранить</button>
          <button onClick={onClose} style={{ flex: 1, padding: '8px 16px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer' }}>Отмена</button>
        </div>
      </div>
    </div>
  );
}

function PinnedBar({ pinnedMessages, messages, onScrollTo, onUnpin }) {
  if (!pinnedMessages || pinnedMessages.length === 0) return null;
  const currentPinnedId = pinnedMessages[pinnedMessages.length - 1];
  const pinnedMsg = messages.find(m => m.id === currentPinnedId);
  if (!pinnedMsg) return null;

  return (
    <div className="pinned-bar" onClick={() => onScrollTo(pinnedMsg.id)}>
      <span className="pinned-bar-icon">📌</span>
      <div className="pinned-bar-content">
        <span className="pinned-bar-label">Закреплено • {pinnedMessages.length > 1 ? `${pinnedMessages.length} сообщения` : ''}</span>
        <span className="pinned-bar-text">
          {pinnedMsg.is_deleted_for_all ? 'Сообщение удалено' : (pinnedMsg.text?.length > 60 ? pinnedMsg.text.slice(0, 60) + '…' : pinnedMsg.text)}
        </span>
      </div>
    </div>
  );
}

function SearchBar({ query, onQuery, results, currentIdx, onPrev, onNext, onClose }) {
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="search-bar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ opacity: 0.5, flexShrink: 0 }}>
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
      </svg>
      <input
        ref={inputRef}
        type="text"
        placeholder="Поиск в чате..."
        value={query}
        onChange={e => onQuery(e.target.value)}
        className="search-bar-input"
      />
      {results.length > 0 && (
        <span className="search-bar-count">{currentIdx + 1} / {results.length}</span>
      )}
      {query && results.length === 0 && (
        <span className="search-bar-count" style={{ color: 'var(--text-secondary)' }}>Нет результатов</span>
      )}
      <button className="search-bar-nav" onClick={onPrev} disabled={results.length === 0} title="Предыдущий (Shift+Enter)">↑</button>
      <button className="search-bar-nav" onClick={onNext} disabled={results.length === 0} title="Следующий (Enter)">↓</button>
      <button className="search-bar-close" onClick={onClose}>✕</button>
    </div>
  );
}

const ChatArea = ({ activeChat, messages, onSendMessage, currentUser, onLogout, myAvatar, setTypingUsers, settings, socket, contacts = [], onMessagesUpdate, pinnedMessages = [] }) => {
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [localReactions, setLocalReactions] = useState({});
  const [localMessages, setLocalMessages] = useState(messages);
  const [editingMsg, setEditingMsg] = useState(null);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchIdx, setSearchIdx] = useState(0);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const prevMsgCount = useRef(0);
  const msgRefs = useRef({});

  const contactName = activeChat ? (activeChat.display_name || activeChat.username) : '';
  const contactAvatar = activeChat?.avatar_base64 || null;

  // Sync local messages from props
  useEffect(() => {
    setLocalMessages(messages);
    const reactionMap = {};
    messages.forEach(m => { if (m.reactions) reactionMap[m.id] = m.reactions; });
    setLocalReactions(reactionMap);
  }, [messages]);

  // Handle realtime socket events
  useEffect(() => {
    if (!socket) return;

    const handlers = {
      reactionsUpdated: ({ messageId, reactions }) => {
        setLocalReactions(prev => ({ ...prev, [messageId]: reactions }));
      },
      messageDeletedSelf: (messageId) => {
        setLocalMessages(prev => prev.filter(m => m.id !== messageId));
      },
      messageDeletedAll: (messageId) => {
        setLocalMessages(prev => prev.map(m => {
          if (m.id === messageId) return { ...m, is_deleted_for_all: 1, reactions: [] };
          if (Number(m.reply_to_id) === Number(messageId)) {
            return { ...m, reply_text: null, reply_is_deleted_for_all: 1 };
          }
          return m;
        }));
        setLocalReactions(prev => { const n = { ...prev }; delete n[messageId]; return n; });
      },
      messageEdited: ({ messageId, text }) => {
        setLocalMessages(prev => prev.map(m => {
          if (m.id === messageId) return { ...m, text, is_edited: 1 };
          if (Number(m.reply_to_id) === Number(messageId)) return { ...m, reply_text: text };
          return m;
        }));
      },
      deliveryUpdated: () => {
        setLocalMessages(prev => prev.map(m =>
          m.sender_id === Number(currentUser.userId) ? { ...m, is_delivered: 1 } : m
        ));
      },
      readUpdated: ({ contactId }) => {
        const cid = Number(contactId);
        if (activeChat && Number(activeChat.id) === cid) {
          setLocalMessages(prev => prev.map(m =>
            m.sender_id === Number(currentUser.userId) ? { ...m, is_read: 1 } : m
          ));
        }
      },
    };

    Object.entries(handlers).forEach(([evt, fn]) => socket.on(evt, fn));
    return () => Object.entries(handlers).forEach(([evt, fn]) => socket.off(evt, fn));
  }, [socket, activeChat, currentUser]);

  // Keyboard shortcut Ctrl+F
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Mark as read when chat opens
  useEffect(() => {
    if (activeChat && socket) {
      socket.emit('markAsRead', Number(activeChat.id));
    }
    setShowSearch(false);
    setSearchQuery('');
    setReplyTo(null);
  }, [activeChat]);

  // Search logic
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchIdx(0);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = localMessages
      .filter(m => !m.is_deleted_for_all && m.text?.toLowerCase().includes(q))
      .map(m => m.id);
    setSearchResults(results);
    setSearchIdx(0);
  }, [searchQuery, localMessages]);

  // Auto-scroll to current search result
  useEffect(() => {
    if (searchResults.length > 0) {
      scrollToMsg(searchResults[searchIdx], true);
    }
  }, [searchIdx, searchResults]);

  const scrollToBottom = (instant = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    scrollToBottom(prevMsgCount.current === 0);
    prevMsgCount.current = localMessages.length;
  }, [localMessages]);

  const scrollToMsg = (msgId, isSearch = false) => {
    const el = msgRefs.current[msgId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (!isSearch) {
        el.classList.add('msg-highlight');
        setTimeout(() => el.classList.remove('msg-highlight'), 1500);
      }
    }
  };

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    autoResize();
    if (socket && activeChat) {
      socket.emit('typing', { recipientId: activeChat.id, isTyping: e.target.value.length > 0 });
    }
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text) return;
    onSendMessage(text, replyTo?.id || null);
    setInputText('');
    setReplyTo(null);
    if (socket && activeChat) socket.emit('typing', { recipientId: activeChat.id, isTyping: false });
    setTimeout(() => { if (textareaRef.current) textareaRef.current.style.height = 'auto'; }, 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  const handleContextMenu = (e, msg) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, msg });
  };

  const beginReply = (msg) => {
    setReplyTo(msg);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleReactionToggle = (messageId, emoji, alreadyReacted) => {
    if (!socket) return;
    if (alreadyReacted) socket.emit('removeReaction', { messageId, emoji });
    else socket.emit('addReaction', { messageId, emoji });
  };

  const handleQuickReact = (msg, emoji) => {
    const myReacted = (localReactions[msg.id] || []).some(r => r.emoji === emoji && Number(r.user_id) === Number(currentUser.userId));
    handleReactionToggle(msg.id, emoji, myReacted);
  };

  const handleDeleteSelf = (msgId) => {
    if (!socket) return;
    socket.emit('deleteMessageSelf', { messageId: msgId });
  };

  const handleDeleteAll = (msgId) => {
    if (!socket) return;
    socket.emit('deleteMessageAll', { messageId: msgId });
  };

  const handleEditSave = (msgId, newText) => {
    if (!socket) return;
    socket.emit('editMessage', { messageId: msgId, newText });
  };

  const handlePin = (msg) => {
    if (!socket || !activeChat) return;
    socket.emit('pinMessage', { messageId: msg.id, contactId: Number(activeChat.id) });
  };

  const handleForwardSend = (contactIds) => {
    if (!socket || !forwardMsg) return;
    contactIds.forEach(cid => {
      socket.emit('sendPrivateMessage', {
        recipientId: Number(cid),
        text: forwardMsg.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isE2ee: true,
        isForwarded: true,
      });
    });
    setForwardMsg(null);
  };

  // Drag & drop
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); };

  if (!activeChat) {
    return (
      <div className="chat-area empty-state">
        <div className="empty-state-content">
          <div className="empty-state-icon">
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3>Выберите чат</h3>
          <p>Ваши сообщения защищены сквозным шифрованием</p>
        </div>
      </div>
    );
  }

  const groups = groupMessages(localMessages, currentUser.userId);

  return (
    <div
      className={`chat-area ${isDragging ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drop-overlay">
          <div className="drop-zone">📎 Отпустите файл для прикрепления</div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          msg={contextMenu.msg}
          currentUserId={currentUser.userId}
          onClose={() => setContextMenu(null)}
          onReply={beginReply}
          onEdit={(msg) => setEditingMsg(msg)}
          onPin={handlePin}
          onForward={(msg) => setForwardMsg(msg)}
          onDeleteSelf={handleDeleteSelf}
          onDeleteAll={handleDeleteAll}
        />
      )}

      {/* Forward Modal */}
      {forwardMsg && (
        <ForwardModal
          contacts={contacts}
          onClose={() => setForwardMsg(null)}
          onForward={handleForwardSend}
        />
      )}

      {/* Edit Modal */}
      {editingMsg && (
        <EditModal
          msg={editingMsg}
          onClose={() => setEditingMsg(null)}
          onSave={handleEditSave}
        />
      )}

      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-info">
          <Avatar src={contactAvatar} name={contactName} size={36} />
          <div className="chat-header-text">
            <h2>{contactName}</h2>
            {activeChat.display_name && (
              <span className="chat-header-username">@{activeChat.username}</span>
            )}
          </div>
          <span className="e2ee-badge" title="End-to-End Encrypted">🔒 E2EE</span>
        </div>

        <div className="chat-header-actions">
          <button
            className="icon-btn"
            title="Поиск (Ctrl+F)"
            onClick={() => setShowSearch(p => !p)}
            style={showSearch ? { color: 'var(--accent)' } : {}}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
          </button>
          <button className="icon-btn" title="Голосовой звонок">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 10.5 19.79 19.79 0 0 1 1.61 2.18 2 2 0 0 1 3.6 0h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 7.91a16 16 0 0 0 6.08 6.08l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
          <button className="icon-btn" title="Видеозвонок">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </button>
          <span className="header-divider" />
          <span className="current-user-tag">Вы: {currentUser.username}</span>
          <button onClick={onLogout} className="logout-btn">Выйти</button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <SearchBar
          query={searchQuery}
          onQuery={setSearchQuery}
          results={searchResults}
          currentIdx={searchIdx}
          onPrev={() => setSearchIdx(i => (i - 1 + searchResults.length) % searchResults.length)}
          onNext={() => setSearchIdx(i => (i + 1) % searchResults.length)}
          onClose={() => { setShowSearch(false); setSearchQuery(''); }}
        />
      )}

      {/* Pinned Message Bar */}
      <PinnedBar
        pinnedMessages={pinnedMessages}
        messages={localMessages}
        onScrollTo={scrollToMsg}
        onUnpin={() => {}}
      />

      {/* Messages */}
      <div className={`messages-list chat-bg--${settings?.chatBackground || 'solid'}`}>
        {groups.map((group, gi) => {
          const { isOwn } = group;
          const senderName = isOwn ? currentUser.username : contactName;
          const senderAvatar = isOwn ? myAvatar : contactAvatar;

          return (
            <div key={gi} className={`msg-group ${isOwn ? 'msg-group--own' : 'msg-group--other'}`}>
              {!isOwn && (
                <div className="msg-group__avatar">
                  <Avatar src={senderAvatar} name={senderName} size={36} />
                </div>
              )}

              <div className="msg-group__bubbles">
                {!isOwn && <span className="msg-sender-name">{senderName}</span>}

                {group.messages.map((msg, mi) => {
                  const isFirst = mi === 0;
                  const isLast = mi === group.messages.length - 1;
                  const isHighlighted = searchResults[searchIdx] === msg.id;

                  return (
                    <MessageComponent
                      key={msg.id}
                      msg={msg}
                      isOwn={isOwn}
                      isFirst={isFirst}
                      isLast={isLast}
                      contactName={contactName}
                      currentUser={currentUser}
                      settings={settings}
                      localReactions={localReactions}
                      msgRefs={msgRefs}
                      scrollToMsg={scrollToMsg}
                      setReplyTo={beginReply}
                      handleQuickReact={handleQuickReact}
                      handleReactionToggle={handleReactionToggle}
                      handleContextMenu={handleContextMenu}
                      isHighlighted={isHighlighted}
                      searchQuery={searchQuery}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="composer">
        {/* Reply preview */}
        {replyTo && (
          <div className="composer-reply">
            <div className="composer-reply-bar" />
            <div className="composer-reply-content">
              <span className="composer-reply-label">Ответ: </span>
              <span className="composer-reply-text">
                {replyTo.is_deleted_for_all ? <i>Сообщение удалено</i> : (replyTo.text.length > 60 ? replyTo.text.slice(0, 60) + '…' : replyTo.text)}
              </span>
            </div>
            <button className="composer-reply-close" onClick={() => setReplyTo(null)}>✕</button>
          </div>
        )}

        <div className="composer-row">
          {/* Left actions */}
          <div className="composer-actions-left">
            <button className="composer-btn" title="Прикрепить">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>
          </div>

          {/* Input */}
          <div className="composer-input-wrap">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Написать сообщение..."
              className="composer-input"
            />
          </div>

          {/* Right actions */}
          <div className="composer-actions-right">
            <button
              className="composer-btn"
              title="Эмодзи"
              onClick={() => setShowEmojiPicker(p => !p)}
            >
              😊
            </button>
            {inputText.trim() ? (
              <button className="send-btn send-btn--active" onClick={handleSubmit} title="Отправить">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            ) : (
              <button className="composer-btn" title="Голосовое сообщение">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="emoji-picker">
            {EMOJI_PICKER.map(e => (
              <button key={e} className="emoji-btn" onClick={() => {
                setInputText(p => p + e);
                textareaRef.current?.focus();
              }}>
                {e}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatArea;
