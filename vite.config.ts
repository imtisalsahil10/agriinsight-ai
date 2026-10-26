import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { dispatch, type ApiRoute } from './server/dispatch';
import { clientIp, emitResult } from './server/http';
import { readJsonBody } from './server/readBody';

function apiDevPlugin(): Plugin {
  return {
    name: 'agriinsight-api',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const key of [
        'GEMINI_API_KEY',
        'UPSTASH_REDIS_REST_URL',
        'UPSTASH_REDIS_REST_TOKEN',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'PHONE_CALL_ENABLED',
        'WHATSAPP_SUMMARY_ENABLED',
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_PHONE_NUMBER',
        'TWILIO_WHATSAPP_FROM',
      ]) {
        if (env[key]) process.env[key] = env[key];
      }

      const routes: Record<string, ApiRoute> = {
        '/api/gemini': 'gemini',
        '/api/live-token': 'live-token',
        '/api/farm': 'farm',
        '/api/notify': 'notify',
        '/api/twilio/voice': 'twilio-voice',
      };

      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] ?? '';
        const route = routes[url];
        if (!route) {
          next();
          return;
        }
        const abort = new AbortController();
        res.on('close', () => {
          if (!res.writableEnded) abort.abort();
        });
        try {
          const body = req.method === 'POST' ? await readJsonBody(req) : {};
          const result = await dispatch(
            route,
            req.method,
            clientIp(req.headers, req.socket.remoteAddress),
            body,
            abort.signal,
          );
          await emitResult(result, {
            setStatus(code) {
              res.statusCode = code;
            },
            setHeader(name, value) {
              res.setHeader(name, value);
            },
            write(chunk) {
              res.write(chunk);
            },
            end() {
              res.end();
            },
            json(payload) {
              res.end(JSON.stringify(payload));
            },
            flush() {
              res.flushHeaders();
            },
          }, abort.signal);
        } catch (error) {
          const tooLarge = error instanceof Error && error.message === 'Payload too large';
          res.statusCode = tooLarge ? 413 : 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: tooLarge ? 'Payload too large' : 'Invalid JSON' }));
        }
      });
    },
  };
}

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), apiDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
