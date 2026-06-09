import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Fully offline, no external dependencies at runtime.
export default defineConfig({
  plugins: [react()],
  base: './',
})
