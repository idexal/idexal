import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { gatewayProxy } from './scripts/gateway-proxy'

export default defineConfig({
  plugins: [react(), gatewayProxy()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
})
