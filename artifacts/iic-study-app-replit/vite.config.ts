import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import http from 'http';
import https from 'https';
import { URL } from 'url';

const port = Number(process.env.PORT) || 3000;
const basePath = process.env.BASE_PATH || '/';

function mediaProxyPlugin() {
  return {
    name: 'media-proxy-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/media-proxy', (req: any, res: any) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        const parsedReqUrl = new URL(req.url, 'http://localhost');
        const targetUrl = parsedReqUrl.searchParams.get('url');

        if (!targetUrl) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: "Missing 'url' query param" }));
          return;
        }

        const streamRemote = (streamUrl: string, redirectHops = 0) => {
          if (redirectHops > 6) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'Too many redirects' }));
            return;
          }

          let parsedTarget: URL;
          try {
            parsedTarget = new URL(streamUrl);
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'Invalid URL' }));
            return;
          }

          const client = parsedTarget.protocol === 'https:' ? https : http;
          const headers: Record<string, string> = {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: '*/*',
          };
          if (req.headers.range) {
            headers['Range'] = req.headers.range;
          }

          const clientReq = client.get(parsedTarget.toString(), { headers, timeout: 30000 }, (remoteRes) => {
            if (
              remoteRes.statusCode &&
              [301, 302, 303, 307, 308].includes(remoteRes.statusCode) &&
              remoteRes.headers.location
            ) {
              let loc = remoteRes.headers.location;
              if (!loc.startsWith('http')) {
                loc = new URL(loc, parsedTarget.origin).toString();
              }
              remoteRes.resume();
              return streamRemote(loc, redirectHops + 1);
            }

            res.statusCode = remoteRes.statusCode || 200;
            if (remoteRes.headers['content-type']) res.setHeader('Content-Type', remoteRes.headers['content-type']);
            if (remoteRes.headers['content-length']) res.setHeader('Content-Length', remoteRes.headers['content-length']);
            if (remoteRes.headers['content-range']) res.setHeader('Content-Range', remoteRes.headers['content-range']);
            if (remoteRes.headers['accept-ranges']) res.setHeader('Accept-Ranges', remoteRes.headers['accept-ranges']);

            remoteRes.pipe(res);
          });

          clientReq.on('error', (err) => {
            if (!res.headersSent) {
              res.statusCode = 502;
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        };

        // Handle Google drive url transformation
        let effectiveUrl = targetUrl;
        if (effectiveUrl.includes('drive.google.com') && !effectiveUrl.includes('confirm=')) {
          const match = effectiveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || effectiveUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
            effectiveUrl = `https://drive.google.com/uc?export=download&id=${match[1]}&confirm=t`;
          }
        }

        streamRemote(effectiveUrl);
      });
    },
  };
}

function notificationApiPlugin() {
  return {
    name: 'notification-api-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/notifications/push', (_req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, method: 'rtdb_pipeline' }));
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    mediaProxyPlugin(),
    notificationApiPlugin(),
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
      ],
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
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
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
        ],
      },
      injectManifest: {
        globIgnores: ['**/*.map'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
    }),
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
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.API_SERVER_URL || 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
