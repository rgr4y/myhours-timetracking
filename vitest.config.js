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
    alias: {
      '@': resolve(__dirname, './src'),
      '@renderer': resolve(__dirname, './src/renderer/src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  esbuild: {
    target: 'node18',
    jsx: 'automatic'
  }
})