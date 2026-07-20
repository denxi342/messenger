import React, { useEffect, useRef, useState } from 'react';
import './VideoPlayer.css';

export default function VideoPlayer({ src, poster, duration: defaultDuration }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(defaultDuration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const controlsTimeout = useRef(null);
  const broadcastChannel = useRef(null);

  useEffect(() => {
    // Set up broadcast channel to pause other videos when this one starts
    broadcastChannel.current = new BroadcastChannel('octave-video');
    broadcastChannel.current.onmessage = (e) => {
      if (e.data.action === 'pause-others' && e.data.id !== src) {
        pause();
      }
    };

    return () => {
      if (broadcastChannel.current) {
        broadcastChannel.current.close();
      }
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [src]);

  const triggerControlsTimeout = () => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    setShowControls(true);
    
    if (isPlaying) {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  };

  const play = () => {
    if (!videoRef.current) return;
    
    // Broadcast message to pause other videos
    if (broadcastChannel.current) {
      broadcastChannel.current.postMessage({ action: 'pause-others', id: src });
    }

    videoRef.current.play()
      .then(() => {
        setIsPlaying(true);
        triggerControlsTimeout();
      })
      .catch((err) => console.error('Video play interrupted:', err));
  };

  const pause = () => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    setShowControls(true);
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
    triggerControlsTimeout();
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const seekTime = Number(e.target.value);
    videoRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
    triggerControlsTimeout();
  };

  const toggleFullscreen = (e) => {
    e.stopPropagation();
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error('Fullscreen request error:', err));
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleContainerMouseMove = () => {
    triggerControlsTimeout();
  };

  const handleContainerMouseLeave = () => {
    if (isPlaying) {
      setShowControls(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`video-player-container ${isFullscreen ? 'fullscreen' : ''}`}
      onMouseMove={handleContainerMouseMove}
      onMouseLeave={handleContainerMouseLeave}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="none"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        className="video-player-element"
      />

      {/* Big Play Button Overlay */}
      {!isPlaying && (
        <div className="video-player-overlay-play">
          <div className="video-player-play-btn-circle">
            <span className="video-player-play-icon">▶</span>
          </div>
        </div>
      )}

      {/* Custom Control Bar */}
      <div 
        className={`video-player-controls-bar ${showControls ? 'visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="video-player-ctrl-btn" 
          onClick={togglePlay}
          title={isPlaying ? 'Пауза' : 'Воспроизвести'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <span className="video-player-time">
          {formatTime(currentTime)}
        </span>

        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="video-player-seek-slider"
          title="Перемотка"
        />

        <span className="video-player-time">
          {formatTime(duration)}
        </span>

        <button 
          className="video-player-ctrl-btn" 
          onClick={toggleMute}
          title={isMuted ? 'Включить звук' : 'Выключить звук'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        <button 
          className="video-player-ctrl-btn" 
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Во весь экран'}
        >
          {isFullscreen ? '⏹' : '📺'}
        </button>
      </div>
    </div>
  );
}
