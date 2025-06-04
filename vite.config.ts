// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/meow/', // <-- set this to your repo name
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});
