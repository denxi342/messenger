import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import './ImageViewer.css';

export default function ImageViewer({ src, name, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const imageRef = useRef(null);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle Zoom via Mouse Wheel
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 0.1;
    const newScale = e.deltaY < 0 
      ? Math.min(scale + zoomFactor, 5) 
      : Math.max(scale - zoomFactor, 1);
    
    setScale(newScale);
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 });
    }
  };

  // Drag to Pan while Zoomed
  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || scale <= 1) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    setPosition({ x: newX, y: newY });
  }, [isDragging, scale]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Double Click Reset
  const handleDoubleClick = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = src;
    link.download = name || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return ReactDOM.createPortal(
    <div 
      className="img-viewer-overlay" 
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="img-viewer-header" onClick={(e) => e.stopPropagation()}>
        <span className="img-viewer-name">{name || 'Изображение'}</span>
        <div className="img-viewer-actions">
          <button className="img-viewer-btn" title="Скачать" onClick={handleDownload}>
            📥
          </button>
          <button className="img-viewer-close" title="Закрыть (Esc)" onClick={onClose}>
            ✕
          </button>
        </div>
      </div>

      <div 
        className="img-viewer-content"
        onWheel={handleWheel}
      >
        <img
          ref={imageRef}
          src={src}
          alt={name}
          className="img-viewer-image"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)'
          }}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          onClick={(e) => e.stopPropagation()}
          draggable="false"
        />
      </div>
      
      {scale > 1 && (
        <div className="img-viewer-zoom-badge" onClick={(e) => e.stopPropagation()}>
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>,
    document.body
  );
}
