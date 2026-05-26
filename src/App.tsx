import { useState, useEffect, useRef, useCallback } from 'react';
// Importações sem a extensão .tsx para evitar avisos do compilador:
import { Sidebar } from './components/Sidebar';
import { Home, Search, Play, FileText, Archive, Settings, Database } from 'lucide-react';
import { Dashboard } from './views/Dashboard';
import { Analyzer } from './views/Analyzer';
import { ProgressView } from './views/ProgressView';
import { ListView } from './views/ListView';
import { RecordsView } from './views/RecordsView';
import { SettingsView } from './views/SettingsView';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAnalyzingRef = useRef(false);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setConfig(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const runAnalysis = useCallback(async (silent = false) => {
    if (isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch('/api/analyze');
      const data = await res.json();
      setAnalysisData(data);
    } catch (e) {
      console.error(e);
    } finally {
      isAnalyzingRef.current = false;
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    runAnalysis();
  }, [fetchConfig, runAnalysis]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        runAnalysis(true);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [runAnalysis]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            analysisData={analysisData}
            onRefresh={runAnalysis}
            isLoading={isLoading}
          />
        );
      case 'analyzer':
        return (
          <Analyzer
            analysisData={analysisData}
            runAnalysis={runAnalysis}
            isLoading={isLoading}
          />
        );
      case 'progress':
        return <ProgressView pendingFiles={analysisData?.pendingFiles || []} />;
      case 'list':
        return (
          <ListView
            gameListData={analysisData?.gameListData}
            recordsData={analysisData?.recordsData}
            onRefresh={runAnalysis}
          />
        );
      case 'records':
        return <RecordsView recordsData={analysisData?.recordsData} />;
      case 'settings':
        return <SettingsView config={config} onSave={fetchConfig} />;
      default:
        return (
          <Dashboard
            analysisData={analysisData}
            onRefresh={runAnalysis}
            isLoading={isLoading}
          />
        );
    }
  };

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Geral' },
    { id: 'analyzer', icon: Search, label: 'Analisar' },
    { id: 'progress', icon: Play, label: 'Progresso' },
    { id: 'list', icon: FileText, label: 'Lista' },
    { id: 'records', icon: Archive, label: 'Registros' },
    { id: 'settings', icon: Settings, label: 'Configs' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Mobile Sticky Header */}
      <header className="md:hidden sticky top-0 z-40 bg-[#161616]/95 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#0078d4] flex items-center justify-center shadow-[0_0_10px_rgba(0,120,212,0.4)]">
            <Database className="w-3 h-3 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight text-white">ThumbSync</span>
        </div>
        <div className="text-[11px] font-bold text-[#0078d4] uppercase bg-[#0078d4]/10 px-2 py-0.5 rounded border border-[#0078d4]/20">
          {menuItems.find(item => item.id === activeTab)?.label}
        </div>
      </header>

      <main className="ml-0 md:ml-[260px] flex-1 p-4 md:p-8 pb-28 md:pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="max-w-6xl mx-auto"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Floating Bottom Bar Menu */}
      <nav className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-[#161616]/95 backdrop-blur-xl border border-white/10 rounded-2xl h-14 shadow-2xl flex items-center justify-around px-1">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full rounded-xl transition-all relative ${
                isActive ? 'text-[#0078d4]' : 'text-[#a0a0a0] active:text-white'
              }`}
            >
              <item.icon className={`w-[18px] h-[18px] transition-transform ${isActive ? 'text-[#0078d4] drop-shadow-[0_0_8px_rgba(0,120,212,0.6)] scale-110' : 'text-[#a0a0a0]'}`} />
              <span className="text-[9px] font-semibold mt-1 truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
