import type { ApiResult } from './http';

/**
 * Optional mirrors and flagged channels.
 * Nothing here calls Gemini. Missing credentials return a documented no-op.
 */

export async function syncFarm(body: unknown): Promise<ApiResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!upstashUrl && !supabaseUrl) {
    return { status: 200, body: { synced: false } };
  }

  try {
    if (upstashUrl && upstashToken) {
      const response = await fetch(upstashUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${upstashToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['SET', 'agriinsight:farm', JSON.stringify(body ?? {})]),
      });
      return { status: 200, body: { synced: response.ok } };
    }
    if (supabaseUrl && supabaseKey) {
      const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/farm_profiles?on_conflict=id`, {
        method: 'POST',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ id: 'default', profile: body ?? {} }),
      });
      return { status: 200, body: { synced: response.ok } };
    }
  } catch (error) {
    console.info(JSON.stringify({ route: 'farm', synced: false, message: error instanceof Error ? error.message : 'sync failed' }));
  }
  return { status: 200, body: { synced: false } };
}

export function notifySummary(body: unknown): ApiResult {
  const enabled = process.env.WHATSAPP_SUMMARY_ENABLED === 'true';
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  console.info(JSON.stringify({ route: 'notify', enabled, hasCredentials: Boolean(sid && token && from), body }));
  if (!enabled || !sid || !token || !from) {
    return { status: 200, body: { sent: false, reason: 'WhatsApp is off until WHATSAPP_SUMMARY_ENABLED and Twilio credentials are set.' } };
  }
  return { status: 200, body: { sent: false, reason: 'Credentials are present. This route logs the summary and does not send a message on its own.' } };
}

export function twilioVoice(): ApiResult {
  const enabled = process.env.PHONE_CALL_ENABLED === 'true';
  const sid = process.env.TWILIO_ACCOUNT_SID;
  if (!enabled || !sid) {
    return {
      status: 200,
      body: {
        enabled: false,
        message: 'Phone calls are off. Set PHONE_CALL_ENABLED=true and Twilio credentials. A live audio bridge needs a long-lived server, which this serverless route does not open.',
      },
    };
  }
  const twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>AgriInsight cannot bridge this call to Gemini Live from a short-lived function. Use the app microphone.</Say></Response>';
  return { status: 200, body: { enabled: true, twiml } };
}
