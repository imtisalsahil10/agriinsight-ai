import { dispatch } from '../server/dispatch';
import { clientIp, emitResult } from '../server/http';

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string | null };
  on?(event: 'close', listener: () => void): void;
}

interface ApiResponse {
  statusCode?: number;
  writableEnded?: boolean;
  status(code: number): { json(body: unknown): void };
  setHeader(name: string, value: string): void;
  write?(chunk: string): void;
  end?(chunk?: string): void;
  on?(event: 'close', listener: () => void): void;
  flushHeaders?(): void;
}

export const maxDuration = 60;

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const abort = new AbortController();
  res.on?.('close', () => {
    if (!res.writableEnded) abort.abort();
  });
  const result = await dispatch(
    'gemini',
    req.method,
    clientIp(req.headers, req.socket?.remoteAddress),
    req.body,
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
      res.write?.(chunk);
    },
    end() {
      res.end?.();
    },
    json(body) {
      res.status(result.status).json(body);
    },
    flush() {
      res.flushHeaders?.();
    },
  }, abort.signal);
}
