import { Home, Search, Play, Settings, FileText, Database, Archive } from "lucide-react";
import { motion } from "motion/react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", icon: Home, label: "Visão Geral" },
    { id: "analyzer", icon: Search, label: "Analisador" },
    { id: "progress", icon: Play, label: "Progresso" },
    { id: "list", icon: FileText, label: "Gestão da Lista" },
    { id: "records", icon: Archive, label: "Registros" },
    { id: "settings", icon: Settings, label: "Configurações" },
  ];

  return (
    <div className="hidden md:flex w-[260px] h-screen bg-[#0d0d10]/60 backdrop-blur-3xl border-r border-white/[0.06] flex flex-col p-6 fixed left-0 top-0 z-50">
      <div className="flex items-center gap-3 px-1 mb-10 mt-2 select-none">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0a84ff] to-[#0055b3] flex items-center justify-center shadow-[0_4px_12px_rgba(10,132,255,0.3)]">
          <Database className="w-4 h-4 text-white" />
        </div>
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
      
      <div className="mt-auto px-2 py-4 text-[10px] uppercase tracking-widest text-[#8a8a93] font-bold flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#30d158] shadow-[0_0_8px_rgba(48,209,88,0.8)]" />
        v1.0.5 Stable
      </div>
    </div>
  );
}
