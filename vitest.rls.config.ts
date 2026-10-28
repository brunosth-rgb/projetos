import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/rls/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
})
