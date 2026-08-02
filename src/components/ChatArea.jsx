import React, { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import MessageComponent from './Message';
import MediaUploader from '../media/MediaUploader';
import UploadPreviewBar from '../media/UploadPreviewBar';
import { validateFile } from '../media/FileValidator';
import { generateImageThumbnail, generateVideoThumbnail } from '../media/ThumbnailGenerator';
import { UploadManager } from '../media/UploadManager';

const EMOJI_PICKER = [
  '😀', '😂', '😍', '🥲', '😭', '🤔', '🔥', '❤️',
  '👍', '💯', '✨', '🎉', '😎', '🥳', '👀', '💬',
];

function groupMessages(messages, currentUserId) {
  const groups = [];
  let currentGroup = null;

  messages.forEach((message) => {
    const senderId = Number(message.sender_id);
    const isOwn = senderId === Number(currentUserId);

    if (!currentGroup || currentGroup.senderId !== senderId) {
      currentGroup = {
        senderId,
        isOwn,
        messages: [],
      };

      groups.push(currentGroup);
    }

    currentGroup.messages.push(message);
  });

  return groups;
}

function truncate(text, limit = 90) {
  const value = String(text || '');
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

function ContextMenu({
  x,
  y,
  msg,
  currentUserId,
  onClose,
  onReply,
  onCopy,
  onEdit,
  onDeleteSelf,
  onDeleteAll,
  onReact,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const isDeleted = Number(msg.is_deleted_for_all) === 1;
  const isOwn = Number(msg.sender_id) === Number(currentUserId);
  const hasText = Boolean(msg.text && msg.text.trim());
  const canEdit = isOwn && !isDeleted && hasText && !msg.media_url;

  const style = {
    top: Math.max(12, Math.min(y, window.innerHeight - 320)),
    left: Math.max(12, Math.min(x, window.innerWidth - 220)),
  };

  return (
    <div className="ctx-menu" ref={menuRef} style={style}>
      {!isDeleted && (
        <button
          type="button"
          className="ctx-item"
          onClick={() => {
            onReply(msg);
            onClose();
          }}
        >
          <span className="ctx-icon">↩️</span>
          <span>Ответить</span>
        </button>
      )}

      {!isDeleted && hasText && (
        <button
          type="button"
          className="ctx-item"
          onClick={() => {
            onCopy(msg.text || '');
            onClose();
          }}
        >
          <span className="ctx-icon">📋</span>
          <span>Копировать</span>
        </button>
      )}

      {canEdit && (
        <button
          type="button"
          className="ctx-item"
          onClick={() => {
            onEdit(msg);
            onClose();
          }}
        >
          <span className="ctx-icon">✏️</span>
          <span>Редактировать</span>
        </button>
      )}

      {!isDeleted && (
        <button
          type="button"
          className="ctx-item"
          onClick={() => {
            onReact(msg, '👍');
            onClose();
          }}
        >
          <span className="ctx-icon">👍</span>
          <span>Реакция</span>
        </button>
      )}

      <button
        type="button"
        className="ctx-item ctx-item--danger"
        onClick={() => {
          onDeleteSelf(msg);
          onClose();
        }}
      >
        <span className="ctx-icon">🗑️</span>
        <span>Удалить у меня</span>
      </button>

      {isOwn && !isDeleted && (
        <button
          type="button"
          className="ctx-item ctx-item--danger"
          onClick={() => {
            onDeleteAll(msg);
            onClose();
          }}
        >
          <span className="ctx-icon">💥</span>
          <span>Удалить у всех</span>
        </button>
      )}
    </div>
  );
}

function ReplyComposerPreview({ replyTo, currentUser, contactName, onCancel }) {
  const originalSenderName = Number(replyTo.sender_id) === Number(currentUser.userId)
    ? 'Вы'
    : (replyTo.senderName || replyTo.reply_sender_name || contactName || 'Пользователь');

  const originalDeleted = Number(replyTo.is_deleted_for_all) === 1;

  return (
    <div
      className="composer-reply"
      role="button"
      tabIndex={0}
      title="Нажмите, чтобы отменить ответ"
      onClick={() => onCancel()}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <span className="composer-reply-bar" />

      <div className="composer-reply-content">
        <span className="composer-reply-label">В ответ на {originalSenderName}</span>
        <span className="composer-reply-text">
          {originalDeleted ? 'Сообщение удалено' : truncate(replyTo.text)}
        </span>
      </div>

      <button
        type="button"
        className="composer-reply-close"
        aria-label="Отменить ответ"
        onClick={(event) => {
          event.stopPropagation();
          onCancel();
        }}
      >
        ×
      </button>
    </div>
  );
}

function EditComposerPreview({ editingMessage, onCancel }) {
  return (
    <div className="composer-edit-bar">
      <div className="composer-edit-bar-left">
        <span className="composer-edit-icon">✏️</span>
        <div className="composer-edit-content">
          <span className="composer-edit-label">Редактирование сообщения</span>
          <span className="composer-edit-text">{truncate(editingMessage.text || '', 80)}</span>
        </div>
      </div>
      <button
        type="button"
        className="composer-edit-close"
        title="Отменить редактирование (Esc)"
        onClick={onCancel}
      >
        ×
      </button>
    </div>
  );
}

function DeleteConfirmModal({ onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-card-dialog" onClick={(e) => e.stopPropagation()}>
        <p className="confirm-dialog-title">Удалить у всех?</p>
        <p className="confirm-dialog-desc">
          Сообщение будет удалено для всех участников чата. Это действие нельзя отменить.
        </p>
        <div className="confirm-dialog-buttons">
          <button className="dialog-btn-cancel" onClick={onCancel}>
            Отмена
          </button>
          <button className="dialog-btn-confirm" onClick={onConfirm}>
            Удалить у всех
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatArea({
  activeChat,
  messages = [],
  onSendMessage,
  currentUser,
  onLogout,
  myAvatar,
  settings,
  socket,
  contacts = [],
  pinnedMessages = [],
}) {
  const [inputText, setInputText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [deleteConfirmMsg, setDeleteConfirmMsg] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [localMessages, setLocalMessages] = useState(messages);
  const [localReactions, setLocalReactions] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const messageRefs = useRef({});
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const activeChatIdRef = useRef(activeChat?.id);
  const fileInputRef = useRef(null);

  // Auto scroll to bottom when new messages load or arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  const handleFilesSelected = async (files) => {
    for (const file of files) {
      const validation = await validateFile(file);
      if (!validation.valid) {
        if (window.notify?.error) {
          window.notify.error('Ошибка', validation.error);
        } else {
          console.error(validation.error);
        }
        continue;
      }

      let metadata = {};
      try {
        if (validation.mediaType === 'image') {
          const thumbResult = await generateImageThumbnail(file);
          metadata = {
            thumbnail: thumbResult.thumbnail,
            width: thumbResult.width,
            height: thumbResult.height
          };
        } else if (validation.mediaType === 'video') {
          const thumbResult = await generateVideoThumbnail(file);
          metadata = {
            thumbnail: thumbResult.thumbnail,
            width: thumbResult.width,
            height: thumbResult.height,
            duration: thumbResult.duration
          };
        }
      } catch (err) {
        console.error('Metadata/Thumbnail generation failed:', err);
      }

      UploadManager.add(file, currentUser.token, metadata);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  // Clipboard paste media handler
  useEffect(() => {
    if (!activeChat) return;

    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        handleFilesSelected(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeChat, currentUser]);

  // Subscribe to UploadManager events
  useEffect(() => {
    if (!activeChat) return;
    
    const unsubscribe = UploadManager.subscribe((items) => {
      items.forEach((item) => {
        if (item.status === 'done' && item.result) {
          onSendMessage('', null, false, {
            mediaUrl: item.result.url,
            mediaType: item.result.type,
            mediaWidth: item.result.width,
            mediaHeight: item.result.height,
            mediaDuration: item.result.duration,
            mediaSize: item.result.size,
            mediaName: item.result.name,
            mediaThumbnail: item.result.thumbnail
          });
          UploadManager.cancel(item.id);
        }
      });
    });

    return () => unsubscribe();
  }, [onSendMessage, activeChat?.id]);

  const contactName = activeChat
    ? (activeChat.display_name || activeChat.username)
    : '';

  const contactAvatar = activeChat?.avatar_base64 || null;

  useEffect(() => {
    activeChatIdRef.current = activeChat?.id;
  }, [activeChat]);

  useEffect(() => {
    setLocalMessages(messages);

    const reactionsMap = {};
    messages.forEach((message) => {
      if (Array.isArray(message.reactions)) {
        reactionsMap[message.id] = message.reactions;
      }
    });

    setLocalReactions(reactionsMap);
  }, [messages]);

  useEffect(() => {
    setReplyTo(null);
    setEditingMessage(null);
    setInputText('');
    setShowSearch(false);
    setSearchQuery('');
  }, [activeChat?.id]);

  useEffect(() => {
    if (!socket) return undefined;

    const onReactionsUpdated = ({ messageId, reactions }) => {
      setLocalReactions((previous) => ({
        ...previous,
        [messageId]: reactions,
      }));
    };

    // Direct socket listeners so localMessages updates instantly for BOTH sender and recipient
    const onMessageDeletedAll = (payload) => {
      const targetId = Number(
        payload && typeof payload === 'object' ? payload.messageId : payload
      );
      setLocalMessages((prev) =>
        prev.map((m) => {
          if (Number(m.id) === targetId) {
            return { ...m, is_deleted_for_all: 1, text: '', media_url: null, media_thumbnail: null, reactions: [] };
          }
          if (Number(m.reply_to_id) === targetId) {
            return { ...m, reply_text: '', reply_is_deleted_for_all: 1 };
          }
          return m;
        })
      );
      // Also clear reactions for this message
      setLocalReactions((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
    };

    const onMessageEdited = (payload) => {
      const targetId = Number(
        payload && typeof payload === 'object' ? payload.messageId : payload
      );
      const text = payload && typeof payload === 'object' ? payload.text : '';
      setLocalMessages((prev) =>
        prev.map((m) => {
          if (Number(m.id) === targetId) return { ...m, text, is_edited: 1 };
          if (Number(m.reply_to_id) === targetId) return { ...m, reply_text: text };
          return m;
        })
      );
    };

    const onMessageDeletedSelf = (payload) => {
      const targetId = Number(
        payload && typeof payload === 'object' ? payload.messageId : payload
      );
      setLocalMessages((prev) => prev.filter((m) => Number(m.id) !== targetId));
    };

    socket.on('reactionsUpdated', onReactionsUpdated);
    socket.on('messageDeletedAll', onMessageDeletedAll);
    socket.on('messageEdited', onMessageEdited);
    socket.on('messageDeletedSelf', onMessageDeletedSelf);

    return () => {
      socket.off('reactionsUpdated', onReactionsUpdated);
      socket.off('messageDeletedAll', onMessageDeletedAll);
      socket.off('messageEdited', onMessageEdited);
      socket.off('messageDeletedSelf', onMessageDeletedSelf);
    };
  }, [socket]);

  const scrollToMessage = (messageId) => {
    const target = messageRefs.current[messageId];
    if (!target) return;

    target.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    target.classList.add('msg-highlight');
    window.setTimeout(() => {
      target.classList.remove('msg-highlight');
    }, 1500);
  };

  const beginReply = (message) => {
    setEditingMessage(null);
    setReplyTo(message);
    setContextMenu(null);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  const beginEdit = (message) => {
    if (!message || Number(message.is_deleted_for_all) === 1) return;
    setReplyTo(null);
    setEditingMessage(message);
    setInputText(message.text || '');
    setContextMenu(null);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    });
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleDeleteSelf = (message) => {
    if (!socket || !message) return;
    socket.emit('deleteMessageSelf', { messageId: message.id });
    setLocalMessages((previous) => previous.filter((m) => m.id !== message.id));
    if (editingMessage?.id === message.id) {
      cancelEdit();
    }
  };

  const handleDeleteAll = (message) => {
    if (!message || Number(message.is_deleted_for_all) === 1) return;
    setDeleteConfirmMsg(message);
  };

  const confirmDeleteAll = () => {
    if (!socket || !deleteConfirmMsg) return;
    socket.emit('deleteMessageAll', { messageId: deleteConfirmMsg.id });
    setLocalMessages((previous) =>
      previous.map((m) =>
        m.id === deleteConfirmMsg.id
          ? { ...m, is_deleted_for_all: 1, text: '', media_url: null, media_thumbnail: null, reactions: [] }
          : m
      )
    );
    if (editingMessage?.id === deleteConfirmMsg.id) {
      cancelEdit();
    }
    setDeleteConfirmMsg(null);
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputText(value);

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }

    if (socket && activeChat) {
      socket.emit('typing', {
        recipientId: Number(activeChat.id),
        isTyping: value.trim().length > 0,
      });
    }
  };

  const sendMessage = () => {
    const text = inputText.trim();
    if (!activeChat) return;

    if (editingMessage) {
      if (!text) {
        if (window.notify?.error) {
          window.notify.error('Ошибка', 'Сообщение не может быть пустым');
        }
        return;
      }

      if (editingMessage.text?.trim() === text) {
        cancelEdit();
        return;
      }

      socket?.emit('editMessage', { messageId: editingMessage.id, newText: text });

      setLocalMessages((previous) =>
        previous.map((m) =>
          m.id === editingMessage.id ? { ...m, text, is_edited: 1 } : m
        )
      );

      cancelEdit();
      return;
    }

    if (!text) return;

    const replyToId = replyTo?.id ? Number(replyTo.id) : null;
    onSendMessage(text, replyToId);

    setInputText('');
    setReplyTo(null);
    setShowEmojiPicker(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    socket?.emit('typing', {
      recipientId: Number(activeChat.id),
      isTyping: false,
    });
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Escape') {
      if (editingMessage) {
        event.preventDefault();
        cancelEdit();
        return;
      }
      if (replyTo) {
        event.preventDefault();
        cancelReply();
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleContextMenu = (event, message) => {
    event.preventDefault();

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      msg: message,
    });
  };

  const toggleReaction = (messageId, emoji, alreadyReacted) => {
    if (!socket) return;

    if (alreadyReacted) {
      socket.emit('removeReaction', { messageId, emoji });
    } else {
      socket.emit('addReaction', { messageId, emoji });
    }
  };

  const quickReact = (message, emoji) => {
    const reactions = localReactions[message.id] || message.reactions || [];
    const alreadyReacted = reactions.some(
      (reaction) =>
        reaction.emoji === emoji
        && Number(reaction.user_id) === Number(currentUser.userId)
    );

    toggleReaction(message.id, emoji, alreadyReacted);
  };

  const filteredMessages = searchQuery.trim()
    ? localMessages.filter((message) =>
      String(message.text || '').toLowerCase().includes(searchQuery.trim().toLowerCase())
    )
    : localMessages;

  const groups = groupMessages(filteredMessages, currentUser.userId);

  if (!activeChat) {
    return (
      <main className="chat-area empty-state">
        <div className="empty-state-content">
          <h3>Выберите чат</h3>
          <p>Выберите контакт, чтобы начать общение.</p>
        </div>
      </main>
    );
  }

  return (
    <MediaUploader onFilesSelected={handleFilesSelected}>
      <main className="chat-area">
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            msg={contextMenu.msg}
            currentUserId={currentUser.userId}
            onClose={() => setContextMenu(null)}
            onReply={beginReply}
            onCopy={(text) => navigator.clipboard?.writeText(text)}
            onEdit={beginEdit}
            onDeleteSelf={handleDeleteSelf}
            onDeleteAll={handleDeleteAll}
            onReact={(message, emoji) => quickReact(message, emoji)}
          />
        )}

        {deleteConfirmMsg && (
          <DeleteConfirmModal
            onConfirm={confirmDeleteAll}
            onCancel={() => setDeleteConfirmMsg(null)}
          />
        )}

        <header className="chat-header">
          <div className="chat-header-info">
            <Avatar src={contactAvatar} name={contactName} size={36} />

            <div className="chat-header-text">
              <h2>{contactName}</h2>
              {activeChat.display_name && (
                <span className="chat-header-username">@{activeChat.username}</span>
              )}
            </div>
          </div>

          <div className="chat-header-actions">
            <button
              type="button"
              className="icon-btn"
              title="Поиск"
              onClick={() => setShowSearch((visible) => !visible)}
            >
              🔍
            </button>

            <button type="button" onClick={onLogout} className="logout-btn">
              Выйти
            </button>
          </div>
        </header>

        {showSearch && (
          <div className="search-bar">
            <input
              autoFocus
              type="search"
              className="search-bar-input"
              placeholder="Поиск по сообщениям..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              type="button"
              className="search-bar-close"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
            >
              ✕
            </button>
          </div>
        )}

        {pinnedMessages.length > 0 && (
          <div className="pinned-bar">
            📌 Закреплённые сообщения: {pinnedMessages.length}
          </div>
        )}

        <section className={`messages-list chat-bg--${settings?.chatBackground || 'solid'}`}>
          {groups.map((group, groupIndex) => {
            const senderName = group.isOwn ? currentUser.username : contactName;
            const senderAvatar = group.isOwn ? myAvatar : contactAvatar;

            return (
              <div
                key={`${group.senderId}-${groupIndex}`}
                className={`msg-group ${group.isOwn ? 'msg-group--own' : 'msg-group--other'}`}
              >
                {!group.isOwn && (
                  <div className="msg-group__avatar">
                    <Avatar src={senderAvatar} name={senderName} size={36} />
                  </div>
                )}

                <div className="msg-group__bubbles">
                  {!group.isOwn && <span className="msg-sender-name">{senderName}</span>}

                  {group.messages.map((message, messageIndex) => (
                    <MessageComponent
                      key={message.id}
                      msg={message}
                      isOwn={group.isOwn}
                      isFirst={messageIndex === 0}
                      isLast={messageIndex === group.messages.length - 1}
                      contactName={contactName}
                      currentUser={currentUser}
                      settings={settings}
                      localReactions={localReactions}
                      msgRefs={messageRefs}
                      scrollToMsg={scrollToMessage}
                      setReplyTo={beginReply}
                      handleQuickReact={quickReact}
                      handleReactionToggle={toggleReaction}
                      handleContextMenu={handleContextMenu}
                      isHighlighted={false}
                      searchQuery={searchQuery}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          <div ref={messagesEndRef} />
        </section>

        <footer className="composer">
          {editingMessage && (
            <EditComposerPreview
              editingMessage={editingMessage}
              onCancel={cancelEdit}
            />
          )}

          {replyTo && !editingMessage && (
            <ReplyComposerPreview
              replyTo={replyTo}
              currentUser={currentUser}
              contactName={contactName}
              onCancel={cancelReply}
            />
          )}

          <UploadPreviewBar />

          <div className="composer-row">
            <button 
              type="button" 
              className="composer-btn" 
              title="Прикрепить файл"
              onClick={() => fileInputRef.current?.click()}
            >
              📎
            </button>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              multiple
              accept="image/*,video/*"
              onChange={handleFileChange}
            />

            <div className="composer-input-wrap">
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                className="composer-input"
                placeholder={editingMessage ? "Редактирование..." : "Написать сообщение..."}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
              />
            </div>

            <button
              type="button"
              className="composer-btn"
              title="Эмодзи"
              onClick={() => setShowEmojiPicker((visible) => !visible)}
            >
              😊
            </button>

            <button
              type="button"
              className={`send-btn ${inputText.trim() ? 'send-btn--active' : ''} ${editingMessage ? 'send-btn--edit' : ''}`}
              title={editingMessage ? "Сохранить изменения" : "Отправить"}
              disabled={!inputText.trim()}
              onClick={sendMessage}
            >
              {editingMessage ? '✓' : '➤'}
            </button>
          </div>

          {showEmojiPicker && (
            <div className="emoji-picker">
              {EMOJI_PICKER.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="emoji-btn"
                  onClick={() => {
                    setInputText((previous) => `${previous}${emoji}`);
                    textareaRef.current?.focus();
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </footer>
      </main>
    </MediaUploader>
  );
}