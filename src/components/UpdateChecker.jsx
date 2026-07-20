import React, { useEffect, useState, useRef } from 'react';
import './UpdateChecker.css';

const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

export default function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const initialHash = useRef(null);

  useEffect(() => {
    // Get the initial bundle hash from current page
    const getCurrentHash = () => {
      const scripts = document.querySelectorAll('script[src]');
      const links = document.querySelectorAll('link[rel="stylesheet"][href]');
      const hashes = [];
      scripts.forEach(s => hashes.push(s.getAttribute('src')));
      links.forEach(l => hashes.push(l.getAttribute('href')));
      return hashes.sort().join('|');
    };

    initialHash.current = getCurrentHash();

    const checkForUpdate = async () => {
      try {
        // Fetch index.html with cache-busting
        const response = await fetch(`/?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (!response.ok) return;
        
        const html = await response.text();
        
        // Extract script and link tags from the fetched HTML
        const scriptMatches = html.match(/src="([^"]*\.js[^"]*)"/g) || [];
        const linkMatches = html.match(/href="([^"]*\.css[^"]*)"/g) || [];
        
        const remoteAssets = [...scriptMatches, ...linkMatches].sort().join('|');
        
        if (initialHash.current && remoteAssets && remoteAssets !== initialHash.current) {
          setUpdateAvailable(true);
        }
      } catch (err) {
        // Silently fail — network issues shouldn't bother the user
      }
    };

    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);
    
    // Also check once after a short delay on mount
    const timeout = setTimeout(checkForUpdate, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  const handleUpdate = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Show again after 5 minutes if still not updated
    setTimeout(() => setDismissed(false), 5 * 60 * 1000);
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <div className="update-toast">
      <div className="update-toast-icon">🚀</div>
      <div className="update-toast-content">
        <span className="update-toast-title">Доступно обновление</span>
        <span className="update-toast-desc">Нажмите для загрузки новой версии</span>
      </div>
      <div className="update-toast-actions">
        <button className="update-toast-btn update-toast-reload" onClick={handleUpdate}>
          Обновить
        </button>
        <button className="update-toast-btn update-toast-dismiss" onClick={handleDismiss}>
          ✕
        </button>
      </div>
    </div>
  );
}
