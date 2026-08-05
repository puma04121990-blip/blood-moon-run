import { defineConfig } from 'vite';

/**
 * base: './' — relative assets for VK hosting & arbitrary HTTPS paths.
 */
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
    // Allow VK tunnel / ngrok hosts
    allowedHosts: true,
  },
  preview: {
    host: true,
    port: 4173,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 4096,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          vk: ['@vkontakte/vk-bridge'],
        },
      },
    },
  },
});
