import { GoogleGenAI, type GenerateContentResponse } from '@google/genai';
import type { ChatStreamEvent } from '../lib/sse';
import type { DiseaseAnalysis, Source, WeatherData } from '../types';
import type { GeminiRequest } from './schemas';
import { safeErrorMessage } from './http';

const MODEL = 'gemini-3.8-flash';

const unavailableWeather = (condition: string, location: string): WeatherData => ({
  temp: '--',
  humidity: '--',
  wind: '--',
  condition,
  location,
});

function requireApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return apiKey;
}

function client(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: requireApiKey() });
}

function parseJsonObject(text: string): unknown {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function splitDataUrl(image: string): { mimeType: string; data: string } {
  const [meta, payload] = image.split(',');
  const mimeMatch = meta?.match(/data:(.*?);base64/);
  return {
    mimeType: mimeMatch?.[1] || 'image/jpeg',
    data: payload || image,
  };
}

/** Retired for the dashboard. The dashboard calls Open-Meteo directly. This remains for older /api/gemini weather requests. */
export async function getWeather(lat: number, lon: number): Promise<WeatherData> {
  try {
    const prompt = `Get the current weather for latitude ${lat}, longitude ${lon}.
    You rely on Google Search to find this information.

    CRITICAL OUTPUT RULE: Return ONLY a raw JSON object. Do not include Markdown formatting like \`\`\`json or \`\`\`. Do not include any introductory text.

    JSON Schema:
    {
      "temp": "Temperature in Celsius (e.g. 24)",
      "humidity": "Humidity percentage (e.g. 65)",
      "wind": "Wind speed in km/h (e.g. 15)",
      "condition": "Short condition (e.g. Sunny)",
      "location": "City/Region name"
    }`;

    const response = await client().models.generateContent({
      model: MODEL,
      contents: { role: 'user', parts: [{ text: prompt }] },
      config: { tools: [{ googleSearch: {} }] },
    });

    const parsed = asRecord(parseJsonObject(response.text || ''));
    if (!parsed) {
      return unavailableWeather('Unavailable', 'Unknown Location');
    }
    return {
      temp: asString(parsed.temp, '--'),
      humidity: asString(parsed.humidity, '--'),
      wind: asString(parsed.wind, '--'),
      condition: asString(parsed.condition, 'Unknown'),
      location: asString(parsed.location, 'Unknown Location'),
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'GEMINI_API_KEY is not configured') {
      throw error;
    }
    const message = safeErrorMessage(error, process.env.GEMINI_API_KEY);
    const isRateLimit = message.includes('Quota exceeded') || message.includes('RESOURCE_EXHAUSTED') || message.includes('Too Many Requests');
    console.error(JSON.stringify({ route: 'gemini', action: 'weather', message }));
    return unavailableWeather(
      isRateLimit ? 'Rate limit exceeded' : 'Unavailable',
      isRateLimit ? 'Try again later' : 'Location Error',
    );
  }
}

function mergeSources(current: Source[], next: Source[]): Source[] {
  if (next.length === 0) return current;
  const seen = new Set(current.map((source) => source.uri));
  const merged = [...current];
  for (const source of next) {
    if (seen.has(source.uri)) continue;
    seen.add(source.uri);
    merged.push(source);
  }
  return merged;
}

function collectSources(response: GenerateContentResponse): Source[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!chunks) return [];
  const sources: Source[] = [];
  for (const chunk of chunks) {
    const web = chunk.web;
    if (web?.uri) {
      sources.push({ title: web.title || 'Source', uri: web.uri });
    }
  }
  return sources;
}

type ChatInput = Extract<GeminiRequest, { action: 'chat' }>;

function buildChatRequest(input: ChatInput, signal?: AbortSignal) {
  const language = input.language || 'en-US';
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (input.image) {
    const { mimeType, data } = splitDataUrl(input.image);
    if (!data) throw new Error('Image payload was empty');
    parts.push({ inlineData: { mimeType, data } });
    parts.push({
      text: input.prompt.trim().length < 5
        ? 'Analyze this image related to agriculture. Identify any plants, diseases, pests, or deficiencies and recommend treatments.'
        : input.prompt,
    });
  } else {
    if (!input.prompt.trim()) throw new Error('Prompt is empty');
    parts.push({ text: input.prompt });
  }

  const history = (input.history || [])
    .filter((message) => message.content.trim().length > 0)
    .map((message) => ({
      role: message.role,
      parts: [{ text: message.content }],
    }));

  const systemInstruction = `You are AgriInsight, an expert agricultural consultant.
    Your goal is to help farmers with crop management, disease identification, pest control, weather interpretation, and soil health.
    Provide practical, scientific, yet easy-to-understand advice.

    Language Instruction: The user is currently operating in ${language === 'hi-IN' ? 'Hindi' : 'English'} mode.
    If the user writes or speaks in Hindi, you MUST reply in Hindi (Devanagari script).
    If the user writes in English, reply in English.

    Special Service - YouTube Analysis:
    If the user provides a YouTube video link, use the 'googleSearch' tool to find information about the video (title, description, key topics, transcript summaries).
    Extract the specific farming advice, techniques, or product recommendations from the video content.
    Even if the video is in English, if the user's language mode is Hindi, translate the insights into Hindi.

    Special Service - Translator:
    If the user asks to translate text, provide a direct and accurate translation preserving agricultural terminology.
    Do not add conversational filler. Just provide the translation.

    When analyzing plant images, be specific about diagnosis and suggest both organic and chemical remedies.
    Format your responses with Markdown.`;

  return {
    model: MODEL,
    contents: [...history, { role: 'user', parts }],
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }],
      abortSignal: signal,
    },
  };
}

export async function generateChat(input: ChatInput): Promise<{ text: string; sources: Source[] }> {
  const response = await client().models.generateContent(buildChatRequest(input));
  return {
    text: response.text || "I couldn't generate a response. Please try again.",
    sources: collectSources(response),
  };
}

export async function* generateChatStream(input: ChatInput, signal?: AbortSignal): AsyncGenerator<ChatStreamEvent> {
  const stream = await client().models.generateContentStream(buildChatRequest(input, signal));
  let full = '';
  let sources: Source[] = [];
  for await (const chunk of stream) {
    if (signal?.aborted) return;
    const piece = chunk.text ?? '';
    if (piece) {
      const delta = full && piece.startsWith(full) ? piece.slice(full.length) : piece;
      if (delta) {
        full += delta;
        yield { type: 'delta', text: delta };
      }
    }
    sources = mergeSources(sources, collectSources(chunk));
  }
  yield {
    type: 'done',
    text: full || "I couldn't generate a response. Please try again.",
    sources,
  };
}

export async function analyzeDisease(image: string): Promise<DiseaseAnalysis | null> {
  const { mimeType, data } = splitDataUrl(image);
  if (!data) return null;

  const prompt = `Analyze this crop/leaf image for diseases. If it shows a diseased plant, provide:

    CRITICAL OUTPUT RULE: Return ONLY a raw JSON object. Do not include Markdown formatting or any text outside the JSON.

    JSON Schema:
    {
      "disease": "Name of disease (e.g., Powdery Mildew)",
      "severity": "low|medium|high",
      "symptoms": ["List", "of", "visible", "symptoms"],
      "organicRemedies": ["Organic", "treatment", "options"],
      "chemicalRemedies": ["Chemical", "treatment", "options"],
      "preventionTips": ["Prevention", "methods"]
    }

    If the image shows a healthy plant, still return the JSON with "disease": "Healthy" and "severity": "low".`;

  const response = await client().models.generateContent({
    model: MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data } },
        ],
      },
    ],
  });

  const parsed = asRecord(parseJsonObject(response.text || ''));
  if (!parsed) return null;
  const severity = parsed.severity;
  return {
    disease: asString(parsed.disease, 'Unknown'),
    severity: severity === 'low' || severity === 'medium' || severity === 'high' ? severity : 'medium',
    symptoms: asStringList(parsed.symptoms),
    organicRemedies: asStringList(parsed.organicRemedies),
    chemicalRemedies: asStringList(parsed.chemicalRemedies),
    preventionTips: asStringList(parsed.preventionTips),
  };
}
