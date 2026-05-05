import { GlassCard } from "../components/GlassCard.tsx";
import { Save, Folder, Info } from "lucide-react";

export function SettingsView({ config, onSave }: { config: any, onSave: () => void }) {
  if (!config) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Configurações</h1>
        <p className="text-gray-400">Gerencie os caminhos de origem e destino dos arquivos.</p>
      </div>

      <GlassCard className="max-w-2xl">
         <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-8 text-blue-200 text-sm">
            <Info className="w-5 h-5 flex-shrink-0" />
            <p>As alterações feitas aqui serão aplicadas ao servidor e persistidas durante a sessão atual.</p>
         </div>

         <div className="space-y-6">
            <div className="space-y-2">
               <label className="block text-sm font-medium text-gray-300">Diretório de Origem (Creative Cloud)</label>
               <div className="flex gap-2">
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
                    {config.source}
                  </div>
                  <button className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <Folder className="w-4 h-4" />
                  </button>
               </div>
            </div>

            <div className="space-y-2">
               <label className="block text-sm font-medium text-gray-300">Diretório de Destino (Google Drive)</label>
               <div className="flex gap-2">
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
                    {config.dest}
                  </div>
                  <button className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <Folder className="w-4 h-4" />
                  </button>
               </div>
            </div>

            <div className="space-y-2">
               <label className="block text-sm font-medium text-gray-300">Arquivo de Lista (.txt)</label>
               <div className="flex gap-2">
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap">
                    {config.list}
                  </div>
                  <button className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <Folder className="w-4 h-4" />
                  </button>
               </div>
            </div>

            <div className="pt-4 flex justify-end">
               <button 
                 onClick={onSave}
                 className="flex items-center gap-2 px-6 py-2.5 bg-fluent-accent/90 text-white rounded-lg hover:bg-fluent-accent hover:shadow-[0_0_20px_rgba(0,120,212,0.4)] transition-all font-semibold active:scale-95 border border-white/10"
               >
                 <Save className="w-4 h-4" />
                 Salvar Configurações
               </button>
            </div>
         </div>
      </GlassCard>
    </div>
  );
}
