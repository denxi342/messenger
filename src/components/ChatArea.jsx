import React, { useState, useEffect, useRef, useCallback } from 'react';
import Avatar from './Avatar';

const EMOJI_QUICK = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👀'];
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

function ContextMenu({ x, y, msg, currentUserId, onClose, onReply, onCopy }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const escHandler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', escHandler); };
  }, [onClose]);

  // Clamp to viewport
  const style = { top: Math.min(y, window.innerHeight - 280), left: Math.min(x, window.innerWidth - 190) };

  const items = [
    { icon: '↩️', label: 'Ответить', action: () => { onReply(msg); onClose(); } },
    { icon: '📋', label: 'Копировать', action: () => { navigator.clipboard.writeText(msg.text); onClose(); } },
    { icon: '↗️', label: 'Переслать', action: onClose },
    { icon: '📌', label: 'Закрепить', action: onClose },
    ...(Number(msg.sender_id) === Number(currentUserId) ? [
      { icon: '✏️', label: 'Редактировать', action: onClose, className: '' },
      { icon: '🗑️', label: 'Удалить', action: onClose, className: 'ctx-danger' },
    ] : []),
  ];

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

function ReactionBar({ reactions, currentUserId, messageId, onToggle }) {
  if (!reactions || reactions.length === 0) return null;
  const grouped = {};
  reactions.forEach(r => {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, users: [], myReacted: false };
    grouped[r.emoji].count++;
    grouped[r.emoji].users.push(r.username);
    if (Number(r.user_id) === Number(currentUserId)) grouped[r.emoji].myReacted = true;
  });
  return (
    <div className="reaction-bar">
      {Object.entries(grouped).map(([emoji, data]) => (
        <button
          key={emoji}
          className={`reaction-chip ${data.myReacted ? 'reacted' : ''}`}
          onClick={() => onToggle(messageId, emoji, data.myReacted)}
          title={data.users.join(', ')}
        >
          {emoji} <span>{data.count}</span>
        </button>
      ))}
    </div>
  );
}

function ReplyQuote({ replyText, replySenderId, currentUserId, contactName, onClick }) {
  if (!replyText) return null;
  const isOwn = Number(replySenderId) === Number(currentUserId);
  return (
    <div className="reply-quote" onClick={onClick}>
      <div className="reply-quote-bar" />
      <div className="reply-quote-content">
        <span className="reply-quote-name">{isOwn ? 'Вы' : contactName}</span>
        <span className="reply-quote-text">{replyText.length > 80 ? replyText.slice(0, 80) + '…' : replyText}</span>
      </div>
    </div>
  );
}

const ChatArea = ({ activeChat, messages, onSendMessage, currentUser, onLogout, myAvatar, setTypingUsers, settings, socket }) => {
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [localReactions, setLocalReactions] = useState({});

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const highlightedMsgRef = useRef(null);
  const prevMsgCount = useRef(0);
  const msgRefs = useRef({});

  const contactName = activeChat ? (activeChat.display_name || activeChat.username) : '';
  const contactAvatar = activeChat?.avatar_base64 || null;

  // Sync reactions from props
  useEffect(() => {
    const reactionMap = {};
    messages.forEach(m => { if (m.reactions) reactionMap[m.id] = m.reactions; });
    setLocalReactions(reactionMap);
  }, [messages]);

  // Handle realtime reactions from socket
  useEffect(() => {
    if (!socket) return;
    const handler = ({ messageId, reactions }) => {
      setLocalReactions(prev => ({ ...prev, [messageId]: reactions }));
    };
    socket.on('reactionsUpdated', handler);
    return () => socket.off('reactionsUpdated', handler);
  }, [socket]);

  const scrollToBottom = (instant = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    scrollToBottom(prevMsgCount.current === 0);
    prevMsgCount.current = messages.length;
  }, [messages]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    autoResize();
    // Emit typing
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

  const handleReactionToggle = (messageId, emoji, alreadyReacted) => {
    if (!socket) return;
    if (alreadyReacted) socket.emit('removeReaction', { messageId, emoji });
    else socket.emit('addReaction', { messageId, emoji });
  };

  const handleQuickReact = (msg, emoji) => {
    const myReacted = (localReactions[msg.id] || []).some(r => r.emoji === emoji && Number(r.user_id) === Number(currentUser.userId));
    handleReactionToggle(msg.id, emoji, myReacted);
  };

  const scrollToMsg = (msgId) => {
    const el = msgRefs.current[msgId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('msg-highlight');
      setTimeout(() => el.classList.remove('msg-highlight'), 1500);
    }
  };

  // Drag & drop
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    // Future: handle file upload
  };

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

  const groups = groupMessages(messages, currentUser.userId);

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
          onReply={(msg) => setReplyTo(msg)}
          onCopy={(msg) => navigator.clipboard.writeText(msg.text)}
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
          <button className="icon-btn" title="Поиск">
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
                  let posClass = 'msg-mid';
                  if (isFirst && isLast) posClass = 'msg-solo';
                  else if (isFirst) posClass = 'msg-first';
                  else if (isLast) posClass = 'msg-last';

                  const msgReactions = localReactions[msg.id] || [];

                  return (
                    <div
                      key={mi}
                      className="msg-bubble-wrap"
                      ref={el => { if (el) msgRefs.current[msg.id] = el; }}
                    >
                      {/* Reply quote */}
                      {msg.reply_text && (
                        <ReplyQuote
                          replyText={msg.reply_text}
                          replySenderId={msg.reply_sender_id}
                          currentUserId={currentUser.userId}
                          contactName={contactName}
                          onClick={() => scrollToMsg(msg.reply_to_id)}
                        />
                      )}

                      <div className="msg-bubble-row">
                        {/* Quick react (hover) */}
                        <div className={`quick-react ${isOwn ? 'quick-react--left' : 'quick-react--right'}`}>
                          {EMOJI_QUICK.map(emoji => (
                            <button key={emoji} className="quick-react-btn" onClick={() => handleQuickReact(msg, emoji)}>
                              {emoji}
                            </button>
                          ))}
                        </div>

                        <div
                          className={`msg-bubble ${isOwn ? 'msg-bubble--own' : 'msg-bubble--other'} ${posClass} msg-bubble--${settings?.bubbleStyle || 'rounded'}`}
                          onContextMenu={e => handleContextMenu(e, msg)}
                        >
                          <span className="msg-bubble__text">{msg.text}</span>
                          <span className="msg-bubble__meta">
                            <span className="msg-bubble__time">{msg.time}</span>
                            {isOwn && <span className="msg-bubble__status" title="Отправлено">✓</span>}
                          </span>
                        </div>

                        {/* Reply button */}
                        <button
                          className="msg-action-btn msg-reply-btn"
                          title="Ответить"
                          onClick={() => setReplyTo(msg)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                          </svg>
                        </button>
                      </div>

                      {/* Reactions bar */}
                      <ReactionBar
                        reactions={msgReactions}
                        currentUserId={currentUser.userId}
                        messageId={msg.id}
                        onToggle={handleReactionToggle}
                      />
                    </div>
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
                {replyTo.text.length > 60 ? replyTo.text.slice(0, 60) + '…' : replyTo.text}
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
