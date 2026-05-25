import { GlassCard } from "../components/GlassCard.tsx";
import { List, Download, CheckCircle, Clock, Edit2, Save, X } from "lucide-react";
import { useState, useEffect } from "react";

export function ListView({ gameListData, onRefresh }: { gameListData: any, onRefresh: () => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [listContent, setListContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadListContent();
    }
  }, [isEditing]);

  const loadListContent = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/list/content");
      const data = await res.json();
      setListContent(data.content || "");
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveListContent = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/list/content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: listContent }),
      });
      setIsEditing(false);
      onRefresh();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!gameListData) return null;

  const remainingGroups = gameListData.remainingGamesByProvider ?? (
    gameListData.remainingGames?.length
      ? [{ providerName: "Sem provedor", games: gameListData.remainingGames }]
      : []
  );
  const readyGroups = gameListData.readyGamesByProvider ?? (
    gameListData.readyGames?.length
      ? [{ providerName: "Sem provedor", games: gameListData.readyGames }]
      : []
  );

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <List className="w-8 h-8 text-fluent-accent" />
            Gestão da Lista
          </h1>
          <p className="text-gray-400">Gerenciamento da lista mestre (lista.txt).</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-fluent-accent text-white hover:bg-fluent-accent-hover transition-colors text-sm font-semibold active:scale-95 shadow-[0_0_15px_rgba(0,120,212,0.3)]">
            <Download className="w-4 h-4" />
            Exportar Pendentes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <GlassCard className="flex flex-col h-[600px] !p-0 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
            <h3 className="font-bold flex items-center gap-2">
              <List className="w-4 h-4 text-fluent-accent" />
              Conteúdo Bruto (lista.txt)
            </h3>
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-sm transition-colors border border-white/5 hover:border-white/20 active:scale-95 text-white"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Editar Arquivo
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors border border-transparent hover:bg-white/5 active:scale-95 text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </button>
                <button 
                  onClick={saveListContent}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-fluent-accent text-white hover:bg-fluent-accent-hover text-sm font-medium transition-colors border border-transparent active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Alterações
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 relative">
            {isEditing ? (
              <textarea
                value={listContent}
                onChange={(e) => setListContent(e.target.value)}
                disabled={isLoading}
                className="absolute inset-0 p-4 bg-[#0a0a0a] text-gray-300 font-mono text-sm resize-none outline-none focus:ring-2 focus:ring-inset focus:ring-fluent-accent/50 disabled:opacity-50"
                placeholder="Insira os jogos aqui, um por linha..."
                spellCheck="false"
              />
            ) : (
              <div className="absolute inset-0 p-4 bg-[#0a0a0a]/50 text-gray-400 font-mono text-sm whitespace-pre-wrap">
                <div className="grid grid-cols-2 gap-4 h-full">
                  <div className="bg-white/[0.02] rounded-lg border border-white/5 p-4 flex flex-col min-h-0">
                    <h4 className="font-bold mb-3 flex items-center gap-2 text-green-400 shrink-0">
                      <CheckCircle className="w-4 h-4" />
                      Prontos ({gameListData.completedGames})
                    </h4>
                    <p className="text-xs text-gray-500 mb-2 italic shrink-0">Jogos que constam na lista e já possuem miniatura.</p>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                       {readyGroups.map((group: any, groupIndex: number) => (
                          <div key={`${group.providerName}-${groupIndex}`} className="space-y-1.5">
                            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded bg-[#151515]/95 border border-white/10 px-2 py-1.5 font-sans text-[11px] text-green-200 backdrop-blur">
                              <span className="font-semibold truncate">Provedor: {group.providerName}</span>
                              <span className="shrink-0 rounded bg-green-500/15 px-2 py-0.5 text-[10px] text-green-300">
                                {group.games?.length || 0}
                              </span>
                            </div>
                            {group.games?.map((game: any, i: number) => (
                              <div key={`${game.displayName}-${i}`} className="py-1.5 px-2 rounded bg-green-500/10 border border-green-500/20 text-xs text-gray-300 font-sans truncate">
                                {game.displayName}
                              </div>
                            ))}
                          </div>
                        ))}
                        {gameListData.readyGames?.length === 0 && <p className="text-center py-20 text-gray-600 text-xs italic">Nenhum pronto!</p>}
                     </div>
                   </div>
                  <div className="bg-white/[0.02] rounded-lg border border-white/5 p-4 flex flex-col min-h-0">
                    <h4 className="font-bold mb-3 flex items-center gap-2 text-orange-400 shrink-0">
                      <Clock className="w-4 h-4" />
                      Faltando ({gameListData.remainingGames?.length || 0})
                    </h4>
                    <p className="text-xs text-gray-500 mb-2 italic shrink-0">Jogos na lista que não foram encontrados nas miniaturas prontas.</p>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                       {remainingGroups.map((group: any, groupIndex: number) => (
                          <div key={`${group.providerName}-${groupIndex}`} className="space-y-1.5">
                            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded bg-[#151515]/95 border border-white/10 px-2 py-1.5 font-sans text-[11px] text-orange-200 backdrop-blur">
                              <span className="font-semibold truncate">Provedor: {group.providerName}</span>
                              <span className="shrink-0 rounded bg-orange-500/15 px-2 py-0.5 text-[10px] text-orange-300">
                                {group.games?.length || 0}
                              </span>
                            </div>
                            {group.games?.map((game: any, i: number) => (
                              <div key={`${game.displayName}-${i}`} className="py-1.5 px-2 rounded bg-orange-500/10 border border-orange-500/20 text-xs text-gray-300 font-sans truncate">
                                {game.displayName}
                              </div>
                            ))}
                          </div>
                        ))}
                        {gameListData.remainingGames?.length === 0 && <p className="text-center py-20 text-gray-600 text-xs italic">Nenhum pendente!</p>}
                     </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
