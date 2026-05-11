import { Home, Search, Play, Settings, FileText, Database } from "lucide-react";
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
    { id: "settings", icon: Settings, label: "Configurações" },
  ];

  return (
    <div className="w-[260px] h-screen bg-[#191919]/95 backdrop-blur-[20px] border-r border-white/5 flex flex-col p-5 fixed left-0 top-0 z-50">
      <div className="flex items-center gap-3 px-1 mb-10 mt-2">
        <div className="w-6 h-6 rounded bg-fluent-accent flex items-center justify-center shadow-[0_0_15px_rgba(0,120,212,0.4)]">
          <Database className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-[18px] tracking-tight text-white drop-shadow-md">ThumbSync</span>
      </div>

      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all relative group overflow-hidden ${
                isActive ? "text-white bg-white/[0.04]" : "text-[#d1d1d1] hover:bg-white/[0.08] hover:text-white"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 top-[15%] bottom-[15%] w-[3px] bg-fluent-accent rounded-r-md shadow-[0_0_8px_#0078d4]"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {/* Liquid hover effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              
              <item.icon className={`w-[18px] h-[18px] relative z-10 ${isActive ? "text-fluent-accent drop-shadow-[0_0_8px_rgba(0,120,212,0.6)]" : "group-hover:text-fluent-accent transition-colors"}`} />
              <span className="text-[14px] font-medium relative z-10">{item.label}</span>
            </button>
          );
        })}
      </nav>
      
      <div className="mt-auto px-2 py-4 text-[11px] uppercase tracking-wider text-[#a0a0a0] font-bold flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
        v1.0.5 Stable
      </div>
    </div>
  );
}
