import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  test: { include: ['tests/modern/**/*.test.ts'], environment: 'node' },
  build: { chunkSizeWarningLimit: 900 },
});
