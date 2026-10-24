import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { applyThemePreference } from '@/app/theme'
import { loadThemePreference } from '@/data/theme'

// Apply the theme before the first render to avoid a flash of the wrong palette.
applyThemePreference(loadThemePreference())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
