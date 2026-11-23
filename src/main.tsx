import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { AvisoVersion } from './ui/AvisoVersion';
import './ui/fonts.css';
import './ui/styles.css';
import './ui/retro.css';

// Instalada como app (GitHub Pages): guarda el juego en el teléfono para abrir sin internet.
if ('serviceWorker' in navigator && location.hostname.endsWith('github.io')) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('./sw.js').catch(() => undefined));
  // En el iPhone la app queda abierta días: cada vez que vuelve a la pantalla, busca si hay versión nueva.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void navigator.serviceWorker.getRegistration().then((r) => r?.update()).catch(() => undefined);
  });
  // Cuando la versión nueva ya está lista, se avisa con un cartel para recargar.
  let habia = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (habia) window.dispatchEvent(new Event('rm-actualizar'));
    habia = true;
  });
  void navigator.storage?.persist?.().catch(() => undefined);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <AvisoVersion />
  </StrictMode>,
);
