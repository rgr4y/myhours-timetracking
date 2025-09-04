/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup/test-setup.js'],
    include: ['tests/**/*.test.{js,jsx}'],
    css: true,
    testTimeout: 10000,
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@': resolve(__dirname, './src'),
      '@main': resolve(__dirname, './src/main'),
      '@renderer': resolve(__dirname, './src/renderer/src'),
      electron: resolve(__dirname, './tests/mocks/electron.js'),
      // Ensure tests never load real electron-updater; map to test mock
      'electron-updater': resolve(__dirname, './tests/mocks/electron-updater.js'),
    },
  },
  define: {
    global: 'globalThis',
  },
  esbuild: {
    target: 'node18',
    jsx: 'automatic'
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  }
})
