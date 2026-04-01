import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { safeError } from './firebase';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';

// Initialize Google Auth only for web (Native uses capacitor.config.ts and strings.xml)
if (Capacitor.getPlatform() === 'web') {
  GoogleAuth.initialize({
    clientId: '449552278886-2k7dgm73hr8svsprlhb2sm6iuuq04htj.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
}

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
