import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

const proxy = { '/api': { target: process.env.THINKTREE_API_URL || 'http://127.0.0.1:8000', changeOrigin: true } };
const host = process.env.THINKTREE_UI_HOST || '127.0.0.1';
const port = Number.parseInt(process.env.PORT || '8443', 10);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { host, port, strictPort: true, proxy },
  preview: { host, port, strictPort: true, proxy },
});
