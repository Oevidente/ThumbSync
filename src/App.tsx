import { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Home, Search, Play, FileText, Archive, Settings, Maximize, Minimize, Share2, Plus, X, CloudLightning, RefreshCw, CheckCircle2, Layers } from 'lucide-react';
import { Dashboard } from './views/Dashboard';
import { Analyzer } from './views/Analyzer';
import { ProgressView } from './views/ProgressView';
import { ListView } from './views/ListView';
import { RecordsView } from './views/RecordsView';
import { SettingsView } from './views/SettingsView';
import { PsdView } from './views/PsdView';
import { motion, AnimatePresence } from 'motion/react';
import {
  parseListContentClient,
  getCachedAnalysisData,
  saveCachedAnalysisData,
  getCachedListContent,
  getPendingChangesFlag,
  clearPendingChangesFlag,
  saveServerStableContent
} from './utils/offlineSync';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAnalyzingRef = useRef(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenToast, setShowFullscreenToast] = useState(false);

  // Connection states
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [syncingOfflineChanges, setSyncingOfflineChanges] = useState(false);
  const [showSyncSuccessToast, setShowSyncSuccessToast] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        !!(
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement ||
          (document as any).msFullscreenElement
        )
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      const doc = document as any;
      const docEl = document.documentElement as any;

      if (!doc.fullscreenElement && !doc.webkitFullscreenElement && !doc.mozFullScreenElement && !doc.msFullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.webkitEnterFullscreen) {
          await docEl.webkitEnterFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        } else {
          setShowFullscreenToast(true);
        }
      } else {
        if (doc.exitFullscreen) {
          await doc.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          await doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          await doc.msExitFullscreen();
        } else {
          setShowFullscreenToast(true);
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle failed, falling back to PWA instructions:", err);
      setShowFullscreenToast(true);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      setConfig(data);
      localStorage.setItem('thumbsync_config_cache', JSON.stringify(data));
    } catch (e) {
      console.warn('Using cached configuration settings.', e);
      const cached = localStorage.getItem('thumbsync_config_cache');
      if (cached) {
        setConfig(JSON.parse(cached));
      }
    }
  }, []);

  const runAnalysis = useCallback(async (silent = false) => {
    if (isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;
    if (!silent) setIsLoading(true);

    try {
      const res = await fetch('/api/analyze');
      if (!res.ok) throw new Error("Unreachable");
      const data = await res.json();

      setIsServerOnline(true);
      saveCachedAnalysisData(data);
      setAnalysisData(data);

      // Keep Server Stable List Cache fresh
      try {
        const listRes = await fetch('/api/list/content');
        if (listRes.ok) {
          const listData = await listRes.json();
          saveServerStableContent(listData.content || '');
        }
      } catch (listErr) {
        console.warn("Failed to sync stable content cache:", listErr);
      }
    } catch (e) {
      console.warn("Express backend offline. Falling back to optimistic cached values.");
      setIsServerOnline(false);

      let cached = getCachedAnalysisData();
      if (cached) {
        // If we have local edits in offline mode, recalculate gameListData automatically client-side!
        if (getPendingChangesFlag()) {
          const pendingContent = getCachedListContent();
          const localGameListData = parseListContentClient(
            pendingContent,
            cached.comparedFiles || [],
            cached.recordsData || {}
          );
          cached = {
            ...cached,
            gameListData: localGameListData
          };
        }
        setAnalysisData(cached);
      }
    } finally {
      isAnalyzingRef.current = false;
      if (!silent) setIsLoading(false);
    }
  }, []);

  const syncOfflineChangesToServer = useCallback(async () => {
    if (syncingOfflineChanges) return;
    const pendingContent = getCachedListContent();
    if (!pendingContent) return;

    setSyncingOfflineChanges(true);
    const base = localStorage.getItem('thumbsync_list_server_stable') || '';
    try {
      const res = await fetch('/api/list/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: pendingContent, base }),
      });

      if (res.ok) {
        clearPendingChangesFlag(pendingContent);
        setHasPendingSync(false);
        setShowSyncSuccessToast(true);
        setTimeout(() => setShowSyncSuccessToast(false), 5000);
        await runAnalysis(true);
      } else {
        throw new Error("Server rejected transfer");
      }
    } catch (e) {
      console.error("Auto Sync: Server rejected or could not reach.", e);
    } finally {
      setSyncingOfflineChanges(false);
    }
  }, [runAnalysis, syncingOfflineChanges]);

  // Initial load
  useEffect(() => {
    setHasPendingSync(getPendingChangesFlag());
    fetchConfig();
    runAnalysis();
  }, [fetchConfig, runAnalysis]);

  // Network connection auto-trigger sync when server is online and we have pending actions
  useEffect(() => {
    if (isServerOnline && hasPendingSync && !syncingOfflineChanges) {
      syncOfflineChangesToServer();
    }
  }, [isServerOnline, hasPendingSync, syncingOfflineChanges, syncOfflineChangesToServer]);

  // Continuous background status polling (Runs every 5s keeping interfaces crisp)
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        runAnalysis(true);
        setHasPendingSync(getPendingChangesFlag());
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
            isServerOnline={isServerOnline}
            hasPendingSync={hasPendingSync}
            syncingOfflineChanges={syncingOfflineChanges}
            onManualSync={syncOfflineChangesToServer}
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
            comparedFiles={analysisData?.comparedFiles}
            onRefresh={runAnalysis}
            isServerOnline={isServerOnline}
            hasPendingSync={hasPendingSync}
            onOfflineListEdit={() => setHasPendingSync(getPendingChangesFlag())}
          />
        );
      case 'records':
        return <RecordsView recordsData={analysisData?.recordsData} />;
      case 'psd':
        return (
          <PsdView
            psdData={analysisData?.psdData}
            onRefresh={runAnalysis}
            isLoading={isLoading}
          />
        );
      case 'settings':
        return <SettingsView config={config} onSave={fetchConfig} />;
      default:
        return (
          <Dashboard
            analysisData={analysisData}
            onRefresh={runAnalysis}
            isLoading={isLoading}
            isServerOnline={isServerOnline}
            hasPendingSync={hasPendingSync}
            syncingOfflineChanges={syncingOfflineChanges}
            onManualSync={syncOfflineChangesToServer}
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
    { id: 'psd', icon: Layers, label: 'PSD' },
    { id: 'settings', icon: Settings, label: 'Configs' },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#070709] bg-radial-[at_top_right] from-zinc-900 via-[#070709] to-black text-white relative overflow-x-hidden selection:bg-[#0a84ff]/20 selection:text-white">
      {/* Decorative ambient light halo (macOS-inspired visual elements) */}
      <div className="absolute pointer-events-none top-[-25%] right-[-15%] w-[650px] h-[650px] bg-[#0a84ff]/8 rounded-full blur-[140px] z-0" />
      <div className="absolute pointer-events-none bottom-[-20%] left-[-15%] w-[600px] h-[600px] bg-[#30d158]/5 rounded-full blur-[130px] z-0" />

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isServerOnline={isServerOnline}
        hasPendingSync={hasPendingSync}
      />

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
        <div className="flex items-center gap-2.5">
          <div className="text-[10px] font-black text-[#0a84ff] uppercase bg-[#0a84ff]/10 border border-[#0a84ff]/15 px-2.5 py-1 rounded-full tracking-wider font-sans">
            {menuItems.find(item => item.id === activeTab)?.label}
          </div>
          <button
            onClick={toggleFullscreen}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] text-white active:scale-90 active:bg-white/[0.12] transition-all cursor-pointer"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4 text-zinc-300" />
            ) : (
              <Maximize className="w-4 h-4 text-zinc-300" />
            )}
          </button>
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

      {/* iOS/Safari Fullscreen Instruction Bottom Sheet */}
      <AnimatePresence>
        {showFullscreenToast && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:hidden">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-zinc-900/95 border-t border-white/[0.08] rounded-t-3xl p-6 pb-10 shadow-2xl relative select-none font-sans"
            >
              <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-5" />
              
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Maximize className="w-5 h-5 text-[#0a84ff]" />
                  Tela Cheia no iOS
                </h3>
                <button
                  onClick={() => setShowFullscreenToast(false)}
                  className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-400 active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-zinc-400 mb-6 leading-relaxed font-semibold">
                O iOS Safari restringe o acionamento de tela cheia padrão via navegador. Siga os passos simples do ecossistema Apple para usufruir de tela inteira sem as barras do navegador:
              </p>

              <div className="space-y-4 mb-6">
                <div className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-2xl">
                  <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-[#0a84ff]/10 text-[#0a84ff] text-xs font-bold font-mono">1</span>
                  <div className="text-xs text-zinc-300 leading-relaxed font-semibold">
                    Toque no ícone de <span className="text-white font-bold inline-flex items-center gap-1">Compartilhar <Share2 className="w-3.5 h-3.5 text-[#0a84ff]" /></span> na barra inferior do Safari.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-2xl">
                  <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-white/5 text-white text-xs font-bold font-mono">2</span>
                  <div className="text-xs text-zinc-300 leading-relaxed font-semibold">
                    Role a lista para baixo e selecione a opção <span className="text-white font-bold inline-flex items-center gap-1">Adicionar à Tela de Início <Plus className="w-3.5 h-3.5 text-[#30d158]" /></span>.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.04] p-3.5 rounded-2xl">
                  <span className="w-6 h-6 shrink-0 flex items-center justify-center rounded-full bg-[#30d158]/10 text-[#30d158] text-xs font-bold font-mono">3</span>
                  <div className="text-xs text-zinc-300 leading-relaxed font-semibold">
                    Abra o ícone criado na tela inicial do seu celular. O site rodará como um app nativo em tela inteira!
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowFullscreenToast(false)}
                className="w-full py-3.5 bg-[#0a84ff] text-white rounded-2xl text-sm font-bold active:bg-[#0071e3] transition-colors focus:outline-none"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic Sync Toast Notification */}
      <AnimatePresence>
        {showSyncSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 right-6 z-[100] max-w-sm w-full bg-[#1c1c1e]/90 backdrop-blur-xl border border-emerald-500/20 shadow-2xl rounded-2xl p-4 flex items-center gap-3.5 select-none text-white font-sans text-left"
          >
            <div className="w-[38px] h-[38px] overflow-hidden rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black tracking-wide leading-normal">
                Sincronização Concluída!
              </h4>
              <p className="text-[10px] text-zinc-300 font-semibold tracking-wide leading-normal mt-0.5">
                Alterações da lista enviadas ao servidor.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
