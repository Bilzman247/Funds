import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { serverBotManager } from './src/core/server/bot-runner.ts';

const derivProxyPlugin = (): Plugin => ({
  name: 'deriv-api-proxy',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = req.url || '';
      
      // Health endpoint
      if (url === '/api/health') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'ok', app: 'G-Squad' }));
        return;
      }

      // Token proxy
      if (url.startsWith('/api/deriv/token') && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const { code, code_verifier, client_id, redirect_uri } = parsed;

            const params = new URLSearchParams();
            params.set('grant_type', 'authorization_code');
            params.set('client_id', client_id || '33E1sj7WNaMsjg5MAxPyS');
            params.set('code', code);
            params.set('redirect_uri', redirect_uri || 'https://g-squad.buzz');
            params.set('code_verifier', code_verifier);

            const derivRes = await fetch('https://oauth.deriv.com/oauth2/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: params.toString(),
            });

            const data = await derivRes.json();
            res.statusCode = derivRes.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Token exchange failed' }));
          }
        });
        return;
      }

      // Accounts proxy
      if (url.startsWith('/api/deriv/accounts') && req.method === 'GET') {
        try {
          const authHeader = req.headers['authorization'];
          const appId = req.headers['x-deriv-app-id'] || '33E1sj7WNaMsjg5MAxPyS';

          if (!authHeader) {
            res.statusCode = 401;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing Authorization header' }));
            return;
          }

          const derivRes = await fetch('https://api.deriv.com/trading/v1/options/accounts', {
            method: 'GET',
            headers: {
              'Authorization': String(authHeader),
              'Deriv-App-ID': String(appId),
            },
          });

          const data = await derivRes.json();
          res.statusCode = derivRes.status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message || 'Failed to fetch accounts' }));
        }
        return;
      }

      // OTP proxy
      if (url.startsWith('/api/deriv/otp') && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const { account_id, app_id } = parsed;
            const authHeader = req.headers['authorization'];

            if (!authHeader || !account_id) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing account_id or auth header' }));
              return;
            }

            const derivRes = await fetch(`https://api.deriv.com/trading/v1/options/accounts/${account_id}/otp`, {
              method: 'POST',
              headers: {
                'Authorization': String(authHeader),
                'Deriv-App-ID': String(app_id || '33E1sj7WNaMsjg5MAxPyS'),
                'Content-Type': 'application/json',
              },
            });

            const data = await derivRes.json();
            res.statusCode = derivRes.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Failed to fetch OTP' }));
          }
        });
        return;
      }

      // Bot Status Endpoint
      if (url === '/api/bot/status' && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(serverBotManager.getStatus()));
        return;
      }

      // Bot Start Endpoint
      if (url === '/api/bot/start' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const config = JSON.parse(body || '{}');
            const status = await serverBotManager.start(config);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(status));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // Bot Stop Endpoint
      if (url === '/api/bot/stop' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const status = serverBotManager.stop(parsed.reason || 'user_action');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(status));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      next();
    });
  },
});

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      derivProxyPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icon.svg', 'logo.jpg'],
        manifest: {
          id: '/',
          name: 'G-Squad Mobile Trading Bot',
          short_name: 'G-Squad',
          description: 'Real-time mobile synthetic indices automated trading bot with risk management.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,woff,woff2}'],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'core': path.resolve(__dirname, './src/core'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true as const,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
