import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'node:https';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'dev-api-proxy',
      configureServer(server) {
        server.middlewares.use('/api/dict', (req, res) => {
          const u = new URL(req.url || '', 'http://localhost');
          const word = u.searchParams.get('word');

          if (!word || !/^[a-zA-Z]+$/.test(word)) {
            res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
            res.end(JSON.stringify(null));
            return;
          }

          const dicts = encodeURIComponent(JSON.stringify({ count: 99, dicts: [['ec', 'blng_sents_part']] }));
          const apiUrl = `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}&le=eng&dicts=${dicts}`;

          https.get(apiUrl, (proxyRes) => {
            let body = '';
            proxyRes.on('data', (chunk: string) => { body += chunk; });
            proxyRes.on('end', () => {
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(body);
            });
          }).on('error', () => {
            res.writeHead(502);
            res.end(JSON.stringify(null));
          });
        });
      },
    },
  ],
  base: './',
  server: {
    port: 3000,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
