/**
 * VitalLens Storage - Supabase Cloud Database Client
 *
 * Provides connection management and initialization for external Supabase PostgreSQL database.
 * Supports environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
 * with in-app fallback via localStorage for dynamic configuration in Settings.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_URL_KEY = 'vitallens_supabase_url';
const STORAGE_KEY_KEY = 'vitallens_supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
  source: 'env' | 'custom' | 'none';
}

/**
 * Retrieves the current Supabase configuration from environment or localStorage.
 */
export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

  if (envUrl && envKey) {
    return {
      url: envUrl,
      anonKey: envKey,
      isConfigured: true,
      source: 'env',
    };
  }

  try {
    const localUrl = (localStorage.getItem(STORAGE_URL_KEY) || '').trim();
    const localKey = (localStorage.getItem(STORAGE_KEY_KEY) || '').trim();

    if (localUrl && localKey) {
      return {
        url: localUrl,
        anonKey: localKey,
        isConfigured: true,
        source: 'custom',
      };
    }
  } catch {
    // LocalStorage unavailable
  }

  return {
    url: '',
    anonKey: '',
    isConfigured: false,
    source: 'none',
  };
}

/**
 * Checks whether Supabase is configured with valid URL and key.
 */
export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig().isConfigured;
}

/**
 * Returns an initialized SupabaseClient instance, or null if unconfigured.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    cachedClient = null;
    return null;
  }

  const currentKey = `${config.url}::${config.anonKey}`;
  if (cachedClient && cachedConfigKey === currentKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    cachedConfigKey = currentKey;
    return cachedClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    cachedClient = null;
    return null;
  }
}

/**
 * Saves user-provided Supabase credentials to localStorage.
 */
export function saveSupabaseConfig(url: string, anonKey: string): void {
  try {
    localStorage.setItem(STORAGE_URL_KEY, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
    cachedClient = null; // Invalidate cache
    cachedConfigKey = '';
  } catch (e) {
    console.error('Failed to save Supabase config to localStorage', e);
  }
}

/**
 * Clears custom Supabase credentials from localStorage.
 */
export function clearSupabaseConfig(): void {
  try {
    localStorage.removeItem(STORAGE_URL_KEY);
    localStorage.removeItem(STORAGE_KEY_KEY);
    cachedClient = null;
    cachedConfigKey = '';
  } catch (e) {
    console.error('Failed to clear Supabase config from localStorage', e);
  }
}

/**
 * Tests connection to the remote Supabase database.
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase URL and Anon Key are not configured.',
    };
  }

  const start = performance.now();
  try {
    // Attempt a lightweight select query from vitals_records
    const { error } = await client
      .from('vitals_records')
      .select('id')
      .limit(1);

    const latency = Math.round(performance.now() - start);

    if (error) {
      // If table doesn't exist yet, it still contacted Supabase successfully
      if (error.code === '42P01') {
        return {
          success: true,
          message: `Connected to Supabase (${latency}ms), but 'vitals_records' table is not yet created. Run supabase_schema.sql.`,
          latencyMs: latency,
        };
      }
      return {
        success: false,
        message: `Supabase query failed: ${error.message} (Code: ${error.code})`,
        latencyMs: latency,
      };
    }

    return {
      success: true,
      message: `Connected successfully to Supabase PostgreSQL! (${latency}ms latency)`,
      latencyMs: latency,
    };
  } catch (err: any) {
    const latency = Math.round(performance.now() - start);
    return {
      success: false,
      message: `Network/connection error: ${err?.message || 'Unable to reach host'}`,
      latencyMs: latency,
    };
  }
}
