import { GlassCard } from "../components/GlassCard.tsx";
import { Search, ArrowRight, Layers } from "lucide-react";
import { useState } from "react";

export function Analyzer({ analysisData, runAnalysis, isLoading }: { analysisData: any, runAnalysis: () => void, isLoading: boolean }) {
  const [filter, setFilter] = useState("");
  const [subFilter, setSubFilter] = useState<'all' | 'new' | 'update'>('all');

  if (!analysisData && !isLoading) return null;

  const filteredFiles = (analysisData?.pendingFiles || []).filter((f: any) => {
    const matchesSearch = f.relativePath.toLowerCase().includes(filter.toLowerCase());
    if (!matchesSearch) return false;

    if (subFilter === 'new') {
      return f.syncStatus?.reason === 'missing-dest';
    }
    if (subFilter === 'update') {
      return f.syncStatus?.reason !== 'missing-dest';
    }
    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Analisador</h1>
          <p className="text-zinc-400 text-xs md:text-sm font-semibold tracking-wide">Inspecione arquivos e lotes recomendados para sincronização subsequente.</p>
        </div>
      </div>

      <div className="flex gap-4 items-center flex-wrap">
        <div className="relative flex-grow min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Filtrar por nome do jogo ou provedor..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] hover:border-white/15 focus:border-fluent-accent focus:bg-white/[0.05] rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none transition-all duration-250 font-sans"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div className="flex bg-white/[0.02] border border-white/[0.05] rounded-xl p-1 gap-1 self-stretch md:self-auto select-none backdrop-blur-md">
          <button 
            type="button"
            onClick={() => setSubFilter('all')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${subFilter === 'all' ? 'bg-[#0a84ff] text-white shadow-md shadow-[#0a84ff]/20' : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'}`}
          >
            Todos
          </button>
          <button 
            type="button"
            onClick={() => setSubFilter('new')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all duration-200 cursor-pointer ${subFilter === 'new' ? 'bg-gradient-to-r from-[#0a84ff]/15 to-[#0a84ff]/5 text-[#0a84ff] border border-[#0a84ff]/20 shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#0a84ff]" />
            Novos
          </button>
          <button 
            type="button"
            onClick={() => setSubFilter('update')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all duration-200 cursor-pointer ${subFilter === 'update' ? 'bg-gradient-to-r from-[#ff9f0a]/15 to-[#ff9f0a]/5 text-[#ff9f0a] border border-[#ff9f0a]/20 shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff9f0a]" />
            Atualizações
          </button>
        </div>
      </div>

      <GlassCard className="overflow-hidden !p-0">
        <div className="p-5 sm:p-6 border-b border-white/[0.05] bg-white/[0.015] flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-[#0a84ff]" />
            <h3 className="font-extrabold text-sm sm:text-base text-white">Fila de Transferência ({filteredFiles.length})</h3>
          </div>
          <p className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-wider">Modificado recentemente primeiro</p>
        </div>
        <div className="max-h-[580px] overflow-y-auto">
          {isLoading ? (
            <div className="py-24 text-center text-zinc-500 text-sm font-semibold animate-pulse flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-[#0a84ff]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 00 0 5.373 0 12h4z" />
              </svg>
              Escaneando árvores de diretórios...
            </div>
          ) : filteredFiles.length === 0 ? (
            <p className="py-24 text-center text-zinc-500 font-medium text-sm italic">
              Nenhum arquivo correspondente aos filtros atuais.
            </p>
          ) : (
            <div className="w-full text-left text-sm flex flex-col">
              <div className="hidden sm:grid sm:grid-cols-[100px_1fr_200px_80px] bg-[#121215]/80 text-zinc-400 uppercase text-[9px] tracking-widest sticky top-0 backdrop-blur-md border-b border-white/[0.05] select-none z-20 px-6">
                <div className="py-4 font-black">Visualização</div>
                <div className="py-4 font-black">Especificação do Jogo</div>
                <div className="py-4 font-black">Status de Sincronia</div>
                <div className="py-4 font-black text-right pl-6">Direção</div>
              </div>
              <div className="flex flex-col divide-y divide-white/[0.04]">
                {filteredFiles.map((file: any, i: number) => (
                  <div key={i} className="hover:bg-white/[0.025] transition-all duration-150 group relative overflow-hidden flex flex-row items-center p-4 sm:px-6 sm:py-3 gap-3 sm:gap-0 sm:grid sm:grid-cols-[100px_1fr_200px_80px]">
                    <div className="relative z-10 shrink-0">
                       <div className="w-12 aspect-[2/3] rounded-lg overflow-hidden border border-white/[0.08] shadow-sm bg-zinc-900 flex-shrink-0">
                         <img 
                           src={`/api/image?path=${encodeURIComponent(file.sourcePath)}`} 
                           alt="Thumb" 
                           className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                           referrerPolicy="no-referrer"
                           onError={(e) => {
                             (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIwaHB4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzY2NiI+V0VCUDwvdGV4dD48L3N2Zz4=';
                           }}
                         />
                       </div>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 sm:pr-4 justify-center">
                      <span className="font-extrabold text-[#f4f4f5] text-[13px] sm:text-[14px] leading-snug w-full truncate">{file.relativePath.split(/[\/\\]/).pop().replace('.webp', '')}</span>
                      <span className="text-[10px] sm:text-[11px] text-zinc-500 font-semibold mt-0.5 w-full truncate">{file.relativePath.split(/[\/\\]/).slice(0, -1).join(' • ') || 'Provedor Geral'}</span>
                      <div className="sm:hidden mt-1.5">
                        {file.syncStatus.reason === 'missing-dest' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#0a84ff]/10 border border-[#0a84ff]/15 rounded-full text-[9px] font-bold text-[#0a84ff]">
                            <span className="w-1 h-1 rounded-full bg-[#0a84ff]" />
                            Novo Arquivo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#ff9f0a]/10 border border-[#ff9f0a]/15 rounded-full text-[9px] font-bold text-[#ff9f0a]">
                            <span className="w-1 h-1 rounded-full bg-[#ff9f0a]" />
                            Modificação/Substituição
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center">
                      {file.syncStatus.reason === 'missing-dest' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#0a84ff]/10 border border-[#0a84ff]/15 rounded-full text-[10px] font-bold text-[#0a84ff]">
                          <span className="w-1 h-1 rounded-full bg-[#0a84ff]" />
                          Novo Arquivo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#ff9f0a]/10 border border-[#ff9f0a]/15 rounded-full text-[10px] font-bold text-[#ff9f0a]">
                          <span className="w-1 h-1 rounded-full bg-[#ff9f0a]" />
                          Modificação/Substituição
                        </span>
                      )}
                    </div>
                    <div className="flex justify-end sm:justify-end items-center sm:pl-4 shrink-0 h-full">
                       <button className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.05] sm:bg-white/[0.02] hover:bg-white/[0.08] hover:text-[#0a84ff] hover:border-white/10 border border-transparent transition-all duration-200">
                         <ArrowRight className="w-4 h-4 text-zinc-400 sm:text-zinc-500 group-hover:translate-x-0.5 group-hover:text-white transition-all shrink-0" />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
