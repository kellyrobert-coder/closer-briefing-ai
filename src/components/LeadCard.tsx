import type { Lead } from '../types/lead';
import { formatCurrency, formatDate } from '../lib/utils';
import { User, Calendar, MapPin, Building2, DollarSign, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  lead: Lead;
}

export default function LeadCard({ lead }: Props) {
  return (
    <Link to={`/lead/${lead.id}`} className="block group">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-orange-500/50 hover:bg-gray-900/80 transition-all duration-200 cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors leading-tight">
                {lead.nome_investidor || lead.titulo}
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">{lead.profissao || lead.canal || lead.funil || 'Lead'}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-orange-400 transition-colors mt-1 shrink-0" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="truncate">{lead.valor > 0 ? formatCurrency(lead.valor) : 'A definir'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="truncate">{lead.empreendimento || lead.etapa || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">{lead.cidade_onde_fica_o_imovel || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-400">
            <Calendar className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">{formatDate(lead.data_da_reuniao) || 'Sem data'}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
