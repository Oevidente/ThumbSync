import { useState, useEffect, useRef, useCallback } from 'react';
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
    <div className="flex flex-col md:flex-row min-h-screen bg-[#070709] bg-radial-[at_top_right] from-zinc-900 via-[#070709] to-black text-white relative overflow-x-hidden selection:bg-[#0a84ff]/20 selection:text-white">
      {/* Decorative ambient light halo (macOS-inspired visual elements) */}
      <div className="absolute pointer-events-none top-[-25%] right-[-15%] w-[650px] h-[650px] bg-[#0a84ff]/8 rounded-full blur-[140px] z-0" />
      <div className="absolute pointer-events-none bottom-[-20%] left-[-15%] w-[600px] h-[600px] bg-[#30d158]/5 rounded-full blur-[130px] z-0" />

      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Mobile Sticky Header */}
      <header className="md:hidden sticky top-0 z-40 bg-[#070709]/85 backdrop-blur-xl border-b border-white/[0.05] px-5 py-4 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)] select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#0a84ff] flex items-center justify-center shadow-[0_0_15px_rgba(10,132,255,0.45)]">
            <Database className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-extrabold text-sm tracking-tight text-white font-sans">ThumbSync</span>
        </div>
        <div className="text-[10px] font-black text-[#0a84ff] uppercase bg-[#0a84ff]/10 border border-[#0a84ff]/15 px-2.5 py-1 rounded-full tracking-wider font-sans">
          {menuItems.find(item => item.id === activeTab)?.label}
        </div>
      </header>

      <main className="ml-0 md:ml-[260px] flex-1 p-5 md:p-8 lg:p-10 pb-28 md:pb-10 z-10 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, scale: 0.99, y: 12, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.99, y: -12, filter: 'blur(10px)' }}
            transition={{ duration: 0.28, cubicBezier: [0.16, 1, 0.3, 1] }}
            className="max-w-6xl mx-auto"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Floating Bottom Bar Menu */}
      <nav className="md:hidden fixed bottom-5 left-4 right-4 z-40 bg-zinc-950/75 backdrop-blur-xl border border-white/[0.08] rounded-2xl h-15 shadow-2xl flex items-center justify-around px-2 select-none">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full rounded-xl transition-all relative ${
                isActive ? 'text-[#0a84ff]' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <item.icon className={`w-[19px] h-[19px] transition-transform ${isActive ? 'text-[#0a84ff] drop-shadow-[0_0_12px_rgba(10,132,255,0.7)] scale-110' : 'text-zinc-500'}`} />
              <span className="text-[9px] font-extrabold mt-1 tracking-wide uppercase">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
