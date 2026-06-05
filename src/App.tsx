import { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Download, Home, Search, Play, FileText, Archive, Settings, Maximize, Minimize, Share2, Plus, X, CloudLightning, RefreshCw, CheckCircle2, Layers } from 'lucide-react';
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
import {
  playChimeSound,
  getNotificationPermissionState,
  requestNotificationPermission,
  triggerNativeNotification,
  startSwBackgroundPolling
} from './utils/notificationSystem';

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

  // Notification states
  const [inAppNotification, setInAppNotification] = useState<{ title: string; body: string; timestamp: string } | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Ref to track game list for updates (detecting additions, deletions, etc.)
  const prevGamesRef = useRef<{ displayName: string; normalized: string; providerName: string }[] | null>(null);

  // Background and appearance states
  const [liquidGlassEnabled, setLiquidGlassEnabled] = useState(() => {
    return localStorage.getItem("liquid-glass-enabled") !== "false";
  });
  const [bgEnabled, setBgEnabled] = useState(() => {
    return localStorage.getItem("background-image-enabled") === "true";
  });
  const [bgPath, setBgPath] = useState(() => {
    return localStorage.getItem("background-image-path") || "";
  });
  const [bgOpacity, setBgOpacity] = useState(() => {
    return Number(localStorage.getItem("background-image-opacity") || "30");
  });
  const [bgBlur, setBgBlur] = useState(() => {
    return Number(localStorage.getItem("background-image-blur") || "0");
  });

  // Appearance settings change listener
  useEffect(() => {
    const handleLiquidGlassUpdate = () => {
      setLiquidGlassEnabled(localStorage.getItem("liquid-glass-enabled") !== "false");
    };
    const handleBackgroundUpdate = () => {
      setBgEnabled(localStorage.getItem("background-image-enabled") === "true");
      setBgPath(localStorage.getItem("background-image-path") || "");
      setBgOpacity(Number(localStorage.getItem("background-image-opacity") || "30"));
      setBgBlur(Number(localStorage.getItem("background-image-blur") || "0"));
    };

    window.addEventListener("liquid-glass-settings-updated", handleLiquidGlassUpdate);
    window.addEventListener("background-settings-updated", handleBackgroundUpdate);

    return () => {
      window.removeEventListener("liquid-glass-settings-updated", handleLiquidGlassUpdate);
      window.removeEventListener("background-settings-updated", handleBackgroundUpdate);
    };
  }, []);

  // Initialize notification permission state in client
  useEffect(() => {
    setNotificationPermission(getNotificationPermissionState());
  }, []);

  // Iniciar polling em background via SW quando a permissão for concedida
  useEffect(() => {
    if (notificationPermission === 'granted') {
      // Calcula hash atual para passar como baseline ao SW
      const ready = analysisData?.gameListData?.readyGames || [];
      const remaining = analysisData?.gameListData?.remainingGames || [];
      const all = [...ready, ...remaining];
      const hash = all
        .map((g: any) => `${g.providerName || ''}::${g.normalized || ''}`)
        .sort()
        .join('|');
      startSwBackgroundPolling(hash || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationPermission]);

  // Escutar mensagens vindas do SW (detecção de mudança em background)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'THUMBSYNC_CHANGE_DETECTED') {
        const { title, body } = event.data;
        // Tocar chime se a aba estiver visível (SW já emitiu a notificação nativa)
        if (document.visibilityState === 'visible') {
          playChimeSound();
        }
        setInAppNotification({
          title,
          body,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        });
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }, []);

  // Dismiss banner automatically after 6 seconds
  useEffect(() => {
    if (inAppNotification) {
      const timer = setTimeout(() => {
        setInAppNotification(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [inAppNotification]);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };
  useEffect(() => {
    if (!analysisData?.gameListData) return;

    // Compile active games list
    const ready = analysisData.gameListData.readyGames || [];
    const remaining = analysisData.gameListData.remainingGames || [];
    const currentGames = [...ready, ...remaining];

    if (prevGamesRef.current === null) {
      // First baseline load, just record current state to prevent initial greeting spikes
      prevGamesRef.current = currentGames;
      return;
    }

    const prevGames = prevGamesRef.current;

    // Check item equality by identifying strings
    const serializeGame = (g: any) => `${g.providerName || 'Sem provedor'}::${g.normalized || ''}`;
    const prevKeys = prevGames.map(serializeGame);
    const currKeys = currentGames.map(serializeGame);

    const prevSerialized = prevKeys.sort().join('|');
    const currSerialized = currKeys.sort().join('|');

    if (prevSerialized !== currSerialized) {
      // Change detected! Let's analyze what specific action happened
      let title = "Lista de Jogos Atualizada 📝";
      let body = "O arquivo de controle mestre (lista.txt) foi atualizado no servidor.";

      if (prevGames.length > 0 && currentGames.length === 0) {
        title = "Lista Esvaziada 🗑️";
        body = "O catálogo de jogos da lista.txt foi totalmente esvaziado pelo usuário.";
      } else {
        const prevSet = new Set(prevKeys);
        const addedGames = currentGames.filter(g => !prevSet.has(serializeGame(g)));

        if (addedGames.length > 0) {
          title = "Novos Itens de Jogos 🆕";
          const names = addedGames.map(g => g.displayName);
          const preview = names.slice(0, 3).join(", ");
          const suffix = names.length > 3 ? ` e mais ${names.length - 3}...` : "";
          body = names.length === 1
            ? `O jogo "${names[0]}" foi adicionado à lista.`
            : `${names.length} novos itens adicionados: ${preview}${suffix}`;
        } else {
          // Check for removals
          const currSet = new Set(currKeys);
          const removedGames = prevGames.filter(g => !currSet.has(serializeGame(g)));

          if (removedGames.length > 0) {
            title = "Itens Removidos da Lista 🗑️";
            const names = removedGames.map(g => g.displayName);
            const preview = names.slice(0, 3).join(", ");
            const suffix = names.length > 3 ? ` e mais ${names.length - 3}...` : "";
            body = names.length === 1
              ? `O jogo "${names[0]}" foi retirado do acervo.`
              : `${names.length} títulos de jogos apagados: ${preview}${suffix}`;
          }
        }
      }

      // 1. Play sweet synth chime "plim" immediately
      playChimeSound();

      // 2. Trigger native OS push notification
      triggerNativeNotification(title, body);

      // 3. Display beautiful in-app Apple glass toast banner
      setInAppNotification({
        title,
        body,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      });

      // Align baseline state
      prevGamesRef.current = currentGames;
    }
  }, [analysisData?.gameListData]);

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
  // Nota: notificações em background são feitas pelo SW via startSwBackgroundPolling
  useEffect(() => {
    const timer = setInterval(() => {
      // Removida a trava de visibilidade para permitir polling e notificações 
      // mesmo quando a aba está em segundo plano.
      runAnalysis(true);
      setHasPendingSync(getPendingChangesFlag());
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
        return (
          <SettingsView
            config={config}
            onSave={fetchConfig}
            notificationPermission={notificationPermission}
            setNotificationPermission={setNotificationPermission}
          />
        );
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
    <div className="flex flex-col md:flex-row min-h-screen bg-[#060608] text-white relative overflow-x-hidden selection:bg-[#0a84ff]/20 selection:text-white">
      {/* Dynamic Animated Organic Liquid Background (Apple Liquid Glass Style) */}
      {liquidGlassEnabled && (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#060608]">
          <svg className="absolute w-0 h-0" aria-hidden="true">
            <defs>
              <filter id="bg-liquid-filter">
                <feTurbulence
                  type="fractalNoise"
                  baseFrequency="0.008"
                  numOctaves="2"
                  result="noise"
                >
                  <animate
                    attributeName="baseFrequency"
                    values="0.008;0.012;0.008"
                    dur="10s"
                    repeatCount="indefinite"
                  />
                </feTurbulence>
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="noise"
                  scale="150"
                  xChannelSelector="R"
                  yChannelSelector="G"
                />
              </filter>
            </defs>
          </svg>

          {/* Liquid organic fluid gradients, distorted heavily by the SVG filter */}
          <div
            className="absolute inset-[-20%] opacity-85 transition-opacity duration-1000 ease-in-out"
            style={{ filter: "url(#bg-liquid-filter) blur(60px)" }}
          >
            {/* Asymmetrical fluid color sources pulsating faster like ARGB */}
            <div className="absolute top-[10%] left-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tr from-[#0a84ff]/[0.5] to-[#15e6cd]/[0.3] mix-blend-screen animate-[drift-blob_12s_ease-in-out_infinite]" />

            <div className="absolute top-[35%] right-[5%] w-[50vw] h-[50vw] rounded-full bg-[#30d158]/[0.4] mix-blend-screen animate-[drift-blob-reverse_15s_ease-in-out_infinite]" />

            <div className="absolute bottom-[5%] left-[25%] w-[60vw] h-[60vw] rounded-full bg-[#bf5af2]/[0.4] mix-blend-screen animate-[drift-blob_18s_ease-in-out_infinite_reverse]" />

            <div className="absolute top-[40%] left-[40%] w-[35vw] h-[35vw] rounded-full bg-[#ff9f0a]/[0.2] mix-blend-screen animate-[drift-blob-reverse_10s_ease-in-out_infinite]" />
          </div>
        </div>
      )}

      {/* Custom Background Image Layer */}
      {bgEnabled && bgPath && (
        <div
          className="fixed inset-0 z-0 pointer-events-none transition-all duration-500 ease-in-out bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(/api/image?path=${encodeURIComponent(bgPath)})`,
            opacity: bgOpacity / 100,
            filter: bgBlur > 0 ? `blur(${bgBlur}px)` : 'none',
            transform: bgBlur > 0 ? 'scale(1.05)' : 'none',
          }}
        />
      )}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isServerOnline={isServerOnline}
        hasPendingSync={hasPendingSync}
        canInstall={!!deferredPrompt}
        onInstallClick={handleInstallPWA}
      />

      {/* Mobile Sticky Header */}
      <header className="md:hidden sticky top-0 z-40 bg-[#070709]/85 backdrop-blur-xl border-b border-white/[0.05] px-5 py-4 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)] select-none">
        <div className="flex items-center gap-2.5">
          <img
            src="./logodosite.jpg"
            alt="ThumbSync Logo"
            className="w-6 h-6 rounded-lg shadow-[0_0_15px_rgba(10,132,255,0.45)] object-cover"
          />
          <span className="font-black text-sm tracking-tight text-white font-rounded">ThumbSync</span>
        </div>
        <div className="flex items-center gap-2.5">
          {deferredPrompt && (
            <button
              onClick={handleInstallPWA}
              className="px-3 py-1.5 rounded-full bg-[#0a84ff]/20 text-[#0a84ff] text-xs font-bold font-sans border border-[#0a84ff]/30 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
            >
              <Download className="w-3.5 h-3.5 mr-1" /> App
            </button>
          )}
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
              title={item.label}
              aria-label={item.label}
              className={`flex items-center justify-center flex-1 h-full rounded-xl transition-all relative ${isActive ? 'text-[#0a84ff]' : 'text-zinc-500 hover:text-white'
                }`}
            >
              <item.icon className={`w-[20px] h-[20px] transition-transform ${isActive ? 'text-[#0a84ff] drop-shadow-[0_0_12px_rgba(10,132,255,0.7)] scale-110' : 'text-zinc-500'}`} />
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

      {/* 2026 Apple-style Premium Glass Notification Banner overlay */}
      <AnimatePresence>
        {inAppNotification && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.94, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -30, scale: 0.94, filter: 'blur(10px)' }}
            transition={{ type: "spring", damping: 18, stiffness: 120 }}
            className="fixed top-6 left-4 right-4 md:left-auto md:right-6 md:w-[380px] z-[999] bg-[#161618]/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_12px_45px_rgba(0,0,0,0.7)] rounded-2xl p-4 flex items-start gap-3.5 select-none font-sans text-white"
          >
            <div className="w-[38px] h-[38px] shrink-0 overflow-hidden rounded-xl bg-[#0a84ff]/10 border border-[#0a84ff]/20 flex items-center justify-center">
              <img
                src="./logodosite.jpg"
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="min-w-0 flex-1 space-y-1 text-left">
              <div className="flex items-center justify-between gap-1.5">
                <h4 className="text-xs font-extrabold text-white tracking-tight truncate">
                  {inAppNotification.title}
                </h4>
                <span className="text-[9px] font-bold text-zinc-500 shrink-0 font-mono">
                  {inAppNotification.timestamp}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-relaxed font-semibold">
                {inAppNotification.body}
              </p>
            </div>

            <button
              onClick={() => setInAppNotification(null)}
              className="p-1 rounded-full hover:bg-white/5 text-zinc-400 hover:text-white shrink-0 active:scale-90 transition-transform cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
