import type { Lead } from '../types/lead';
import { formatCurrency, formatDate, formatPhone, getScoreColor, getStatusLabel, getStatusColor } from '../lib/utils';
import {
  User, Mail, Phone, MapPin, Building2, DollarSign,
  Calendar, Briefcase, Heart, Flag, Activity,
  MessageSquare, FileText, GitBranch
} from 'lucide-react';

interface Props {
  lead: Lead;
}

export default function LeadInfoPanel({ lead }: Props) {
  const completionRate = lead.total_de_atividades > 0
    ? Math.round((lead.atividades_concluidas / lead.total_de_atividades) * 100)
    : 0;

  // Map etapa numbers to funnel stages
  const funnelStages = [
    { name: 'Qualificação', threshold: 180 },
    { name: 'Reunião', threshold: 190 },
    { name: 'Proposta', threshold: 195 },
    { name: 'Negociação', threshold: 200 },
    { name: 'Fechamento', threshold: 210 },
  ];

  const currentStageIndex = funnelStages.findIndex(
    (s) => parseInt(lead.etapa) <= s.threshold
  );
  const stageProgress = currentStageIndex === -1
    ? funnelStages.length
    : currentStageIndex + 1;

  return (
    <div className="space-y-4">
      {/* Lead Header */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
            <User className="w-8 h-8 text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white">{lead.nome_investidor}</h2>
              <span className={`text-xs px-2.5 py-1 rounded-full text-white ${getStatusColor(lead.score)}`}>
                {getStatusLabel(lead.score)}
              </span>
            </div>
            <p className="text-gray-400 text-sm mt-1">{lead.profissao || 'Investidor'}</p>
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className={`font-bold text-2xl ${getScoreColor(lead.score)}`}>
                {lead.score}
              </span>
              <span className="text-gray-500">/100 Score</span>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider text-gray-400">Contato</h3>
        <div className="space-y-3">
          <InfoRow icon={<Mail className="w-4 h-4 text-blue-400" />} label="Email" value={lead.e_mail} />
          <InfoRow icon={<Phone className="w-4 h-4 text-emerald-400" />} label="Telefone" value={formatPhone(lead.telefone)} />
          <InfoRow icon={<Briefcase className="w-4 h-4 text-purple-400" />} label="Profissão" value={lead.profissao} />
          <InfoRow icon={<Heart className="w-4 h-4 text-rose-400" />} label="Estado Civil" value={lead.estado_civil} />
          <InfoRow icon={<Flag className="w-4 h-4 text-amber-400" />} label="Nacionalidade" value={lead.nacionalidade} />
        </div>
      </div>

      {/* Deal Info */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider text-gray-400">Negócio</h3>
        <div className="space-y-3">
          <InfoRow icon={<DollarSign className="w-4 h-4 text-emerald-400" />} label="Valor" value={formatCurrency(lead.valor)} />
          <InfoRow icon={<Building2 className="w-4 h-4 text-blue-400" />} label="Empreendimento" value={lead.empreendimento} />
          <InfoRow icon={<MapPin className="w-4 h-4 text-rose-400" />} label="Cidade" value={lead.cidade_onde_fica_o_imovel} />
          <InfoRow icon={<Calendar className="w-4 h-4 text-amber-400" />} label="Reunião" value={formatDate(lead.data_da_reuniao)} />
          <InfoRow icon={<GitBranch className="w-4 h-4 text-cyan-400" />} label="Canal" value={lead.canal || lead.origem} />
        </div>
      </div>

      {/* Funnel Progress */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider text-gray-400">Progresso no Funil</h3>
        <div className="flex items-center gap-1">
          {funnelStages.map((stage, i) => (
            <div key={i} className="flex-1">
              <div
                className={`h-2 rounded-full transition-colors ${
                  i < stageProgress
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                    : 'bg-gray-700'
                }`}
              />
              <p className={`text-xs mt-1.5 text-center ${
                i < stageProgress ? 'text-orange-400' : 'text-gray-600'
              }`}>
                {stage.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Stats */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider text-gray-400">Atividades</h3>
        <div className="grid grid-cols-2 gap-3">
          <StatBox
            icon={<Activity className="w-4 h-4 text-orange-400" />}
            label="Atividades"
            value={`${lead.atividades_concluidas}/${lead.total_de_atividades}`}
            sublabel={`${completionRate}% concluídas`}
          />
          <StatBox
            icon={<Mail className="w-4 h-4 text-blue-400" />}
            label="Emails"
            value={String(lead.numero_de_mensagens_de_e_mail)}
            sublabel="trocados"
          />
          <StatBox
            icon={<FileText className="w-4 h-4 text-purple-400" />}
            label="Notas"
            value={String(lead.notes_count)}
            sublabel="registradas"
          />
          <StatBox
            icon={<MessageSquare className="w-4 h-4 text-emerald-400" />}
            label="Tipo"
            value={lead.tipo_de_venda || '—'}
            sublabel="de venda"
          />
        </div>
      </div>

      {/* Notes */}
      {lead.observacoes_longo && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider text-gray-400">Observações</h3>
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
