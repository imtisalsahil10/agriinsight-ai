export interface ApiResult {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
  stream?: AsyncIterable<unknown>;
}

export interface ResultSink {
  setStatus(code: number): void;
  setHeader(name: string, value: string): void;
  write(chunk: string): void;
  end(): void;
  json(body: unknown): void;
  flush?(): void;
}

export function clientIp(
  headers: Record<string, string | string[] | undefined>,
  fallback?: string | null,
): string {
  const forwarded = headers['x-forwarded-for'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const first = raw?.split(',')[0]?.trim();
  if (first) return first;
  return fallback || 'unknown';
}

export async function emitResult(result: ApiResult, sink: ResultSink, signal?: AbortSignal): Promise<void> {
  sink.setStatus(result.status);
  sink.setHeader('Cache-Control', 'no-store');
  if (result.headers) {
    for (const [name, value] of Object.entries(result.headers)) {
      sink.setHeader(name, value);
    }
  }

  if (!result.stream) {
    sink.setHeader('Content-Type', 'application/json; charset=utf-8');
    sink.json(result.body);
    return;
  }

  sink.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  sink.setHeader('X-Accel-Buffering', 'no');
  sink.flush?.();
  try {
    for await (const event of result.stream) {
      if (signal?.aborted) break;
      sink.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  } catch (error) {
    if (!signal?.aborted) {
      console.error(JSON.stringify({
        route: 'gemini',
        action: 'chat-stream',
        message: safeErrorMessage(error, process.env.GEMINI_API_KEY),
      }));
      const message = error instanceof Error && error.message === 'GEMINI_API_KEY is not configured'
        ? 'GEMINI_API_KEY is not configured'
        : 'Gemini request failed';
      sink.write(`data: ${JSON.stringify({ type: 'error', message })}\n\n`);
    }
  }
  sink.end();
}

export function safeErrorMessage(error: unknown, secret?: string): string {
  const raw = error instanceof Error ? error.message : 'Unknown error';
  if (!secret) return raw;
  return raw.split(secret).join('[redacted]');
}
