import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const webRoot = fileURLToPath(new URL('./web', import.meta.url));

export default defineConfig(({ mode }) => ({
  root: webRoot,
  publicDir: false,
  plugins: [react()],
  resolve: {
    alias: [{ find: /^react-native$/, replacement: 'react-native-web' }],
    extensions: [
      '.web.tsx',
      '.web.ts',
      '.web.jsx',
      '.web.js',
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.json',
    ],
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    exclude: ['react-native-safe-area-context', '@react-native-async-storage/async-storage'],
  },
  define: {
    __DEV__: JSON.stringify(mode !== 'production'),
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(mode),
  },
  server: {
    port: 4200,
    host: 'localhost',
    strictPort: true,
  },
  preview: {
    port: 4200,
  },
  build: {
    outDir: fileURLToPath(new URL('./dist-web', import.meta.url)),
    emptyOutDir: true,
  },
}));
