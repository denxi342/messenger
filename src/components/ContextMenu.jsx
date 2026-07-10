import React, { useEffect, useRef } from 'react';

const ContextMenu = ({ x, y, message, onClose, onReply, onCopy, onReact }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    
    // Slight delay to prevent immediate closure if triggered by click
    const timerId = setTimeout(() => document.addEventListener('click', handleClickOutside), 10);
    return () => {
      clearTimeout(timerId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent menu from overflowing screen
  const style = { top: y, left: x };
  if (x > window.innerWidth - 200) {
    style.left = undefined;
    style.right = window.innerWidth - x;
  }
  if (y > window.innerHeight - 300) {
    style.top = undefined;
    style.bottom = window.innerHeight - y;
  }

  return (
    <div className="context-menu-overlay" onContextMenu={e => { e.preventDefault(); onClose(); }}>
      <div className="context-menu" ref={menuRef} style={style}>
        <button className="context-menu-item" onClick={() => { onReply(message); onClose(); }}>
          <span>↪️</span> Ответить
        </button>
        <button className="context-menu-item" onClick={() => { onCopy(message.text); onClose(); }}>
          <span>📋</span> Копировать
        </button>
        
        <div className="context-menu-divider" />
        
        <button className="context-menu-item" onClick={() => { onReact(message); onClose(); }}>
          <span>😀</span> Реакция
        </button>
      </div>
    </div>
  );
};

export default ContextMenu;
