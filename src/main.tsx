import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installLocalApi } from './lib/localApi';

// On Android (native), serve /api/* locally: on-device storage + Alpine execution.
installLocalApi();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
