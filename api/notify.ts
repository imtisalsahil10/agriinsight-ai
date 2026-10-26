import { dispatch } from '../server/dispatch';
import { clientIp, emitResult } from '../server/http';

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string | null };
}

interface ApiResponse {
  statusCode?: number;
  status(code: number): { json(body: unknown): void };
  setHeader(name: string, value: string): void;
  write?(chunk: string): void;
  end?(chunk?: string): void;
  flushHeaders?(): void;
}

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const result = await dispatch('notify', req.method, clientIp(req.headers, req.socket?.remoteAddress), req.body);
  await emitResult(result, {
    setStatus(code) { res.statusCode = code; },
    setHeader(name, value) { res.setHeader(name, value); },
    write(chunk) { res.write?.(chunk); },
    end() { res.end?.(); },
    json(body) { res.status(result.status).json(body); },
    flush() { res.flushHeaders?.(); },
  });
}
