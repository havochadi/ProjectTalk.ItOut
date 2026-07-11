import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@talkitout/ui': path.resolve(__dirname, '../../packages/ui/src'),
    },
  },
  server: {
    port: 80,
    strictPort: true,
    host: '0.0.0.0',
    // Cloudflare Quick Tunnels use a random trycloudflare.com hostname.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '^/(auth|users|tasks|chat|checkins|pomodoro|risk|metrics|privacy|admin|voice|counselor-messages)(/|$)': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'ws://localhost:4000',
        ws: true,
      },
    },
    headers: {
      'Cache-Control': 'no-store',
    },
  },
});
