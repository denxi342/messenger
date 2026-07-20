import React, { useEffect, useState } from 'react';
import { UploadManager } from './UploadManager';
import './UploadPreviewBar.css';

export default function UploadPreviewBar() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    // Subscribe to UploadManager state updates
    const unsubscribe = UploadManager.subscribe((items) => {
      setQueue(items);
    });

    return () => unsubscribe();
  }, []);

  if (queue.length === 0) return null;

  const handleCancel = (id) => {
    UploadManager.cancel(id);
  };

  const handleRetry = (id) => {
    UploadManager.retry(id);
  };

  return (
    <div className="upload-preview-bar">
      <div className="upload-preview-list">
        {queue.map((item) => {
          const isFailed = item.status === 'failed';
          const isDone = item.status === 'done';
          const isProcessing = item.status === 'processing';
          
          return (
            <div key={item.id} className={`upload-preview-card ${isFailed ? 'failed' : ''}`}>
              <div className="upload-preview-thumb-container">
                {item.metadata?.thumbnail ? (
                  <img 
                    src={item.metadata.thumbnail} 
                    alt="preview" 
                    className="upload-preview-thumbnail"
                  />
                ) : (
                  <div className="upload-preview-file-icon">
                    {item.mime.startsWith('video/') ? '🎥' : '📄'}
                  </div>
                )}

                {/* Cancel Button */}
                <button 
                  className="upload-preview-cancel-btn" 
                  onClick={() => handleCancel(item.id)}
                  title="Отменить"
                >
                  ✕
                </button>
              </div>

              <div className="upload-preview-details">
                <span className="upload-preview-filename">{item.name}</span>
                
                <div className="upload-preview-status-row">
                  {isFailed ? (
                    <span className="upload-preview-status failed">Ошибка</span>
                  ) : isProcessing ? (
                    <span className="upload-preview-status processing">Обработка...</span>
                  ) : isDone ? (
                    <span className="upload-preview-status done">Готово</span>
                  ) : (
                    <span className="upload-preview-status uploading">
                      Загрузка {Math.round(item.progress)}%
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                {!isFailed && !isDone && (
                  <div className="upload-preview-progress-track">
                    <div 
                      className={`upload-preview-progress-fill ${isProcessing ? 'processing' : ''}`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {isFailed && (
                <button 
                  className="upload-preview-retry-btn"
                  onClick={() => handleRetry(item.id)}
                  title="Повторить попытку"
                >
                  🔄
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
