import type { Lead, BriefingResult } from '../types/lead';
import { getApiKeys } from './api-keys';

export async function generateBriefing(lead: Lead): Promise<BriefingResult> {
  const keys = getApiKeys();
  const apiKey = keys.gemini;

  if (!apiKey) {
    throw new Error('Chave da API Gemini não configurada. Vá em Configurações (ícone ⚙️) para adicionar sua chave.');
  }

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

SOBRE A SEAZONE:
- Gestão profissional de imóveis de temporada (short-stay)
- Rentabilidade média de 8-12% ao ano
- Mais de 2.000 imóveis sob gestão em todo o Brasil
- Modelo de gestão completa: da captação à manutenção
- Escritórios em Florianópolis, São Paulo, e outras capitais

Responda EXCLUSIVAMENTE em JSON válido (sem markdown, sem backticks, sem texto fora do JSON) com esta estrutura exata:
{
  "resumo": "Resumo executivo do lead em 2-3 frases",
  "pontos_chave": ["ponto 1", "ponto 2", "ponto 3", "ponto 4", "ponto 5"],
  "estrategia_abordagem": "Estratégia detalhada de abordagem para esta reunião em 3-4 frases",
  "perguntas_sugeridas": ["pergunta 1", "pergunta 2", "pergunta 3", "pergunta 4"],
  "riscos": ["risco 1", "risco 2", "risco 3"],
  "oportunidades": ["oportunidade 1", "oportunidade 2", "oportunidade 3"]
}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response from Gemini');
  }

  // Clean up response - remove markdown code blocks if present
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    return JSON.parse(cleaned) as BriefingResult;
  } catch {
    throw new Error('Failed to parse Gemini response as JSON');
  }
}
