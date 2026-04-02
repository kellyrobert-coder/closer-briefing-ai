import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { LeadsProvider } from './contexts/LeadsContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <LeadsProvider>
        <App />
      </LeadsProvider>
    </HashRouter>
  </StrictMode>,
)
