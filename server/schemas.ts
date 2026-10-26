import { z } from 'zod';

const historyMessage = z.object({
  role: z.enum(['user', 'model']),
  content: z.string().max(8000),
});

export const geminiRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('weather'),
    lat: z.number().gte(-90).lte(90),
    lon: z.number().gte(-180).lte(180),
  }),
  z.object({
    action: z.literal('chat'),
    prompt: z.string().max(8000),
    language: z.string().max(35).optional(),
    image: z.string().max(4_500_000).optional(),
    history: z.array(historyMessage).max(20).optional(),
    stream: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('disease'),
    image: z.string().min(1).max(4_500_000),
  }),
]);

export type GeminiRequest = z.infer<typeof geminiRequestSchema>;
