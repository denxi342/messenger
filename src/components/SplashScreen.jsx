import React, { useEffect, useRef, useState } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onComplete }) => {
  const canvasRef = useRef(null);
  const [active, setActive] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [exit, setExit] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      ctx.scale(dpr, dpr);
      draw(width, height);
    };

    const draw = (width, height) => {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      // Beautiful large radius for subtle and smooth distribution
      const maxRadius = Math.max(width, height) * 0.75;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);

      // Generate a mathematically perfect Gaussian falloff to eliminate banding/rings
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        
        // Gaussian falloff curve: exp(-x^2)
        const factor = Math.exp(-Math.pow(t / 0.42, 2));
        
        // Subtle violet-pink tint (139, 92, 246 to 244, 140, 167)
        const r = Math.round(139 + (244 - 139) * t);
        const g = Math.round(92 + (140 - 92) * t);
        const b = Math.round(246 + (167 - 246) * t);
        
        // Peak opacity at center is extremely subtle (5.5%)
        const opacity = factor * 0.055;

        grad.addColorStop(t, `rgba(${r}, ${g}, ${b}, ${opacity})`);
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const tActive = setTimeout(() => setActive(true), 50);
    const tSubtitle = setTimeout(() => setShowSubtitle(true), 750);
    const tExit = setTimeout(() => setExit(true), 2900);
    const tComplete = setTimeout(() => {
      if (onComplete) onComplete();
    }, 3400);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(tActive);
      clearTimeout(tSubtitle);
      clearTimeout(tExit);
      clearTimeout(tComplete);
    };
  }, [onComplete]);

  return (
    <div className={`splash-overlay ${active ? 'is-active' : ''} ${exit ? 'is-exiting' : ''}`}>
      {/* High-resolution mathematical gradient layer */}
      <canvas ref={canvasRef} className="splash-gradient-canvas" />

      <div className="splash-minimal-content">
        {/* Title with moving gradient */}
        <h1 className="splash-gradient-title">Octave</h1>
        
        {/* Slogan with delayed fade-in */}
        <p className={`splash-slogan ${showSubtitle ? 'is-visible' : ''}`}>
          Privacy without compromise
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;
