import { useState } from 'react';
import type { Lead, WebResearchResult } from '../types/lead';
import { researchLead } from '../lib/serpapi';
import { Globe, ExternalLink, Loader2, Search, AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  lead: Lead;
}

export default function WebResearchPanel({ lead }: Props) {
  const [results, setResults] = useState<WebResearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await researchLead(lead.nome_investidor, lead.profissao);
      setResults(res);
      setSearched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro na pesquisa web');
    } finally {
      setLoading(false);
    }
  };

  if (!searched && !loading && !error) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Pesquisa Web</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
            Pesquise informações públicas sobre o investidor usando SerpAPI para enriquecer seu briefing.
          </p>
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 inline-flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Pesquisar "{lead.nome_investidor}"
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="text-center py-12">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Pesquisando na web...</p>
          <p className="text-xs text-gray-600 mt-2">Buscando informações sobre {lead.nome_investidor}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 border border-red-900/50 rounded-xl p-6">
        <div className="text-center py-6">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 mb-2">{error}</p>
          <button
            onClick={handleSearch}
            className="text-sm text-gray-400 hover:text-white underline inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Pesquisa Web</h3>
          <span className="text-xs text-gray-500">{results.length} resultados</span>
        </div>
        <button
          onClick={handleSearch}
          className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
          title="Pesquisar novamente"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {results.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          Nenhum resultado encontrado para "{lead.nome_investidor}"
        </p>
      ) : (
        <div className="space-y-3">
          {results.map((result, i) => (
            <a
              key={i}
              href={result.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-cyan-500/30 transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-cyan-400 group-hover:text-cyan-300 truncate">
                    {result.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">{result.source}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{result.snippet}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 shrink-0 mt-1" />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
