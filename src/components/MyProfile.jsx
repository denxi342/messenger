import React, { useState, useRef, useEffect } from 'react';
import Avatar from './Avatar';
import Settings from './Settings';
import { fetchMyProfile, updateProfile, uploadAvatar, changePassword } from '../api';

const MyProfile = ({ user, token, onClose, onLogout, onProfileUpdate, onUserUpdate, settings, onUpdateSettings }) => {
  const [profile, setProfile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passStatus, setPassStatus] = useState('');
  
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [cropModal, setCropModal] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    fetchMyProfile(token)
      .then(p => {
        if (!p) {
          onLogout();
          return;
        }
        setProfile(p);
        setDisplayName(p.display_name || p.username);
        setUsername(p.username);
        setBio(p.bio || '');
        if (p.avatar_base64) setAvatarPreview(p.avatar_base64);
      })
      .catch(err => {
        console.error(err);
        onLogout();
      });
  }, [token, onLogout]);

  const showSaved = (msg = 'Сохранено ✓') => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleSaveProfile = async () => {
    try {
      const updated = await updateProfile(token, { displayName, username, bio });
      setProfile(updated);
      setDisplayName(updated.display_name || updated.username);
      setUsername(updated.username);
      setBio(updated.bio || '');
      if (updated.token) {
        onUserUpdate({ token: updated.token, username: updated.username });
      }
      onProfileUpdate({ displayName: updated.display_name, bio: updated.bio });
      setEditingName(false);
      setEditingUsername(false);
      setEditingBio(false);
      showSaved();
    } catch (err) {
      showSaved(`Ошибка: ${err.message}`);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
      setCropModal(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    if (!avatarPreview) return;
    try {
      await uploadAvatar(token, avatarPreview);
      onProfileUpdate({ avatar: avatarPreview });
      setCropModal(false);
      showSaved('Аватар обновлён ✓');
    } catch (err) {
      showSaved(`Ошибка: ${err.message}`);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassStatus('');
    try {
      await changePassword(token, currentPass, newPass);
      setPassStatus('✓ Пароль изменён');
      setCurrentPass('');
      setNewPass('');
      setTimeout(() => setPassStatus(''), 2000);
    } catch (err) {
      setPassStatus(`✗ ${err.message}`);
    }
  };

  const formatDate = (dt) => {
    if (!dt) return '';
    return new Date(dt).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  };

  if (!profile) return null;

  const profileComponent = (
    <div className="settings-block">
      {saveStatus && <div style={{ color: saveStatus.startsWith('Ошибка') ? 'var(--error)' : 'var(--success)', marginBottom: 12, fontSize: 14 }}>{saveStatus}</div>}
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div className="avatar-edit-wrapper" onClick={() => fileRef.current?.click()} style={{ width: 96, height: 96 }}>
          <Avatar src={avatarPreview} name={displayName} size={96} />
          <div className="avatar-edit-overlay">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        
        <div style={{ textAlign: 'center', width: '100%', marginTop: 16 }}>
          {editingName ? (
            <input
              autoFocus
              className="profile-name-input"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              onBlur={handleSaveProfile}
              onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
              maxLength={40}
            />
          ) : (
            <h3 className="profile-display-name" onClick={() => setEditingName(true)}>
              {displayName}
              <span className="edit-hint">✎</span>
            </h3>
          )}
          
          <div style={{ margin: '4px 0 8px' }}>
            {editingUsername ? (
              <input
                autoFocus
                className="profile-username-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onBlur={handleSaveProfile}
                onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
                maxLength={24}
              />
            ) : (
              <div 
                className="profile-username-btn"
                style={{ color: 'var(--text-secondary)', fontSize: 14, cursor: 'pointer', display: 'inline-block' }} 
                onClick={() => setEditingUsername(true)}
              >
                @{username} <span className="edit-hint" style={{ fontSize: 10 }}>✎</span>
              </div>
            )}
          </div>
          
          <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>В Мессенджере с {formatDate(profile.created_at)}</div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <label className="section-label">О себе</label>
        {editingBio ? (
          <div className="bio-edit-area">
            <textarea
              autoFocus
              className="bio-textarea"
              value={bio}
              onChange={e => setBio(e.target.value)}
              maxLength={160}
              rows={3}
              placeholder="Расскажи о себе..."
            />
            <div className="bio-footer">
              <span className="bio-counter">{bio.length}/160</span>
              <button className="save-bio-btn" onClick={handleSaveProfile}>Сохранить</button>
            </div>
          </div>
        ) : (
          <p className="profile-bio" onClick={() => setEditingBio(true)}>
            {bio || <span className="bio-placeholder">Добавить статус или описание... ✎</span>}
          </p>
        )}
      </div>

      {cropModal && (
        <div className="crop-modal-overlay" onClick={() => setCropModal(false)}>
          <div className="crop-modal" onClick={e => e.stopPropagation()}>
            <h3>Предпросмотр аватарки</h3>
            <div className="crop-preview">
              <img src={avatarPreview} alt="preview" className="crop-img" />
            </div>
            <p className="crop-hint">Аватарка будет обрезана по кругу автоматически</p>
            <div className="crop-actions">
              <button className="crop-cancel" onClick={() => { setCropModal(false); setAvatarPreview(profile.avatar_base64 || null); }}>Отмена</button>
              <button className="crop-save" onClick={handleSaveAvatar}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const securityComponent = (
    <div>
      <div className="settings-block">
        <h4 style={{ marginBottom: 12, fontSize: 15 }}>Смена пароля</h4>
        <form className="change-pass-form" onSubmit={handleChangePassword}>
          <input type="password" placeholder="Текущий пароль" value={currentPass} onChange={e => setCurrentPass(e.target.value)} required />
          <input type="password" placeholder="Новый пароль (мин. 6 символов)" value={newPass} onChange={e => setNewPass(e.target.value)} minLength={6} required />
          {passStatus && <span className={`pass-status ${passStatus.startsWith('✓') ? 'ok' : 'err'}`}>{passStatus}</span>}
          <button type="submit" style={{ marginTop: 8 }}>Сохранить пароль</button>
        </form>
      </div>
      <div className="settings-block">
        <h4 style={{ marginBottom: 12, fontSize: 15, color: 'var(--error)' }}>Опасная зона</h4>
        <button className="logout-danger-btn" onClick={onLogout}>Выйти из аккаунта</button>
      </div>
    </div>
  );

  return (
    <Settings 
      token={token}
      user={user}
      onClose={onClose} 
      profileComponent={profileComponent} 
      securityComponent={securityComponent} 
      settings={settings}
      onUpdateSettings={onUpdateSettings}
      onLogout={onLogout}
    />
  );
};

export default MyProfile;
