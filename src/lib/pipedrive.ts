import type { Lead } from '../types/lead';

const BASE = 'https://api.pipedrive.com/v1';

// ─── Module-level cache for deal fields ────────────────────────────────────
let dealFieldsCache: Map<string, DealField> | null = null;

// ─── Company domain cache ──────────────────────────────────────────────────
let companyDomainCache: string | null = null;

export async function fetchCompanyDomain(apiToken: string): Promise<string> {
  if (companyDomainCache) return companyDomainCache;
  try {
    const res = await fetch(`${BASE}/users/me?api_token=${apiToken}`);
    if (!res.ok) return '';
    const data = await res.json();
    const domain = data?.data?.company_domain || '';
    if (domain) companyDomainCache = domain;
    return domain;
  } catch {
    return '';
  }
}

export function getPipedriveDeepLink(companyDomain: string, dealId: number): string {
  if (companyDomain) {
    return `https://${companyDomain}.pipedrive.com/deal/${dealId}`;
  }
  return `https://app.pipedrive.com/deal/${dealId}`;
}

// ─── Custom field hash keys (from GET /v1/dealFields) ────────────────────────
const F = {
  NOME_INVESTIDOR:   'd0ac708e265df3324f6c217f2f96526132479e3b',
  TELEFONE:          '145c0d27deafcc3bf3298867ee88db1d770050da',
  EMAIL:             '6c9ac3132a67cd17c2de3e65f2958896eb34daf0',
  PROFISSAO:         '513842e3c26022708be47ac08075e719fa366dbe',
  ESTADO_CIVIL:      'a99270a44f7fabae328750f26155fc8b652d6766',
  NACIONALIDADE:     '874c52cec53c7eb63f001d790d1448f7eabb7c2c',
  CIDADE:            '45a56c6ae1f43dad4992c3c23d4a2a32787d93d6',
  EMPREENDIMENTO:    '6d565fd4fce66c16da078f520a685fa2fa038272',
  PRE_VENDEDOR:      '34a7f4f5f78e8a8d4751ddfb3cfcfb224d8ff908',
  DATA_QUALIFICACAO: 'bc74bcc4326527cbeb331d1697d4c8812d68506e',
  TIPO_VENDA:        '7c49d85470c1c8a553fa0faee757883157b7830b',
  CANAL:             '93b3ada8b94bd1fc4898a25754d6bcac2713f835',
  ORIGEM:            'f0e7dc75928ee7be1d26b6ed65df1e26e944468d',
  DATA_REUNIAO:      'bfafc352c5c6f2edbaa41bf6d1c6daa825fc9c16',
  OBSERVACOES:       '1f91c7451cf87c5f7e69b4af88e04ee0b3655358',
};

// ─── Enum option maps ─────────────────────────────────────────────────────────
const ESTADO_CIVIL: Record<string, string> = {
  '4076': 'Solteiro(a)',
  '4077': 'Casado(a)',
  '4078': 'Divorciado(a)',
  '4079': 'União Estável',
  '4080': 'Viúvo(a)',
};

const TIPO_VENDA: Record<string, string> = {
  '467': 'Parceiro',
  '468': 'Interna',
  '503': 'Permuta',
  '2605': 'Private',
  '3425': 'Indicação Cliente',
};

const CANAL: Record<string, string> = {
  '10': 'Indicação de Clientes',
  '12': 'Marketing',
  '276': 'Prospecção Ativa',
  '543': 'Indicação de Colaborador',
  '582': 'Indicação de Corretor',
  '583': 'Indicação de Franquia',
  '622': 'Indicação de Hóspede',
  '623': 'Cliente SZN',
  '804': 'Portais de imóveis',
  '830': 'Indicação de Embaixador',
  '1748': 'Expansão',
  '2876': 'Indicação de Parceiros',
  '3142': 'Colaborador Seazone',
  '3189': 'Spot Seazone',
};

const EMPREENDIMENTO: Record<string, string> = {
  '461': 'Vistas de Anitá I', '462': 'Barra Spot', '463': 'Rosa Sul Spot',
  '464': 'Ingleses Spot', '465': 'Urubici Spot', '466': 'Japaratinga Spot',
  '490': 'Penha Spot', '492': 'Aguardando definição', '504': 'Rosa Spot',
  '505': 'Lagoa Spot', '506': 'Jurerê Spot', '510': 'Downtown',
  '636': 'Olímpia Spot', '637': 'Vistas de Anitá II', '692': 'Canela Spot',
  '824': 'Top Club', '828': 'Imbassaí Spot', '1124': 'Pio 4',
  '1125': 'Duetto', '1126': 'Maxxi Garden', '1127': 'Mosaico',
  '1128': 'Reflect', '1129': 'T58', '1132': 'Barra de São Miguel Spot',
  '1171': 'Trancoso Spot', '1447': 'Salvador Spot', '2324': 'Campeche Spot',
  '2415': 'Vale do Ouro', '2526': 'Urubici Spot II', '2573': 'Canasvieiras Spot',
  '2607': 'Ilha do Campeche Spot', '2745': 'VN Ueno', '2795': 'Rosa Norte Spot',
  '2835': 'Cachoeira Spot', '2840': 'Batel Spot', '2868': 'Sul America Spot',
  '2897': 'Foz Spot', '2906': 'Jurerê Beach Spot', '3049': 'Ponta das Canas Spot',
  '3169': 'Itacaré Spot', '3229': 'Marista 144 Spot', '3257': 'Salvador Spot II',
  '3266': 'Cachoeira Beach Spot', '3303': 'Bonito Spot', '3313': 'Altavista',
  '3416': 'Caraguá Spot', '3451': 'Bonito Spot II', '3478': 'Barra Grande Spot',
  '3533': 'Ponta das Canas Spot II', '3594': 'Rosa Sul Spot II', '3641': 'Foz Spot II',
  '4090': 'Canas Beach Spot',
};

// ─── Type definitions ─────────────────────────────────────────────────────────
interface DealField {
  id: number;
  key: string;
  name: string;
  type: string;
  options?: { id: number; label: string }[];
}

interface DealNote {
  content: string;
  addTime: string;
  userName: string;
}

interface PersonDeal {
  id: number;
  title: string;
  status: string;
  lost_reason: string;
  value: number;
  add_time: string;
}

// ─── Type helpers ─────────────────────────────────────────────────────────────
function enumVal(map: Record<string, string>, val: unknown): string {
  if (!val) return '';
  return map[String(val)] ?? String(val);
}

function str(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function formatPhone(val: unknown): string {
  if (!val) return '';
  const s = String(val).trim();
  // Already formatted (person phone)
  if (s.startsWith('+')) return s;
  // Large numeric → add +
  const n = Number(s);
  if (!isNaN(n) && n > 10000000000) return '+' + String(Math.round(n));
  return s;
}

function extractPersonEmail(personId: unknown): string {
  if (!personId || typeof personId !== 'object') return '';
  const p = personId as { email?: { value: string; primary?: boolean }[] };
  const emails = p.email || [];
  const primary = emails.find((e) => e.primary);
  return (primary || emails[0])?.value || '';
}

function extractPersonPhone(personId: unknown): string {
  if (!personId || typeof personId !== 'object') return '';
  const p = personId as { phone?: { value: string; primary?: boolean }[] };
  const phones = p.phone || [];
  const primary = phones.find((ph) => ph.primary);
  return (primary || phones[0])?.value || '';
}

function preVendedorName(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'object' && val !== null) {
    return (val as { name?: string }).name || '';
  }
  return str(val);
}

// ─── Main mapping: raw Pipedrive deal → Lead ──────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dealToLead(deal: Record<string, any>): Lead {
  // Phone: prefer person phone (already formatted), then custom field
  const personPhone = extractPersonPhone(deal.person_id);
  const customPhone = formatPhone(deal[F.TELEFONE]);
  const telefone = personPhone || customPhone;

  // Email: prefer person email, then custom field
  const personEmail = extractPersonEmail(deal.person_id);
  const customEmail = str(deal[F.EMAIL]);
  const email = personEmail || customEmail;

  // Name: prefer custom field, then person name, then title
  const nomeInvestidor =
    str(deal[F.NOME_INVESTIDOR]) ||
    (deal.person_id as { name?: string } | null)?.name ||
    str(deal.title);

  return {
    id: deal.id,
    titulo: str(deal.title),
    status: str(deal.status) || 'open',
    valor: Number(deal.value) || 0,
    nome_investidor: nomeInvestidor,
    telefone,
    e_mail: email,
    profissao: str(deal[F.PROFISSAO]),
    estado_civil: enumVal(ESTADO_CIVIL, deal[F.ESTADO_CIVIL]),
    nacionalidade: str(deal[F.NACIONALIDADE]),
    cidade_onde_fica_o_imovel: str(deal[F.CIDADE]),
    canal: enumVal(CANAL, deal[F.CANAL]),
    origem: str(deal[F.ORIGEM]),
    tipo_de_venda: enumVal(TIPO_VENDA, deal[F.TIPO_VENDA]),
    empreendimento: enumVal(EMPREENDIMENTO, deal[F.EMPREENDIMENTO]),
    plano: '',
    pre_vendedor_a: preVendedorName(deal[F.PRE_VENDEDOR]),
    deal_owner_name: (deal.user_id as { name?: string } | null)?.name || '',
    data_da_reuniao: str(deal[F.DATA_REUNIAO]),
    data_de_qualificacao: str(deal[F.DATA_QUALIFICACAO]),
    observacoes_longo: str(deal[F.OBSERVACOES]),
    total_de_atividades: Number(deal.activities_count) || 0,
    atividades_concluidas: Number(deal.done_activities_count) || 0,
    notes_count: Number(deal.notes_count) || 0,
    numero_de_mensagens_de_e_mail: Number(deal.email_messages_count) || 0,
    etapa: str(deal.stage_id),
    funil: str(deal.pipeline_id),
    negocio_criado_em: str(deal.add_time).slice(0, 10),
    atualizado_em: str(deal.update_time).slice(0, 10),
    score: 0,
  };
}

// ─── Search result mapping (less data available) ──────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function searchItemToLead(item: Record<string, any>): Lead {
  return {
    id: item.id,
    titulo: str(item.title),
    status: str(item.status) || 'open',
    valor: Number(item.value) || 0,
    nome_investidor: item.person?.name || str(item.title),
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

// ─── New helper functions ─────────────────────────────────────────────────────
export async function fetchDealFields(apiToken: string): Promise<Map<string, DealField>> {
  if (dealFieldsCache) {
    return dealFieldsCache;
  }

  const url = `${BASE}/dealFields?limit=500&api_token=${apiToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pipedrive dealFields API ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error('Pipedrive dealFields: ' + (data.error || 'Erro'));

  dealFieldsCache = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (data.data || []).forEach((field: any) => {
    dealFieldsCache!.set(field.key, {
      id: field.id,
      key: field.key,
      name: field.name,
      type: field.field_type,
      options: field.options || [],
    });
  });

  return dealFieldsCache;
}

export async function fetchDealNotes(dealId: number, apiToken: string): Promise<DealNote[]> {
  const url = `${BASE}/deals/${dealId}/notes?limit=50&sort=add_time%20DESC&api_token=${apiToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pipedrive notes API ${res.status}`);
  const data = await res.json();
  if (!data.success) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.data || []).map((note: any) => ({
    content: (note.content || '').replace(/<[^>]*>/g, ''),
    addTime: note.add_time || '',
    userName: note.user?.name || 'Unknown',
  }));
}

export async function fetchPersonDeals(personId: number, apiToken: string): Promise<PersonDeal[]> {
  const url = `${BASE}/persons/${personId}/deals?status=all_not_deleted&limit=100&api_token=${apiToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pipedrive person deals API ${res.status}`);
  const data = await res.json();
  if (!data.success) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.data || []).map((deal: any) => ({
    id: deal.id,
    title: deal.title || '',
    status: deal.status || '',
    lost_reason: deal.lost_reason || '',
    value: Number(deal.value) || 0,
    add_time: deal.add_time || '',
  }));
}

export async function fetchDealAllFields(dealId: number, apiToken: string): Promise<Record<string, string>> {
  const url = `${BASE}/deals/${dealId}?api_token=${apiToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pipedrive deal API ${res.status}`);
  const data = await res.json();
  if (!data.success) return {};

  const dealData = data.data;
  const fields = await fetchDealFields(apiToken);
  const result: Record<string, string> = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Object.entries(dealData).forEach(([key, value]: [string, any]) => {
    const field = fields.get(key);
    if (!field) return;

    // Skip empty/null/zero values and nested objects
    if (value === null || value === undefined || value === '' || value === '0') return;
    if (typeof value === 'object') return;

    let strValue = String(value).trim();
    if (!strValue) return;

    // Try to resolve enum fields
    if (field.type === 'enum' && field.options && !isNaN(Number(value))) {
      const numVal = Number(value);
      const option = field.options.find((o) => o.id === numVal);
      if (option) {
        strValue = option.label;
      }
    }

    result[field.name] = strValue;
  });

  return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export async function searchDeals(term: string, apiToken: string): Promise<Lead[]> {
  if (!term.trim()) return [];

  // If the search term is a numeric ID, fetch the deal directly
  const trimmed = term.trim();
  if (/^\d+$/.test(trimmed)) {
    try {
      const lead = await fetchDeal(Number(trimmed), apiToken);
      return [lead];
    } catch {
      // If direct fetch fails (deal not found), fall through to text search
    }
  }

  const url = `${BASE}/deals/search?term=${encodeURIComponent(trimmed)}&status=open&limit=20&api_token=${apiToken}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pipedrive API ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  if (!data.success) throw new Error('Pipedrive: ' + (data.error || 'Erro desconhecido'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.data?.items || []).map((i: any) => searchItemToLead(i.item));
}

export async function fetchDeal(id: number, apiToken: string): Promise<Lead & { _rawPersonId?: number }> {
  const url = `${BASE}/deals/${id}?api_token=${apiToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pipedrive API ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error('Pipedrive: ' + (data.error || 'Erro'));
  const lead = dealToLead(data.data);
  // Attach raw person_id for later use
  const personIdObj = data.data.person_id;
  if (personIdObj && typeof personIdObj === 'object' && 'value' in personIdObj) {
    (lead as any)._rawPersonId = personIdObj.value;
  }
  return lead;
}

export interface UpcomingMeeting {
  dealId: number;
  nomeLead: string;
  dataReuniao: string; // YYYY-MM-DD
  horaReuniao: string; // HH:MM or ''
}

export async function fetchUpcomingMeetings(_apiToken: string): Promise<UpcomingMeeting[]> {
  const today = new Date().toISOString().split('T')[0];

  // Load pre-built meetings snapshot from Nekt (includes meeting times)
  const base = import.meta.env.BASE_URL ?? '/';
  const jsonUrl = base.replace(/\/$/, '') + '/upcoming-meetings.json';

  try {
    const res = await fetch(jsonUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const all: UpcomingMeeting[] = await res.json();
    // Filter to today and future, sort asc
    return all
      .filter((m) => m.dataReuniao >= today)
      .sort((a, b) => {
        const d = a.dataReuniao.localeCompare(b.dataReuniao);
        return d !== 0 ? d : a.horaReuniao.localeCompare(b.horaReuniao);
      });
  } catch {
    return [];
  }
}
