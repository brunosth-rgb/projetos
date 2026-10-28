/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { assertSupabaseEnv } from './build/assertEnv.ts'

export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') {
    assertSupabaseEnv({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env })
  }
  return {
    base: process.env.VITE_BASE ?? '/',
    plugins: [react(), tailwindcss()],
    test: {
      environment: 'jsdom',
      setupFiles: ['tests/setup.ts'],
      exclude: ['node_modules/**', 'dist/**', 'tests/rls/**'],
    },
  }
})
