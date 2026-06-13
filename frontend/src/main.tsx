import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuthStore } from '@/store/authStore';
import App from './App';
import './index.css';

useAuthStore.getState().hydrateFromToken();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TooltipProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </TooltipProvider>
  </React.StrictMode>,
);
