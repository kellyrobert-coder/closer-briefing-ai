import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, AlertCircle, Bot } from 'lucide-react';
import Header from '../components/Header';
import LeadCard from '../components/LeadCard';
import { searchDeals } from '../lib/pipedrive';
import { getApiKeys } from '../lib/api-keys';
import type { Lead } from '../types/lead';

export default function Dashboard() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

        {/* Empty state hint */}
        {!query && (
          <div className="text-center text-gray-600 text-sm mt-4">
            Dados em tempo real via API do Pipedrive
          </div>
        )}
      </main>
    </div>
  );
}
