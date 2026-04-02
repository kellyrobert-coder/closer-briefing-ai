import type { Lead } from '../types/lead';

const BASE = 'https://api.pipedrive.com/v1';

// Raw Pipedrive types
interface PdPerson {
  name?: string;
  email?: { value: string; primary?: boolean }[];
  phone?: { value: string; primary?: boolean }[];
}

interface PdDeal {
  id: number;
  title: string;
  value: number;
  status: string;
  stage_id: number;
  pipeline_id: number;
  add_time: string;
  update_time: string;
  close_time: string | null;
  expected_close_date: string | null;
  person_id?: PdPerson & { value?: number };
  owner_name?: string;
  stage_name?: string;
  pipeline_name?: string;
  // custom fields (keys are hash strings)
  [key: string]: unknown;
}

interface PdSearchItem {
  id: number;
  title: string;
  value: number;
  status: string;
  stage?: { id: number; name: string };
  owner?: { id: number; name: string };
  person?: { id: number; name: string };
  pipeline?: { id: number; name: string };
}

function extractEmail(person?: PdPerson): string {
  if (!person?.email?.length) return '';
  const primary = person.email.find((e) => e.primary);
  return (primary || person.email[0])?.value || '';
}

function extractPhone(person?: PdPerson): string {
  if (!person?.phone?.length) return '';
  const primary = person.phone.find((p) => p.primary);
  return (primary || person.phone[0])?.value || '';
}

function searchItemToLead(item: PdSearchItem): Lead {
  return {
    id: item.id,
    titulo: item.title,
    status: item.status || 'open',
    valor: item.value || 0,
    nome_investidor: item.person?.name || item.title,
    telefone: '',
    e_mail: '',
    profissao: '',
    estado_civil: '',
    nacionalidade: '',
    cidade_onde_fica_o_imovel: '',
    canal: '',
    origem: '',
    tipo_de_venda: '',
    empreendimento: '',
    plano: '',
    pre_vendedor_a: '',
    deal_owner_name: item.owner?.name || '',
    data_da_reuniao: '',
    data_de_qualificacao: '',
    observacoes_longo: '',
    total_de_atividades: 0,
    atividades_concluidas: 0,
    notes_count: 0,
    numero_de_mensagens_de_e_mail: 0,
    etapa: item.stage?.name || '',
    funil: item.pipeline?.name || '',
    negocio_criado_em: '',
    atualizado_em: '',
    score: 0,
  };
}

function dealToLead(deal: PdDeal): Lead {
  const person = deal.person_id as PdPerson | undefined;
  return {
    id: deal.id,
    titulo: deal.title,
    status: deal.status || 'open',
    valor: deal.value || 0,
    nome_investidor: person?.name || deal.title,
    telefone: extractPhone(person),
    e_mail: extractEmail(person),
    profissao: '',
    estado_civil: '',
    nacionalidade: '',
    cidade_onde_fica_o_imovel: '',
    canal: '',
    origem: '',
    tipo_de_venda: '',
    empreendimento: '',
    plano: '',
    pre_vendedor_a: '',
    deal_owner_name: deal.owner_name || '',
    data_da_reuniao: deal.expected_close_date || '',
    data_de_qualificacao: '',
    observacoes_longo: '',
    total_de_atividades: 0,
    atividades_concluidas: 0,
    notes_count: 0,
    numero_de_mensagens_de_e_mail: 0,
    etapa: deal.stage_name || String(deal.stage_id || ''),
    funil: deal.pipeline_name || String(deal.pipeline_id || ''),
    negocio_criado_em: deal.add_time?.slice(0, 10) || '',
    atualizado_em: deal.update_time?.slice(0, 10) || '',
    score: 0,
  };
}

export async function searchDeals(term: string, apiToken: string): Promise<Lead[]> {
  if (!term.trim()) return [];
  const url = `${BASE}/deals/search?term=${encodeURIComponent(term)}&status=open&limit=20&api_token=${apiToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pipedrive API ${res.status}: ${text.slice(0, 120)}`);
  }
  const data = await res.json();
  if (!data.success) throw new Error('Pipedrive: ' + (data.error || 'Erro desconhecido'));
  const items: PdSearchItem[] = (data.data?.items || []).map((i: { item: PdSearchItem }) => i.item);
  return items.map(searchItemToLead);
}

export async function fetchDeal(id: number, apiToken: string): Promise<Lead> {
  const url = `${BASE}/deals/${id}?api_token=${apiToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pipedrive API ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error('Pipedrive: ' + (data.error || 'Erro'));

  const deal = data.data as PdDeal;

  // Also fetch activities count
  try {
    const actUrl = `${BASE}/deals/${id}/activities?api_token=${apiToken}`;
    const actRes = await fetch(actUrl);
    if (actRes.ok) {
      const actData = await actRes.json();
      const activities = actData.data || [];
      const lead = dealToLead(deal);
      lead.total_de_atividades = activities.length;
      lead.atividades_concluidas = activities.filter((a: { done: boolean }) => a.done).length;
      return lead;
    }
  } catch {
    // ignore activity errors
  }

  return dealToLead(deal);
}
