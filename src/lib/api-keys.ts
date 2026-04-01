import type { ApiKeys } from '../types/lead';

const STORAGE_KEY = 'closer-briefing-api-keys';

const DEFAULT_KEYS: ApiKeys = {
  gemini: '',
  serpapi: '',
};

export function getApiKeys(): ApiKeys {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {}
  return DEFAULT_KEYS;
}

export function saveApiKeys(keys: ApiKeys): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}
