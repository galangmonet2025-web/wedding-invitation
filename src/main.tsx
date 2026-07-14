import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './core/i18n/config';
import { purgeLegacyStorageBlobs } from './shared/utils/safeStorage';

// Bersihkan sisa base64/cache tema dari build lama yang memenuhi kuota
// localStorage (~5MB) sebelum app menulis preferensi kecil apa pun.
purgeLegacyStorageBlobs();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
