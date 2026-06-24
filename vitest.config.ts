import { defineConfig } from 'vitest/config'

// El núcleo de simulación es headless (sin Three.js ni DOM): basta el entorno node.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
