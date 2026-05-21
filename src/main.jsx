import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// This is the React entry point. Vite loads it from index.html and mounts the
// application into the `<div id="root">` element.
createRoot(document.getElementById('root')).render(
  // StrictMode intentionally double-invokes some development lifecycle paths so
  // side effects are easier to catch before production.
  <StrictMode>
    <App />
  </StrictMode>,
)
