import { useState } from 'react';
import type { Lead, BriefingResult } from '../types/lead';
import { generateBriefing } from '../lib/gemini';
import {
  Sparkles, AlertTriangle, Target, MessageSquare,
  TrendingUp, Loader2, RefreshCw
} from 'lucide-react';

interface Props {
  lead: Lead;
}

export default function BriefingPanel({ lead }: Props) {
  const [briefing, setBriefing] = useState<BriefingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateBriefing(lead);
      setBriefing(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar briefing');
    } finally {
      setLoading(false);
    }
  };

  if (!briefing && !loading && !error) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Briefing com IA</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
            Gere um briefing personalizado usando Gemini AI com dados reais do Pipedrive para preparar sua reunião.
          </p>
          <button
            onClick={handleGenerate}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/20 inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Gerar Briefing com Gemini
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="text-center py-12">
          <Loader2 className="w-10 h-10 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Gerando briefing com Gemini AI...</p>
          <p className="text-xs text-gray-600 mt-2">Analisando dados do lead e preparando estratégia</p>
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
            onClick={handleGenerate}
            className="text-sm text-gray-400 hover:text-white underline inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Resumo */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Resumo Executivo</h3>
          <button
            onClick={handleGenerate}
            className="ml-auto p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
            title="Regenerar briefing"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">{briefing!.resumo}</p>
      </div>

      {/* Estratégia */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-orange-400" />
          <h3 className="font-semibold text-white">Estratégia de Abordagem</h3>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">{briefing!.estrategia_abordagem}</p>
      </div>

      {/* Pontos-chave */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Pontos-Chave</h3>
        </div>
        <ul className="space-y-2">
          {briefing!.pontos_chave.map((ponto, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              {ponto}
            </li>
          ))}
        </ul>
      </div>

      {/* Perguntas */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
          <h3 className="font-semibold text-white">Perguntas Sugeridas</h3>
        </div>
        <ul className="space-y-2">
          {briefing!.perguntas_sugeridas.map((pergunta, i) => (
            <li key={i} className="text-sm text-gray-300 pl-4 border-l-2 border-emerald-500/30 py-1">
              {pergunta}
            </li>
          ))}
        </ul>
      </div>

      {/* Oportunidades e Riscos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-white">Oportunidades</h3>
          </div>
          <ul className="space-y-2">
            {briefing!.oportunidades.map((op, i) => (
              <li key={i} className="text-sm text-emerald-300/80 flex items-start gap-2">
                <span className="text-emerald-500 mt-1">+</span>
                {op}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-white">Riscos</h3>
          </div>
          <ul className="space-y-2">
            {briefing!.riscos.map((risco, i) => (
              <li key={i} className="text-sm text-amber-300/80 flex items-start gap-2">
                <span className="text-amber-500 mt-1">!</span>
                {risco}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
