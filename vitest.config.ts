import path from 'node:path'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { silenceMissingSourcemapWarnings } from './src/vite/silenceMissingSourcemapWarnings.ts'

export default defineConfig({
  plugins: [vue(), silenceMissingSourcemapWarnings()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    include: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts',
    ],
  },
})
