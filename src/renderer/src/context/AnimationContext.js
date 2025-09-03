import React, { createContext, useContext, useState, useEffect } from 'react';

const AnimationContext = createContext();

export const useAnimations = () => {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAnimations must be used within AnimationProvider');
  }
  return context;
};

export const AnimationProvider = ({ children }) => {
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  // Apply animation state to CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    if (animationsEnabled) {
      root.style.setProperty('--animation-duration-fast', '0.15s');
      root.style.setProperty('--animation-duration-base', '0.2s');
      root.style.setProperty('--animation-duration-slow', '0.3s');
      root.style.setProperty('--animation-state', 'running');
    } else {
      root.style.setProperty('--animation-duration-fast', '0s');
      root.style.setProperty('--animation-duration-base', '0s');
      root.style.setProperty('--animation-duration-slow', '0s');
      root.style.setProperty('--animation-state', 'paused');
    }
  }, [animationsEnabled]);

  // Global keyboard shortcut for developers: Ctrl+Shift+A (or Cmd+Shift+A on Mac)
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'A') {
        event.preventDefault();
        setAnimationsEnabled(prev => {
          const newState = !prev;
          console.log(`[ANIMATIONS] ${newState ? 'Enabled' : 'Disabled'} animations`);
          return newState;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pauseAnimations = () => setAnimationsEnabled(false);
  const resumeAnimations = () => setAnimationsEnabled(true);
  const toggleAnimations = () => setAnimationsEnabled(prev => !prev);

  const value = {
    animationsEnabled,
    pauseAnimations,
    resumeAnimations,
    toggleAnimations
  };

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
};

export default AnimationContext;
