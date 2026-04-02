import type { Lead, WebResearchResult, OsintProfile } from '../types/lead';
import { getApiKeys } from './api-keys';

export async function searchWeb(query: string): Promise<WebResearchResult[]> {
  const keys = getApiKeys();
  const apiKey = keys.serpapi;

  if (!apiKey) {
    throw new Error('Chave da SerpAPI não configurada. Vá em Configurações (ícone ⚙️) para adicionar sua chave.');
  }

  const serpUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&hl=pt-br&gl=br&num=8&api_key=${apiKey}`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(serpUrl)}`;

  const response = await fetch(proxyUrl);
  if (!response.ok) throw new Error(`SerpAPI error: ${response.status}`);

  const data = await response.json();
  const results: WebResearchResult[] = [];

  if (data.organic_results) {
    for (const r of data.organic_results.slice(0, 8)) {
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

// ─── OSINT Investigation ─────────────────────────────────────────────────────

export async function investigateLead(lead: Lead): Promise<{
  rawResults: WebResearchResult[];
  profile: OsintProfile;
}> {
  const keys = getApiKeys();
  if (!keys.serpapi) throw new Error('Chave da SerpAPI não configurada.');
  if (!keys.gemini) throw new Error('Chave da Gemini não configurada.');

  const name = lead.nome_investidor;
  const ddd = lead.telefone ? lead.telefone.replace(/\D/g, '').slice(0, 4) : '';
  const cidade = lead.cidade_onde_fica_o_imovel || '';

  // Multiple targeted searches in parallel
  const queries = [
    `"${name}" LinkedIn`,
    `"${name}" Instagram OR Facebook`,
    `"${name}" ${lead.profissao || cidade || 'investidor'}`,
    `"${name}" CNPJ OR empresa OR sócio`,
  ];

  const searchPromises = queries.map((q) =>
    searchWeb(q).catch(() => [] as WebResearchResult[])
  );
  const searchResults = await Promise.all(searchPromises);

  // Flatten and deduplicate
  const seen = new Set<string>();
  const allResults: WebResearchResult[] = [];
  for (const batch of searchResults) {
    for (const r of batch) {
      if (!seen.has(r.link)) {
        seen.add(r.link);
        allResults.push(r);
      }
    }
  }

  // Build context for Gemini OSINT analysis
  const searchContext = allResults
    .map((r, i) => `[${i + 1}] ${r.title}\n    URL: ${r.link}\n    ${r.snippet}`)
    .join('\n\n');

  const osintPrompt = `Você é um especialista em OSINT (Open Source Intelligence) e análise de dados públicos.
Analise os resultados de busca abaixo e organize as informações encontradas sobre esta pessoa.

🔎 DADOS DISPONÍVEIS DO PIPEDRIVE:
- Nome Completo: ${name}
- Telefone/DDD: ${lead.telefone || 'Não informado'}
- E-mail: ${lead.e_mail || 'Não informado'}
- Localização Provável: ${cidade || 'Não informada'}
- Profissão: ${lead.profissao || 'Não informada'}
- Nacionalidade: ${lead.nacionalidade || 'Não informada'}

📋 RESULTADOS DA BUSCA WEB:
${searchContext || 'Nenhum resultado encontrado'}

⚠️ REGRAS:
- Diferencie informações CONFIRMADAS de SUPOSIÇÕES
- Se houver homônimos, escolha o mais provável baseado no DDD (${ddd}), cidade (${cidade}) ou profissão
- Cite a origem de cada informação (ex: "encontrado via LinkedIn", "resultado #3")
- Se não encontrar um perfil em alguma rede, diga "Não encontrado"
- Para redes sociais, SEMPRE inclua a URL completa se disponível nos resultados
- Foque em informações úteis para um vendedor que vai fazer uma reunião com esta pessoa

Responda EXCLUSIVAMENTE em JSON válido:
{
  "pessoa_identificada": "Nome completo e breve descrição (cargo, empresa)",
  "nivel_confianca": "Alto|Médio|Baixo - justificativa breve",
  "redes_sociais": [
    {"plataforma": "LinkedIn", "url": "URL ou vazio", "descricao": "Cargo, empresa, resumo do perfil"},
    {"plataforma": "Instagram", "url": "URL ou vazio", "descricao": "Tipo de conteúdo, seguidores se visível"},
    {"plataforma": "Facebook", "url": "URL ou vazio", "descricao": "Informações relevantes"}
  ],
  "historico_profissional": "Resumo da trajetória profissional encontrada (2-3 frases)",
  "empresas_cnpj": "Empresas onde é sócio/dono ou trabalha, se encontrado",
  "contexto_publico": "Informações relevantes de portais públicos, notícias, publicações",
  "evidencias": ["evidência 1 com fonte", "evidência 2 com fonte"],
  "resumo_para_closer": "Resumo prático de 3-4 frases para o closer usar na reunião: quem é essa pessoa, o que faz, como abordar, pontos de conexão"
}`;

  const model = 'gemini-2.5-flash';
  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${keys.gemini}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: osintPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (!geminiRes.ok) {
    const errText = await geminiRes.text();
    throw new Error(`Gemini API error ${geminiRes.status}: ${errText.slice(0, 200)}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geminiData: any = await geminiRes.json();

  if (geminiData.error) {
    throw new Error(`Gemini: ${geminiData.error.message || 'Erro desconhecido'}`);
  }

  const parts = geminiData.candidates?.[0]?.content?.parts ?? [];
  const text = parts.filter((p: { thought?: boolean }) => !p.thought)
    .map((p: { text?: string }) => p.text ?? '').join('')
    || parts.map((p: { text?: string }) => p.text ?? '').join('');

  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  if (!cleaned.startsWith('{')) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) cleaned = match[0];
  }

  const profile: OsintProfile = JSON.parse(cleaned);

  return { rawResults: allResults, profile };
}
