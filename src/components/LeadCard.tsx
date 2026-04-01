import type { Lead } from '../types/lead';
import { formatCurrency, formatDate, getScoreColor, getStatusLabel, getStatusColor } from '../lib/utils';
import { User, Calendar, MapPin, Building2, DollarSign, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  lead: Lead;
}

export default function LeadCard({ lead }: Props) {
  const scoreColor = getScoreColor(lead.score);
  const statusLabel = getStatusLabel(lead.score);
  const statusColor = getStatusColor(lead.score);

  return (
    <Link
      to={`/lead/${lead.id}`}
      className="block group"
    >
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-orange-500/50 hover:bg-gray-900/80 transition-all duration-200 cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center">
              <User className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors">
                {lead.nome_investidor}
              </h3>
              <p className="text-sm text-gray-400">{lead.profissao || 'Investidor'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${scoreColor}`}>{lead.score}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full text-white ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div className="flex items-center gap-2 text-gray-400">
            <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">{formatCurrency(lead.valor)}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="truncate">{lead.empreendimento || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{lead.cidade_onde_fica_o_imovel || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{formatDate(lead.data_da_reuniao)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-800">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>{lead.canal || lead.origem}</span>
            <span>•</span>
            <span>{lead.tipo_de_venda}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition-colors" />
        </div>
      </div>
    </Link>
  );
}
