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

  // ── STEP 1: Advanced Email Decomposition (the "anchor point") ─────────────
  const emailUser = email.split('@')[0] || '';

  // --- 1a. Split by separators first: "petra.n.r.lins" → ["petra","n","r","lins"]
  const separatorParts = emailUser.split(/[._-]/).filter(Boolean);

  // --- 1b. For each part, split letters from trailing numbers: "srosy712" → ["srosy","712"]
  const splitLettersNumbers = (s: string): string[] => {
    const m = s.match(/^([a-zA-Z]+)(\d+)$/);
    return m ? [m[1], m[2]] : [s];
  };

  // --- 1c. Try first-char-as-initial split: "srosy" → ["s","rosy"] (common pattern: initial + name)
  const tryInitialSplit = (s: string): string[] => {
    if (s.length >= 4 && /^[a-z]/i.test(s)) {
      return [s[0], s.slice(1)];
    }
    return [s];
  };

  // Build decomposed parts
  const rawParts: string[] = [];
  for (const part of separatorParts) {
    rawParts.push(...splitLettersNumbers(part));
  }

  // Filter: separate alpha parts from numeric parts
  const alphaParts = rawParts.filter((p) => /^[a-zA-Z]+$/.test(p));
  const numericParts = rawParts.filter((p) => /^\d+$/.test(p));

  // If we only got 1 alpha part (no separators, e.g. "srosy"), try initial split
  const emailParts: string[] = [];
  if (alphaParts.length === 1 && alphaParts[0].length >= 4) {
    const [initial, rest] = tryInitialSplit(alphaParts[0]);
    emailParts.push(initial, rest);
  } else {
    emailParts.push(...alphaParts);
  }

  // --- 1d. Extract numbers for age/year inference
  // "712" → possible birth year 1971 or 1972; "85" → 1985; "1990" → 1990
  let inferredAge = '';
  for (const num of numericParts) {
    const n = parseInt(num, 10);
    if (n >= 1940 && n <= 2010) {
      inferredAge = `Provável ano de nascimento: ${n} (idade ~${new Date().getFullYear() - n})`;
    } else if (n >= 40 && n <= 99) {
      inferredAge = `Provável ano de nascimento: 19${num} (idade ~${new Date().getFullYear() - (1900 + n)})`;
    } else if (num.length === 3) {
      // "712" → could be "71" + "2" → 1971, or just a number
      const twoDigit = parseInt(num.slice(0, 2), 10);
      if (twoDigit >= 40 && twoDigit <= 99) {
        inferredAge = `Possível ano de nascimento: 19${num.slice(0, 2)} (idade ~${new Date().getFullYear() - (1900 + twoDigit)}) — inferido dos dígitos "${num}" no email`;
      }
    }
  }

  // --- 1e. Infer full name from email parts
  // Also try combining CRM surname with email-derived first name
  const crmSurname = name.split(/\s+/).slice(-1)[0] || '';
  const emailFullName = emailParts
    .filter((p) => p.length > 1) // skip single initials for full name
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
  // If email gives us a short name like "Rosy" and CRM has surname "Saundres", combine them
  const emailDerivedNames: string[] = [];
  if (emailFullName) emailDerivedNames.push(emailFullName);
  if (emailParts.length >= 1) {
    const emailFirstName = emailParts.find((p) => p.length > 1);
    if (emailFirstName && crmSurname && emailFirstName.toLowerCase() !== crmSurname.toLowerCase()) {
      const combined = emailFirstName.charAt(0).toUpperCase() + emailFirstName.slice(1).toLowerCase() + ' ' + crmSurname;
      emailDerivedNames.push(combined);
    }
  }

  // --- 1f. Username guessing — ALWAYS include emailUser itself as a username
  const usernameGuesses: string[] = [emailUser]; // the raw username is always a valid social handle
  if (emailParts.length >= 2) {
    usernameGuesses.push(emailParts.join('')); // srosy
    usernameGuesses.push(emailParts.filter((p) => p.length > 1).join('')); // rosy (skip initials)
    usernameGuesses.push(emailParts.join('.')); // s.rosy
    usernameGuesses.push(emailParts.join('_')); // s_rosy
    if (numericParts.length > 0) {
      // Add with numbers: rosy712, srosy712
      const mainName = emailParts.filter((p) => p.length > 1).join('');
      usernameGuesses.push(mainName + numericParts[0]);
    }
  }
  // Also try CRM name variations as usernames
  const nameParts = name.toLowerCase().split(/\s+/).filter(Boolean);
  if (nameParts.length >= 2) {
    usernameGuesses.push(nameParts.join('')); // mariasaundres
    usernameGuesses.push(nameParts[0] + nameParts[nameParts.length - 1]); // mariasaundres
    usernameGuesses.push(nameParts[0] + '.' + nameParts[nameParts.length - 1]); // maria.saundres
  }
  const uniqueUsernames = [...new Set(usernameGuesses.filter((u) => u.length >= 3))].slice(0, 8);

  // ── STEP 2: Build OSINT search queries (Google Dorks methodology) ─────────
  const queries: string[] = [];
  const geoContext = cidade || (dddState ? `estado ${dddState}` : '');
  const geoShort = dddState || cidade || '';

  // FASE 1: Busca direta pelo email (allintext dork) — most valuable anchor
  if (email) {
    queries.push(`allintext:"${email}"`);
  }

  // FASE 2: Nome derivado do email + localização (finds the REAL name vs CRM name)
  for (const derivedName of emailDerivedNames) {
    if (derivedName.toLowerCase() !== name.toLowerCase()) {
      queries.push(`"${derivedName}" ${geoShort}`.trim());
    }
  }

  // FASE 3: LinkedIn search — both CRM name and email-derived names
  queries.push(`site:linkedin.com "${name}"`);
  for (const derivedName of emailDerivedNames) {
    if (derivedName.toLowerCase() !== name.toLowerCase()) {
      queries.push(`site:linkedin.com "${derivedName}"`);
    }
  }

  // FASE 4: Instagram — username guessing (the most valuable for rapport)
  const igUsernames = uniqueUsernames.slice(0, 4).map((u) => `"${u}"`).join(' OR ');
  queries.push(`site:instagram.com ${igUsernames}`);

  // FASE 5: Facebook — name variations + usernames
  const fbNames = [name, ...emailDerivedNames.filter((n) => n.toLowerCase() !== name.toLowerCase())];
  const fbQuery = fbNames.map((n) => `"${n}"`).join(' OR ');
  queries.push(`site:facebook.com ${fbQuery} ${geoShort}`.trim());

  // FASE 6: Fontes oficiais — Escavador, JusBrasil, ConsultaSocio (CNPJ/sócios)
  queries.push(`site:escavador.com OR site:jusbrasil.com.br OR site:consultasocio.com "${name}" ${geoShort}`.trim());
  // Also search by email-derived name if different
  for (const derivedName of emailDerivedNames) {
    if (derivedName.toLowerCase() !== name.toLowerCase()) {
      queries.push(`site:escavador.com OR site:consultasocio.com "${derivedName}" ${geoShort}`.trim());
    }
  }

  // FASE 7: Nome CRM + contexto profissional/geográfico
  if (geoContext || profissao) {
    queries.push(`"${name}" ${profissao || 'investidor imobiliário'} ${geoContext}`.trim());
  }

  // FASE 8: Telefone (WhatsApp Business, OLX, classificados, registros públicos)
  if (phoneDigits.length >= 10) {
    queries.push(`"${phoneDigits.slice(-11)}" OR "${phoneDigits.slice(-10)}" OR "${phoneDigits.slice(-9)}"`);
  }

  // FASE 9: Email username as social handle + CRM name combo search
  if (emailUser) {
    queries.push(`"${emailUser}" "${name}" OR "${crmSurname}"`);
  }

  // Execute all searches in parallel (max 12)
  const finalQueries = queries.slice(0, 12);
  const searchPromises = finalQueries.map((q) =>
    searchWeb(q).catch(() => [] as WebResearchResult[])
  );
  const searchResults = await Promise.all(searchPromises);

  // Flatten, deduplicate, and annotate with which query found each result
  const seen = new Set<string>();
  const allResults: WebResearchResult[] = [];
  // Dynamic labels based on query content
  const queryLabels = finalQueries.map((q) => {
    if (q.includes('allintext:')) return 'Busca email direto';
    if (q.includes('site:linkedin')) return 'LinkedIn';
    if (q.includes('site:instagram')) return 'Instagram';
    if (q.includes('site:facebook')) return 'Facebook';
    if (q.includes('escavador') || q.includes('jusbrasil') || q.includes('consultasocio')) return 'Registros oficiais';
    if (/^\"\d/.test(q)) return 'Telefone';
    if (q.includes(emailUser) && q.includes(crmSurname)) return 'Username + sobrenome';
    return 'Nome + contexto';
  });
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

  const osintPrompt = `Você é um investigador OSINT de elite especializado em perfis de leads para equipes comerciais.
Sua missão: construir o perfil MAIS COMPLETO possível desta pessoa usando TODAS as pistas disponíveis.

══════════ DADOS DO LEAD (PIPEDRIVE) ══════════
- Nome no CRM: ${name}
- Telefone: ${phone || 'Não informado'} ${ddd ? `(DDD ${ddd} = ${dddState || 'estado desconhecido'})` : ''}
- E-mail: ${email || 'Não informado'}
- Profissão: ${profissao || 'Não informada'}
- Localização do imóvel: ${cidade || 'Não informada'}
- Nacionalidade: ${lead.nacionalidade || 'Não informada'}
- Estado Civil: ${lead.estado_civil || 'Não informado'}
${extraFields ? `\nCAMPOS EXTRAS DO PIPEDRIVE:\n${extraFields}` : ''}

══════════ ANÁLISE DO EMAIL (PONTO DE ANCORAGEM MAIS IMPORTANTE) ══════════
- Email: ${email || 'N/A'}
- Username: ${emailUser || 'N/A'}
- Decomposição: partes alfabéticas = [${emailParts.join(', ')}] | dígitos = [${numericParts.join(', ')}]
- Nomes derivados do email: ${emailDerivedNames.join(' | ') || 'N/A'}
${inferredAge ? `- 🎂 ${inferredAge}` : '- Sem dígitos que indiquem idade no email'}
- Usernames prováveis: ${uniqueUsernames.join(', ') || 'N/A'}

ATENÇÃO: O nome no CRM pode estar DIFERENTE do nome real. Exemplos:
- CRM diz "Maria Saundres" mas o email "srosy712" revela que ela usa "Rosy" e o sobrenome pode ser "Saunders" (com 'e' trocado)
- Nomes compostos brasileiros: Maria Rosineide → usa "Rosy" no dia a dia
- SEMPRE considere que o email pode revelar um nome mais preciso que o do CRM

══════════ VALIDAÇÃO GEOGRÁFICA ══════════
- DDD: ${ddd || 'N/A'} → Estado: ${dddState || 'N/A'}
- Cidade do imóvel: ${cidade || 'N/A'}

══════════ RESULTADOS DAS ${finalQueries.length} BUSCAS (${allResults.length} resultados únicos) ══════════
${searchContext || 'Nenhum resultado encontrado'}

══════════ METODOLOGIA OBRIGATÓRIA (SIGA TODOS OS PASSOS) ══════════

1. DECOMPOSIÇÃO PROFUNDA DO EMAIL "${emailUser}":
   - Separe letras de números: ex. "srosy712" → "srosy" + "712"
   - Teste a primeira letra como inicial: "srosy" → "S. Rosy" → nome provável "Rosy" com inicial "S" do sobrenome (ou vice-versa)
   - Números podem indicar: ano nascimento (712→1971? 85→1985?), data especial, ou número aleatório
   - Compare o nome inferido com o nome do CRM: se o email sugere "Rosy" e o CRM tem "Maria Saundres", pode ser "Maria Rosy Saunders"
   - EMAILS SÃO A MELHOR PISTA — dedique uma análise profunda

2. VALIDAÇÃO GEOGRÁFICA:
   - DDD ${ddd || 'N/A'} confirma região (${dddState || '?'}). Use para filtrar homônimos.
   - Se a cidade do imóvel é diferente do estado do DDD, a pessoa pode morar em outro lugar.

3. IDENTIFICAÇÃO EM REDES SOCIAIS:
   - "${emailUser}" provavelmente É o username do Instagram/Facebook/Twitter da pessoa
   - Busque combinações: @${emailUser}, @${uniqueUsernames.slice(0, 3).join(', @')}
   - Redes de pessoas mais velhas (50+): priorize Facebook. Mais jovens: Instagram.
   - Se encontrou perfil privado, ainda é valioso — mencione e descreva o que é visível.

4. REGISTROS PROFISSIONAIS E EMPRESARIAIS:
   - Busque em Escavador, ConsultaSocio, Receita Federal
   - Use TODAS as variações do nome (CRM e email-derivado)
   - Identifique profissão, empresas, CNPJ, situação cadastral

5. CRUZAMENTO E SÍNTESE:
   - Cruze TODAS as fontes para construir o perfil mais completo
   - Se dois resultados mencionam a mesma pessoa/local/profissão → confiança ALTA
   - Para cada achado importante, CITE o resultado # como evidência

⚠️ REGRAS ABSOLUTAS:
- NÃO diga "não foi possível identificar" sem antes TENTAR TODAS as deduções acima
- MESMO COM POUCOS RESULTADOS, faça inferências inteligentes baseadas no email, DDD, e contexto
- Se encontrou QUALQUER pista, construa hipóteses a partir dela
- URLs de redes sociais: construa a URL provável mesmo que não tenha confirmação (ex: instagram.com/${emailUser})
- Foque no que é ÚTIL para um VENDEDOR que vai entrar numa reunião em minutos
- Números no email SEMPRE merecem análise (idade, ano, data)

Responda EXCLUSIVAMENTE em JSON válido:
{
  "pessoa_identificada": "Nome completo real identificado (pode ser diferente do CRM!) + cargo/profissão + cidade. Ex: 'Maria Rosineide Saunders (Rosy), área de Estética/Vendas, Maceió/AL'. SEMPRE inclua o nome que a pessoa USA no dia a dia entre parênteses se diferente.",
  "nivel_confianca": "Alto|Médio|Baixo — DETALHAMENTO: quantas fontes confirmam, quais cruzamentos foram feitos, o que falta para aumentar a confiança",
  "redes_sociais": [
    {"plataforma": "LinkedIn", "url": "URL encontrada ou URL construída provável (linkedin.com/in/username)", "descricao": "Cargo, empresa, experiência. Se não encontrou perfil confirmado, diga que variações buscadas e se existem perfis similares."},
    {"plataforma": "Instagram", "url": "URL encontrada ou construída: instagram.com/${emailUser}", "descricao": "Username, se é público ou privado, bio visível, tipo de conteúdo, observações para rapport. SE O USERNAME DO EMAIL FOR O MESMO DO INSTAGRAM, MENCIONE ISSO."},
    {"plataforma": "Facebook", "url": "URL encontrada ou buscas feitas", "descricao": "Nome no Facebook (pode ser diferente do CRM), cidade, trabalho, interesses, fotos públicas relevantes"}
  ],
  "historico_profissional": "OBRIGATÓRIO: Mesmo com poucos dados, CONSTRUA hipóteses. Ex: 'Baseado no email (rosy = nome artístico/profissional) e na localização (Maceió/AL), e no interesse em locação por temporada do imóvel, Maria Rosy possivelmente atua como empresária autônoma ou profissional liberal no setor de serviços/estética.' Use 3-5 frases. Se tem dados concretos, detalhe: formação, empresas, cargos, registros profissionais.",
  "empresas_cnpj": "Empresas onde aparece como sócio/proprietário. CNPJ, razão social, situação. Se nada encontrado com nome do CRM, TENTE com o nome derivado do email. Diga explicitamente o que foi buscado.",
  "contexto_publico": "Diários oficiais, processos judiciais, publicações acadêmicas, notícias. INCLUA: análise do telefone (apareceu em OLX, WhatsApp Business, classificados?). Se os dígitos do email sugerem idade, MENCIONE. Qualquer detalhe público que ajude a entender quem é esta pessoa.",
  "evidencias": ["Evidência 1 — resultado #X: descrição específica (fonte: site)", "Evidência 2 — análise do email: decomposição ${emailUser} → [partes] → dedução", "Evidência 3 — DDD ${ddd} confirma ${dddState}, cruzado com resultado #Y", "Evidência 4 — username @${emailUser} encontrado em [rede] (resultado #Z)"],
  "resumo_para_closer": "BRIEFING PRÁTICO PARA A REUNIÃO (6-8 frases): 1) Quem é esta pessoa (nome REAL, não o do CRM se for diferente, profissão, cidade/estado). 2) Faixa etária provável (baseada nos dígitos do email ou outros indícios). 3) Perfil financeiro (baseado em profissão/empresas encontradas). 4) Como gerar rapport (interesses das redes sociais, hobbies, estilo de vida). 5) Por que está interessado em imóvel (dados do Pipedrive: temporada, investimento, moradia). 6) Pontos de ATENÇÃO (deals perdidos anteriores, nome diferente no CRM vs real, informações conflitantes). 7) Abordagem recomendada."
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
