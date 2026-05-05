import { GlassCard } from "../components/GlassCard.tsx";
import { RefreshCw, FileCheck, AlertCircle, Clock, Package, CheckCircle } from "lucide-react";
import { motion } from "motion/react";

export function Dashboard({ analysisData, onRefresh }: { analysisData: any, onRefresh: () => void }) {
  if (!analysisData) return <div className="p-10 text-center opacity-50">Carregando dados...</div>;

  const stats = [
    { label: "Origem", value: analysisData.totalSourceFiles, icon: Package, color: "text-blue-400", glow: "bg-blue-500/20" },
    { label: "Pendentes", value: analysisData.pendingFiles.length, icon: AlertCircle, color: "text-orange-400", glow: "bg-orange-500/20" },
    { label: "Jogos Feitos", value: analysisData.gameListData?.completedGames || 0, icon: FileCheck, color: "text-green-400", glow: "bg-green-500/20" },
    { label: "Lista Total", value: analysisData.gameListData?.totalListedGames || 0, icon: Clock, color: "text-purple-400", glow: "bg-purple-500/20" },
  ];

  return (
    <div className="space-y-10 relative">
      <div className="flex justify-between items-end relative z-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">Centro de Controle</h1>
          <p className="text-gray-400 font-medium">Lógica preservada • Design ultra-vidro</p>
        </div>
        <button 
          onClick={onRefresh}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full acrylic hover:bg-white/10 transition-all text-sm font-semibold active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          Sincronizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <GlassCard key={i} hover className="flex items-start gap-5 !p-5 relative">
            <div className={`absolute -inset-1 ${stat.glow} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className={`p-3 rounded-xl bg-white/5 ${stat.color} relative z-10`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <GlassCard className="lg:col-span-2 !p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-fluent-accent" />
              Próximo Lote Inteligente
            </h3>
            <span className="px-3 py-1 bg-fluent-accent/10 border border-fluent-accent/20 rounded-full text-[10px] font-black text-fluent-accent uppercase tracking-tighter">
              Auto-Schedule Ativo
            </span>
          </div>
          
          <div className="space-y-6">
             {analysisData.pendingFiles.length === 0 ? (
               <div className="py-20 text-center space-y-4">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto opacity-20" />
                  <p className="text-gray-500 italic font-medium">Todos os arquivos estão sincronizados.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Galeria de Prioridades</p>
                    <div className="grid grid-cols-2 gap-2">
                       {analysisData.pendingFiles.slice(0, 4).map((f: any, i: number) => (
                         <div key={i} className="relative aspect-video rounded-lg overflow-hidden group border border-white/10">
                           <img 
                             src={`/api/image?path=${encodeURIComponent(f.sourcePath)}`} 
                             alt={f.relativePath.split('/').pop()}
                             className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                             onError={(e) => {
                               (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIwaHB4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzY2NiI+V0VCUDwvdGV4dD48L3N2Zz4=';
                             }}
                           />
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                             <span className="text-[10px] truncate w-full font-medium text-white drop-shadow-md">
                               {f.relativePath.split('/').pop().replace('.webp', '')}
                             </span>
                           </div>
                         </div>
                       ))}
                    </div>
                  </div>
                  <div className="p-6 rounded-2xl bg-fluent-accent/5 border border-fluent-accent/10 flex flex-col justify-center items-center text-center">
                    <Clock className="w-10 h-10 text-fluent-accent mb-3 opacity-50" />
                    <p className="text-sm font-bold text-white mb-1">Lote 01 Programado</p>
                    <p className="text-xs text-gray-500 max-w-[140px]">Distribuição de 17 arquivos entre 14:10 e 17:30</p>
                  </div>
               </div>
             )}
          </div>
        </GlassCard>

        <GlassCard className="!p-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-fluent-accent/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
          <h3 className="text-xl font-bold mb-8">Saúde do Acervo</h3>
          <div className="relative h-48 flex items-center justify-center">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="84"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="12"
                className="text-white/5"
              />
              <motion.circle
                cx="96"
                cy="96"
                r="84"
                fill="transparent"
                stroke="currentColor"
                strokeWidth="12"
                strokeDasharray={527}
                initial={{ strokeDashoffset: 527 }}
                animate={{ strokeDashoffset: 527 - (527 * (analysisData.gameListData?.completedGames || 0) / (analysisData.gameListData?.totalListedGames || 1)) }}
                transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
                className="text-fluent-accent"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black tracking-tighter">
                {Math.round(((analysisData.gameListData?.completedGames || 0) / (analysisData.gameListData?.totalListedGames || 1)) * 100)}%
              </span>
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Status Global</span>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4">
             <div className="space-y-1">
               <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Feitos</span>
               <span className="text-lg font-bold text-white">{analysisData.gameListData?.completedGames || 0}</span>
             </div>
             <div className="space-y-1">
               <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Faltam</span>
               <span className="text-lg font-bold text-white">{analysisData.gameListData?.remainingGames?.length || 0}</span>
             </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
