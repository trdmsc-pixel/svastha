import { Platform } from 'react-native';
import { isSupabaseConfigured, supabase } from './supabase';

export type AiEndpoint = 'analyse-meal' | 'parse-report' | 'suggest-recipes' | 'report-chat';

export type AiResult<T> =
  | { ok: true; data: T; via: 'supabase' | 'api' }
  | { ok: false; reason: 'not_configured' | 'rate_limited' | 'too_large' | 'error' | 'offline'; message: string };

function apiBase(): string | null {
  const env = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (env) return env.replace(/\/+$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return null;
}

export function aiTransportLabel(): string {
  if (apiBase()) return 'Svastha AI (Fast Vercel API)';
  if (isSupabaseConfigured) return 'Supabase Edge Functions · Mumbai';
  return 'Not connected';
}

async function viaApi<T>(endpoint: AiEndpoint, body: unknown, timeoutMs: number): Promise<AiResult<T> | null> {
  const base = apiBase();
  if (!base) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => null)) as (T & { error?: string; code?: string }) | null;
    if (res.status === 404 || res.status === 405 || json?.code === 'not_configured') {
      return { ok: false, reason: 'not_configured', message: 'AI analysis isn’t connected yet (no LLM key on the server).' };
    }
    if (res.status === 429) return { ok: false, reason: 'rate_limited', message: json?.error ?? 'Too many requests — please wait a minute.' };
    if (res.status === 413) return { ok: false, reason: 'too_large', message: json?.error ?? 'That file is too large to analyse.' };
    if (!res.ok || !json) return { ok: false, reason: 'error', message: json?.error ?? `The AI service returned an error (${res.status}).` };
    return { ok: true, data: json as T, via: 'api' };
  } catch (e) {
    const aborted = (e as Error)?.name === 'AbortError';
    return { ok: false, reason: aborted ? 'error' : 'offline', message: aborted ? 'The analysis took too long. Please try again.' : 'You seem to be offline.' };
  } finally {
    clearTimeout(timer);
  }
}

async function viaSupabase<T>(endpoint: AiEndpoint, body: unknown): Promise<AiResult<T> | null> {
  if (!isSupabaseConfigured) return null;
  if (endpoint === 'suggest-recipes') return null;
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return null;
  const { data, error } = await supabase.functions.invoke(endpoint, { body: body as Record<string, unknown> });
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 429) return { ok: false, reason: 'rate_limited', message: 'Daily AI limit reached — try again tomorrow.' };
    if (status === 413) return { ok: false, reason: 'too_large', message: 'That file is too large to analyse.' };
    return { ok: false, reason: 'error', message: 'The AI service had a problem. Please try again.' };
  }
  return { ok: true, data: data as T, via: 'supabase' };
}

/**
 * Calls Vercel `/api/*` FIRST whenever available (eliminates 5-15s Supabase Edge Function
 * cold-start / fallback delay on web and configured mobile builds), falling back to Supabase
 * Edge Functions only if `/api/*` is unavailable.
 */
export async function callAi<T>(endpoint: AiEndpoint, body: unknown, timeoutMs = 45_000): Promise<AiResult<T>> {
  const apiRes = await viaApi<T>(endpoint, body, timeoutMs);
  if (apiRes?.ok) return apiRes;
  if (apiRes && (apiRes.reason === 'rate_limited' || apiRes.reason === 'offline')) {
    return apiRes;
  }

  try {
    const supaRes = await viaSupabase<T>(endpoint, body);
    if (supaRes?.ok) return supaRes;
    if (supaRes) return supaRes;
  } catch {
    // keep apiRes error
  }

  return apiRes ?? { ok: false, reason: 'not_configured', message: 'AI analysis isn’t connected in this build.' };
}