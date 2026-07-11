import React, { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import MessageComponent from './Message';

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

  const style = {
    top: Math.max(12, Math.min(y, window.innerHeight - 300)),
    left: Math.max(12, Math.min(x, window.innerWidth - 220)),
  };

  return (
    <div className="ctx-menu" ref={menuRef} style={style}>
      {!isDeleted && (
        <button
          type="button"
          className="ctx-item"
          onClick={() => {
            console.log('[ContextMenu] reply selected', {
              messageId: msg.id,
              text: msg.text,
            });

            onReply(msg);
            onClose();
          }}
        >
          <span className="ctx-icon">↩️</span>
          <span>Ответить</span>
        </button>
      )}

      {!isDeleted && (
        <button
          type="button"
          className="ctx-item"
          onClick={() => {
            navigator.clipboard?.writeText(msg.text || '');
            onClose();
          }}
        >
          <span className="ctx-icon">📋</span>
          <span>Копировать</span>
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

      {isOwn && !isDeleted && (
        <span className="ctx-menu-own-message">Ваше сообщение</span>
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
      onClick={() => {
        console.log('[ReplyComposer] reply cancelled by preview click');
        onCancel();
      }}
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
          console.log('[ReplyComposer] reply cancelled by close button');
          onCancel();
        }}
      >
        ×
      </button>
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

    const onMessageDeletedAll = (messageId) => {
      setLocalMessages((previous) => previous.map((message) => {
        if (Number(message.id) === Number(messageId)) {
          return {
            ...message,
            is_deleted_for_all: 1,
            reactions: [],
          };
        }

        if (Number(message.reply_to_id) === Number(messageId)) {
          return {
            ...message,
            reply_text: null,
            reply_is_deleted_for_all: 1,
          };
        }

        return message;
      }));
    };

    const onMessageEdited = ({ messageId, text }) => {
      setLocalMessages((previous) => previous.map((message) => {
        if (Number(message.id) === Number(messageId)) {
          return { ...message, text, is_edited: 1 };
        }

        if (Number(message.reply_to_id) === Number(messageId)) {
          return { ...message, reply_text: text };
        }

        return message;
      }));
    };

    socket.on('reactionsUpdated', onReactionsUpdated);
    socket.on('messageDeletedAll', onMessageDeletedAll);
    socket.on('messageEdited', onMessageEdited);

    return () => {
      socket.off('reactionsUpdated', onReactionsUpdated);
      socket.off('messageDeletedAll', onMessageDeletedAll);
      socket.off('messageEdited', onMessageEdited);
    };
  }, [socket]);

  const scrollToMessage = (messageId) => {
    const target = messageRefs.current[messageId];

    console.log('[ChatArea] scroll to original message', {
      messageId,
      found: Boolean(target),
    });

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
    console.log('[ChatArea] reply target selected', {
      messageId: message.id,
      text: message.text,
    });

    setReplyTo(message);
    setContextMenu(null);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const cancelReply = () => {
    setReplyTo(null);
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
    if (!text || !activeChat) return;

    const replyToId = replyTo?.id ? Number(replyTo.id) : null;

    console.log('[ChatArea] sending message', {
      text,
      replyToId,
      replyTarget: replyTo,
    });

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
    if (event.key === 'Escape' && replyTo) {
      event.preventDefault();
      cancelReply();
      return;
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
          onReact={(message, emoji) => quickReact(message, emoji)}
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
            placeholder="Поиск в чате..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />

          <button
            type="button"
            className="search-bar-close"
            onClick={() => {
              setSearchQuery('');
              setShowSearch(false);
            }}
          >
            ×
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
        {replyTo && (
          <ReplyComposerPreview
            replyTo={replyTo}
            currentUser={currentUser}
            contactName={contactName}
            onCancel={cancelReply}
          />
        )}

        <div className="composer-row">
          <button type="button" className="composer-btn" title="Прикрепить файл">
            📎
          </button>

          <div className="composer-input-wrap">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              className="composer-input"
              placeholder="Написать сообщение..."
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
            className={`send-btn ${inputText.trim() ? 'send-btn--active' : ''}`}
            title="Отправить"
            disabled={!inputText.trim()}
            onClick={sendMessage}
          >
            ➤
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
  );
}