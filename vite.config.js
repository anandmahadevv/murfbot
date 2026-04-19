import { defineConfig } from 'vite'

/**
 * Vite Configuration for VoxAI
 * 
 * Handles frontend serving, backend proxying for API requests,
 * and build output management.
 */
export default defineConfig({
  // Base directory for frontend source
  root: 'frontend',
  
  server: {
    port: 3000,
    open: true,
    proxy: {
      // Proxy all /api calls to Flask backend to avoid CORS issues during development
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  
  build: {
    // Generate build files in the root dist folder
    outDir: '../dist',
    emptyOutDir: true,
  }
})
