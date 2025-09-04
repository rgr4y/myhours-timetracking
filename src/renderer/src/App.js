import React, { useEffect, useRef, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';
import './App.css';
import { TimerProvider } from './context/TimerContext';
import { AnimationProvider, useAnimations } from './context/AnimationContext';
import { ToastProvider } from './components/ui/Toast';
import Sidebar from './components/Sidebar';
import TimeEntries from './components/TimeEntries';
import Clients from './components/Clients';
import Reports from './components/Reports';
import Settings from './components/Settings';
import About from './components/About';
import Invoice from './components/Invoice';
import BackgroundClockOrbits from './components/BackgroundClockOrbits';
import { Button } from './components/ui';

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

const UpdateBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  background: #2a2a2a;
  border-bottom: 1px solid #404040;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const UpdateBarText = styled.div`
  color: #fff;
  font-size: 14px;
`;

const UpdateBarActions = styled.div`
  display: flex;
  gap: 8px;
`;

// Component to handle tray navigation (needs to be inside Router)
const TrayNavigationHandler = () => {
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);

  // Keep navigateRef updated
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  // Set up tray event listeners once
  useEffect(() => {
    // Handle tray events for navigation
    const handleTrayOpenSettings = () => {
      console.log('[App] Navigate to settings from tray');
      navigateRef.current('/settings');
    };

    // Add tray event listeners
    if (window.electronAPI && window.electronAPI.on) {
      window.electronAPI.on('tray-open-settings', handleTrayOpenSettings);
    }

    // Cleanup function
    return () => {
      if (window.electronAPI && window.electronAPI.removeListener) {
        window.electronAPI.removeListener('tray-open-settings', handleTrayOpenSettings);
      }
    };
  }, []); // Run only once on mount

  return null; // This component doesn't render anything
};

// Component to handle window visibility detection (needs to be inside Router)
const AppLogic = () => {
  const timeoutRef = useRef(null);
  const { pauseAnimations, resumeAnimations } = useAnimations();

  // Set up visibility change detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[RNDR->APP] Document hidden - pausing animations');
        pauseAnimations();
      } else {
        console.log('[RNDR->APP] Document visible - resuming animations');
        // Small delay to let the window properly focus
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          resumeAnimations();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [pauseAnimations, resumeAnimations]);

  return null; // This component doesn't render anything
};

function App() {
  const [updateBanner, setUpdateBanner] = useState({ visible: false, version: null, notesUrl: null });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    let unsub = null;
    const init = async () => {
      try {
        // Read preference (default to true if unset)
        const val = await window.electronAPI?.invoke('db:getSetting', 'update_notifications_enabled');
        if (val === 'false') setNotificationsEnabled(false);
      } catch (_) {}

      if (!window.electronAPI?.updater?.onEvent) return;
      const handler = (evt) => {
        if (!evt || !evt.type) return;
        if (evt.type === 'update-available') {
          if (notificationsEnabled) {
            const ver = evt.payload?.version || null;
            const notesUrl = evt.payload?.notesUrl || null;
            setUpdateBanner({ visible: true, version: ver, notesUrl });
          }
        }
      };
      window.electronAPI.updater.onEvent(handler);
      unsub = () => window.electronAPI.updater.removeEventListener(handler);
    };
    init();
    return () => { if (unsub) unsub(); };
  }, [notificationsEnabled]);

  const handleDownloadUpdate = async () => {
    try { await window.electronAPI?.updater?.download(); } catch (_) {}
  };
  const handleDismiss = () => setUpdateBanner({ visible: false, version: updateBanner.version });
  const handleDisable = async () => {
    try {
      await window.electronAPI?.invoke('db:setSetting', 'update_notifications_enabled', 'false');
      setNotificationsEnabled(false);
      setUpdateBanner({ visible: false, version: updateBanner.version, notesUrl: updateBanner.notesUrl });
    } catch (_) {}
  };

  const handleOpenReleaseNotes = async () => {
    try {
      if (updateBanner?.notesUrl) {
        await window.electronAPI?.openExternal(updateBanner.notesUrl);
      } else if (updateBanner?.version) {
        const url = `https://github.com/rgr4y/myhours-timetracking/releases/tag/v${updateBanner.version}`;
        await window.electronAPI?.openExternal(url);
      }
    } catch (_) {}
  };

  return (
    <AnimationProvider>
      <TimerProvider>
        <ToastProvider>
          <Router>
            <TrayNavigationHandler />
            <GlobalStyle />
            <AppLogic />
            <AppContainer>
              <BackgroundContainer>
                <BackgroundClockOrbits />
              </BackgroundContainer>
              <ContentWrapper>
                <Sidebar />
                <MainContent>
                  {updateBanner.visible && (
                  <UpdateBar>
                    <UpdateBarText>
                      {updateBanner.version ? `Update v${updateBanner.version} is available.` : 'An update is available.'}
                    </UpdateBarText>
                    <UpdateBarActions>
                      <Button variant="primary" size="small" onClick={handleDownloadUpdate}>Download</Button>
                      <Button variant="secondary" size="small" onClick={handleOpenReleaseNotes}>Release Notes</Button>
                      <Button variant="secondary" size="small" onClick={handleDismiss}>Later</Button>
                      <Button variant="secondary" size="small" onClick={handleDisable}>Disable notifications</Button>
                    </UpdateBarActions>
                  </UpdateBar>
                )}
                <Routes>
                  <Route path="/" element={<TimeEntries />} />
                  <Route path="/clients" element={<Clients />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/invoice" element={<Invoice />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/about" element={<About />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </MainContent>
            </ContentWrapper>
          </AppContainer>
        </Router>
      </ToastProvider>
    </TimerProvider>
  </AnimationProvider>
  );
}

export default App;
