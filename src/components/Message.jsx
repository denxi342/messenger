import React from 'react';

const EMOJI_QUICK = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👀'];

function truncate(text, limit = 120) {
  const value = String(text || '');
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

function ReplyQuote({ msg, currentUserId, contactName, onScrollTo }) {
  const originalIsDeleted = Number(msg.reply_is_deleted_for_all) === 1;
  const originalSenderId = Number(msg.reply_sender_id || 0);
  const isOwnOriginal = originalSenderId === Number(currentUserId);

  const senderName = isOwnOriginal ? 'Вы' : (msg.reply_sender_name || contactName || 'Пользователь');

  const previewText = originalIsDeleted
    ? 'Сообщение удалено'
    : truncate(msg.reply_text || 'Сообщение недоступно');

  const handleClick = () => {
    if (msg.reply_to_id) {
      onScrollTo(msg.reply_to_id);
    }
  };

  return (
    <button
      type="button"
      className="reply-quote"
      onClick={handleClick}
      title="Перейти к исходному сообщению"
    >
      <span className="reply-quote-bar" aria-hidden="true" />

      <span className="reply-quote-content">
        <span className="reply-quote-label">В ответ на {senderName}</span>
        <span className={`reply-quote-text ${originalIsDeleted ? 'reply-quote-text--deleted' : ''}`}>
          {previewText}
        </span>
      </span>
    </button>
  );
}

function ReactionBar({ reactions, currentUserId, messageId, onToggle }) {
  if (!Array.isArray(reactions) || reactions.length === 0) return null;

  const grouped = reactions.reduce((result, reaction) => {
    if (!result[reaction.emoji]) {
      result[reaction.emoji] = { count: 0, users: [], myReacted: false };
    }
    result[reaction.emoji].count += 1;
    result[reaction.emoji].users.push(reaction.username);
    if (Number(reaction.user_id) === Number(currentUserId)) {
      result[reaction.emoji].myReacted = true;
    }
    return result;
  }, {});

  return (
    <div className="reaction-bar">
      {Object.entries(grouped).map(([emoji, data]) => (
        <button
          key={emoji}
          type="button"
          className={`reaction-chip ${data.myReacted ? 'reacted' : ''}`}
          title={data.users.filter(Boolean).join(', ')}
          onClick={() => onToggle(messageId, emoji, data.myReacted)}
        >
          {emoji} <span>{data.count}</span>
        </button>
      ))}
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
  searchQuery = '',
}) {
  let posClass = 'msg-mid';
  if (isFirst && isLast) posClass = 'msg-solo';
  else if (isFirst) posClass = 'msg-first';
  else if (isLast) posClass = 'msg-last';

  const replyToId = Number(msg.reply_to_id);
  const hasReply = replyToId > 0;   // Самое надёжное условие

  const isDeletedForAll = Number(msg.is_deleted_for_all) === 1;
  const isEdited = Number(msg.is_edited) === 1;
  const isForwarded = Number(msg.is_forwarded) === 1;
  const reactions = localReactions[msg.id] || msg.reactions || [];

  // Отладка
  if (hasReply) {
    console.log('[Message] Рендер ответа:', {
      messageId: msg.id,
      replyToId: replyToId,
      replyText: msg.reply_text,
      replySender: msg.reply_sender_name
    });
  }

  return (
    <article
      className={`msg-bubble-wrap ${isHighlighted ? 'msg-search-active' : ''}`}
      ref={(element) => { if (element) msgRefs.current[msg.id] = element; }}
      data-message-id={msg.id}
    >
      {isForwarded && (
        <div className={`msg-forwarded-indicator ${isOwn ? 'msg-forwarded-indicator--own' : ''}`}>
          ↗ Переслано
        </div>
      )}

      {/* Превью ответа */}
      {hasReply && (
        <ReplyQuote
          msg={msg}
          currentUserId={currentUser.userId}
          contactName={contactName}
          onScrollTo={scrollToMsg}
        />
      )}

      <div className="msg-bubble-row">
        {!isDeletedForAll && (
          <div className={`quick-react ${isOwn ? 'quick-react--left' : 'quick-react--right'}`}>
            {EMOJI_QUICK.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="quick-react-btn"
                onClick={() => handleQuickReact(msg, emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div
          className={[
            'msg-bubble',
            isOwn ? 'msg-bubble--own' : 'msg-bubble--other',
            posClass,
            `msg-bubble--${settings?.bubbleStyle || 'rounded'}`,
            isDeletedForAll ? 'msg-deleted' : '',
          ].join(' ')}
          onContextMenu={(event) => handleContextMenu(event, msg)}
        >
          <span className="msg-bubble__text">
            {isDeletedForAll ? <i>Сообщение удалено</i> : msg.text || ''}
          </span>

          <span className="msg-bubble__meta">
            {isEdited && !isDeletedForAll && <span className="msg-bubble__edited">(изменено)</span>}
            <span className="msg-bubble__time">{msg.time || msg.created_at?.slice(11, 16)}</span>
          </span>
        </div>

        {!isDeletedForAll && (
          <button
            type="button"
            className="msg-action-btn msg-reply-btn"
            title="Ответить"
            onClick={() => setReplyTo(msg)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
          </button>
        )}
      </div>

      {!isDeletedForAll && (
        <ReactionBar
          reactions={reactions}
          currentUserId={currentUser.userId}
          messageId={msg.id}
          onToggle={handleReactionToggle}
        />
      )}
    </article>
  );
}