import type { Lead, BriefingResult } from '../types/lead';
import { getApiKeys } from './api-keys';

export async function generateBriefing(lead: Lead, historicalSummary?: string): Promise<BriefingResult> {
  const keys = getApiKeys();
  const apiKey = keys.gemini;

  if (!apiKey) {
    throw new Error('Chave da API Gemini não configurada. Vá em Configurações (ícone ⚙️) para adicionar sua chave.');
  }

  const customFieldsText =
    lead.allCustomFields && Object.keys(lead.allCustomFields).length > 0
      ? Object.entries(lead.allCustomFields)
          .filter(([, v]) => v)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join('\n')
      : '';

  const notesText = lead.notesContent || 'Sem anotações registradas';
  const historyText = lead.lostDealsHistory || 'Primeiro contato - sem histórico anterior';

  const prompt = `Você é um assistente de vendas especializado em investimentos imobiliários de short-stay da Seazone, empresa líder em gestão de imóveis de temporada no Brasil.

Gere um briefing completo para preparar um closer (vendedor) antes de uma reunião com um lead/investidor. O briefing deve ser em português brasileiro.

DADOS DO LEAD:
- Nome: ${lead.nome_investidor}
- Profissão: ${lead.profissao}
- Estado Civil: ${lead.estado_civil}
- Nacionalidade: ${lead.nacionalidade}
- Email: ${lead.e_mail}
- Telefone: ${lead.telefone}
- Valor do Negócio: R$ ${lead.valor.toLocaleString('pt-BR')}
- Empreendimento de Interesse: ${lead.empreendimento}
- Cidade do Imóvel: ${lead.cidade_onde_fica_o_imovel}
- Canal de Origem: ${lead.canal}
- Tipo de Venda: ${lead.tipo_de_venda}
- Data da Reunião: ${lead.data_da_reuniao}
- Observações: ${lead.observacoes_longo || 'Sem observações'}
- Score: ${lead.score}/100
- Total de Atividades: ${lead.total_de_atividades} (${lead.atividades_concluidas} concluídas)
- Emails trocados: ${lead.numero_de_mensagens_de_e_mail}
- Notas: ${lead.notes_count}
- Etapa no Funil: ${lead.etapa}

${customFieldsText ? `CAMPOS EXTRAS DO PIPEDRIVE:
${customFieldsText}

` : ''}ANOTAÇÕES DO DEAL (mais recentes primeiro):
${notesText}

HISTÓRICO COM A SEAZONE (DEALS ANTERIORES):
${historyText}

${historicalSummary ? `HISTÓRICO COMPLETO DO DEAL (CHANGELOG, ATIVIDADES, CADÊNCIAS, TRANSBORDO):
${historicalSummary}

` : ''}SOBRE A SEAZONE:
- Gestão profissional de imóveis de temporada (short-stay)
- Rentabilidade média de 8-12% ao ano
- Mais de 2.000 imóveis sob gestão em todo o Brasil
- Modelo de gestão completa: da captação à manutenção
- Escritórios em Florianópolis, São Paulo, e outras capitais

INSTRUÇÕES IMPORTANTES:
- O RESUMO EXECUTIVO deve ser COMPLETO e DETALHADO (4-6 frases): incluir quem é o lead, como chegou, o que a MIA descobriu na conversa, como foi o atendimento (cadências, transbordo, ligações), e a situação atual. Use dados reais das notas e do histórico.
- ANALISE PROFUNDAMENTE as anotações do deal — elas contêm dados valiosos da qualificação da MIA (Morada AI): tipo de imóvel, endereço, área, número de quartos, mobília, ar-condicionado, objetivo do investimento, orçamento, prazo, etc.
- Se o HISTÓRICO COMPLETO DO DEAL estiver disponível, USE-O para enriquecer o resumo: mencione quantas cadências foram feitas, se houve transbordo, quantas ligações/emails foram tentados, e quem atendeu o lead em cada etapa.
- Se existem deals perdidos anteriores, analise POR QUE foram perdidos e COMO abordar diferente desta vez — isto é CRÍTICO para o closer
- NÃO seja genérico: use o NOME do lead, o EMPREENDIMENTO específico, a CIDADE, o VALOR, e todos os dados disponíveis nas suas respostas
- Se o email do lead sugere informações (domínio corporativo, números que indicam idade), USE essa informação
- As PERGUNTAS SUGERIDAS devem ser personalizadas com o nome do lead e contexto específico (não perguntas genéricas de vendas)
- As OPORTUNIDADES e RISCOS devem ser específicas para ESTE lead, não genéricas sobre investimento imobiliário
- Se algum campo do lead estiver vazio, infere com base no contexto disponível (notas, email, telefone DDD, título do deal)
- Responda EXCLUSIVAMENTE em JSON válido, sem markdown, sem backticks, sem texto antes ou depois do JSON, com esta estrutura exata:
{
  "resumo": "Resumo executivo COMPLETO do lead em 4-6 frases, incluindo histórico de atendimento, dados da conversa MIA e situação atual",
  "pontos_chave": ["ponto 1", "ponto 2", "ponto 3", "ponto 4", "ponto 5"],
  "estrategia_abordagem": "Estratégia detalhada de abordagem para esta reunião em 3-4 frases",
  "perguntas_sugeridas": ["pergunta 1", "pergunta 2", "pergunta 3", "pergunta 4"],
  "riscos": ["risco 1", "risco 2", "risco 3"],
  "oportunidades": ["oportunidade 1", "oportunidade 2", "oportunidade 3"]
}`;

  const model = 'gemini-2.5-flash';
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingBudget: 1024 },
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 300)}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    const raw = await response.text();
    throw new Error(`Gemini retornou resposta inválida (não-JSON): ${raw.slice(0, 300)}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;

  // Check for API-level errors in the response body
  if (d.error) {
    throw new Error(`Gemini API: ${d.error.message ?? JSON.stringify(d.error).slice(0, 300)}`);
  }

  // Check for blocked/empty candidates
  if (!d.candidates || d.candidates.length === 0) {
    const reason = d.promptFeedback?.blockReason ?? 'unknown';
    throw new Error(`Gemini bloqueou a resposta (reason: ${reason}). Tente com outro lead.`);
  }

  const candidate = d.candidates[0];
  if (candidate.finishReason && candidate.finishReason !== 'STOP' && candidate.finishReason !== 'MAX_TOKENS') {
    throw new Error(`Gemini finishReason: ${candidate.finishReason}. Conteúdo pode ter sido bloqueado.`);
  }

  // Extract text from response parts
  const parts: { text?: string; thought?: boolean }[] = candidate.content?.parts ?? [];

  // Prefer non-thought parts, fallback to any part with text
  const text =
    parts.filter((p) => !p.thought).map((p) => p.text ?? '').join('') ||
    parts.map((p) => p.text ?? '').join('');

  if (!text) {
    throw new Error(`Resposta vazia do Gemini. Parts: ${JSON.stringify(parts).slice(0, 200)}`);
  }

  // Clean up: strip markdown fences if present
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Extract JSON object if surrounded by extra text
  if (!cleaned.startsWith('{')) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) cleaned = match[0];
  }

  try {
    return JSON.parse(cleaned) as BriefingResult;
  } catch {
    throw new Error(`JSON inválido do Gemini: ${cleaned.slice(0, 200)}`);
  }
}
