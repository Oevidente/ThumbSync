import { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Home, Search, Play, FileText, Archive, Settings, Download } from 'lucide-react';
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

  // Estados relacionados ao PWA e Instalação no Celular
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Detectar se o aplicativo já está rodando em modo independente (instalado)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (navigator as any).standalone === true;
    setIsInstalled(!!isStandalone);

    // 2. Detectar se é dispositivo iOS
    const detectIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(detectIOS);

    // No iOS, se não estiver instalado em modo Standalone, o banner é exibido como dica de como fixar na tela inicial
    if (detectIOS && !isStandalone) {
      setShowInstallBanner(true);
    }

    // 3. Capturar o evento beforeinstallprompt (Android / Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Capturar se o app foi instalado com sucesso
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

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
          <img 
            src="./logodosite.jpg" 
            alt="ThumbSync Logo" 
            className="w-6 h-6 rounded-lg shadow-[0_0_15px_rgba(10,132,255,0.45)] object-cover"
          />
          <span className="font-extrabold text-sm tracking-tight text-white font-sans">ThumbSync</span>
        </div>
        <div className="flex items-center gap-2">
          {!isInstalled && (
            <button
              onClick={() => setShowInstallBanner(true)}
              className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#30d158] uppercase bg-[#30d158]/10 border border-[#30d158]/15 px-2.5 py-1 rounded-full tracking-wider font-sans hover:bg-[#30d158]/20 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#30d158]" />
              Instalar
            </button>
          )}
          <div className="text-[10px] font-black text-[#0a84ff] uppercase bg-[#0a84ff]/10 border border-[#0a84ff]/15 px-2.5 py-1 rounded-full tracking-wider font-sans">
            {menuItems.find(item => item.id === activeTab)?.label}
          </div>
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

      {/* Banner de Instalação PWA (Focado em Dispositivos Móveis) */}
      <AnimatePresence>
        {showInstallBanner && !isInstalled && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="md:hidden fixed bottom-22 left-4 right-4 z-50 bg-zinc-950/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 shadow-[0_10px_50px_rgba(0,0,0,0.8)] flex flex-col gap-3 font-sans"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src="./logodosite.jpg" 
                  alt="ThumbSync Icon" 
                  className="w-10 h-10 rounded-xl shadow-[0_0_15px_rgba(10,132,255,0.3)] object-cover"
                />
                <div>
                  <h4 className="font-bold text-xs text-white">Instalar o Aplicativo</h4>
                  <p className="text-[11px] text-zinc-400">Adicione o ThumbSync à tela inicial do seu celular!</p>
                </div>
              </div>
              <button 
                onClick={() => setShowInstallBanner(false)}
                className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-sm"
              >
                &times;
              </button>
            </div>

            {isIOS ? (
              <div className="bg-[#0a84ff]/10 text-[#0a84ff] rounded-xl p-3 text-[10.5px] leading-relaxed border border-[#0a84ff]/25">
                <span className="font-bold text-white">No iPhone/iPad:</span> Toque no ícone de compartilhar <span className="font-bold font-sans text-xs">↑</span> no Safari (na barra inferior do navegador) e depois selecione <span className="font-bold text-white">"Adicionar à Tela de Início"</span>.
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 bg-[#0a84ff] hover:bg-[#0070e0] active:scale-[0.98] text-white text-[11px] font-bold py-2 px-3 rounded-lg shadow-lg shadow-[#0a84ff]/20 transition-all text-center cursor-pointer"
                >
                  Instalar Agora
                </button>
                <button
                  onClick={() => setShowInstallBanner(false)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold py-2 px-3 rounded-lg transition-all text-center border border-white/5 cursor-pointer"
                >
                  Agora Não
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
