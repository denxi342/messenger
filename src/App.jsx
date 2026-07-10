import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import MainApp from './components/MainApp';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('messenger_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('messenger_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('messenger_user');
  };

  const handleUserUpdate = (newUserData) => {
    const updated = { ...user, ...newUserData };
    setUser(updated);
    localStorage.setItem('messenger_user', JSON.stringify(updated));
  };

  if (!user) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  return <MainApp user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />;
}

export default App;
