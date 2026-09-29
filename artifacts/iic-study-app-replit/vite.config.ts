import path from 'path';
import fs from 'fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { telegramProxyPlugin } from './telegramProxyPlugin';

function injectPushNotificationToSWPlugin() {
  let resolvedOutDir = path.resolve(import.meta.dirname, '../../dist');
  return {
    name: 'inject-push-notification-to-sw',
    apply: 'build' as const,
    configResolved(config: any) {
      if (config.build?.outDir) {
        resolvedOutDir = path.resolve(config.root || import.meta.dirname, config.build.outDir);
      }
    },
    closeBundle() {
      try {
        const swLocations = [
          path.resolve(resolvedOutDir, 'sw.js'),
          path.resolve(import.meta.dirname, '../../dist/sw.js'),
          path.resolve(import.meta.dirname, 'dist/sw.js'),
        ];
        const pushSnippet = `
// --- PWABuilder & Web Push Notification Handler ---
self.addEventListener('push', (event) => {
  let title = 'NSTA';
  let body = 'New update available';
  let icon = '/icons/icon-192.png';
  let badge = '/favicon.svg';
  let data = {};
  if (event.data) {
    try {
      const json = event.data.json();
      data = json;
      title = json.notification?.title || json.data?.title || json.title || title;
      body = json.notification?.body || json.data?.body || json.body || body;
      icon = json.notification?.icon || json.data?.icon || icon;
    } catch (_) {
      body = event.data.text() || body;
    }
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
`;
        for (const targetPath of swLocations) {
          if (fs.existsSync(targetPath)) {
            const swContent = fs.readFileSync(targetPath, 'utf-8');
            if (!swContent.includes("self.addEventListener('push'")) {
              fs.appendFileSync(targetPath, pushSnippet, 'utf-8');
              console.log('[injectPushNotificationToSWPlugin] Appended push listener to:', targetPath);
            }
          }
        }
      } catch (err) {
        console.warn('[injectPushNotificationToSWPlugin] Error:', err);
      }
    }
  };
}

const port = 3000;
const basePath = process.env.BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  plugins: [
    telegramProxyPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: false },
      includeAssets: [
        'favicon.svg',
        'branding/nsta-logo.png',
        'icons/apple-touch-icon.png',
        'icons/icon-192.png',
        'icons/icon-512.png',
        'icons/icon-maskable-512.png',
        'firebase-messaging-sw.js',
      ],
      manifest: {
        name: 'NSTA',
        short_name: 'NSTA',
        description:
          'Comprehensive learning platform with syllabus, notes, audio studio, MCQs, and student progress tracking.',
        theme_color: '#030717',
        background_color: '#030717',
        display: 'standalone',
        orientation: 'portrait',
        start_url: basePath,
        scope: basePath,
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globIgnores: ['**/*.map'],
        skipWaiting: true,
        clientsClaim: true,
        importScripts: ['firebase-messaging-sw.js'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
    injectPushNotificationToSWPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  esbuild: {
    jsx: 'automatic',
  },
  build: {
    outDir: path.resolve(import.meta.dirname, '../../dist'),
    emptyOutDir: true,
    reportCompressedSize: false,
    sourcemap: false,
    minify: 'esbuild',
    target: 'esnext',
    rollupOptions: {
      maxParallelFileOps: 2,
      cache: false,
      onwarn(warning, warn) {
        if (
          warning.code === 'MODULE_LEVEL_DIRECTIVE' ||
          (typeof warning.message === 'string' &&
            (warning.message.includes('Module level directives cause errors when bundled') ||
             warning.message.includes('"use client"')))
        ) {
          return;
        }
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) return 'vendor-three';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react-pdf') || id.includes('pdfjs-dist')) return 'vendor-pdf';
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('jszip')) return 'vendor-export';
            if (id.includes('firebase')) return 'vendor-firebase';
            if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts';
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    fs: {
      strict: false,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});

