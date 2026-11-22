import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Registrasi Service Worker PWA dengan auto-update
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('Versi baru PilMate tersedia.');
  },
  onOfflineReady() {
    console.log('PilMate siap digunakan secara offline!');
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

