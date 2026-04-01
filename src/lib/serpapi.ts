import type { WebResearchResult } from '../types/lead';
import { getApiKeys } from './api-keys';

export async function searchWeb(query: string): Promise<WebResearchResult[]> {
  const keys = getApiKeys();
  const apiKey = keys.serpapi;

  if (!apiKey) {
    throw new Error('Chave da SerpAPI não configurada. Vá em Configurações (ícone ⚙️) para adicionar sua chave.');
  }

  // Use allorigins as CORS proxy for SerpAPI
  const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&hl=pt-br&gl=br&num=5&api_key=${apiKey}`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(serpUrl)}`;

  const response = await fetch(proxyUrl);

  if (!response.ok) {
    throw new Error(`SerpAPI error: ${response.status}`);
  }

  const data = await response.json();
  const results: WebResearchResult[] = [];

  if (data.organic_results) {
    for (const r of data.organic_results.slice(0, 5)) {
      results.push({
        title: r.title || '',
        link: r.link || '',
        snippet: r.snippet || '',
        source: r.source || new URL(r.link || 'https://google.com').hostname,
      });
    }
  }

  if (data.knowledge_graph) {
    const kg = data.knowledge_graph;
    if (kg.description) {
      results.unshift({
        title: kg.title || query,
        link: kg.website || '',
        snippet: kg.description || '',
        source: 'Knowledge Graph',
      });
    }
  }

  return results;
}

export async function researchLead(name: string, profession: string): Promise<WebResearchResult[]> {
  const queries = [
    `"${name}" ${profession}`,
    `"${name}" LinkedIn`,
  ];

  const allResults: WebResearchResult[] = [];

  for (const q of queries) {
    try {
      const results = await searchWeb(q);
      allResults.push(...results);
    } catch (e) {
      console.warn(`Search failed for: ${q}`, e);
    }
  }

  // Deduplicate by link
  const seen = new Set<string>();
  return allResults.filter(r => {
    if (seen.has(r.link)) return false;
    seen.add(r.link);
    return true;
  });
}
