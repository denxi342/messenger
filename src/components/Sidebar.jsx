import React, { useState } from 'react';
import { searchContact, addContact } from '../api';
import Avatar from './Avatar';
import ContactProfile from './ContactProfile';

const Sidebar = ({
  contacts, activeChat, setActiveChat, onlineUsers, token,
  onContactAdded, unreadCounts = {}, onOpenMyProfile, typingUsers = {}
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [viewProfile, setViewProfile] = useState(null);
  const [filterQuery, setFilterQuery] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchError('');
    setSearchResult(null);
    setSearchLoading(true);
    try {
      const result = await searchContact(token, searchQuery.trim());
      if (result) setSearchResult(result);
      else setSearchError('Пользователь не найден. Введите точный никнейм.');
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!searchResult) return;
    try {
      await addContact(token, searchResult.id);
      onContactAdded();
      setShowAddModal(false);
      setSearchQuery('');
      setSearchResult(null);
    } catch (err) {
      setSearchError(err.message);
    }
  };

  const alreadyAdded = searchResult && contacts.some(c => c.id === searchResult.id);

  const filteredContacts = filterQuery.trim()
    ? contacts.filter(c =>
        (c.display_name || c.username).toLowerCase().includes(filterQuery.toLowerCase()) ||
        c.username.toLowerCase().includes(filterQuery.toLowerCase())
      )
    : contacts;

  const truncate = (str, n) => {
    if (!str) return '';
    return str.length > n ? str.slice(0, n) + '…' : str;
  };

  return (
    <div className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-header-left">
          <button className="my-profile-btn" onClick={onOpenMyProfile} title="Мой профиль">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
          <h2>Сообщения</h2>
        </div>
        <button className="icon-btn compose-btn" onClick={() => setShowAddModal(true)} title="Добавить контакт">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      </div>

      {/* Search / Filter */}
      <div className="sidebar-search">
        <div className="sidebar-search-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
        </div>
        <input
          type="text"
          placeholder="Поиск по контактам..."
          value={filterQuery}
          onChange={e => setFilterQuery(e.target.value)}
          className="sidebar-filter-input"
        />
        {filterQuery && (
          <button className="sidebar-filter-clear" onClick={() => setFilterQuery('')}>✕</button>
        )}
      </div>

      {/* Contacts List */}
      <div className="contacts-list">
        {filteredContacts.length === 0 && contacts.length === 0 ? (
          <div className="empty-contacts">
            <div className="empty-contacts-icon">💬</div>
            <p>Контактов пока нет</p>
            <span>Добавьте человека по его точному username</span>
            <button onClick={() => setShowAddModal(true)}>Добавить контакт</button>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="empty-contacts">
            <div className="empty-contacts-icon" style={{ fontSize: 28 }}>🔍</div>
            <p>Ничего не найдено</p>
            <span>Попробуйте другой запрос</span>
          </div>
        ) : (
          filteredContacts.map(contact => {
            const isOnline = onlineUsers.includes(Number(contact.id));
            const isTyping = !!typingUsers[Number(contact.id)];
            const unread = unreadCounts[Number(contact.id)] || 0;
            const displayN = contact.display_name || contact.username;
            const isActive = activeChat?.id === contact.id;

            return (
              <div
                key={contact.id}
                className={`contact-item ${isActive ? 'active' : ''} ${unread > 0 ? 'has-unread' : ''}`}
                onClick={() => setActiveChat(contact)}
              >
                <div className="contact-avatar-wrap">
                  <Avatar src={contact.avatar_base64 || null} name={displayN} size={46} />
                  {isOnline && <div className="online-dot" />}
                </div>

                <div className="contact-info">
                  <div className="contact-row-top">
                    <span className="contact-name">{displayN}</span>
                    {contact.last_message_time && (
                      <span className="contact-time">{contact.last_message_time}</span>
                    )}
                  </div>
                  <div className="contact-row-bottom">
                    {isTyping ? (
                      <span className="typing-indicator">
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-dot" />
                        <span className="typing-text">печатает...</span>
                      </span>
                    ) : contact.last_message_text ? (
                      <span className="contact-last-msg">
                        {contact.last_message_sender_id === contact.id ? '' : 'Вы: '}
                        {truncate(contact.last_message_text, 36)}
                      </span>
                    ) : (
                      <span className="contact-status-text">{isOnline ? 'В сети' : 'Не в сети'}</span>
                    )}
                    {unread > 0 && (
                      <div className="unread-badge">{unread > 99 ? '99+' : unread}</div>
                    )}
                  </div>
                </div>

                <button
                  className="contact-info-btn"
                  title="Профиль"
                  onClick={e => { e.stopPropagation(); setViewProfile(contact); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Contact Profile Modal */}
      {viewProfile && (
        <ContactProfile
          contact={viewProfile}
          token={token}
          onlineUsers={onlineUsers}
          onClose={() => setViewProfile(null)}
          onOpenChat={(c) => { setActiveChat(c); setViewProfile(null); }}
          onContactRemoved={() => { onContactAdded(); setViewProfile(null); }}
        />
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); setSearchQuery(''); setSearchResult(null); setSearchError(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setShowAddModal(false)}>✕</button>
            <h3>Добавить контакт</h3>
            <p className="modal-subtitle">Введите точный username — только полное совпадение</p>

            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                placeholder="exact_username"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                required
                autoFocus
              />
              <button type="submit" disabled={searchLoading}>
                {searchLoading ? '...' : 'Найти'}
              </button>
            </form>

            {searchError && <div className="search-error">{searchError}</div>}

            {searchResult && (
              <div className="search-result">
                <div className="search-result-info">
                  <Avatar src={searchResult.avatar_base64 || null} name={searchResult.display_name || searchResult.username} size={40} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{searchResult.display_name || searchResult.username}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>@{searchResult.username}</div>
                  </div>
                </div>
                {alreadyAdded
                  ? <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Уже в контактах</span>
                  : <button onClick={handleAdd} className="add-btn">Добавить</button>
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
