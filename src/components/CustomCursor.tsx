import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Restrict to non-touch devices
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (!isTouch) {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Create a dynamic style element to force cursor: none on all elements
    const styleEl = document.createElement('style');
    styleEl.id = 'custom-cursor-style-override';
    styleEl.innerHTML = `
      * {
        cursor: none !important;
      }
    `;
    document.head.appendChild(styleEl);

    const cursor = cursorRef.current;
    const dot = dotRef.current;

    if (!cursor || !dot) return;

    // Fast GSAP quickTo for smooth follow physics without stutter
    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.3, ease: 'power3.out' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.3, ease: 'power3.out' });

    const dotXTo = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'power3.out' });
    const dotYTo = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'power3.out' });

    const onMouseMove = (e: MouseEvent) => {
      xTo(e.clientX - 16);
      yTo(e.clientY - 16);

      dotXTo(e.clientX - 3);
      dotYTo(e.clientY - 3);
    };

    window.addEventListener('mousemove', onMouseMove);

    // Interactive Hover States
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName.toLowerCase() === 'a' ||
        target.tagName.toLowerCase() === 'button' ||
        target.closest('a') ||
        target.closest('button') ||
        target.classList.contains('interactive-hover') ||
        target.tagName.toLowerCase() === 'input'
      ) {
        gsap.to(cursor, {
          scale: 1.8,
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.12)',
          duration: 0.3,
        });
        gsap.to(dot, {
          scale: 0,
          opacity: 0,
          duration: 0.2,
        });
      } else {
        gsap.to(cursor, {
          scale: 1,
          borderColor: '#8b5cf6',
          backgroundColor: 'transparent',
          duration: 0.3,
        });
        gsap.to(dot, {
          scale: 1,
          opacity: 1,
          duration: 0.2,
        });
      }
    };

    document.addEventListener('mouseover', handleMouseOver);

    // Click microinteractions
    const onMouseDown = () => {
      gsap.to(cursor, { scale: 0.75, duration: 0.1 });
    };

    const onMouseUp = () => {
      gsap.to(cursor, { scale: 1.25, duration: 0.1 }).then(() => {
        gsap.to(cursor, { scale: 1.0, duration: 0.15 });
      });
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      
      // Remove style override and restore default cursor
      const el = document.getElementById('custom-cursor-style-override');
      if (el) {
        el.remove();
      }
    };
  }, [mounted]);

  if (!mounted) return null;

  return (
    <>
      {/* Outer Ring */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 w-8 h-8 border-2 border-purple-600 dark:border-purple-400 rounded-full pointer-events-none z-[999999] will-change-transform"
        style={{ transform: 'translate3d(-100px, -100px, 0)' }}
      />
      {/* Inner Dot */}
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-1.5 h-1.5 bg-purple-600 dark:bg-purple-400 rounded-full pointer-events-none z-[999999] will-change-transform"
        style={{ transform: 'translate3d(-100px, -100px, 0)' }}
      />
    </>
  );
};

export default CustomCursor;