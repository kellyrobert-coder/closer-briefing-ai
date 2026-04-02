import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, AlertCircle, Bot, Calendar, Clock, ChevronRight } from 'lucide-react';
import Header from '../components/Header';
import LeadCard from '../components/LeadCard';
import { searchDeals, fetchUpcomingMeetings } from '../lib/pipedrive';
import type { UpcomingMeeting } from '../lib/pipedrive';
import { getApiKeys } from '../lib/api-keys';
import type { Lead } from '../types/lead';

export default function Dashboard() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Upcoming meetings
  const [meetings, setMeetings] = useState<UpcomingMeeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(true);

  useEffect(() => {
    const apiToken = getApiKeys().pipedrive;
    if (!apiToken) { setMeetingsLoading(false); return; }
    fetchUpcomingMeetings(apiToken)
      .then(setMeetings)
      .finally(() => setMeetingsLoading(false));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      setError(null);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const apiToken = getApiKeys().pipedrive;
      if (!apiToken) {
        setError('Token do Pipedrive não configurado. Acesse Configurações (⚙️).');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const leads = await searchDeals(query, apiToken);
        setResults(leads);
        setSearched(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao buscar leads.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">

        {/* Hero search */}
        <div className={`transition-all duration-500 ${searched || query ? 'mb-6' : 'mt-24 mb-8 text-center'}`}>
          {!searched && !query && (
            <>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center">
                  <Bot className="w-8 h-8 text-orange-400" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Closer Briefing AI</h1>
              <p className="text-gray-400 mb-8">
                Busque um lead pelo nome ou ID do negócio no Pipedrive
              </p>
            </>
          )}

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            {loading && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 animate-spin" />
            )}
            <input
              type="text"
              autoFocus
              placeholder="Ex: Juliano Boscardin, Marcelo Silva, 249237..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-gray-900 border border-gray-700 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20 transition-all text-base"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 mb-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Results */}
        {searched && !loading && (
          <>
            <p className="text-xs text-gray-500 mb-3">
              {results.length === 0
                ? `Nenhum resultado para "${query}"`
                : `${results.length} negócio${results.length > 1 ? 's' : ''} encontrado${results.length > 1 ? 's' : ''} no Pipedrive`}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          </>
        )}

        {/* Upcoming meetings list */}
        {!query && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                Reuniões Agendadas
              </h2>
              {!meetingsLoading && meetings.length > 0 && (
                <span className="ml-auto text-xs text-gray-500">{meetings.length} reunião{meetings.length !== 1 ? 'ões' : ''}</span>
              )}
            </div>

            {meetingsLoading ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                Carregando reuniões...
              </div>
            ) : meetings.length === 0 ? (
              <p className="text-gray-600 text-sm py-2">Nenhuma reunião agendada.</p>
            ) : (
              <div className="space-y-2">
                {meetings.map((m) => (
                  <button
                    key={m.dealId}
                    onClick={() => navigate(`/lead/${m.dealId}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl hover:border-orange-500/40 hover:bg-gray-800/80 transition-all text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{m.nomeLead}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-400">
                          {formatMeetingDate(m.dataReuniao)}
                          {m.horaReuniao ? ` às ${m.horaReuniao.slice(0, 5)}` : ''}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-orange-400 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function formatMeetingDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (date.getTime() === today.getTime()) return 'Hoje';
  if (date.getTime() === tomorrow.getTime()) return 'Amanhã';

  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
}
