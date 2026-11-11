import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './index.css'
import './i18n'
import App from './App.tsx'
import { captureSource } from './lib/source'
import { applyTheme, getTheme } from './lib/theme'

applyTheme(getTheme())
captureSource()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
