import type { ApiKeys } from '../types/lead';

const STORAGE_KEY = 'closer-briefing-api-keys';

const DEFAULT_KEYS: ApiKeys = {
  gemini: 'AIzaSyCzwZHUd_ogMlo2nsOcfvsaWadINHeWBjM',
  serpapi: 'ff5a57d29a63f889ac18ee2503a723318a60539ce17bb17ceef1522095430e72',
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
