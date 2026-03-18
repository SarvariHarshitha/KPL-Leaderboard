import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { KplProvider } from './lib/KplProvider.jsx'
import { AuthProvider } from './lib/AuthProvider.jsx'
import { ensureServiceWorker } from './lib/pwa.js'

ensureServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <KplProvider>
          <App />
        </KplProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
