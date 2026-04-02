import type { ApiKeys } from '../types/lead';

const STORAGE_KEY = 'closer-briefing-api-keys';

// Keys from .env (injected at build time by Vite — the .env file is in .gitignore)
const ENV_KEYS: ApiKeys = {
  gemini: import.meta.env.VITE_GEMINI_API_KEY || '',
  serpapi: import.meta.env.VITE_SERPAPI_KEY || '',
  pipedrive: import.meta.env.VITE_PIPEDRIVE_API_KEY || '',
};

export function getApiKeys(): ApiKeys {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge: localStorage overrides env, env overrides empty
      return {
        gemini: parsed.gemini || ENV_KEYS.gemini,
        serpapi: parsed.serpapi || ENV_KEYS.serpapi,
        pipedrive: parsed.pipedrive || ENV_KEYS.pipedrive,
      };
    }
  } catch {}
  return ENV_KEYS;
}

export function saveApiKeys(keys: ApiKeys): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}
