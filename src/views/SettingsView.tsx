import { useState, useEffect } from "react";
import { GlassCard } from "../components/GlassCard.tsx";
import { Save, Info, CheckCircle } from "lucide-react";

export function SettingsView({ config, onSave }: { config: any, onSave: () => void }) {
  const [source, setSource] = useState("");
  const [dest, setDest] = useState("");
  const [list, setList] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setSource(config.source || "");
      setDest(config.dest || "");
      setList(config.list || "");
    }
  }, [config]);

  if (!config) return null;

  async function handleSaveSettings() {
    setIsSaving(true);
    setIsSaved(false);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, dest, list })
      });
      if (res.ok) {
        setIsSaved(true);
        onSave(); // Refetches from backend and syncs global application config state
        setTimeout(() => setIsSaved(false), 4000);
      }
    } catch (e) {
      console.error("Erro ao salvar configurações:", e);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Configurações</h1>
        <p className="text-gray-400 font-medium">Gerencie os caminhos de origem, destino e arquivo de controle de miniaturas.</p>
      </div>

      <GlassCard className="max-w-2xl">
         {isSaved ? (
           <div className="flex items-center gap-3 p-4 bg-green-500/15 border border-green-500/35 rounded-lg mb-8 text-green-200 text-sm animate-fade-in">
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-green-400" />
              <p className="font-semibold">Configurações salvas e aplicadas com sucesso pelo servidor!</p>
           </div>
         ) : (
           <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-8 text-blue-200 text-sm">
              <Info className="w-5 h-5 flex-shrink-0" />
              <p>As alterações feitas aqui serão aplicadas ao servidor e persistidas durante a sessão atual de sincronia.</p>
           </div>
         )}

         <div className="space-y-6">
            <div className="space-y-2">
               <label className="block text-sm font-semibold text-gray-300">Diretório de Origem (Creative Cloud Files)</label>
               <input
                 type="text"
                 value={source}
                 onChange={(e) => setSource(e.target.value)}
                 placeholder="Diretório de origem das miniaturas .webp"
                 className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-fluent-accent focus:bg-white/[0.08] transition-all font-mono"
                 id="input-source-dir"
               />
            </div>

            <div className="space-y-2">
               <label className="block text-sm font-semibold text-gray-300">Diretório de Destino (Google Drive)</label>
               <input
                 type="text"
                 value={dest}
                 onChange={(e) => setDest(e.target.value)}
                 placeholder="Diretório de destino sincronizado"
                 className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-fluent-accent focus:bg-white/[0.08] transition-all font-mono"
                 id="input-dest-dir"
               />
            </div>

            <div className="space-y-2">
               <label className="block text-sm font-semibold text-gray-300">Arquivo de Lista (.txt)</label>
               <input
                 type="text"
                 value={list}
                 onChange={(e) => setList(e.target.value)}
                 placeholder="Arquivo lista.txt contendo controle de jogos ordenados"
                 className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-fluent-accent focus:bg-white/[0.08] transition-all font-mono"
                 id="input-list-file"
               />
            </div>

            <div className="pt-4 flex justify-end">
               <button 
                 onClick={handleSaveSettings}
                 disabled={isSaving || !source || !dest || !list}
                 id="btn-save-settings"
                 className="flex items-center gap-2 px-6 py-2.5 bg-fluent-accent text-white rounded-lg hover:bg-fluent-accent hover:shadow-[0_0_20px_rgba(0,120,212,0.5)] transition-all font-semibold active:scale-95 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
               >
                 <Save className="w-4 h-4" />
                 {isSaving ? "Salvando..." : "Salvar Configurações"}
               </button>
            </div>
         </div>
      </GlassCard>
    </div>
  );
}
