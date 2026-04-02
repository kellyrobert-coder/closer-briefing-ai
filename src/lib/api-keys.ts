import type { ApiKeys } from '../types/lead';

const STORAGE_KEY = 'closer-briefing-api-keys';

const DEFAULT_KEYS: ApiKeys = {
  gemini: '',
  serpapi: '',
  pipedrive: '12339180235d1073c5cdd0fee730354da51fb94c',
};

export function getApiKeys(): ApiKeys {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Merge with defaults so new fields (pipedrive) are included
      return { ...DEFAULT_KEYS, ...parsed };
    }
  } catch {}
  return DEFAULT_KEYS;
}

export function saveApiKeys(keys: ApiKeys): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}
