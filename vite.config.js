import { defineConfig } from 'vite'

export default defineConfig({
  root: 'frontend',
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy all /api calls to Flask backend
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  }
})
