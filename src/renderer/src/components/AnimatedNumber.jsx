import React from 'react';
import useNumberAnimation from '../hooks/useNumberAnimation';

const AnimatedNumber = ({ 
  value, 
  formatFunction = null, 
  isAnimating = true, 
  duration = 1000,
  ...props 
}) => {
  const animatedValue = useNumberAnimation(value, isAnimating, duration);
  
  // Apply formatting if provided, otherwise show the animated value
  const displayValue = formatFunction && animatedValue !== '' ? 
    formatFunction(parseFloat(animatedValue || 0)) : 
    animatedValue;
  
  return <span {...props}>{displayValue}</span>;
};

export default AnimatedNumber;
