import { useState, useEffect } from 'react';

const useNumberAnimation = (finalValue, isAnimating = true, duration = 1000) => {
  const [displayValue, setDisplayValue] = useState('');

  useEffect(() => {
    if (!isAnimating || finalValue === null || finalValue === undefined) {
      setDisplayValue(finalValue);
      return;
    }

    // Convert final value to number if it's a string
    let numericValue = finalValue;
    if (typeof finalValue === 'string') {
      numericValue = parseFloat(finalValue.replace(/[$,]/g, '')) || 0;
    }

    // Handle decimal places
    const hasDecimal = numericValue.toString().includes('.');
    let decimalPlaces = 0;
    if (hasDecimal) {
      decimalPlaces = numericValue.toString().split('.')[1]?.length || 0;
    }

    // Start with one more digit than the final number for animation effect
    const integerPart = Math.floor(Math.abs(numericValue));
    const finalIntegerLength = integerPart.toString().length;
    const targetLength = finalIntegerLength + 1; // One more than actual length
    
    let currentStep = 0;
    const totalSteps = targetLength;
    const stepDuration = duration / totalSteps;
    let timeoutId = null;

    const generateRandomNumber = (length) => {
      return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
    };

    const animate = () => {
      if (currentStep >= totalSteps) {
        // Animation complete, show final value
        setDisplayValue(numericValue);
        return;
      }

      // Calculate how many digits from the right we should show as final
      const digitsFromRight = currentStep + 1;
      const randomDigitsLength = targetLength - digitsFromRight;
      
      let animatedValue;
      const integerStr = integerPart.toString().padStart(targetLength, '0');
      
      if (randomDigitsLength > 0) {
        const randomPart = generateRandomNumber(randomDigitsLength);
        const finalPart = integerStr.substring(randomDigitsLength);
        animatedValue = parseInt(randomPart + finalPart);
      } else {
        animatedValue = integerPart;
      }

      // Add decimal part if original number had decimals
      if (hasDecimal && decimalPlaces > 0) {
        const decimalPart = (numericValue % 1).toFixed(decimalPlaces).substring(1); // Gets ".XX"
        animatedValue = parseFloat(animatedValue + decimalPart);
      }

      // Handle negative numbers
      if (numericValue < 0) {
        animatedValue = -Math.abs(animatedValue);
      }

      setDisplayValue(animatedValue);
      currentStep++;

      timeoutId = setTimeout(animate, stepDuration);
    };

    // Start animation
    animate();

    // Cleanup
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [finalValue, isAnimating, duration]);

  return displayValue;
};

export default useNumberAnimation;
