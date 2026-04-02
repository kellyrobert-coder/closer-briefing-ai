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

// ─── DDD → State mapping for geographic validation ──────────────────────────
const DDD_STATE: Record<string, string> = {
  '11':'SP','12':'SP','13':'SP','14':'SP','15':'SP','16':'SP','17':'SP','18':'SP','19':'SP',
  '21':'RJ','22':'RJ','24':'RJ','27':'ES','28':'ES',
  '31':'MG','32':'MG','33':'MG','34':'MG','35':'MG','37':'MG','38':'MG',
  '41':'PR','42':'PR','43':'PR','44':'PR','45':'PR','46':'PR',
  '47':'SC','48':'SC','49':'SC',
  '51':'RS','53':'RS','54':'RS','55':'RS',
  '61':'DF','62':'GO','63':'TO','64':'GO','65':'MT','66':'MT','67':'MS','68':'AC','69':'RO',
  '71':'BA','73':'BA','74':'BA','75':'BA','77':'BA',
  '79':'SE','81':'PE','82':'AL','83':'PB','84':'RN','85':'CE','86':'PI','87':'PE','88':'CE','89':'PI',
  '91':'PA','92':'AM','93':'PA','94':'PA','95':'RR','96':'AP','97':'AM','98':'MA','99':'MA',
};

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
  const phoneDigits = phone.replace(/\D/g, '');
  const ddd = phoneDigits.slice(phoneDigits.length >= 12 ? 2 : 0, phoneDigits.length >= 12 ? 4 : 2);
  const dddState = DDD_STATE[ddd] || '';
  const cidade = lead.cidade_onde_fica_o_imovel || '';
  const profissao = lead.profissao || '';

  // ── STEP 1: Email decomposition (the "anchor point") ──────────────────────
  const emailUser = email.split('@')[0] || '';
  // Decompose email parts: "petra.n.r.lins" → ["petra", "n", "r", "lins"]
  const emailParts = emailUser.split(/[._-]/).filter((p) => p && !/^\d+$/.test(p));
  // Infer possible full name from email parts
  const emailFullName = emailParts
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
  // Generate username guessing variations for social media
  const usernameGuesses: string[] = [];
  if (emailParts.length >= 2) {
    usernameGuesses.push(emailParts.join('')); // petranrlins
    usernameGuesses.push(emailParts[0] + emailParts[emailParts.length - 1]); // petralins
    usernameGuesses.push(emailParts.join('.')); // petra.n.r.lins
    usernameGuesses.push(emailParts.join('_')); // petra_n_r_lins
    if (emailParts.length >= 3) {
      // first + last surname (skip initials): petraramos, petralins
      usernameGuesses.push(emailParts[0] + emailParts[emailParts.length - 1]);
      // first + second part: petran, petrarthur
      usernameGuesses.push(emailParts[0] + emailParts[1]);
    }
  }
  const uniqueUsernames = [...new Set(usernameGuesses)].slice(0, 4);

  // ── STEP 2: Build OSINT search queries (Google Dorks methodology) ─────────
  const queries: string[] = [];

  // FASE 1: Busca direta pelo email (allintext dork) — most valuable
  if (email) {
    queries.push(`allintext:"${email}"`);
  }

  // FASE 2: Nome completo inferido do email + localização (validation)
  if (emailFullName && emailFullName.toLowerCase() !== name.toLowerCase() && emailParts.length >= 3) {
    queries.push(`"${emailFullName}" ${dddState || cidade || ''}`);
  }

  // FASE 3: LinkedIn search (name + inferred name)
  queries.push(`site:linkedin.com "${name}"`);
  if (emailFullName !== name && emailParts.length >= 2) {
    const linkedinName = emailParts[0] + ' ' + emailParts[emailParts.length - 1];
    queries.push(`site:linkedin.com "${linkedinName}"`);
  }

  // FASE 4: Instagram/Facebook username guessing
  if (uniqueUsernames.length > 0) {
    const usernameQuery = uniqueUsernames.slice(0, 3).map((u) => `"${u}"`).join(' OR ');
    queries.push(`site:instagram.com ${usernameQuery}`);
    queries.push(`site:facebook.com "${name}" OR ${uniqueUsernames.slice(0, 2).map((u) => `"${u}"`).join(' OR ')}`);
  } else {
    queries.push(`"${name}" Instagram OR Facebook`);
  }

  // FASE 5: Fontes oficiais - Escavador, JusBrasil, ConsultaSocio (CNPJ/OAB)
  queries.push(`site:escavador.com OR site:jusbrasil.com.br "${name}" ${dddState || ''}`);

  // FASE 6: Nome + contexto profissional/geográfico
  const geoContext = cidade || (dddState ? `estado ${dddState}` : '');
  if (geoContext || profissao) {
    queries.push(`"${name}" ${profissao || 'investidor'} ${geoContext}`.trim());
  }

  // FASE 7: Telefone (pode revelar WhatsApp Business, OLX, classificados)
  if (phoneDigits.length >= 10) {
    queries.push(`"${phoneDigits.slice(-11)}" OR "${phoneDigits.slice(-10)}" OR "${phoneDigits.slice(-9)}"`);
  }

  // Execute all searches in parallel (max 10)
  const finalQueries = queries.slice(0, 10);
  const searchPromises = finalQueries.map((q) =>
    searchWeb(q).catch(() => [] as WebResearchResult[])
  );
  const searchResults = await Promise.all(searchPromises);

  // Flatten, deduplicate, and annotate with which query found each result
  const seen = new Set<string>();
  const allResults: WebResearchResult[] = [];
  const queryLabels = [
    'Busca email direto', 'Nome inferido do email', 'LinkedIn (nome)',
    'LinkedIn (nome email)', 'Instagram (usernames)', 'Facebook',
    'Escavador/JusBrasil', 'Nome + profissão + cidade', 'Telefone'
  ];
  for (let qi = 0; qi < searchResults.length; qi++) {
    for (const r of searchResults[qi]) {
      if (!seen.has(r.link)) {
        seen.add(r.link);
        r.source = `${r.source} [via: ${queryLabels[qi] || `query ${qi + 1}`}]`;
        allResults.push(r);
      }
    }
  }

  // ── STEP 3: Build context for Gemini OSINT analysis ───────────────────────
  const searchContext = allResults
    .map((r, i) => `[${i + 1}] ${r.title}\n    URL: ${r.link}\n    Fonte: ${r.source}\n    ${r.snippet}`)
    .join('\n\n');

  const extraFields = lead.allCustomFields
    ? Object.entries(lead.allCustomFields).filter(([,v]) => v).map(([k,v]) => `- ${k}: ${v}`).join('\n')
    : '';

  const osintPrompt = `Atue como um especialista em OSINT (Open Source Intelligence) e análise de dados públicos.
Investigue o perfil abaixo cruzando todas as informações disponíveis.

🔎 DADOS DO LEAD (PIPEDRIVE):
- Nome no CRM: ${name}
- Telefone: ${phone || 'Não informado'} ${ddd ? `(DDD ${ddd} = ${dddState || 'estado desconhecido'})` : ''}
- E-mail: ${email || 'Não informado'}
- Profissão: ${profissao || 'Não informada'}
- Localização: ${cidade || 'Não informada'}
- Nacionalidade: ${lead.nacionalidade || 'Não informada'}
- Estado Civil: ${lead.estado_civil || 'Não informado'}
${extraFields ? `\nCAMPOS EXTRAS:\n${extraFields}` : ''}

🧠 ANÁLISE DO EMAIL (PONTO DE ANCORAGEM):
- Email completo: ${email || 'N/A'}
- Username: ${emailUser || 'N/A'}
- Partes decompostas: ${emailParts.join(' | ') || 'N/A'}
- Nome completo provável: ${emailFullName || 'N/A'}
- Variações de username para busca em redes: ${uniqueUsernames.join(', ') || 'N/A'}

📍 VALIDAÇÃO GEOGRÁFICA:
- DDD: ${ddd || 'N/A'} → Estado: ${dddState || 'N/A'}
- Cidade informada: ${cidade || 'N/A'}

📋 RESULTADOS DAS ${finalQueries.length} BUSCAS (${allResults.length} resultados únicos):
${searchContext || 'Nenhum resultado encontrado'}

🔬 METODOLOGIA QUE VOCÊ DEVE SEGUIR:
1. DECOMPOSIÇÃO DO EMAIL: Analise "${emailUser}" — as iniciais/partes geralmente correspondem ao nome completo real. Por exemplo, "petra.n.r.lins" → Petra N. R. Lins → buscar listas de aprovados em vestibulares, OAB, concursos com esse padrão.
2. VALIDAÇÃO GEOGRÁFICA: O DDD ${ddd || 'N/A'} confirma a região (${dddState || '?'}). Cruze com os resultados para filtrar homônimos.
3. FILTRO PROFISSIONAL: Com nome completo + cidade, busque registros profissionais (OAB, CRM, CREA, CRP, etc.), LinkedIn, e cargos.
4. USERNAME GUESSING: Pessoas reutilizam padrões do email nas redes sociais. Teste variações: ${uniqueUsernames.join(', ')}.
5. CRUZAMENTO DE FONTES: Valide cada achado contra pelo menos 2 fontes diferentes. Se a bio do Instagram menciona a mesma profissão e cidade encontrada no LinkedIn, a confiança aumenta.

⚠️ REGRAS RÍGIDAS:
- O email "${email}" é o dado mais valioso — SEMPRE decomponha e analise
- Diferencie CONFIRMADO (múltiplas fontes concordam) de PROVÁVEL (uma fonte) de SUPOSIÇÃO (inferência lógica)
- Para cada rede social, inclua a URL COMPLETA dos resultados de busca
- Se não encontrou em alguma rede, explique o que foi tentado
- CITE SEMPRE o número do resultado (ex: "resultado #3") como evidência
- Foque em informações que ajudem um VENDEDOR em uma reunião de vendas

Responda EXCLUSIVAMENTE em JSON válido:
{
  "pessoa_identificada": "Nome completo real identificado + cargo/profissão + cidade (ex: 'Petra Nathalia Ramos Lins, Advogada em Manaus/AM')",
  "nivel_confianca": "Alto|Médio|Baixo - explicação detalhada das evidências que sustentam este nível",
  "redes_sociais": [
    {"plataforma": "LinkedIn", "url": "URL completa do perfil encontrado, ou vazio", "descricao": "Cargo atual, empresa, resumo da experiência profissional. Se não encontrado, explique o que foi buscado."},
    {"plataforma": "Instagram", "url": "URL completa ou vazio", "descricao": "Username encontrado, tipo de conteúdo, bio, observações úteis para rapport"},
    {"plataforma": "Facebook", "url": "URL completa ou vazio", "descricao": "Informações relevantes: cidade, trabalho, interesses"}
  ],
  "historico_profissional": "Trajetória profissional completa: formação acadêmica (universidade), empresas onde trabalhou/trabalha, cargos, registro profissional (OAB/CRM/CREA se aplicável), área de especialização. 3-5 frases detalhadas.",
  "empresas_cnpj": "Empresas onde aparece como sócio/proprietário (Escavador, ConsultaSocio, Receita Federal). CNPJ, razão social, situação cadastral. Se não encontrado, dizer explicitamente.",
  "contexto_publico": "Publicações em diários oficiais (TJAM, DOU, etc.), processos judiciais (JusBrasil), publicações acadêmicas, notícias, participação em eventos. Inclua detalhes específicos.",
  "evidencias": ["Evidência 1 — resultado #X: descrição (fonte: nome do site)", "Evidência 2 — cruzamento entre resultado #X e #Y", "Evidência 3"],
  "resumo_para_closer": "RESUMO PRÁTICO (5-6 frases): Quem é esta pessoa (nome completo, profissão, cidade). Qual é seu perfil financeiro provável (baseado em cargo/empresa). Como gerar rapport (interesses pessoais, hobbies visíveis nas redes). Pontos de conexão com investimento imobiliário. Abordagem recomendada para a reunião. Cuidados ou observações importantes."
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
