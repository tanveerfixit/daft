import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * TopProgressBar
 * Provides a subtle, high-performance top progress indicator on route transitions
 * and passive view navigation without blocking user interaction or freezing the DOM.
 */
export const TopProgressBar: React.FC = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Start progress bar on route change
    setIsVisible(true);
    setProgress(25);

    const timer1 = setTimeout(() => setProgress(65), 100);
    const timer2 = setTimeout(() => setProgress(90), 200);
    const timer3 = setTimeout(() => {
      setProgress(100);
      const timer4 = setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 250);
      return () => clearTimeout(timer4);
    }, 350);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [location.pathname, location.search]);

  if (!isVisible && progress === 0) return null;

  return (
    <div 
      className="fixed top-0 left-0 right-0 h-[2.5px] z-[99999] pointer-events-none overflow-hidden bg-transparent"
      aria-hidden="true"
    >
      <div 
        className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all duration-200 ease-out"
        style={{ 
          width: `${progress}%`,
          opacity: isVisible ? 1 : 0,
          transitionProperty: 'width, opacity',
          transitionDuration: progress === 100 ? '150ms' : '200ms'
        }}
      />
    </div>
  );
};

export default TopProgressBar;
