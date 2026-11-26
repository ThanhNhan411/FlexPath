import { defineConfig } from 'vitest/config';

// Kept separate from vite.config.ts so tests do not need the Tailwind/React build plugins.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
