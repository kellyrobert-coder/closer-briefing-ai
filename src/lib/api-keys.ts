import type { ApiKeys } from '../types/lead';

const STORAGE_KEY = 'closer-briefing-api-keys';

// Keys: env vars (from .env at build time) → fallback defaults
// In production (GH Actions), secrets are injected via workflow env vars
// Locally, .env file provides the values (and is in .gitignore)
const ENV_KEYS: ApiKeys = {
  gemini: import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyAzmBAMTqSX8oatTkmpL7RLoUyTgmrLLJE',
  serpapi: import.meta.env.VITE_SERPAPI_KEY || 'ff5a57d29a63f889ac18ee2503a723318a60539ce17bb17ceef1522095430e72',
  pipedrive: import.meta.env.VITE_PIPEDRIVE_API_KEY || '12339180235d1073c5cdd0fee730354da51fb94c',
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
