import React, { useEffect, useState } from 'react';

export const CustomCursor: React.FC = () => {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Detect touch device
    if (window.matchMedia('(hover: none) or (pointer: coarse)').matches) {
      setIsTouchDevice(true);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });

      const target = e.target as HTMLElement | null;
      if (target) {
        const isClickable = target.closest('a, button, input, [role="button"], .interactive');
        setIsHovering(!!isClickable);
      }
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (isTouchDevice) return null;

  return (
    <>
      {/* Tiny Center Dot */}
      <div
        className="fixed pointer-events-none z-[99999] rounded-full bg-cyan-400 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out shadow-[0_0_10px_#06b6d4]"
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          width: isClicking ? '4px' : '8px',
          height: isClicking ? '4px' : '8px',
          opacity: pos.x === -100 ? 0 : 1
        }}
      />

      {/* Cyber Ring Follower */}
      <div
        className={`fixed pointer-events-none z-[99998] rounded-full -translate-x-1/2 -translate-y-1/2 border transition-all duration-200 ease-out ${
          isHovering
            ? 'w-14 h-14 border-cyan-400 bg-cyan-400/10 shadow-[0_0_25px_rgba(6,182,212,0.45)]'
            : isClicking
            ? 'w-6 h-6 border-purple-500 bg-purple-500/25 shadow-[0_0_20px_rgba(168,85,247,0.8)]'
            : 'w-9 h-9 border-cyan-500/70 shadow-[0_0_15px_rgba(124,58,237,0.3)]'
        }`}
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          opacity: pos.x === -100 ? 0 : 1
        }}
      />
    </>
  );
};
