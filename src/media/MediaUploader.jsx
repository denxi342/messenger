import React, { useEffect, useState, useRef } from 'react';
import './MediaUploader.css';

export default function MediaUploader({ children, onFilesSelected }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    dragCounter.current = 0;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(filesArray);
      e.dataTransfer.clearData();
    }
  };

  return (
    <div 
      className="media-uploader-dropzone"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop Zone Overlay */}
      {isDragActive && (
        <div className="media-uploader-drag-overlay">
          <div className="media-uploader-drag-message">
            <span className="media-uploader-drag-icon">📥</span>
            <h3>Отправка файлов</h3>
            <p>Перетащите изображения или видео сюда</p>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
