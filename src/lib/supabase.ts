import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_CONFIG_STORAGE_KEY = 'ai_study_planner_supabase_config';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const getStoredSupabaseConfig = (): SupabaseConfig => {
  try {
    const raw = localStorage.getItem(SUPABASE_CONFIG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse stored Supabase config:', e);
  }

  return {
    url: (import.meta.env.VITE_SUPABASE_URL as string) || '',
    anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
  };
};

export const saveStoredSupabaseConfig = (config: SupabaseConfig): void => {
  localStorage.setItem(SUPABASE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  // Invalidate cached client
  cachedClient = null;
};

export const clearStoredSupabaseConfig = (): void => {
  localStorage.removeItem(SUPABASE_CONFIG_STORAGE_KEY);
  cachedClient = null;
};

let cachedClient: SupabaseClient | null = null;

export const isSupabaseConfigured = (): boolean => {
  const config = getStoredSupabaseConfig();
  return Boolean(config.url && config.anonKey && config.url.startsWith('https://'));
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (cachedClient) return cachedClient;

  const config = getStoredSupabaseConfig();
  if (config.url && config.anonKey && config.url.startsWith('https://')) {
    try {
      cachedClient = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      return cachedClient;
    } catch (err) {
      console.error('Error creating Supabase client:', err);
      return null;
    }
  }
  return null;
};
