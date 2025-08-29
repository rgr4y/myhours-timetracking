import React, { useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';
import './App.css';
import { TimerProvider } from './context/TimerContext';
import Sidebar from './components/Sidebar';
import Timer from './components/Timer';
import TimeEntries from './components/TimeEntries';
import Clients from './components/Clients';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Invoice from './components/Invoice';
import BackgroundClockOrbits from './components/BackgroundClockOrbits';

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    -webkit-user-select: none;
    user-select: none;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background-color: #1a1a1a;
    color: #ffffff;
    overflow: hidden;
  }

  /* Allow selecting and editing text in form controls */
  input, textarea, select, [contenteditable="true"], [contenteditable=""] {
    -webkit-user-select: text;
    user-select: text;
  }

  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: #2a2a2a;
  }

  ::-webkit-scrollbar-thumb {
    background: #404040;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: #505050;
  }
`;

const AppContainer = styled.div`
  position: relative;
  min-height: 100vh;
  background: #1a1a1a;
  color: #ffffff;
  display: flex;
  overflow: hidden;
`;

const BackgroundContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  opacity: 0.3;
`;

const ContentWrapper = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  width: 100%;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

// Component to handle window visibility detection
const VisibilityHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Window became hidden, start 30-second timer
        timeoutRef.current = setTimeout(() => {
          // Navigate to Timer page if not already there
          if (location.pathname !== '/') {
            navigate('/');
          }
        }, 30000); // 30 seconds
      } else {
        // Window became visible, clear the timer
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      }
    };

    // Handle tray events for navigation
    const handleTrayOpenSettings = () => {
      console.log('[App] Navigate to settings from tray');
      navigate('/settings');
    };

    // Add event listener for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Add tray event listeners
    if (window.electronAPI && window.electronAPI.on) {
      window.electronAPI.on('tray-open-settings', handleTrayOpenSettings);
    }

    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (window.electronAPI && window.electronAPI.removeListener) {
        window.electronAPI.removeListener('tray-open-settings', handleTrayOpenSettings);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [navigate, location]);

  return null; // This component doesn't render anything
};

function App() {
  return (
    <TimerProvider>
      <Router>
        <GlobalStyle />
        <VisibilityHandler />
        <AppContainer>
          <BackgroundContainer>
            <BackgroundClockOrbits />
          </BackgroundContainer>
          <ContentWrapper>
            <Sidebar />
            <MainContent>
              <Routes>
                <Route path="/" element={<Timer />} />
                <Route path="/entries" element={<TimeEntries />} />
                <Route path="/projects" element={<Clients />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/invoice" element={<Invoice />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </MainContent>
          </ContentWrapper>
        </AppContainer>
      </Router>
    </TimerProvider>
  );
}

export default App;
