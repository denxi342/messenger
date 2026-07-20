import React, { useState, useEffect } from 'react';
import ImageViewer from './ImageViewer';
import VideoPlayer from './VideoPlayer';
import './MediaMessage.css';

/**
 * Formats size in bytes to readable format.
 */
function formatSize(bytes) {
  if (!bytes) return '';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

export default function MediaMessage({ msg }) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const mediaUrl = msg.media_url || '';
  const mediaType = msg.media_type || 'image';
  const name = msg.media_name || 'file';
  const size = msg.media_size || 0;
  const thumbBase64 = msg.media_thumbnail || null;
  const width = msg.media_width || null;
  const height = msg.media_height || null;
  const duration = msg.media_duration || null;

  // Revoke ObjectURL if it was generated locally
  useEffect(() => {
    return () => {
      if (mediaUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(mediaUrl);
        } catch (e) {
          console.error('Blob revoke failed on unmount:', e);
        }
      }
    };
  }, [mediaUrl]);

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasDims = width && height;
  const aspectRatio = hasDims ? `${width} / ${height}` : 'auto';

  if (mediaType === 'image') {
    return (
      <div className="media-msg-wrap image-type">
        <div 
          className="media-msg-img-container"
          style={{ 
            aspectRatio: aspectRatio,
            maxWidth: hasDims ? `${Math.min(width, 360)}px` : '360px',
          }}
          onClick={() => {
            if (!imageError && imageLoaded) {
              setIsViewerOpen(true);
            }
          }}
        >
          {/* Base64 Instant Thumbnail Placeholder */}
          {thumbBase64 && !imageLoaded && (
            <img 
              src={thumbBase64} 
              alt="loading thumbnail" 
              className="media-msg-placeholder"
            />
          )}

          {/* Skeleton Shimmer when no thumbnail is provided */}
          {!thumbBase64 && !imageLoaded && !imageError && (
            <div className="media-msg-skeleton" />
          )}

          {/* Full Image with lazy load */}
          {!imageError && (
            <img
              src={mediaUrl}
              alt={name}
              loading="lazy"
              decoding="async"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`media-msg-image ${imageLoaded ? 'loaded' : ''}`}
            />
          )}

          {imageError && (
            <div className="media-msg-error">
              <span>⚠️ Не удалось загрузить фото</span>
            </div>
          )}

          {/* Info Badge on Hover */}
          {imageLoaded && (
            <div className="media-msg-info-badge">
              <span className="media-msg-name-label">{name}</span>
              <span className="media-msg-size-label">{formatSize(size)}</span>
              <button 
                className="media-msg-download-icon" 
                onClick={handleDownload}
                title="Скачать файл"
              >
                📥
              </button>
            </div>
          )}
        </div>

        {/* Fullscreen ImageViewer Portal */}
        {isViewerOpen && (
          <ImageViewer
            src={mediaUrl}
            name={name}
            onClose={() => setIsViewerOpen(false)}
          />
        )}
      </div>
    );
  }

  if (mediaType === 'video') {
    return (
      <div className="media-msg-wrap video-type">
        <VideoPlayer
          src={mediaUrl}
          poster={thumbBase64}
          duration={duration}
        />
        <div className="media-video-info-row">
          <span className="media-msg-name-label">{name}</span>
          <span className="media-msg-size-label">{formatSize(size)}</span>
          <button 
            className="media-video-download-btn"
            onClick={handleDownload}
            title="Скачать видео"
          >
            📥 Скачать
          </button>
        </div>
      </div>
    );
  }

  return null;
}
