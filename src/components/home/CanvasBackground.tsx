import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
}

export const CanvasBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // Floating background particle constellation
    const particleCount = Math.min(Math.floor((width * height) / 22000), 55);
    const particles: Particle[] = [];
    const colors = ['#7c3aed', '#06b6d4', '#a855f7', '#10b981', '#38bdf8'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.6 + 0.6,
        alpha: Math.random() * 0.5 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    // DNA Double Helix Parameters
    let helixAngle = 0;
    const basePairs = 36;
    const helixAmplitude = Math.min(width * 0.28, 220); // Width of DNA twist
    const helixPitch = height / (basePairs * 0.7);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // --- 1. Render Background Particles & Web Connections ---
      const maxDistance = 120;
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];

        // Gentle mouse repulsion
        const mdx = p1.x - mouseX;
        const mdy = p1.y - mouseY;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist < 120) {
          p1.x += (mdx / mDist) * 0.6;
          p1.y += (mdy / mDist) * 0.6;
        }

        p1.x += p1.vx;
        p1.y += p1.vy;

        if (p1.x < 0) p1.x = width;
        else if (p1.x > width) p1.x = 0;
        if (p1.y < 0) p1.y = height;
        else if (p1.y > height) p1.y = 0;

        ctx.beginPath();
        ctx.arc(p1.x, p1.y, p1.radius, 0, Math.PI * 2);
        ctx.fillStyle = p1.color;
        ctx.globalAlpha = p1.alpha * 0.6;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            const lineAlpha = (1 - dist / maxDistance) * 0.1;
            ctx.strokeStyle = '#06b6d4';
            ctx.globalAlpha = lineAlpha;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      // --- 2. Render 3D Rotating DNA Double Helix ---
      helixAngle += 0.012;
      const helixCenterX = width * 0.82; // Position subtly on the right side
      const baseColors = [
        { strand1: '#06b6d4', strand2: '#f59e0b', label1: 'A', label2: 'T' }, // Adenine-Thymine
        { strand1: '#a855f7', strand2: '#10b981', label1: 'G', label2: 'C' }  // Guanine-Cytosine
      ];

      for (let i = 0; i < basePairs; i++) {
        const y = (i * helixPitch * 1.5 - ((helixAngle * 35) % (helixPitch * 1.5))) - 50;
        if (y < -50 || y > height + 50) continue;

        const currentTheta = helixAngle + i * 0.32;
        const sinVal = Math.sin(currentTheta);
        const cosVal = Math.cos(currentTheta);

        // 3D Perspective calculation
        const x1 = helixCenterX + cosVal * helixAmplitude;
        const x2 = helixCenterX - cosVal * helixAmplitude;

        // Depth perspective (Z-order)
        const depth1 = (sinVal + 1) / 2; // 0 (back) to 1 (front)
        const depth2 = (-sinVal + 1) / 2;

        const r1 = 2 + depth1 * 3;
        const r2 = 2 + depth2 * 3;

        const pairType = baseColors[i % baseColors.length];

        // Draw connecting base pair rung
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        const rungAlpha = 0.08 + Math.abs(cosVal) * 0.12;
        ctx.strokeStyle = '#6366f1';
        ctx.globalAlpha = rungAlpha;
        ctx.lineWidth = 1 + Math.abs(sinVal) * 0.8;
        ctx.stroke();

        // Draw Strand 1 Node
        ctx.beginPath();
        ctx.arc(x1, y, r1, 0, Math.PI * 2);
        ctx.fillStyle = pairType.strand1;
        ctx.globalAlpha = 0.25 + depth1 * 0.6;
        ctx.fill();

        // Draw Strand 2 Node
        ctx.beginPath();
        ctx.arc(x2, y, r2, 0, Math.PI * 2);
        ctx.fillStyle = pairType.strand2;
        ctx.globalAlpha = 0.25 + depth2 * 0.6;
        ctx.fill();
      }

      ctx.globalAlpha = 1.0;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-85"
      aria-hidden="true"
    />
  );
};
