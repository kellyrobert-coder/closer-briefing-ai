import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import LeadInfoPanel from '../components/LeadInfoPanel';
import BriefingPanel from '../components/BriefingPanel';
import WebResearchPanel from '../components/WebResearchPanel';
import { fetchDeal, fetchDealNotes, fetchPersonDeals, fetchDealAllFields } from '../lib/pipedrive';
import { getApiKeys } from '../lib/api-keys';
import { lookupSeazoneClient, preloadSeazoneLookup } from '../lib/seazone-lookup';
import type { SeazoneClientInfo } from '../lib/seazone-lookup';
import type { Lead } from '../types/lead';
import { Sparkles, Globe, User, AlertTriangle, Loader2 } from 'lucide-react';

// Pre-warm cache on module load
preloadSeazoneLookup();

type Tab = 'briefing' | 'research' | 'info';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [clienteSeazone, setClienteSeazone] = useState<SeazoneClientInfo | null>(null);
  const [checkingCliente, setCheckingCliente] = useState(false);

  useEffect(() => {
    if (!id) return;
    const apiToken = getApiKeys().pipedrive;
    setLoading(true);
    setError(null);
    setClienteSeazone(null);
    setCheckingCliente(false);

    fetchDeal(Number(id), apiToken)
      .then(async (data) => {
        // Fetch enriched data in parallel
        try {
          const [notes, allCustomFields] = await Promise.all([
            fetchDealNotes(data.id, apiToken).catch(() => []),
            fetchDealAllFields(data.id, apiToken).catch(() => ({})),
          ]);

          // Build notes content
          const notesContent =
            notes.length > 0
              ? notes.map((n) => `${n.addTime} - ${n.userName}:\n${n.content}`).join('\n\n')
              : undefined;

          // Fetch person's other deals to build lost deals history
          let lostDealsHistory: string | undefined;
          const personId = (data as any)._rawPersonId;
          if (personId) {
            try {
              const personDeals = await fetchPersonDeals(personId, apiToken);
              const lostDeals = personDeals.filter((d) => d.status === 'lost' && d.id !== data.id);
              if (lostDeals.length > 0) {
                lostDealsHistory = lostDeals
                  .map((d) => {
                    const dateStr = d.add_time.split(' ')[0];
                    return `Deal '${d.title}' perdido em ${dateStr}${d.lost_reason ? ` - Motivo: ${d.lost_reason}` : ''}`;
                  })
                  .join('\n');
              }
            } catch {
              // Continue without lost deals history
            }
          }

          // Use allCustomFields to resolve enum values that dealToLead couldn't resolve
          // "Cidade onde fica o imóvel" is an enum field — dealToLead returns the ID (e.g. "614")
          const cf = allCustomFields as Record<string, string>;
          const resolvedCidade = cf['Cidade onde fica o imóvel']
            || cf['Cidade onde fica o Imóvel']
            || cf['Cidade']
            || data.cidade_onde_fica_o_imovel;

          setLead({
            ...data,
            cidade_onde_fica_o_imovel: resolvedCidade,
            notesContent,
            lostDealsHistory,
            allCustomFields: Object.keys(allCustomFields).length > 0 ? allCustomFields : undefined,
          });
          setLoading(false);
          // Look up Seazone client status by email
          if (data.e_mail) {
            setCheckingCliente(true);
            lookupSeazoneClient(data.e_mail).then((result) => {
              setClienteSeazone(result);
              setCheckingCliente(false);
            });
          }
        } catch (err) {
          // Continue even if enrichment fails
          setLead(data);
          setLoading(false);
          if (data.e_mail) {
            setCheckingCliente(true);
            lookupSeazoneClient(data.e_mail).then((result) => {
              setClienteSeazone(result);
              setCheckingCliente(false);
            });
          }
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar lead.');
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
          <span>Buscando dados do Pipedrive...</span>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <AlertTriangle className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Erro ao carregar lead</h2>
          <p className="text-gray-500">{error || `Lead ID ${id} não encontrado.`}</p>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: 'Dados do Lead', icon: <User className="w-4 h-4" /> },
    { key: 'briefing', label: 'Briefing IA', icon: <Sparkles className="w-4 h-4" /> },
    { key: 'research', label: 'Pesquisa Web', icon: <Globe className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex gap-1 mb-6 bg-gray-900 p-1 rounded-xl border border-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div>
          {activeTab === 'info' && <LeadInfoPanel lead={lead} clienteSeazone={clienteSeazone} checkingCliente={checkingCliente} />}
          {activeTab === 'briefing' && <BriefingPanel lead={lead} />}
          {activeTab === 'research' && <WebResearchPanel lead={lead} />}
        </div>
      </main>
    </div>
  );
}
