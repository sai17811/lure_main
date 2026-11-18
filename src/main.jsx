import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.jsx';
import './styles/base.css';
import './styles/studio.css';
import './styles/three.css';
import './styles/luxe.css';

createRoot(document.getElementById('root')).render(<StrictMode><App/></StrictMode>);

// Offline-capable PWA (production builds only).
if (import.meta.env.PROD) import('virtual:pwa-register').then(({registerSW}) => registerSW({immediate:true})).catch(() => {});
