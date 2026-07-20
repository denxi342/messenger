import React, { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import MainApp from './components/MainApp';
import SplashScreen from './components/SplashScreen';
import UpdateChecker from './components/UpdateChecker';

function App() {
  const [user, setUser] = useState(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    let savedUser = localStorage.getItem('octave_user');
    if (!savedUser) {
      // Migration from old app name
      const legacyUser = localStorage.getItem('messenger_user');
      if (legacyUser) {
        savedUser = legacyUser;
        localStorage.setItem('octave_user', legacyUser);
        localStorage.removeItem('messenger_user');
      }
    }

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('octave_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('octave_user');
  };

  const handleUserUpdate = (newUserData) => {
    const updated = { ...user, ...newUserData };
    setUser(updated);
    localStorage.setItem('octave_user', JSON.stringify(updated));
  };

  return (
    <>
      <UpdateChecker />

      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      )}

      {!user ? (
        <AuthScreen onLogin={handleLogin} />
      ) : (
        <MainApp user={user} onLogout={handleLogout} onUserUpdate={handleUserUpdate} />
      )}
    </>
  );
}

export default App;
