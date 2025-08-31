import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Browser shim for electronAPI - only in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && !window.electronAPI) {
  // Dynamically import the browser shim
  import('./browserShim').then(() => {
    console.log('[INDEX] Browser shim loaded for development');
  }).catch(err => {
    console.warn('[INDEX] Could not load browser shim:', err);
  });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
