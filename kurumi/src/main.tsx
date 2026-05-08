import React from 'react'
import ReactDOM from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import App from './App'
import './styles/globals.css'
import './styles/glass.css'
import './styles/animations.css'
import './styles/fonts.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MemoryRouter>
      <App />
    </MemoryRouter>
  </React.StrictMode>
)
