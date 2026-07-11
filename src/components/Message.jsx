import React from 'react';

const EMOJI_QUICK = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👀'];

function highlightText(text, query) {
  if (!query || !query.trim()) return text;
  try {
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="search-highlight">{part}</mark>
        : part
    );
  } catch {
    return text;
  }
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

function ReplyQuote({ replyText, replySenderId, currentUserId, contactName, onClick, isDeleted }) {
  const isOwn = Number(replySenderId) === Number(currentUserId);
  return (
    <div className="reply-quote" onClick={onClick}>
      <div className="reply-quote-bar" />
      <div className="reply-quote-content">
        <span className="reply-quote-name">{isOwn ? 'Вы' : contactName}</span>
        <span className="reply-quote-text">
          {isDeleted ? <i>Сообщение удалено</i> : (replyText?.length > 80 ? replyText.slice(0, 80) + '…' : replyText)}
        </span>
      </div>
    </div>
  );
}

export default function Message({
  msg,
  isOwn,
  isFirst,
  isLast,
  contactName,
  currentUser,
  settings,
  localReactions,
  msgRefs,
  scrollToMsg,
  setReplyTo,
  handleQuickReact,
  handleReactionToggle,
  handleContextMenu,
  isHighlighted,
  searchQuery = ''
}) {
  let posClass = 'msg-mid';
  if (isFirst && isLast) posClass = 'msg-solo';
  else if (isFirst) posClass = 'msg-first';
  else if (isLast) posClass = 'msg-last';

  const msgReactions = localReactions[msg.id] || [];
  const hasReply = msg.reply_to_id && (msg.reply_text || msg.reply_is_deleted_for_all);

  // SQLite returns 0/1 as integers — convert to booleans explicitly
  const isDeletedForAll = Number(msg.is_deleted_for_all) === 1;
  const isEdited = Number(msg.is_edited) === 1;
  const isForwarded = Number(msg.is_forwarded) === 1;
  const isRead = Number(msg.is_read) === 1;
  const isDelivered = Number(msg.is_delivered) === 1;

  return (
    <div
      className={`msg-bubble-wrap ${isHighlighted ? 'msg-search-active' : ''}`}
      ref={el => { if (el) msgRefs.current[msg.id] = el; }}
    >
      {/* Forwarded indicator */}
      {isForwarded && (
        <div className={`msg-forwarded-indicator ${isOwn ? 'msg-forwarded-indicator--own' : ''}`}>
          <span>↗ Переслано</span>
        </div>
      )}

      {/* Reply quote */}
      {hasReply && (
        <ReplyQuote
          replyText={msg.reply_text}
          replySenderId={msg.reply_sender_id}
          currentUserId={currentUser.userId}
          contactName={contactName}
          isDeleted={Number(msg.reply_is_deleted_for_all) === 1}
          onClick={() => scrollToMsg(msg.reply_to_id)}
        />
      )}

      <div className="msg-bubble-row">
        {/* Quick react — hidden for deleted messages */}
        {!isDeletedForAll && (
          <div className={`quick-react ${isOwn ? 'quick-react--left' : 'quick-react--right'}`}>
            {EMOJI_QUICK.map(emoji => (
              <button key={emoji} className="quick-react-btn" onClick={() => handleQuickReact(msg, emoji)}>
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div
          className={`msg-bubble ${isOwn ? 'msg-bubble--own' : 'msg-bubble--other'} ${posClass} msg-bubble--${settings?.bubbleStyle || 'rounded'} ${isDeletedForAll ? 'msg-deleted' : ''}`}
          onContextMenu={e => handleContextMenu(e, msg)}
        >
          <span className="msg-bubble__text">
            {isDeletedForAll
              ? <i style={{ opacity: 0.7 }}>Сообщение удалено</i>
              : highlightText(msg.text || '', searchQuery)
            }
          </span>
          <span className="msg-bubble__meta">
            {isEdited && !isDeletedForAll && (
              <span className="msg-bubble__edited">(изменено)</span>
            )}
            <span className="msg-bubble__time">{msg.time}</span>
            {isOwn && (
              <span
                className={`msg-bubble__status ${isRead ? 'status-read' : isDelivered ? 'status-delivered' : ''}`}
                title={isRead ? 'Прочитано' : isDelivered ? 'Доставлено' : 'Отправлено'}
              >
                {isRead ? '✓✓' : isDelivered ? '✓✓' : '✓'}
              </span>
            )}
          </span>
        </div>

        {/* Reply button */}
        {!isDeletedForAll && (
          <button
            className="msg-action-btn msg-reply-btn"
            title="Ответить"
            onClick={() => setReplyTo(msg)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
            </svg>
          </button>
        )}
      </div>

      {/* Reactions bar */}
      {!isDeletedForAll && (
        <ReactionBar
          reactions={msgReactions}
          currentUserId={currentUser.userId}
          messageId={msg.id}
          onToggle={handleReactionToggle}
        />
      )}
    </div>
  );
}
