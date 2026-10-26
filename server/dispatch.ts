import { notifySummary, syncFarm, twilioVoice } from './extras';
import { geminiRequestSchema } from './schemas';
import { analyzeDisease, generateChat, generateChatStream, getWeather } from './gemini';
import { createLiveToken } from './liveToken';
import { GEMINI_LIMIT, LIVE_TOKEN_LIMIT, rateLimit } from './rateLimit';
import { safeErrorMessage, type ApiResult } from './http';

export type ApiRoute = 'gemini' | 'live-token' | 'farm' | 'notify' | 'twilio-voice';

function limited(retryAfterSec: number): ApiResult {
  return {
    status: 429,
    body: { error: 'Too many requests. Try again shortly.' },
    headers: { 'Retry-After': String(retryAfterSec) },
  };
}

function missingKey(error: unknown): boolean {
  return error instanceof Error && error.message === 'GEMINI_API_KEY is not configured';
}

export async function dispatch(route: ApiRoute, method: string | undefined, ip: string, body: unknown, signal?: AbortSignal): Promise<ApiResult> {
  const started = Date.now();
  if (method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } };
  }

  const rule = route === 'live-token' ? LIVE_TOKEN_LIMIT : GEMINI_LIMIT;
  if (route === 'farm' || route === 'notify' || route === 'twilio-voice') {
    const decision = rateLimit(`${route}:${ip}`, rule);
    if (!decision.ok) return limited(decision.retryAfterSec);
    if (route === 'farm') return syncFarm(body);
    if (route === 'notify') return notifySummary(body);
    return twilioVoice();
  }
  const decision = rateLimit(`${route}:${ip}`, rule);
  if (!decision.ok) {
    return limited(decision.retryAfterSec);
  }

  try {
    if (route === 'live-token') {
      const token = await createLiveToken();
      log(route, 'create', 200, started);
      return { status: 200, body: token };
    }

    const parsed = geminiRequestSchema.safeParse(body);
    if (!parsed.success) {
      log(route, 'invalid', 400, started);
      return { status: 400, body: { error: 'Invalid request' } };
    }

    if (parsed.data.action === 'weather') {
      const weather = await getWeather(parsed.data.lat, parsed.data.lon);
      log(route, 'weather', 200, started);
      return { status: 200, body: weather };
    }

    if (parsed.data.action === 'disease') {
      const analysis = await analyzeDisease(parsed.data.image);
      log(route, 'disease', 200, started);
      return { status: 200, body: { analysis } };
    }

    if (parsed.data.stream) {
      log(route, 'chat-stream', 200, started);
      return { status: 200, body: { stream: true }, stream: generateChatStream(parsed.data, signal) };
    }

    const chat = await generateChat(parsed.data);
    log(route, 'chat', 200, started);
    return { status: 200, body: chat };
  } catch (error) {
    const status = missingKey(error) ? 500 : 502;
    const message = missingKey(error)
      ? 'GEMINI_API_KEY is not configured'
      : 'Gemini request failed';
    console.error(JSON.stringify({
      route,
      status,
      message: safeErrorMessage(error, process.env.GEMINI_API_KEY),
      durationMs: Date.now() - started,
    }));
    return { status, body: { error: message } };
  }
}

function log(route: ApiRoute, action: string, status: number, started: number): void {
  console.info(JSON.stringify({
    route,
    action,
    status,
    durationMs: Date.now() - started,
  }));
}
