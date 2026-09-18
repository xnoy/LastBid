import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { queryClient } from './lib/queryClient';
import { AuthProvider } from './store/AuthContext';
import { ThemeProvider } from './store/ThemeContext';
import { ToastProvider } from './store/ToastContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
