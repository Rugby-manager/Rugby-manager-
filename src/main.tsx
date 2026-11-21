import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/fonts.css';
import './ui/styles.css';
import './ui/retro.css';

// Instalada como app (GitHub Pages): guarda el juego en el teléfono para abrir sin internet.
if ('serviceWorker' in navigator && location.hostname.endsWith('github.io')) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js').catch(() => undefined));
  void navigator.storage?.persist?.().catch(() => undefined);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
