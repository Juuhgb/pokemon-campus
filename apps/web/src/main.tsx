import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import './index.css';
import { listenForInstallPrompt } from './features/install/installPrompt.js';

// O aviso de instalação do navegador pode chegar antes da primeira tela.
listenForInstallPrompt();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

