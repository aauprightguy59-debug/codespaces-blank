import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/codespaces-blank/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['equiai-nexus.loca.lt', 'soft-bobcat-47.loca.lt', 'localhost'],
  }
});
