import type { Lead } from '../types/lead';
import type { SeazoneClientInfo } from '../lib/seazone-lookup';
import { formatCurrency, formatDate, formatDateTime, formatPhone } from '../lib/utils';
import {
  User, Mail, Phone, MapPin, Building2, DollarSign,
  Calendar, Briefcase, Activity, ExternalLink, Hash,
  MessageSquare, FileText, GitBranch, Star, Home, Loader2, UserCheck,
  Bot, Video, MessageCircle
} from 'lucide-react';

interface Props {
  lead: Lead;
  clienteSeazone?: SeazoneClientInfo | null;
  checkingCliente?: boolean;
  pipedriveUrl?: string;
}

export default function LeadInfoPanel({ lead, clienteSeazone, checkingCliente, pipedriveUrl }: Props) {
  const completionRate = lead.total_de_atividades > 0
    ? Math.round((lead.atividades_concluidas / lead.total_de_atividades) * 100)
    : 0;

  // Show etapa label (may be a name or numeric ID)
  const etapaLabel = lead.etapa && isNaN(Number(lead.etapa)) ? lead.etapa : lead.funil || lead.etapa;

  return (
    <div className="space-y-4">
      {/* Lead Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
            <User className="w-8 h-8 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white">{lead.nome_investidor || lead.titulo}</h2>
            <p className="text-gray-400 text-sm mt-1">{lead.profissao || lead.canal || 'Lead Pipedrive'}</p>
            {etapaLabel && (
              <span className="inline-block mt-2 text-xs px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                {etapaLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Cliente Seazone Badge */}
      {checkingCliente ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-orange-400 shrink-0" />
          Verificando histórico na base Seazone...
        </div>
      ) : clienteSeazone ? (
        <SeazoneClientBadge info={clienteSeazone} />
      ) : lead.e_mail ? (
        <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-500 text-sm">
          <UserCheck className="w-4 h-4 text-gray-600 shrink-0" />
          Novo prospect — sem histórico na base Seazone
        </div>
      ) : null}

      {/* Contact Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-gray-400">Contato</h3>
        <div className="space-y-3">
          <InfoRow icon={<Mail className="w-4 h-4 text-blue-400" />} label="Email" value={lead.e_mail} />
          <InfoRow icon={<Phone className="w-4 h-4 text-emerald-400" />} label="Telefone" value={formatPhone(lead.telefone)} />
          <InfoRow icon={<Briefcase className="w-4 h-4 text-purple-400" />} label="Profissão" value={lead.profissao} />
          <InfoRow icon={<Hash className="w-4 h-4 text-gray-400" />} label="Deal ID" value={String(lead.id)} />
          <InfoRowLink
            icon={<ExternalLink className="w-4 h-4 text-orange-400" />}
            label="Pipedrive"
            value="Abrir no Pipedrive"
            href={pipedriveUrl || `https://app.pipedrive.com/deal/${lead.id}`}
          />
        </div>
      </div>

      {/* Deal Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-gray-400">Negócio</h3>
        <div className="space-y-3">
          <InfoRow
            icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
            label="Valor"
            value={lead.valor > 0 ? formatCurrency(lead.valor) : 'A definir'}
          />
          <InfoRow icon={<Building2 className="w-4 h-4 text-blue-400" />} label="Empreendimento" value={lead.empreendimento} />
          <InfoRow icon={<MapPin className="w-4 h-4 text-rose-400" />} label="Cidade" value={lead.cidade_onde_fica_o_imovel} />
          <InfoRow icon={<Calendar className="w-4 h-4 text-amber-400" />} label="Reunião" value={formatDateTime(lead.data_da_reuniao)} />
          <InfoRow icon={<GitBranch className="w-4 h-4 text-cyan-400" />} label="Canal" value={lead.canal || lead.origem} />
          <InfoRow icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Criado em" value={formatDate(lead.negocio_criado_em)} />
        </div>
      </div>

      {/* MIA Info */}
      {(lead.link_conversa || lead.link_reuniao_mia || lead.agente) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-gray-400">MIA (Morada AI)</h3>
          <div className="space-y-3">
            {lead.link_conversa && (
              <InfoRowLink
                icon={<MessageCircle className="w-4 h-4 text-cyan-400" />}
                label="Conversa MIA"
                value="Abrir conversa"
                href={lead.link_conversa}
              />
            )}
            {lead.link_reuniao_mia && (
              <InfoRowLink
                icon={<Video className="w-4 h-4 text-blue-400" />}
                label="Link Reunião"
                value="Abrir reunião"
                href={lead.link_reuniao_mia}
              />
            )}
            {lead.agente && (
              <InfoRow icon={<Bot className="w-4 h-4 text-purple-400" />} label="Agente" value={lead.agente} />
            )}
          </div>
        </div>
      )}

      {/* Activity Stats */}
      {(lead.total_de_atividades > 0 || lead.notes_count > 0 || lead.numero_de_mensagens_de_e_mail > 0) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-gray-400">Atividades</h3>
          <div className="grid grid-cols-2 gap-3">
            {lead.total_de_atividades > 0 && (
              <StatBox
                icon={<Activity className="w-4 h-4 text-orange-400" />}
                label="Atividades"
                value={`${lead.atividades_concluidas}/${lead.total_de_atividades}`}
                sublabel={`${completionRate}% concluídas`}
              />
            )}
            {lead.numero_de_mensagens_de_e_mail > 0 && (
              <StatBox
                icon={<Mail className="w-4 h-4 text-blue-400" />}
                label="Emails"
                value={String(lead.numero_de_mensagens_de_e_mail)}
                sublabel="trocados"
              />
            )}
            {lead.notes_count > 0 && (
              <StatBox
                icon={<FileText className="w-4 h-4 text-purple-400" />}
                label="Notas"
                value={String(lead.notes_count)}
                sublabel="registradas"
              />
            )}
            {lead.tipo_de_venda && (
              <StatBox
                icon={<MessageSquare className="w-4 h-4 text-emerald-400" />}
                label="Tipo"
                value={lead.tipo_de_venda}
                sublabel="de venda"
              />
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {lead.observacoes_longo && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-gray-400">Observações</h3>
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
            {lead.observacoes_longo}
          </p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
      <span className="text-sm text-gray-300 truncate">{value || '—'}</span>
    </div>
  );
}

function InfoRowLink({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href: string }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-orange-400 hover:text-orange-300 underline underline-offset-2 truncate">
        {value}
      </a>
    </div>
  );
}

function StatBox({ icon, label, value, sublabel }: { icon: React.ReactNode; label: string; value: string; sublabel: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500">{sublabel}</p>
    </div>
  );
}

function SeazoneClientBadge({ info }: { info: SeazoneClientInfo }) {
  const isSZI = info.tipo === 'SZI' || info.tipo === 'SZI+SZS';
  const isSZS = info.tipo === 'SZS' || info.tipo === 'SZI+SZS';
  const isAtivo = info.status === 'ATIVO';

  return (
    <div className="bg-gradient-to-br from-emerald-950/60 to-teal-950/60 border border-emerald-500/30 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-5 h-5 text-emerald-400 fill-emerald-400/30" />
        <h3 className="font-semibold text-emerald-300 text-sm uppercase tracking-wider">
          Já é Cliente Seazone
        </h3>
        <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${
          isAtivo
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : 'bg-gray-700/50 text-gray-400 border border-gray-600/30'
        }`}>
          {info.status}
        </span>
      </div>

      <div className="space-y-2">
        {isSZI && info.empreendimentos.length > 0 && (
          <div className="flex items-start gap-3">
            <Building2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 mb-1">Investidor SZI — Empreendimento(s):</p>
              <div className="flex flex-wrap gap-1.5">
                {info.empreendimentos.map((emp) => (
                  <span
                    key={emp}
                    className="text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-full px-2.5 py-0.5"
                  >
                    {emp}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {isSZS && (
          <div className="flex items-center gap-3">
            <Home className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Anfitrião SZS</p>
              <p className="text-sm text-cyan-300">Imóvel em gestão pela Seazone</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
