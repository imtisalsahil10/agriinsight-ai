import { parseSseBuffer } from '../lib/sse';
import { DiseaseAnalysis, Message, Source, WeatherData } from '../types';

interface ChatResponse {
  text: string;
  sources?: Source[];
}

interface DiseaseResponse {
  analysis: DiseaseAnalysis | null;
}

async function postGemini<T>(body: unknown): Promise<T> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
      ? data.error
      : 'Failed to get response from AgriInsight.';
    throw new Error(message);
  }
  return data as T;
}

export const getWeather = async (lat: number, lon: number): Promise<WeatherData> => {
  try {
    return await postGemini<WeatherData>({ action: 'weather', lat, lon });
  } catch (error) {
    console.error('Weather fetch error:', error);
    return {
      temp: '--',
      humidity: '--',
      wind: '--',
      condition: 'Unavailable',
      location: 'Location Error',
    };
  }
};

export const generateResponse = async (
  currentPrompt: string,
  history: Message[],
  imageBase64?: string,
  language: string = 'en-US',
): Promise<{ text: string; sources: Source[] }> => {
  const data = await postGemini<ChatResponse>({
    action: 'chat',
    prompt: currentPrompt,
    language,
    image: imageBase64,
    history: history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  });
  return {
    text: data.text,
    sources: data.sources ?? [],
  };
};

export const streamResponse = async (
  currentPrompt: string,
  history: Array<{ role: 'user' | 'model'; content: string }>,
  language: string,
  onDelta: (fullText: string) => void,
  signal?: AbortSignal,
): Promise<{ text: string; sources: Source[] }> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({
      action: 'chat',
      stream: true,
      prompt: currentPrompt,
      language,
      history,
    }),
    signal,
  });

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/event-stream')) {
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof data === 'object' && data && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Failed to get response from AgriInsight.';
      throw new Error(message);
    }
    const payload = data as ChatResponse;
    const text = payload.text ?? '';
    onDelta(text);
    return { text, sources: payload.sources ?? [] };
  }

  if (!response.ok || !response.body) {
    throw new Error('Failed to get response from AgriInsight.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';
  let sources: Source[] = [];
  const applyEvents = (chunk: string): { rest: string } => {
    const parsed = parseSseBuffer(chunk);
    for (const event of parsed.events) {
      if (event.type === 'delta') {
        full += event.text;
        onDelta(full);
      } else if (event.type === 'done') {
        full = event.text || full;
        sources = event.sources;
        onDelta(full);
      } else {
        throw new Error(event.message);
      }
    }
    return { rest: parsed.rest };
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = applyEvents(buffer);
      buffer = parsed.rest;
    }
    buffer += decoder.decode();
    if (buffer.trim()) applyEvents(`${buffer}\n\n`);
  } finally {
    reader.releaseLock();
  }

  if (!full) throw new Error('Failed to get response from AgriInsight.');
  return { text: full, sources };
};

export const analyzeDiseaseFromImage = async (imageBase64: string): Promise<DiseaseAnalysis | null> => {
  try {
    const data = await postGemini<DiseaseResponse>({ action: 'disease', image: imageBase64 });
    return data.analysis;
  } catch (error) {
    console.error('Disease analysis error:', error);
    return null;
  }
};
