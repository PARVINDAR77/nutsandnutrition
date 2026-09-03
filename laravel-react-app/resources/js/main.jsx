import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AutoRefreshProvider } from './context/AutoRefreshContext'

createRoot(document.getElementById('app')).render(
  <StrictMode>
    <AutoRefreshProvider interval={15000}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AutoRefreshProvider>
  </StrictMode>,
)
