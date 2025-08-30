import React from 'react';
import styled, { keyframes } from 'styled-components';

// Animation for the hour hand (slower)
const hourHandRotation = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// Animation for the minute hand (faster)
const minuteHandRotation = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// Fade animations for the overlay
const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
`;

const Overlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${props => {
    if (props.$isHiding) {
      return fadeOut;
    } else if (props.$noFadeIn) {
      return 'none';
    } else {
      return fadeIn;
    }
  }} 0.3s ease-in-out;
`;

const ClockContainer = styled.div`
  position: relative;
  width: 80px;
  height: 80px;
  border: 3px solid #007AFF;
  border-radius: 50%;
  background: #1a1a1a;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ClockFace = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 50%;
`;

// Hour markers
const HourMarker = styled.div`
  position: absolute;
  width: 2px;
  height: 8px;
  background: #007AFF;
  top: 6px;
  left: 50%;
  transform-origin: 50% 33px;
  transform: translateX(-50%) rotate(${props => props.$hour * 30}deg);
`;

// Clock hands
const ClockHand = styled.div`
  position: absolute;
  background: #007AFF;
  transform-origin: bottom center;
  border-radius: 2px;
  left: 50%;
  bottom: 50%;
`;

const HourHand = styled(ClockHand)`
  width: 3px;
  height: 20px;
  margin-left: -1.5px;
  animation: ${hourHandRotation} 3s linear infinite;
`;

const MinuteHand = styled(ClockHand)`
  width: 2px;
  height: 28px;
  margin-left: -1px;
  animation: ${minuteHandRotation} 1s linear infinite;
`;

const CenterDot = styled.div`
  position: absolute;
  width: 6px;
  height: 6px;
  background: #007AFF;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
`;

const LoadingText = styled.div`
  margin-top: 24px;
  color: #ffffff;
  font-size: 16px;
  font-weight: 500;
  text-align: center;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const LoadingOverlay = ({ isVisible, onHide, text = "Loading...", noFadeIn = false }) => {
  const [shouldRender, setShouldRender] = React.useState(isVisible);
  const [isAnimatingOut, setIsAnimatingOut] = React.useState(false);

  React.useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      setIsAnimatingOut(false);
    } else if (shouldRender) {
      // Start fade out animation
      setIsAnimatingOut(true);
      const timeout = setTimeout(() => {
        setShouldRender(false);
        setIsAnimatingOut(false);
        if (onHide) onHide();
      }, 300); // Match animation duration
      return () => clearTimeout(timeout);
    }
  }, [isVisible, shouldRender, onHide]);

  if (!shouldRender) {
    return null;
  }

  return (
    <Overlay $isHiding={isAnimatingOut} $noFadeIn={noFadeIn}>
      <LoadingContainer>
        <ClockContainer>
          <ClockFace>
            {/* Hour markers */}
            {[...Array(12)].map((_, i) => (
              <HourMarker key={i} $hour={i} />
            ))}
            
            {/* Clock hands */}
            <HourHand />
            <MinuteHand />
            
            {/* Center dot */}
            <CenterDot />
          </ClockFace>
        </ClockContainer>
        <LoadingText>{text}</LoadingText>
      </LoadingContainer>
    </Overlay>
  );
};

export default LoadingOverlay;
