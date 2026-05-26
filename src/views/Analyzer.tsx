import { GlassCard } from "../components/GlassCard.tsx";
import { Search, Filter, ArrowRight, Layers, FileWarning } from "lucide-react";
import { useState } from "react";

export function Analyzer({ analysisData, runAnalysis, isLoading }: { analysisData: any, runAnalysis: () => void, isLoading: boolean }) {
  const [filter, setFilter] = useState("");

  if (!analysisData && !isLoading) return null;

  const filteredFiles = analysisData?.pendingFiles.filter((f: any) => 
    f.relativePath.toLowerCase().includes(filter.toLowerCase())
  ) || [];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Analisador</h1>
          <p className="text-gray-400">Detalhamento de arquivos pendentes de sincronização.</p>
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Filtrar por nome ou provedor..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-fluent-accent transition-colors"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <button className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <Filter className="w-4 h-4" />
        </button>
      </div>

      <GlassCard className="overflow-hidden !p-0">
        <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-fluent-accent" />
            <h3 className="font-semibold">Arquivos Pendentes ({filteredFiles.length})</h3>
          </div>
          <p className="text-xs text-gray-500 italic">Ordenados por mais recentes</p>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {isLoading ? (
            <div className="p-20 text-center text-gray-500">Escaneando diretórios...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="p-20 text-center text-gray-500">Nenhum arquivo encontrado para o filtro atual.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-gray-400 uppercase text-[10px] tracking-widest sticky top-0 backdrop-blur-md border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-bold">Miniatura</th>
                  <th className="px-6 py-4 font-bold">Provedor / Caminho</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredFiles.map((file: any, i: number) => (
                  <tr key={i} className="hover:bg-white/[0.06] transition-colors group relative overflow-hidden">
                    <td className="px-6 py-4 relative z-10 w-24">
                       <img 
                         src={`/api/image?path=${encodeURIComponent(file.sourcePath)}`} 
                         alt="Thumb" 
                         className="w-12 aspect-[2/3] object-cover rounded shadow-md border border-white/10" 
                         onError={(e) => {
                           (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIwaHB4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzY2NiI+V0VCUDwvdGV4dD48L3N2Zz4=';
                         }}
                       />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{file.relativePath.split(/[\/\\]/).pop().replace('.webp', '')}</span>
                        <span className="text-xs text-gray-500">{file.relativePath.split(/[\/\\]/).slice(0, -1).join(' / ') || 'Raiz'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {file.syncStatus.reason === 'missing-dest' ? (
                        <span className="flex items-center gap-1.5 text-blue-400 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          Novo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-orange-400 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          Atualização
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                       <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
