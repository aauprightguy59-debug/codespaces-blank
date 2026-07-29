import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/codespaces-blank/' : '/',
  server: {
    host: '0.0.0.0',
    allowedHosts: ['equiai-nexus.loca.lt', 'soft-bobcat-47.loca.lt', 'localhost', '127.0.0.1'],
  },
});
