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
  const email = lead.e_mail || '';
  const phone = lead.telefone || '';
  const ddd = phone.replace(/\D/g, '').slice(0, 4);
  const cidade = lead.cidade_onde_fica_o_imovel || '';
  const profissao = lead.profissao || '';

  // Extract username from email (e.g. "petra.n.r.lins" from "petra.n.r.lins@gmail.com")
  const emailUser = email.split('@')[0] || '';
  // Try to infer full name from email if name is short
  const emailNameHint = emailUser.replace(/[._]/g, ' ').replace(/\d+/g, '').trim();

  // Build comprehensive search queries using ALL available data
  const queries: string[] = [];

  // Core identity searches
  queries.push(`"${name}" LinkedIn`);
  queries.push(`"${name}" Instagram OR Facebook`);

  // Email-based searches (critical for OSINT)
  if (email) {
    queries.push(`"${email}"`);
    if (emailUser.length > 4) {
      queries.push(`"${emailUser}" site:linkedin.com OR site:instagram.com OR site:facebook.com`);
    }
  }

  // Professional / CNPJ searches
  if (profissao) {
    queries.push(`"${name}" ${profissao} ${cidade}`);
  }
  queries.push(`"${name}" CNPJ OR sócio OR empresa site:escavador.com OR site:jusbrasil.com.br OR site:consultasocio.com`);

  // Location-based refinement
  if (cidade || ddd) {
    queries.push(`"${name}" ${cidade || ''} ${ddd ? 'DDD ' + ddd.slice(0, 2) : ''} advogado OR empresário OR investidor OR profissional`.trim());
  }

  // Phone-based searches (can reveal profiles, WhatsApp business, etc.)
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    // Search the phone number directly — can find WhatsApp business, classified ads, registrations
    if (digits.length >= 10) {
      queries.push(`"${digits}" OR "${digits.slice(-11)}" OR "${digits.slice(-9)}"`);
    }
  }

  // If email suggests a different/fuller name, search that too
  if (emailNameHint && emailNameHint.toLowerCase() !== name.toLowerCase() && emailNameHint.split(' ').length >= 2) {
    queries.push(`"${emailNameHint}" LinkedIn OR Instagram`);
  }

  // Limit to 8 parallel queries to balance depth vs rate limits
  const finalQueries = queries.slice(0, 8);

  const searchPromises = finalQueries.map((q) =>
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

  // All custom fields from Pipedrive for extra context
  const extraFields = lead.allCustomFields
    ? Object.entries(lead.allCustomFields).filter(([,v]) => v).map(([k,v]) => `- ${k}: ${v}`).join('\n')
    : '';

  const osintPrompt = `Atue como um especialista em OSINT (Open Source Intelligence) e análise de dados públicos.
Investigue o perfil abaixo e organize as informações encontradas de forma estruturada.

🔎 DADOS DISPONÍVEIS DO PIPEDRIVE:
- Nome Completo: ${name}
- Telefone/DDD: ${phone || 'Não informado'}
- E-mail: ${email || 'Não informado'}
- Username do email: ${emailUser || 'N/A'}
- Possível nome completo inferido do email: ${emailNameHint || 'N/A'}
- Localização Provável: ${cidade || 'Não informada'}
- Profissão: ${profissao || 'Não informada'}
- Nacionalidade: ${lead.nacionalidade || 'Não informada'}
- Estado Civil: ${lead.estado_civil || 'Não informado'}
${extraFields ? `\nCAMPOS EXTRAS DO PIPEDRIVE:\n${extraFields}` : ''}

🌐 OBJETIVO: Cruzar os dados acima para encontrar:
1. Presença Digital: LinkedIn, Instagram, Facebook e portfólios profissionais.
2. Vida Profissional: Cargo atual, empresa e trajetória.
3. Contexto Público: Informações em portais de transparência, registros de empresas (CNPJ), Escavador, JusBrasil, publicações acadêmicas/oficiais.

📋 RESULTADOS DA BUSCA WEB (${allResults.length} resultados):
${searchContext || 'Nenhum resultado encontrado nas buscas'}

⚠️ REGRAS:
- O EMAIL é uma pista crucial: analise o username (${emailUser}) para inferir nome completo, iniciais, sobrenomes
- Diferencie informações CONFIRMADAS de SUPOSIÇÕES
- Se houver homônimos, liste as opções mais prováveis com base no DDD (${ddd}), cidade (${cidade}) ou profissão
- Cite a origem da informação (ex: "encontrado via bio do Instagram", "resultado #3")
- Para redes sociais, SEMPRE inclua a URL completa se disponível nos resultados
- Se não encontrar um perfil, explique o que foi buscado e por que não foi encontrado
- Cruze informações entre diferentes fontes para aumentar a confiança
- Foque em informações úteis para um vendedor (closer) que vai fazer uma reunião de vendas com esta pessoa

Responda EXCLUSIVAMENTE em JSON válido:
{
  "pessoa_identificada": "Nome completo identificado + breve descrição (cargo, empresa, cidade)",
  "nivel_confianca": "Alto|Médio|Baixo - justificativa detalhada de por que este nível (mencione as evidências que confirmam ou não)",
  "redes_sociais": [
    {"plataforma": "LinkedIn", "url": "URL completa ou vazio se não encontrado", "descricao": "Cargo, empresa, resumo do perfil, ou explicação de por que não foi encontrado"},
    {"plataforma": "Instagram", "url": "URL completa ou vazio", "descricao": "Username, tipo de conteúdo, observações relevantes"},
    {"plataforma": "Facebook", "url": "URL completa ou vazio", "descricao": "Informações relevantes do perfil"}
  ],
  "historico_profissional": "Resumo detalhado da trajetória profissional: formação, empresas, cargos, área de atuação (3-5 frases)",
  "empresas_cnpj": "Empresas onde aparece como sócio/dono, registros no Escavador, CNPJ vinculados. Se não encontrado, diga explicitamente.",
  "contexto_publico": "Informações de portais públicos, diários oficiais, JusBrasil, notícias, publicações acadêmicas, processos judiciais mencionados",
  "evidencias": ["evidência 1 (fonte: resultado #X ou nome do site)", "evidência 2", "evidência 3"],
  "resumo_para_closer": "Resumo prático de 4-5 frases para o closer usar na reunião: quem é essa pessoa, qual sua profissão e renda provável, como abordar, pontos de conexão pessoal, e qualquer informação que ajude a gerar rapport e fechar a venda"
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
          temperature: 0.4,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          // Allow some thinking for better OSINT analysis
          thinkingConfig: { thinkingBudget: 2048 },
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
