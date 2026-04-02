import type { Lead } from '../types/lead';
import type { FlowEntry, DealActivityItem } from './pipedrive';
import {
  fetchDealFlow,
  fetchDealActivities,
  fetchDealRaw,
  fetchUsers,
  getDealMiaFields,
} from './pipedrive';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface OwnerChange {
  timestamp: string;
  oldOwner: string;
  newOwner: string;
}

export interface StageChange {
  timestamp: string;
  oldStage: string;
  newStage: string;
  userName: string;
}

export interface ClassifiedActivity {
  category: 'cadencia_mia' | 'ligacao' | 'email' | 'whatsapp' | 'reuniao' | 'outro';
  subject: string;
  date: string;
  ownerName: string;
  done: boolean;
  note: string;
  daysSinceCreation: number;
}

export interface StageRow {
  etapa: string;
  status: '✅' | '❌' | '⚠️';
  detalhe: string;
}

export interface MiaFields {
  respondeu_mia: string;
  step_cadencia: string;
  data_ultima_cadencia: string;
  hora_ultima_cadencia: string;
  etapa_final_cadencia: string;
  pular_cadencia: string;
  rd_campanha: string;
  predio_b2b: string;
  status_reuniao: string;
  motivo_lost_mia: string;
  link_conversa: string;
  hora_reuniao_mia: string;
  data_reuniao_mia: string;
  cidade_mia: string;
  agente: string;
}

export interface HistoricalData {
  // Raw data
  flowEntries: FlowEntry[];
  activities: DealActivityItem[];
  miaFields: MiaFields;

  // Parsed
  ownerChanges: OwnerChange[];
  stageChanges: StageChange[];
  classifiedActivities: ClassifiedActivity[];
  miaRelato: string | null;
  transbordoTimestamp: string | null;
  transbordoFrom: string;
  transbordoTo: string;

  // Stage classification table
  stageTable: StageRow[];

  // Full text summary for Gemini
  summaryText: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function daysBetween(dateA: string, dateB: string): number {
  if (!dateA || !dateB) return 0;
  const a = new Date(dateA);
  const b = new Date(dateB);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function hoursBetween(dateA: string, dateB: string): number {
  if (!dateA || !dateB) return 0;
  const a = new Date(dateA);
  const b = new Date(dateB);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60));
}

function timeSince(creation: string, event: string): string {
  if (!creation || !event) return '';
  const h = hoursBetween(creation, event);
  if (isNaN(h) || h === 0) return '';
  if (h < 24) return `${h}h após criação`;
  const d = daysBetween(creation, event);
  return `${d}d após criação`;
}

function classifyActivity(a: DealActivityItem, creationDate: string): ClassifiedActivity {
  const subj = (a.subject || '').toLowerCase();
  const noteL = (a.note || '').toLowerCase();

  let category: ClassifiedActivity['category'] = 'outro';

  const ownerL = (a.ownerName || '').toLowerCase();
  if (subj.includes('tentativa de contato pela mia') || subj.includes('cadência') ||
      (ownerL.includes('automac') || ownerL.includes('autômato') || ownerL.includes('morada'))) {
    category = 'cadencia_mia';
  } else if (a.type === 'call' || subj.includes('ligação') || subj.includes('ligacao') ||
      noteL.includes('ligação para')) {
    category = 'ligacao';
  } else if (a.type === 'email' || subj.includes('e-mail') || subj.includes('email')) {
    category = 'email';
  } else if (subj.includes('whatsapp') || a.type === 'whatsapp_chat') {
    category = 'whatsapp';
  } else if (a.type === 'reuniao' || subj.includes('reunião') || subj.includes('pré agendamento') ||
      subj.includes('pre agendamento')) {
    category = 'reuniao';
  }

  const eventDate = a.addTime || a.dueDate;
  return {
    category,
    subject: a.subject,
    date: eventDate,
    ownerName: a.ownerName,
    done: a.done,
    note: a.note,
    daysSinceCreation: eventDate && creationDate ? daysBetween(creationDate, eventDate) : 0,
  };
}

function extractMiaRelato(notesContent: string | undefined): string | null {
  if (!notesContent) return null;
  // Look for MIA relato pattern in notes
  const patterns = [
    /# Relato enviado[\s\S]*?(?=\n\n\d{4}-|\n\n$|$)/i,
    /Relato enviado[\s\S]*?(?=\n\n\d{4}-|\n\n$|$)/i,
    /AGENDA MIA[\s\S]*?(?=\n\n\d{4}-|\n\n$|$)/i,
    /CONFIRMAÇÃO DE AGENDAMENTO[\s\S]*?(?=\n\n\d{4}-|\n\n$|$)/i,
  ];
  for (const pat of patterns) {
    const match = notesContent.match(pat);
    if (match) return match[0].trim();
  }
  // Also look for notes by "Morada - Mia" or "Automacao"
  const lines = notesContent.split('\n\n');
  for (const block of lines) {
    if (block.toLowerCase().includes('morada') || block.toLowerCase().includes('automac')) {
      if (block.length > 50) return block.trim();
    }
  }
  return null;
}

// ─── Main builder ────────────────────────────────────────────────────────────
export async function buildHistoricalData(
  lead: Lead,
  apiToken: string
): Promise<HistoricalData> {
  // Fetch all data in parallel
  const [flowEntries, activities, rawDeal, userMap] = await Promise.all([
    fetchDealFlow(lead.id, apiToken).catch(() => [] as FlowEntry[]),
    fetchDealActivities(lead.id, apiToken).catch(() => [] as DealActivityItem[]),
    fetchDealRaw(lead.id, apiToken).catch(() => ({} as Record<string, unknown>)),
    fetchUsers(apiToken).catch(() => new Map<string, string>()),
  ]);

  const rawMia = getDealMiaFields(rawDeal);
  const miaFields: MiaFields = {
    respondeu_mia: rawMia.respondeu_mia || '',
    step_cadencia: rawMia.step_cadencia || '',
    data_ultima_cadencia: rawMia.data_ultima_cadencia || '',
    hora_ultima_cadencia: rawMia.hora_ultima_cadencia || '',
    etapa_final_cadencia: rawMia.etapa_final_cadencia || '',
    pular_cadencia: rawMia.pular_cadencia || '',
    rd_campanha: rawMia.rd_campanha || '',
    predio_b2b: rawMia.predio_b2b || '',
    status_reuniao: rawMia.status_reuniao || '',
    motivo_lost_mia: rawMia.motivo_lost_mia || '',
    link_conversa: rawMia.link_conversa || '',
    hora_reuniao_mia: rawMia.hora_reuniao_mia || '',
    data_reuniao_mia: rawMia.data_reuniao_mia || '',
    cidade_mia: rawMia.cidade_mia || '',
    agente: rawMia.agente || '',
  };
  const creationDate = lead.negocio_criado_em || '';

  // Parse owner changes from flow (resolve user IDs to names)
  const ownerChanges: OwnerChange[] = flowEntries
    .filter((e) => e.fieldKey === 'user_id')
    .map((e) => ({
      timestamp: e.timestamp,
      oldOwner: userMap.get(e.oldValue) || e.oldValue,
      newOwner: userMap.get(e.newValue) || e.newValue,
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Parse stage changes
  const stageChanges: StageChange[] = flowEntries
    .filter((e) => e.fieldKey === 'stage_id')
    .map((e) => ({
      timestamp: e.timestamp,
      oldStage: e.oldValue,
      newStage: e.newValue,
      userName: e.userName,
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // Detect transbordo (Mia/Automacao → SDR)
  let transbordoTimestamp: string | null = null;
  let transbordoFrom = '';
  let transbordoTo = '';
  for (const oc of ownerChanges) {
    const oldL = (oc.oldOwner || '').toLowerCase();
    if (oldL.includes('morada') || oldL.includes('mia') || oldL.includes('automac') || oldL.includes('autômato')) {
      transbordoTimestamp = oc.timestamp;
      transbordoFrom = oc.oldOwner;
      transbordoTo = oc.newOwner;
      break;
    }
  }

  // Classify activities
  const classifiedActivities = activities
    .map((a) => classifyActivity(a, creationDate))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Extract MIA relato from notes
  const miaRelato = extractMiaRelato(lead.notesContent);

  // Build stage classification table
  const cadencias = classifiedActivities.filter((a) => a.category === 'cadencia_mia');
  const ligacoes = classifiedActivities.filter((a) => a.category === 'ligacao');
  const emails = classifiedActivities.filter((a) => a.category === 'email');

  const stageTable: StageRow[] = [];

  // 1. Lead respondeu à Mia
  const respMia = miaFields.respondeu_mia?.toLowerCase();
  if (respMia === 'sim' || respMia === 'true' || respMia === '1') {
    stageTable.push({ etapa: 'Lead respondeu à Mia', status: '✅', detalhe: `Campo: ${miaFields.respondeu_mia}` });
  } else if (respMia === 'não' || respMia === 'nao' || respMia === 'false' || respMia === '0') {
    stageTable.push({ etapa: 'Lead respondeu à Mia', status: '❌', detalhe: `Campo: ${miaFields.respondeu_mia}` });
  } else if (miaRelato) {
    stageTable.push({ etapa: 'Lead respondeu à Mia', status: '⚠️', detalhe: 'Relato encontrado nas notas' });
  } else {
    stageTable.push({ etapa: 'Lead respondeu à Mia', status: '⚠️', detalhe: miaFields.respondeu_mia || 'Indeterminado' });
  }

  // 2. 1ª cadência
  if (cadencias.length >= 1) {
    const c1 = cadencias[0];
    stageTable.push({
      etapa: '1ª Cadência (MIA)',
      status: '✅',
      detalhe: `${c1.date.split(' ')[0]} — ${timeSince(creationDate, c1.date)}`,
    });
  } else {
    stageTable.push({ etapa: '1ª Cadência (MIA)', status: '❌', detalhe: 'Não encontrada' });
  }

  // 3. 2ª cadência
  const stepNum = Number(miaFields.step_cadencia) || 0;
  if (cadencias.length >= 2) {
    const c2 = cadencias[1];
    stageTable.push({
      etapa: '2ª Cadência (MIA)',
      status: '✅',
      detalhe: `${c2.date.split(' ')[0]} — ${timeSince(creationDate, c2.date)}`,
    });
  } else if (stepNum >= 2 && !miaFields.data_ultima_cadencia && cadencias.length < 2) {
    stageTable.push({
      etapa: '2ª Cadência (MIA)',
      status: '❌',
      detalhe: `Erro: step_cadencia=${stepNum} mas sem disparo detectado`,
    });
  } else {
    stageTable.push({ etapa: '2ª Cadência (MIA)', status: '❌', detalhe: 'Não encontrada' });
  }

  // 4. Transbordo
  if (transbordoTimestamp) {
    stageTable.push({
      etapa: 'Transbordo',
      status: '✅',
      detalhe: `${transbordoFrom} → ${transbordoTo} em ${transbordoTimestamp.split(' ')[0]}`,
    });
  } else {
    stageTable.push({ etapa: 'Transbordo', status: '❌', detalhe: 'Sem registro de transbordo' });
  }

  // 5. Tentativa de ligação
  if (ligacoes.length > 0) {
    const first = ligacoes[0];
    stageTable.push({
      etapa: 'Tentativa de ligação',
      status: '✅',
      detalhe: `${ligacoes.length}x — 1ª: ${first.date.split(' ')[0]} (${first.ownerName}) — ${timeSince(creationDate, first.date)}`,
    });
  } else {
    stageTable.push({ etapa: 'Tentativa de ligação', status: '❌', detalhe: 'Nenhuma ligação encontrada' });
  }

  // 6. Envio de e-mail
  if (emails.length > 0) {
    const first = emails[0];
    stageTable.push({
      etapa: 'Envio de e-mail',
      status: '✅',
      detalhe: `${emails.length}x — 1º: ${first.date.split(' ')[0]} (${first.ownerName}) — ${timeSince(creationDate, first.date)}`,
    });
  } else {
    stageTable.push({ etapa: 'Envio de e-mail', status: '❌', detalhe: 'Nenhum e-mail encontrado' });
  }

  // Build full summary text for Gemini prompt
  const whatsapps = classifiedActivities.filter((a) => a.category === 'whatsapp');
  const reunioes = classifiedActivities.filter((a) => a.category === 'reuniao');
  const outros = classifiedActivities.filter((a) => a.category === 'outro');

  let summaryText = `📖 HISTÓRICO COMPLETO — ${lead.nome_investidor}\n\n`;

  summaryText += `🗓️ Criação: ${lead.negocio_criado_em} — Criado por ${lead.deal_owner_name || '—'}\n`;
  summaryText += `   Pipe: ${lead.funil} | Etapa: ${lead.etapa} | Canal: ${lead.canal || '—'}\n`;
  if (miaFields.rd_campanha) summaryText += `   Campanha RD: ${miaFields.rd_campanha}\n`;
  if (miaFields.predio_b2b) summaryText += `   Prédio B2B: ${miaFields.predio_b2b}\n`;

  summaryText += `\n🤖 Atendimento pela Mia:\n`;
  if (miaRelato) {
    summaryText += `   Relato encontrado nas notas:\n   ${miaRelato.replace(/\n/g, '\n   ')}\n`;
  } else {
    summaryText += `   Sem relato da Mia nas notas.\n`;
  }
  summaryText += `   Campo "Respondeu MIA": ${miaFields.respondeu_mia || 'não preenchido'}\n`;
  summaryText += `   Agente: ${miaFields.agente || '—'}\n`;
  if (miaFields.link_conversa) {
    const isAI = miaFields.link_conversa.includes('/conversations/');
    summaryText += `   Link conversa: ${isAI ? 'IA acionada (/conversations/)' : 'Humano (/talk/)'}\n`;
  } else {
    summaryText += `   Link conversa: sem link\n`;
  }

  summaryText += `\n🔄 Transbordo:\n`;
  if (transbordoTimestamp) {
    summaryText += `   ${transbordoTimestamp} — ${transbordoFrom} → ${transbordoTo}\n`;
  } else {
    summaryText += `   Sem registro de transbordo no changelog.\n`;
  }

  // Owner changes timeline
  if (ownerChanges.length > 0) {
    summaryText += `   Histórico de proprietários:\n`;
    for (const oc of ownerChanges) {
      summaryText += `   ${oc.timestamp.split(' ')[0]} — ${oc.oldOwner} → ${oc.newOwner}\n`;
    }
  }

  summaryText += `\n📲 Cadências de contato:\n`;
  if (cadencias.length > 0) {
    cadencias.forEach((c, i) => {
      summaryText += `   ${i + 1}ª cadência: ✅ ${c.date.split(' ')[0]} — ${timeSince(creationDate, c.date)} (${c.ownerName})\n`;
    });
  } else {
    summaryText += `   Nenhuma cadência encontrada\n`;
  }
  summaryText += `   Campo step_cadencia: ${miaFields.step_cadencia || '—'} | data_ultima_cadencia: ${miaFields.data_ultima_cadencia || '—'}\n`;
  if (miaFields.etapa_final_cadencia) summaryText += `   Etapa final cadência: ${miaFields.etapa_final_cadencia}\n`;
  if (miaFields.pular_cadencia) summaryText += `   Pular cadência: ${miaFields.pular_cadencia}\n`;

  summaryText += `\n📞 Ligações registradas:\n`;
  if (ligacoes.length > 0) {
    for (const l of ligacoes) {
      summaryText += `   ${l.date.split(' ')[0]} — ${l.ownerName} — ${timeSince(creationDate, l.date)}\n`;
      if (l.note) summaryText += `      ${l.note.slice(0, 150)}\n`;
    }
  } else {
    summaryText += `   Nenhuma ligação encontrada\n`;
  }

  summaryText += `\n📧 E-mails registrados:\n`;
  if (emails.length > 0) {
    for (const e of emails) {
      summaryText += `   ${e.date.split(' ')[0]} — ${e.ownerName} — ${timeSince(creationDate, e.date)}\n`;
    }
  } else {
    summaryText += `   Nenhum e-mail encontrado\n`;
  }

  if (whatsapps.length > 0) {
    summaryText += `\n💬 WhatsApp:\n`;
    for (const w of whatsapps) {
      summaryText += `   ${w.date.split(' ')[0]} — ${w.ownerName} — ${w.subject.slice(0, 100)}\n`;
    }
  }

  if (reunioes.length > 0) {
    summaryText += `\n📅 Reuniões/Agendamentos:\n`;
    for (const r of reunioes) {
      summaryText += `   ${r.date.split(' ')[0]} — ${r.ownerName} — ${r.subject.slice(0, 100)}\n`;
      if (r.note) summaryText += `      ${r.note.slice(0, 150)}\n`;
    }
  }

  if (outros.length > 0) {
    summaryText += `\n📋 Outras atividades:\n`;
    for (const o of outros) {
      summaryText += `   ${o.date.split(' ')[0]} — ${o.ownerName} — ${o.subject.slice(0, 100)}\n`;
    }
  }

  summaryText += `\n📍 Situação atual:\n`;
  summaryText += `   Etapa: ${lead.etapa} | Status: ${lead.status}\n`;
  summaryText += `   Responsável: ${lead.deal_owner_name || '—'}\n`;
  if (miaFields.status_reuniao) summaryText += `   Status Reunião: ${miaFields.status_reuniao}\n`;
  if (miaFields.data_reuniao_mia) summaryText += `   Data Reunião MIA: ${miaFields.data_reuniao_mia} ${miaFields.hora_reuniao_mia || ''}\n`;

  summaryText += `\n🏷️ Classificação das etapas:\n`;
  for (const row of stageTable) {
    summaryText += `   ${row.status} ${row.etapa}: ${row.detalhe}\n`;
  }

  return {
    flowEntries,
    activities,
    miaFields,
    ownerChanges,
    stageChanges,
    classifiedActivities,
    miaRelato,
    transbordoTimestamp,
    transbordoFrom,
    transbordoTo,
    stageTable,
    summaryText,
  };
}
