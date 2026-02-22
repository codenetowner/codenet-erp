import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/' : '/Catalystdriver/',
  server: {
    port: 3002,
    host: true, // Allow access from network
    proxy: {
      '/api': {
        target: 'http://localhost:5227',
        changeOrigin: true
      }
    }
  }
}))
