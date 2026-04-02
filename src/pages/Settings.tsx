import { useState, useEffect } from 'react';
import { Key, Save, CheckCircle } from 'lucide-react';
import Header from '../components/Header';
import { getApiKeys, saveApiKeys } from '../lib/api-keys';

export default function Settings() {
  const [geminiKey, setGeminiKey] = useState('');
  const [serpapiKey, setSerpapiKey] = useState('');
  const [pipedriveKey, setPipedriveKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const keys = getApiKeys();
    setGeminiKey(keys.gemini);
    setSerpapiKey(keys.serpapi);
    setPipedriveKey(keys.pipedrive);
  }, []);

  const handleSave = () => {
    saveApiKeys({ gemini: geminiKey, serpapi: serpapiKey, pipedrive: pipedriveKey });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Header />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-2xl font-bold text-white mb-6">Configurações</h2>

        <div className="space-y-6">
          {/* Pipedrive Token */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-orange-400" />
              <h3 className="font-semibold text-white">Token API Pipedrive</h3>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              Token pessoal de API do Pipedrive para busca em tempo real de negócios.
            </p>
            <input
              type="password"
              value={pipedriveKey}
              onChange={(e) => setPipedriveKey(e.target.value)}
              placeholder="ex: 1234abc..."
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/20 text-sm"
            />
          </div>

          {/* Gemini API Key */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-purple-400" />
              <h3 className="font-semibold text-white">Gemini API Key</h3>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              Chave da API do Google Gemini para geração de briefings com IA.
            </p>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 text-sm"
            />
          </div>

          {/* SerpAPI Key */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Key className="w-5 h-5 text-cyan-400" />
              <h3 className="font-semibold text-white">SerpAPI Key</h3>
            </div>
            <p className="text-sm text-gray-400 mb-3">
              Chave da SerpAPI para pesquisa web sobre leads.
            </p>
            <input
              type="password"
              value={serpapiKey}
              onChange={(e) => setSerpapiKey(e.target.value)}
              placeholder="ff5a57..."
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 text-sm"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-orange-600 to-amber-600 text-white hover:from-orange-500 hover:to-amber-500 shadow-lg shadow-orange-500/20'
            }`}
          >
            {saved ? <><CheckCircle className="w-5 h-5" />Salvo!</> : <><Save className="w-5 h-5" />Salvar Configurações</>}
          </button>

          <div className="bg-gray-900/50 border border-gray-800/50 rounded-xl p-4">
            <p className="text-xs text-gray-500 leading-relaxed">
              As chaves são armazenadas localmente no navegador (localStorage) e enviadas diretamente para as APIs — sem servidores intermediários.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
