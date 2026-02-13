import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './ErrorBoundary';

function renderPlainError(message, stack) {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <div style="padding:24px;font-family:system-ui,Arial;color:#111">
      <h2 style="color:#b91c1c">A fatal error occurred</h2>
      <p>${String(message).replace(/</g, '&lt;')}</p>
      <pre style="white-space:pre-wrap;margin-top:12px;background:#f8f8f8;padding:12px;border-radius:6px">${String(stack || '')}</pre>
      <div style="margin-top:12px"><button onclick="location.reload()" style="padding:8px 12px;border-radius:6px">Reload</button></div>
    </div>
  `;
}

// Global handlers for errors that occur before React mounts (import-time errors)
window.addEventListener('error', (ev) => {
  try {
    renderPlainError(ev.message || 'Unknown error', ev.error?.stack || ev.filename + ':' + ev.lineno + ':' + ev.colno);
  } catch (e) {
    // ignore
  }
});

window.addEventListener('unhandledrejection', (ev) => {
  try {
    const reason = ev.reason;
    renderPlainError(reason?.message || String(reason), reason?.stack || '');
  } catch (e) {
    // ignore
  }
});

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} catch (err) {
  renderPlainError(err?.message || String(err), err?.stack || '');
}