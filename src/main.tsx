import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

// Global fetch interceptor to attach JWT token and handle 401 Unauthorized globally
const originalFetch = window.fetch;
window.fetch = async (resource: any, config: any = {}) => {
  try {
    let url = typeof resource === 'string' ? resource : (resource?.url || '');
    if (typeof url === 'string' && url.startsWith('/api/')) {
      const token = sessionStorage.getItem('epos_token') || localStorage.getItem('epos_token');
      if (token) {
        if (config?.headers instanceof Headers) {
          if (!config.headers.has('Authorization')) {
            config.headers.set('Authorization', `Bearer ${token}`);
          }
        } else {
          config = config || {};
          config.headers = {
            ...config.headers,
            'Authorization': `Bearer ${token}`
          };
        }
      }
    }

    const response = await originalFetch(resource, config);
    if (response.status === 401 && typeof url === 'string' && !url.includes('/api/auth/login') && !url.includes('/api/auth/me')) {
      try {
        sessionStorage.clear();
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
          if (k.startsWith('epos_') && k !== 'theme') {
            localStorage.removeItem(k);
          }
        });
        localStorage.removeItem('token');
      } catch (e) {}
      window.location.replace('/');
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
