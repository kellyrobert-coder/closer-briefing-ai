import { useState, useMemo } from 'react';
import { Search, Users, TrendingUp, Calendar, Database, Loader2 } from 'lucide-react';
import Header from '../components/Header';
import LeadCard from '../components/LeadCard';
import { useLeads } from '../contexts/LeadsContext';

export default function Dashboard() {
  const { leads, loading, error } = useLeads();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return leads;
    const lower = searchTerm.toLowerCase();
    return leads.filter(
      (l) =>
        (l.nome_investidor || '').toLowerCase().includes(lower) ||
        (l.titulo || '').toLowerCase().includes(lower) ||
        (l.profissao || '').toLowerCase().includes(lower) ||
        (l.empreendimento || '').toLowerCase().includes(lower) ||
        (l.e_mail || '').toLowerCase().includes(lower) ||
        (l.canal || '').toLowerCase().includes(lower)
    );
  }, [searchTerm, leads]);

  const stats = useMemo(() => {
    if (!leads.length) return { avgScore: 0, hotLeads: 0, total: 0, reunioesHoje: 0 };
    const today = new Date().toISOString().slice(0, 10);
    const leadsComScore = leads.filter((l) => l.score > 0);
    const avgScore = leadsComScore.length
      ? Math.round(leadsComScore.reduce((sum, l) => sum + l.score, 0) / leadsComScore.length)
      : 0;
    const hotLeads = leads.filter((l) => l.score >= 80).length;
    const reunioesHoje = leads.filter((l) => l.data_da_reuniao?.startsWith(today)).length;
    return { avgScore, hotLeads, total: leads.length, reunioesHoje };
  }, [leads]);

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard
            icon={<Users className="w-5 h-5 text-orange-400" />}
            label="Leads Ativos"
            value={loading ? '...' : String(stats.total)}
            color="orange"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
            label="Score Médio"
            value={loading ? '...' : String(stats.avgScore)}
            color="emerald"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5 text-blue-400" />}
            label="Reuniões Hoje"
            value={loading ? '...' : String(stats.reunioesHoje)}
            color="blue"
          />
          <StatCard
            icon={<Database className="w-5 h-5 text-purple-400" />}
            label="Fonte"
            value="Pipedrive"
            color="purple"
          />
        </div>

        {/* Source badge */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 inline-flex items-center gap-1.5">
            <Database className="w-3 h-3" />
            Dados reais — Pipedrive via Nekt Data Lake (Amazon Athena)
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar lead por nome, profissão, empreendimento, canal ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 transition-all"
          />
        </div>

        {/* Loading / Error */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
            <span>Carregando leads do Pipedrive...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-rose-400">{error}</div>
        )}

        {/* Lead Cards */}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredLeads.slice(0, 50).map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>

            {filteredLeads.length > 50 && (
              <p className="text-center text-sm text-gray-500 mt-4">
                Mostrando 50 de {filteredLeads.length} leads. Refine a busca para encontrar mais.
              </p>
            )}

            {filteredLeads.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum lead encontrado para "{searchTerm}"</p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const bgMap: Record<string, string> = {
    orange: 'bg-orange-500/10 border-orange-500/20',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
    blue: 'bg-blue-500/10 border-blue-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
  };

  return (
    <div className={`rounded-xl border p-4 ${bgMap[color] || bgMap.orange}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
