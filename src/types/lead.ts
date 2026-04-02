export interface Lead {
  id: number;
  titulo: string;
  status: string;
  valor: number;
  nome_investidor: string;
  telefone: string;
  e_mail: string;
  profissao: string;
  estado_civil: string;
  nacionalidade: string;
  cidade_onde_fica_o_imovel: string;
  canal: string;
  origem: string;
  tipo_de_venda: string;
  empreendimento: string;
  plano: string;
  pre_vendedor_a: string;
  deal_owner_name: string;
  data_da_reuniao: string;
  data_de_qualificacao: string;
  observacoes_longo: string;
  total_de_atividades: number;
  atividades_concluidas: number;
  notes_count: number;
  numero_de_mensagens_de_e_mail: number;
  etapa: string;
  funil: string;
  negocio_criado_em: string;
  atualizado_em: string;
  score: number;
  notesContent?: string;
  lostDealsHistory?: string;
  allCustomFields?: Record<string, string>;
}

export interface BriefingResult {
  resumo: string;
  pontos_chave: string[];
  estrategia_abordagem: string;
  perguntas_sugeridas: string[];
  riscos: string[];
  oportunidades: string[];
}

export interface WebResearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
}

export interface OsintProfile {
  pessoa_identificada: string;
  nivel_confianca: string;
  redes_sociais: { plataforma: string; url: string; descricao: string }[];
  historico_profissional: string;
  empresas_cnpj: string;
  contexto_publico: string;
  evidencias: string[];
  resumo_para_closer: string;
}

export interface ApiKeys {
  gemini: string;
  serpapi: string;
  pipedrive: string;
}
