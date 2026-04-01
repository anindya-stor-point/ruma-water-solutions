import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { safeError } from './firebase';
import { Capacitor } from '@capacitor/core';

// Global error handlers to catch and log errors safely
window.onerror = (message, source, lineno, colno, error) => {
  safeError("Global error caught:", { message, source, lineno, colno, error });
};

window.onunhandledrejection = (event) => {
  safeError("Unhandled promise rejection:", event.reason);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
