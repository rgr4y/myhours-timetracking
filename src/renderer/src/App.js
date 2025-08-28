import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';
import './App.css';
import { TimerProvider } from './context/TimerContext';
import Sidebar from './components/Sidebar';
import Timer from './components/Timer';
import TimeEntries from './components/TimeEntries';
import Projects from './components/Projects';
import Reports from './components/Reports';
import Settings from './components/Settings';
import Invoice from './components/Invoice';

const GlobalStyle = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    background-color: #1a1a1a;
    color: #ffffff;
    overflow: hidden;
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
  display: flex;
  height: 100vh;
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

function App() {
  return (
    <TimerProvider>
      <Router>
        <GlobalStyle />
        <AppContainer>
          <Sidebar />
          <MainContent>
            <Routes>
              <Route path="/" element={<Timer />} />
              <Route path="/entries" element={<TimeEntries />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/invoice" element={<Invoice />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </MainContent>
        </AppContainer>
      </Router>
    </TimerProvider>
  );
}

export default App;
