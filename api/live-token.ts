import { dispatch } from '../server/dispatch';
import { clientIp } from '../server/http';

interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string | null };
}

interface ApiResponse {
  status(code: number): { json(body: unknown): void };
  setHeader(name: string, value: string): void;
}

export const maxDuration = 15;

export default async function handler(req: ApiRequest, res: ApiResponse): Promise<void> {
  const result = await dispatch(
    'live-token',
    req.method,
    clientIp(req.headers, req.socket?.remoteAddress),
    req.body,
  );
  res.setHeader('Cache-Control', 'no-store');
  if (result.headers) {
    for (const [name, value] of Object.entries(result.headers)) {
      res.setHeader(name, value);
    }
  }
  res.status(result.status).json(result.body);
}
