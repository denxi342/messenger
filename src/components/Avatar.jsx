import React from 'react';

// Gradient palettes by first letter
const GRADIENTS = {
  A: '#667eea, #764ba2', B: '#f093fb, #f5576c', C: '#4facfe, #00f2fe',
  D: '#43e97b, #38f9d7', E: '#fa709a, #fee140', F: '#a18cd1, #fbc2eb',
  G: '#fccb90, #d57eeb', H: '#a1c4fd, #c2e9fb', I: '#fd7043, #ff8a65',
  J: '#66bb6a, #43a047', K: '#ab47bc, #7b1fa2', L: '#26c6da, #00acc1',
  M: '#ef5350, #e53935', N: '#5c6bc0, #3949ab', O: '#ffca28, #ffa000',
  P: '#26a69a, #00897b', Q: '#ec407a, #d81b60', R: '#7e57c2, #5e35b1',
  S: '#29b6f6, #0288d1', T: '#9ccc65, #689f38', U: '#ff7043, #e64a19',
  V: '#42a5f5, #1565c0', W: '#26c6da, #006064', X: '#ec407a, #880e4f',
  Y: '#ffca28, #ff6f00', Z: '#66bb6a, #2e7d32',
  DEFAULT: '#6b4cff, #a855f7'
};

const getGradient = (name) => {
  if (!name) return GRADIENTS.DEFAULT;
  const key = name[0].toUpperCase();
  return GRADIENTS[key] || GRADIENTS.DEFAULT;
};

const Avatar = ({ src, name, size = 44, className = '', onClick }) => {
  const initial = name ? name[0].toUpperCase() : '?';
  const gradient = getGradient(name);
  const fontSize = Math.floor(size * 0.38);

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`avatar-img ${className}`}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', cursor: onClick ? 'pointer' : 'default', flexShrink: 0 }}
        onClick={onClick}
      />
    );
  }

  return (
    <div
      className={`avatar-fallback ${className}`}
      onClick={onClick}
      style={{
        width: size, height: size, borderRadius: '50%',
        background: `linear-gradient(135deg, ${gradient})`,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        fontSize, fontWeight: 700, color: '#fff',
        cursor: onClick ? 'pointer' : 'default', flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {initial}
    </div>
  );
};

export default Avatar;
