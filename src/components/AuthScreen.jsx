import React, { useState } from 'react';
import { login, register } from '../api';

const AuthScreen = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegister) {
        const data = await register(username, password);
        onLogin(data);
      } else {
        const data = await login(username, password);
        onLogin(data);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="auth-title">{isRegister ? 'Создать аккаунт' : 'Вход в систему'}</h2>
        <p className="auth-subtitle">Только приватное общение.</p>
        
        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            placeholder="Точный никнейм" 
            value={username} 
            onChange={e => setUsername(e.target.value)}
            required 
            className="auth-input"
          />
          <input 
            type="password" 
            placeholder="Пароль" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            required 
            className="auth-input"
          />
          <button type="submit" className="auth-button">
            {isRegister ? 'Регистрация' : 'Войти'}
          </button>
        </form>

        <button 
          className="auth-switch" 
          onClick={() => { setIsRegister(!isRegister); setError(''); }}
        >
          {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Создать'}
        </button>
      </div>
    </div>
  );
};

export default AuthScreen;
