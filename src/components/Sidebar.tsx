import { Download, Home, Search, Play, Settings, FileText, Archive, Layers } from "lucide-react";
import { motion } from "motion/react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isServerOnline?: boolean;
  hasPendingSync?: boolean;
  canInstall?: boolean;
  onInstallClick?: () => void;
}

export function Sidebar({ activeTab, setActiveTab, isServerOnline = true, hasPendingSync = false, canInstall = false, onInstallClick }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", icon: Home, label: "Visão Geral" },
    { id: "analyzer", icon: Search, label: "Analisador" },
    { id: "progress", icon: Play, label: "Progresso" },
    { id: "list", icon: FileText, label: "Gestão da Lista" },
    { id: "records", icon: Archive, label: "Registros" },
    { id: "psd", icon: Layers, label: "Projetos PSD" },
    { id: "settings", icon: Settings, label: "Configurações" },
  ];

  return (
    <div className="hidden md:flex w-[260px] h-screen bg-[#0d0d10]/60 backdrop-blur-3xl border-r border-white/[0.06] flex flex-col p-6 fixed left-0 top-0 z-50">
      <div className="flex items-center gap-3 px-1 mb-10 mt-2 select-none">
        <img 
          src="/logodosite.jpg" 
          alt="ThumbSync Logo" 
          className="w-[34px] h-[34px] rounded-[10px] shadow-[0_0_15px_rgba(10,132,255,0.4)] object-cover"
        />
        <span className="font-extrabold text-[19px] tracking-tight text-white bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">ThumbSync</span>
      </div>

      <nav className="flex-1 space-y-1.5">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all relative group overflow-hidden ${
                isActive ? "text-white bg-white/[0.06] shadow-sm animate-fade-in" : "text-zinc-400 hover:bg-white/[0.03] hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 top-[25%] bottom-[25%] w-[3px] bg-[#0a84ff] rounded-r-md shadow-[0_0_8px_#0a84ff]"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {/* Highlight flash layout */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.015] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
              <item.icon className={`w-[18px] h-[18px] relative z-10 transition-transform duration-300 group-hover:scale-105 ${isActive ? "text-[#0a84ff] drop-shadow-[0_0_8px_rgba(10,132,255,0.4)]" : "text-zinc-400 group-hover:text-[#0a84ff] transition-colors"}`} />
              <span className="text-[13.5px] font-semibold relative z-10">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="mt-auto px-2 py-4 flex flex-col gap-2 font-sans select-none border-t border-white/[0.04] pt-4">
        {canInstall && (
          <button
            onClick={onInstallClick}
            className="w-full flex items-center justify-center gap-2 mb-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#0a84ff] to-[#0071e3] text-white text-sm font-bold shadow-[0_0_15px_rgba(10,132,255,0.4)] cursor-pointer active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Instalar PWA</span>
          </button>
        )}
        <div className="text-[10px] uppercase tracking-widest text-[#8a8a93] font-bold flex items-center gap-2">
          {isServerOnline ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#30d158] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#30d158] shadow-[0_0_8px_rgba(48,209,88,0.8)]"></span>
              </span>
              <span>Servidor Conectado</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff9f0a] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff9f0a] shadow-[0_0_8px_rgba(255,159,10,0.8)]"></span>
              </span>
              <span className="text-zinc-400">Modo Local (Offline)</span>
            </>
          )}
        </div>
        {hasPendingSync && (
          <div className="text-[9px] font-black tracking-wide text-[#ff9f0a] bg-[#ff9f0a]/8 border border-[#ff9f0a]/15 rounded-lg py-1 px-2.5 flex items-center justify-center gap-1.5 shadow-sm transition-all duration-300">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#ff9f0a]"></span>
            </span>
            <span>Sincronização Pendente</span>
          </div>
        )}
      </div>
    </div>
  );
}
