import { useState } from 'react';
import type { Lead, WebResearchResult, OsintProfile } from '../types/lead';
import { investigateLead } from '../lib/serpapi';
import {
  Globe, ExternalLink, Loader2, Search, AlertTriangle, RefreshCw,
  User, Briefcase, Building2, Shield,
  Link2, Quote, Eye
} from 'lucide-react';

interface Props {
  lead: Lead;
}

function PlatformIcon({ name }: { name: string }) {
  const n = name.toLowerCase();
  if (n.includes('linkedin')) return <span className="text-[#0A66C2] text-sm font-bold">in</span>;
  if (n.includes('instagram')) return <span className="text-[#E4405F] text-sm font-bold">IG</span>;
  if (n.includes('facebook')) return <span className="text-[#1877F2] text-sm font-bold">fb</span>;
  return <Link2 className="w-4 h-4" />;
}

function parseConfidence(level: string) {
  // Split label from detail: "Médio-Baixo — DETALHAMENTO: long text..." → label + detail
  const dashIdx = level.indexOf('—');
  const label = dashIdx >= 0 ? level.slice(0, dashIdx).trim() : level.split(/\s*[-–]\s*/)[0] || level;
  const detail = dashIdx >= 0 ? level.slice(dashIdx + 1).trim().replace(/^DETALHAMENTO:\s*/i, '') : '';
  return { label, detail };
}

function ConfidenceBadge({ level }: { level: string }) {
  const { label } = parseConfidence(level);
  const l = label.toLowerCase();
  let badgeClass = 'bg-red-500/20 text-red-400 border-red-500/30';
  let emoji = '🔴';
  if (l.startsWith('alto')) { badgeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'; emoji = '🟢'; }
  else if (l.startsWith('méd') || l.startsWith('med')) { badgeClass = 'bg-amber-500/20 text-amber-400 border-amber-500/30'; emoji = '🟡'; }

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${badgeClass} whitespace-nowrap`}>
      {emoji} {label}
    </span>
  );
}

export default function WebResearchPanel({ lead }: Props) {
  const [profile, setProfile] = useState<OsintProfile | null>(null);
  const [rawResults, setRawResults] = useState<WebResearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const handleInvestigate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { rawResults: raw, profile: p } = await investigateLead(lead);
      setRawResults(raw);
      setProfile(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro na investigação');
    } finally {
      setLoading(false);
    }
  };

  // ─── Initial state ───
  if (!profile && !loading && !error) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
            <Eye className="w-8 h-8 text-cyan-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Investigação OSINT</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">
            Busca inteligente em fontes públicas: LinkedIn, Instagram, Facebook, registros empresariais e mais.
          </p>
          <button
            onClick={handleInvestigate}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-medium hover:from-cyan-500 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/20 inline-flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Investigar "{lead.nome_investidor}"
          </button>
        </div>
      </div>
    );
  }

  // ─── Loading ───
  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="text-center py-12">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Investigando {lead.nome_investidor}...</p>
          <p className="text-xs text-gray-600 mt-2">Buscando LinkedIn, Instagram, Facebook, CNPJ, notícias...</p>
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (error) {
    return (
      <div className="bg-gray-900 border border-red-900/50 rounded-xl p-6">
        <div className="text-center py-6">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 mb-2 text-sm">{error}</p>
          <button
            onClick={handleInvestigate}
            className="text-sm text-gray-400 hover:text-white underline inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  // ─── OSINT Results ───
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header: Person identified + confidence */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            <h3 className="font-semibold text-white">Pessoa Identificada</h3>
          </div>
          <div className="flex items-center gap-2">
            <ConfidenceBadge level={profile.nivel_confianca} />
            <button
              onClick={handleInvestigate}
              className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-white transition-colors"
              title="Investigar novamente"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        {parseConfidence(profile.nivel_confianca).detail && (
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">{parseConfidence(profile.nivel_confianca).detail}</p>
        )}
        <p className="text-gray-300 text-sm">{profile.pessoa_identificada}</p>
      </div>

      {/* Resumo para o Closer */}
      <div className="bg-gradient-to-r from-cyan-950/50 to-blue-950/50 border border-cyan-500/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Resumo para o Closer</h3>
        </div>
        <p className="text-gray-200 text-sm leading-relaxed">{profile.resumo_para_closer}</p>
      </div>

      {/* Social Media */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Redes Sociais</h3>
        </div>
        <div className="space-y-2">
          {profile.redes_sociais.map((rs, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
              <div className="mt-0.5 text-gray-400">
                <PlatformIcon name={rs.plataforma} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{rs.plataforma}</span>
                  {rs.url && rs.url !== '' && !rs.url.toLowerCase().includes('não') && (
                    <a
                      href={rs.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 text-xs"
                    >
                      Abrir <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{rs.descricao}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Professional History */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Histórico Profissional</h3>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">{profile.historico_profissional}</p>
      </div>

      {/* Companies / CNPJ */}
      {profile.empresas_cnpj && !profile.empresas_cnpj.toLowerCase().includes('não encontr') && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-white">Empresas / CNPJ</h3>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{profile.empresas_cnpj}</p>
        </div>
      )}

      {/* Public Context */}
      {profile.contexto_publico && !profile.contexto_publico.toLowerCase().includes('não encontr') && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-white">Contexto Público</h3>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">{profile.contexto_publico}</p>
        </div>
      )}

      {/* Evidence */}
      {profile.evidencias && profile.evidencias.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Quote className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-white">Evidências</h3>
          </div>
          <ul className="space-y-1.5">
            {profile.evidencias.map((ev, i) => (
              <li key={i} className="text-xs text-gray-400 pl-3 border-l-2 border-gray-700 py-0.5">
                {ev}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Toggle raw results */}
      <div className="text-center">
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-xs text-gray-600 hover:text-gray-400 underline"
        >
          {showRaw ? 'Ocultar' : 'Ver'} {rawResults.length} resultados brutos da busca
        </button>
      </div>

      {showRaw && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="space-y-2">
            {rawResults.map((r, i) => (
              <a
                key={i}
                href={r.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 hover:border-cyan-500/30 transition-all group"
              >
                <h4 className="text-xs font-medium text-cyan-400 group-hover:text-cyan-300 truncate">
                  {r.title}
                </h4>
                <p className="text-[10px] text-gray-500">{r.source}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{r.snippet}</p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
