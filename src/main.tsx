import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DuckDBProvider } from './db/DuckDBProvider'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DuckDBProvider>
      <App />
    </DuckDBProvider>
  </StrictMode>,
)
