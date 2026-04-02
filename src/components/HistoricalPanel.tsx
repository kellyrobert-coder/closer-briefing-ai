import type { HistoricalData, ClassifiedActivity } from '../lib/historical';
import {
  Clock, ArrowRightLeft, Phone, Mail, MessageCircle,
  Calendar, Bot, CheckCircle2, XCircle, AlertCircle, Activity
} from 'lucide-react';

interface Props {
  data: HistoricalData;
}

function StatusIcon({ status }: { status: '✅' | '❌' | '⚠️' }) {
  if (status === '✅') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === '❌') return <XCircle className="w-4 h-4 text-red-400" />;
  return <AlertCircle className="w-4 h-4 text-amber-400" />;
}

function CategoryIcon({ category }: { category: ClassifiedActivity['category'] }) {
  switch (category) {
    case 'cadencia_mia': return <Bot className="w-3.5 h-3.5 text-purple-400" />;
    case 'ligacao': return <Phone className="w-3.5 h-3.5 text-blue-400" />;
    case 'email': return <Mail className="w-3.5 h-3.5 text-cyan-400" />;
    case 'whatsapp': return <MessageCircle className="w-3.5 h-3.5 text-green-400" />;
    case 'reuniao': return <Calendar className="w-3.5 h-3.5 text-orange-400" />;
    default: return <Activity className="w-3.5 h-3.5 text-gray-400" />;
  }
}

function categoryLabel(cat: ClassifiedActivity['category']): string {
  switch (cat) {
    case 'cadencia_mia': return 'Cadência MIA';
    case 'ligacao': return 'Ligação';
    case 'email': return 'E-mail';
    case 'whatsapp': return 'WhatsApp';
    case 'reuniao': return 'Reunião';
    default: return 'Outro';
  }
}

function formatDate(d: string): string {
  if (!d) return '—';
  const [date] = d.split(' ');
  const parts = date.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
}

export default function HistoricalPanel({ data }: Props) {
  const { stageTable, ownerChanges, classifiedActivities, miaFields, miaRelato, transbordoTimestamp } = data;

  return (
    <div className="space-y-4">
      {/* Stage Classification Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold text-white">Análise das Etapas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-gray-400 font-medium pb-2 pr-4">Etapa</th>
                <th className="text-center text-gray-400 font-medium pb-2 px-2 w-14">Status</th>
                <th className="text-left text-gray-400 font-medium pb-2 pl-4">Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {stageTable.map((row, i) => (
                <tr key={i} className="border-b border-gray-800/50">
                  <td className="py-2.5 pr-4 text-gray-300 whitespace-nowrap">{row.etapa}</td>
                  <td className="py-2.5 px-2 text-center">
                    <div className="flex items-center justify-center">
                      <StatusIcon status={row.status} />
                    </div>
                  </td>
                  <td className="py-2.5 pl-4 text-gray-400 text-xs">{row.detalhe}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MIA Summary */}
      {(miaFields.respondeu_mia || miaRelato || miaFields.agente) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-white">Atendimento MIA</h3>
          </div>
          <div className="space-y-2 text-sm">
            {miaFields.respondeu_mia && (
              <div className="flex gap-2">
                <span className="text-gray-500 shrink-0">Respondeu:</span>
                <span className={miaFields.respondeu_mia.toLowerCase() === 'sim' ? 'text-emerald-400' : 'text-gray-300'}>
                  {miaFields.respondeu_mia}
                </span>
              </div>
            )}
            {miaFields.agente && (
              <div className="flex gap-2">
                <span className="text-gray-500 shrink-0">Agente:</span>
                <span className="text-gray-300">{miaFields.agente}</span>
              </div>
            )}
            {miaFields.etapa_final_cadencia && (
              <div className="flex gap-2">
                <span className="text-gray-500 shrink-0">Etapa final cadência:</span>
                <span className="text-gray-300">{miaFields.etapa_final_cadencia}</span>
              </div>
            )}
            {miaFields.step_cadencia && (
              <div className="flex gap-2">
                <span className="text-gray-500 shrink-0">Passo cadência:</span>
                <span className="text-gray-300">{miaFields.step_cadencia}</span>
              </div>
            )}
            {miaRelato && (
              <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <p className="text-xs text-gray-500 mb-1 font-medium">Relato da MIA:</p>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{miaRelato.slice(0, 600)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Owner Timeline */}
      {ownerChanges.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRightLeft className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white">Histórico de Proprietários</h3>
          </div>
          <div className="space-y-2">
            {ownerChanges.map((oc, i) => {
              const isTransbordo = oc.timestamp === transbordoTimestamp;
              return (
                <div key={i} className={`flex items-start gap-3 text-sm ${isTransbordo ? 'bg-purple-500/10 -mx-2 px-2 py-1.5 rounded-lg border border-purple-500/20' : ''}`}>
                  <Clock className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-gray-500">{formatDate(oc.timestamp)}</span>
                    <span className="text-gray-600 mx-1">—</span>
                    <span className="text-gray-400">{oc.oldOwner}</span>
                    <span className="text-gray-600 mx-1">→</span>
                    <span className="text-gray-300">{oc.newOwner}</span>
                    {isTransbordo && <span className="ml-2 text-xs text-purple-400 font-medium">TRANSBORDO</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Activities Timeline */}
      {classifiedActivities.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-5 h-5 text-orange-400" />
            <h3 className="font-semibold text-white">Timeline de Atividades</h3>
            <span className="text-xs text-gray-500 ml-auto">{classifiedActivities.length} atividades</span>
          </div>
          <div className="space-y-2">
            {classifiedActivities.map((a, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <CategoryIcon category={a.category} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-gray-500 text-xs">{formatDate(a.date)}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${
                      a.category === 'cadencia_mia' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                      a.category === 'ligacao' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      a.category === 'email' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                      a.category === 'whatsapp' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      a.category === 'reuniao' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      'bg-gray-500/10 text-gray-400 border-gray-500/20'
                    }`}>
                      {categoryLabel(a.category)}
                    </span>
                    <span className="text-gray-500 text-xs">{a.ownerName}</span>
                    {a.done && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5 truncate">{a.subject}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
