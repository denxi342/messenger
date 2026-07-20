import React, { useState, useEffect } from 'react';
import Avatar from './Avatar';
import { fetchContactProfile, removeContact, blockUser } from '../api';

const ContactProfile = ({ contact, token, onlineUsers, onClose, onOpenChat, onContactRemoved }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // 'remove' | 'block'
  const [actionDone, setActionDone] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'media' | 'files'
  const [copySuccess, setCopySuccess] = useState('');

  const isOnline = onlineUsers.includes(Number(contact.id));

  useEffect(() => {
    fetchContactProfile(token, contact.username)
      .then(p => { setProfile(p); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [contact.username]);

  const handleCopyUsername = () => {
    navigator.clipboard.writeText(profile.username);
    showFeedback('Никнейм скопирован ✓');
  };

  const handleShareContact = () => {
    const shareLink = `http://localhost:5173/user/${profile.username}`;
    navigator.clipboard.writeText(shareLink);
    showFeedback('Ссылка на контакт скопирована ✓');
  };

  const showFeedback = (msg) => {
    setCopySuccess(msg);
    setTimeout(() => setCopySuccess(''), 2000);
  };

  const handleRemove = async () => {
    await removeContact(token, contact.id);
    setActionDone(true);
    setTimeout(() => { onContactRemoved(); onClose(); }, 1200);
  };

  const handleBlock = async () => {
    await blockUser(token, contact.id);
    setActionDone(true);
    setTimeout(() => { onContactRemoved(); onClose(); }, 1200);
  };

  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    try {
      const mutedList = JSON.parse(localStorage.getItem('octave_muted_conversations') || '[]');
      setIsMuted(mutedList.includes(String(contact.id)));
    } catch (e) {
      console.error('Failed to read muted chats:', e);
    }
  }, [contact.id]);

  const handleToggleMute = () => {
    try {
      const mutedList = JSON.parse(localStorage.getItem('octave_muted_conversations') || '[]');
      const idStr = String(contact.id);
      let nextMuted;
      if (mutedList.includes(idStr)) {
        nextMuted = mutedList.filter(id => id !== idStr);
        setIsMuted(false);
      } else {
        nextMuted = [...mutedList, idStr];
        setIsMuted(true);
      }
      localStorage.setItem('octave_muted_conversations', JSON.stringify(nextMuted));
    } catch (e) {
      console.error('Failed to toggle mute:', e);
    }
  };

  const formatDate = (dt) => {
    if (!dt) return '';
    return new Date(dt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="contact-profile-card" onClick={e => e.stopPropagation()}>
        <button className="card-close-btn" onClick={onClose}>✕</button>

        {loading && <div className="profile-loading">Загрузка...</div>}
        {error && <div className="profile-error">{error}</div>}

        {profile && !actionDone && (
          <>
            {/* Premium Blurred Background Cover */}
            <div className="profile-card-cover-wrapper">
              <div 
                className="profile-card-cover-blur"
                style={{ 
                  backgroundImage: profile.avatar_base64 ? `url(${profile.avatar_base64})` : 'linear-gradient(135deg, #6b4cff, #a855f7)'
                }}
              />
              <div className="profile-card-cover-overlay" />
            </div>

            {/* Main Info */}
            <div className="contact-profile-header">
              <div className="avatar-frame">
                <Avatar src={profile.avatar_base64 || null} name={profile.display_name || profile.username} size={90} />
              </div>
              <h2 className="contact-display-name">{profile.display_name || profile.username}</h2>
              
              <div className="contact-meta-row">
                <span className="contact-username-badge" onClick={handleCopyUsername} title="Скопировать никнейм">
                  @{profile.username} 📋
                </span>
                <div className={`contact-status-badge ${isOnline ? 'online' : 'offline'}`}>
                  <span className="status-indicator-dot"></span>
                  <span>{isOnline ? 'В сети' : 'Не в сети'}</span>
                </div>
              </div>
            </div>

            {/* Toast feedback */}
            {copySuccess && <div className="copy-toast-notification">{copySuccess}</div>}

            {/* Tab Navigation */}
            <div className="profile-tabs-nav">
              <button className={activeTab === 'info' ? 'active' : ''} onClick={() => setActiveTab('info')}>Информация</button>
              <button className={activeTab === 'media' ? 'active' : ''} onClick={() => setActiveTab('media')}>Медиа</button>
              <button className={activeTab === 'files' ? 'active' : ''} onClick={() => setActiveTab('files')}>Файлы</button>
            </div>

            {/* Tab Contents */}
            <div className="profile-tab-content">
              {activeTab === 'info' && (
                <div className="tab-pane info-pane">
                  {profile.bio && (
                    <div className="info-block">
                      <span className="info-block-label">О себе</span>
                      <p className="info-block-text">«{profile.bio}»</p>
                    </div>
                  )}

                  <div className="info-block">
                    <span className="info-block-label">Детали</span>
                    <div className="info-row">
                      <span>Добавлен в контакты:</span>
                      <span className="info-value">{formatDate(profile.added_at)}</span>
                    </div>
                  </div>

                  <button className="share-contact-btn" onClick={handleShareContact}>
                    🔗 Поделиться контактом
                  </button>
                </div>
              )}

              {activeTab === 'media' && (
                <div className="tab-pane media-pane">
                  {/* Styled Premium Placeholders */}
                  <div className="shared-media-grid">
                    <div className="media-placeholder-item">
                      <div className="media-placeholder-icon">🖼️</div>
                      <span>image_2026_07.png</span>
                    </div>
                    <div className="media-placeholder-item">
                      <div className="media-placeholder-icon">🎥</div>
                      <span>screencast.mp4</span>
                    </div>
                    <div className="media-placeholder-item">
                      <div className="media-placeholder-icon">🖼️</div>
                      <span>avatar_concept.jpg</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'files' && (
                <div className="tab-pane files-pane">
                  <div className="shared-files-list">
                    <div className="file-list-item">
                      <span className="file-icon">📄</span>
                      <div className="file-details">
                        <span className="file-name">Техническое_задание.pdf</span>
                        <span className="file-size">4.2 MB</span>
                      </div>
                    </div>
                    <div className="file-list-item">
                      <span className="file-icon">📦</span>
                      <div className="file-details">
                        <span className="file-name">octave-build-win.zip</span>
                        <span className="file-size">48.9 MB</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="contact-profile-footer">
              {!confirmAction ? (
                <>
                  <div className="action-main-buttons" style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px' }}>
                    <button 
                      className="action-chat-btn"
                      onClick={() => { onOpenChat(contact); onClose(); }}
                    >
                      💬 Написать сообщение
                    </button>
                    <button 
                      className={`action-mute-btn ${isMuted ? 'muted' : ''}`}
                      onClick={handleToggleMute}
                      style={{
                        background: isMuted ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                        border: isMuted ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(255, 255, 255, 0.06)',
                        color: isMuted ? '#ef4444' : 'var(--text-secondary)',
                        padding: '12px 16px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '500',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                      }}
                    >
                      {isMuted ? '🔊 Включить уведомления' : '🔕 Выключить уведомления'}
                    </button>
                  </div>

                  <div className="action-danger-row" style={{ marginTop: '12px' }}>
                    <button className="action-danger-btn-outline" onClick={() => setConfirmAction('remove')}>
                      Удалить
                    </button>
                    <button className="action-danger-btn-ghost" onClick={() => setConfirmAction('block')}>
                      Заблокировать
                    </button>
                  </div>
                </>
              ) : (

                <div className="confirm-card-dialog">
                  <p className="confirm-dialog-title">
                    {confirmAction === 'remove' 
                      ? 'Удалить из контактов?' 
                      : 'Заблокировать пользователя?'}
                  </p>
                  <p className="confirm-dialog-desc">
                    {confirmAction === 'remove' 
                      ? 'Вы сможете снова найти его по полному никнейму. Переписка сохранится в архиве.'
                      : 'Он больше не сможет отправлять вам сообщения и видеть ваш статус.'}
                  </p>
                  <div className="confirm-dialog-buttons">
                    <button className="dialog-btn-cancel" onClick={() => setConfirmAction(null)}>Отмена</button>
                    <button 
                      className="dialog-btn-confirm" 
                      onClick={confirmAction === 'remove' ? handleRemove : handleBlock}
                    >
                      Подтвердить
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {actionDone && (
          <div className="success-action-screen">
            <div className="success-circle">✓</div>
            <h3>Выполнено</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactProfile;
