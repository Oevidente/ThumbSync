import { GlassCard } from "../components/GlassCard.tsx";
import { List, Download, CheckCircle, Clock } from "lucide-react";

export function ListView({ gameListData }: { gameListData: any }) {
  if (!gameListData) return null;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Lista de Jogos</h1>
          <p className="text-gray-400">Gerenciamento da lista mestre (lista.txt).</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-fluent-accent text-white hover:bg-fluent-accent-hover transition-colors text-sm">
          <Download className="w-4 h-4" />
          Exportar Pendentes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard>
           <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
             <CheckCircle className="text-green-500 w-5 h-5" />
             Jogos Prontos ({gameListData.completedGames})
           </h3>
           <p className="text-sm text-gray-500 mb-4">Estes jogos já possuem miniatura criada ou sincronizada.</p>
           <div className="h-96 overflow-y-auto pr-2 space-y-2 text-sm text-gray-400">
              {/* This is a summary based on counts, but logic could show names if provided by API */}
              <div className="p-10 text-center opacity-30 italic">Visão detalhada disponível no analisador</div>
           </div>
        </GlassCard>

        <GlassCard>
           <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
             <Clock className="text-orange-500 w-5 h-5" />
             Jogos Restantes ({gameListData.remainingGames?.length})
           </h3>
           <p className="text-sm text-gray-500 mb-4">Estes são jogos da lista que ainda precisam de miniatura.</p>
           <div className="h-96 overflow-y-auto pr-2 space-y-1">
              {gameListData.remainingGames?.map((game: any, i: number) => (
                <div key={i} className="py-2 px-3 rounded bg-white/5 border border-white/5 text-xs">
                  {game.displayName}
                </div>
              ))}
              {gameListData.remainingGames?.length === 0 && <p className="text-center py-20 text-gray-500 italic">Nenhum jogo pendente na lista!</p>}
           </div>
        </GlassCard>
      </div>
    </div>
  );
}
