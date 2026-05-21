import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite config stays intentionally small for now. The React plugin enables JSX,
// Fast Refresh during development, and production transforms for React.
export default defineConfig({
  plugins: [react()],
})
