import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import LeadInfoPanel from '../components/LeadInfoPanel';
import BriefingPanel from '../components/BriefingPanel';
import WebResearchPanel from '../components/WebResearchPanel';
import { realLeads } from '../lib/leads-data';
import { Sparkles, Globe, User, AlertTriangle } from 'lucide-react';

type Tab = 'briefing' | 'research' | 'info';

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const lead = useMemo(() => {
    return realLeads.find((l) => l.id === Number(id));
  }, [id]);

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Header />
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <AlertTriangle className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Lead não encontrado</h2>
          <p className="text-gray-500">O lead com ID {id} não foi encontrado nos dados do Pipedrive.</p>
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
        {/* Tab Navigation */}
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

        {/* Tab Content */}
        <div className="animate-fade-in">
          {activeTab === 'info' && <LeadInfoPanel lead={lead} />}
          {activeTab === 'briefing' && <BriefingPanel lead={lead} />}
          {activeTab === 'research' && <WebResearchPanel lead={lead} />}
        </div>
      </main>
    </div>
  );
}
