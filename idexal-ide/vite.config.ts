import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
    }),
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      'monaco-editor': path.resolve(__dirname, 'node_modules/monaco-editor'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable source maps for production
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'react-vendor': ['react', 'react-dom'],
          
          // Editor
          'monaco': ['@monaco-editor/react', 'monaco-editor'],
          
          // Terminal
          'xterm': ['@xterm/xterm', '@xterm/addon-fit'],
          
          // State management
          'zustand': ['zustand'],
          
          // Icons
          'icons': ['react-icons'],
          
          // Utilities
          'utils': ['clsx'],
        },
        // Optimize chunk naming
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Enable chunk size warnings
    chunkSizeWarningLimit: 100,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'zustand', 'clsx', 'monaco-editor'],
  },
})