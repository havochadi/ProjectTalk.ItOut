import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const checkForAppUpdate = async () => {
  try {
    const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
    baseUrl.searchParams.set('__fresh', Date.now().toString());
    const response = await fetch(baseUrl, { cache: 'no-store' });
    if (!response.ok) return;
    const html = await response.text();
    const entrySource = html.match(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i)?.[1];
    if (!entrySource) return;

    const latestEntry = new URL(entrySource, window.location.origin).pathname;
    const runningEntry = new URL(import.meta.url).pathname;
    if (latestEntry !== runningEntry) {
      const freshUrl = new URL(window.location.href);
      freshUrl.searchParams.set('__app_version', Date.now().toString());
      window.location.replace(freshUrl.toString());
    }
  } catch {
    // Staying on the current version is safer than interrupting the app when
    // the update check is temporarily unavailable.
  }
};

void checkForAppUpdate();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void checkForAppUpdate();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
