import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { CatalogProvider } from './context/CatalogContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { CustomerProvider } from './context/CustomerContext.jsx';
import './index.css';

class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error(error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, fontFamily: 'system-ui', textAlign: 'center' }}>
        <div><h1 style={{ fontSize: 24 }}>Something went wrong</h1><p style={{ color: '#6A4B38' }}>Please refresh the page. If it keeps happening, contact us.</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '10px 22px', borderRadius: 999, background: '#A65F0B', color: '#fff', border: 0, fontWeight: 600 }}>Reload</button></div>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <CatalogProvider>
            <CartProvider>
              <AuthProvider>
                <CustomerProvider>
                  <App />
                </CustomerProvider>
              </AuthProvider>
            </CartProvider>
          </CatalogProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);