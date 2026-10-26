import { GoogleGenAI, Modality } from '@google/genai';

/**
 * Live session credentials, from the current Gemini docs and @google/genai 1.31 types.
 *
 * Model: gemini-3.8-live
 * API version: v1beta
 *   POST https://generativelanguage.googleapis.com/v1beta/auth_tokens
 *   Client socket (Step 5): wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=TOKEN
 *
 * SDK:
 *   ai.authTokens.create({ config: { uses: 1, expireTime, newSessionExpireTime, httpOptions: { apiVersion: 'v1beta' }, liveConnectConstraints } })
 *   Step 5 connect: new GoogleGenAI({ apiKey: token.name }); ai.live.connect({ model: 'gemini-3.8-live', config: { responseModalities: [Modality.AUDIO] }, callbacks })
 *
 * The installed SDK still console.warns that ephemeral tokens are "v1alpha only".
 * The live docs (ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens, fetched for this change)
 * say tokens work only on v1beta. This route follows the docs and sets v1beta explicitly.
 * The SDK default for the Gemini API is also v1beta. The warning does not change the URL.
 */

export const LIVE_MODEL = 'gemini-3.8-live';
export const LIVE_API_VERSION = 'v1beta';

/** Window in which the browser must open the Live socket. */
const NEW_SESSION_TTL_MS = 60 * 1000;
/** Window in which that open socket may keep sending. Resuming does not spend another use. */
const TOKEN_TTL_MS = 10 * 60 * 1000;

export async function createLiveToken(): Promise<{
  token: string;
  expireTime: string;
  newSessionExpireTime: string;
  uses: number;
  model: string;
  apiVersion: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const expireTime = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  const newSessionExpireTime = new Date(Date.now() + NEW_SESSION_TTL_MS).toISOString();
  const ai = new GoogleGenAI({ apiKey });

  const created = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime,
      newSessionExpireTime,
      httpOptions: { apiVersion: LIVE_API_VERSION },
      liveConnectConstraints: {
        model: LIVE_MODEL,
        config: {
          sessionResumption: {},
          responseModalities: [Modality.AUDIO],
        },
      },
    },
  });

  if (!created.name) {
    throw new Error('Gemini did not return a token name');
  }

  return {
    token: created.name,
    expireTime,
    newSessionExpireTime,
    uses: 1,
    model: LIVE_MODEL,
    apiVersion: LIVE_API_VERSION,
  };
}
