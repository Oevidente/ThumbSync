import { useState, useMemo } from 'react';
import { 
  Layers, 
  Search, 
  Sparkles, 
  FileCheck, 
  AlertTriangle, 
  FolderMinus, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  FileCode,
  ArrowRight,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PsdItem {
  id: string;
  normalizedName: string;
  displayName: string;
  providerName: string;
  isListed: boolean;
  hasPsd: boolean;
  psdPath: string;
  psdSize: number;
  psdModifiedAtMs: number;
  hasSourceWebp: boolean;
  sourceWebpPath: string;
  hasDestWebp: boolean;
  destWebpPath: string;
}

interface PsdData {
  totalPsds: number;
  totalWebps: number;
  psdsMatched: number;
  psdsMissingWebp: number;
  webpsMissingPsd: number;
  unlistedAssets: number;
  items: PsdItem[];
}

interface PsdViewProps {
  psdData?: PsdData;
  onRefresh?: (silent?: boolean) => void;
  isLoading?: boolean;
}

export function PsdView({ psdData, onRefresh, isLoading = false }: PsdViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'missing-webp' | 'missing-psd' | 'unlisted' | 'synced'>('all');

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '---';
    const k = 1024;
    const dm = 1;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatLastModified = (timestamp?: number) => {
    if (!timestamp) return '---';
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const providers = useMemo(() => {
    if (!psdData?.items) return [];
    const list = new Set(psdData.items.map(item => item.providerName || 'Sem provedor'));
    return Array.from(list).sort();
  }, [psdData?.items]);

  const filteredItems = useMemo(() => {
    if (!psdData?.items) return [];

    return psdData.items.filter(item => {
      // 1. Search Query
      const matchesSearch = 
        item.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.providerName.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Provider Filter
      if (selectedProvider !== 'all') {
        const itemProvNormalized = (item.providerName || 'Sem provedor').toLowerCase();
        const selectedProvNormalized = selectedProvider.toLowerCase();
        if (itemProvNormalized !== selectedProvNormalized) return false;
      }

      // 3. Status Action Tab Filter
      switch (activeFilter) {
        case 'missing-webp':
          return item.hasPsd && !item.hasSourceWebp && !item.hasDestWebp;
        case 'missing-psd':
          return !item.hasPsd && (item.hasSourceWebp || item.hasDestWebp);
        case 'unlisted':
          return !item.isListed && (item.hasPsd || item.hasSourceWebp || item.hasDestWebp);
        case 'synced':
          return item.hasPsd && (item.hasSourceWebp || item.hasDestWebp);
        case 'all':
        default:
          return true;
      }
    });
  }, [psdData?.items, searchQuery, selectedProvider, activeFilter]);

  // Visual counts
  const missingWebpCount = useMemo(() => {
    return psdData?.items?.filter(item => item.hasPsd && !item.hasSourceWebp && !item.hasDestWebp).length || 0;
  }, [psdData?.items]);

  const missingPsdCount = useMemo(() => {
    return psdData?.items?.filter(item => !item.hasPsd && (item.hasSourceWebp || item.hasDestWebp)).length || 0;
  }, [psdData?.items]);

  const unlistedCount = useMemo(() => {
    return psdData?.items?.filter(item => !item.isListed && (item.hasPsd || item.hasSourceWebp || item.hasDestWebp)).length || 0;
  }, [psdData?.items]);

  const syncedCount = useMemo(() => {
    return psdData?.items?.filter(item => item.hasPsd && (item.hasSourceWebp || item.hasDestWebp)).length || 0;
  }, [psdData?.items]);

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 md:space-y-8 select-none max-w-7xl mx-auto w-full" id="psd-catalog-root">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.04] pb-6">
        <div>
          <div className="flex items-center gap-2.5 text-[#0a84ff] mb-1">
            <span className="p-1.5 bg-[#0a84ff]/8 border border-[#0a84ff]/15 rounded-lg flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider">Centro de Design</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
            Catálogo de Projetos PSD
          </h1>
          <p className="text-xs md:text-sm text-zinc-400 font-medium">
            Mapeie o vínculo entre os templates editáveis locais (<span className="text-[#0a84ff] font-semibold">.PSD</span>) e as imagens exportadas na <span className="text-[#30d158] font-semibold">Origem</span>. Projetos em PSD são catalogados localmente para não sobrecarregar o drive externo do site.
          </p>
        </div>

        <button
          onClick={() => onRefresh && onRefresh(false)}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 border border-white/[0.06] hover:border-white/[0.1] active:border-white/[0.05] text-white py-3 px-4 rounded-xl text-button transition-all disabled:opacity-50 select-none min-h-[44px]"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Escanear Catálogo</span>
        </button>
      </div>

      {/* OVERVIEW STATS GRID (BENTO CARD STYLE) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="psd-stats-grid">
        
        {/* TOTAL PSDS */}
        <div className="bg-[#121216]/40 border border-white/[0.05] rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-zinc-700 group-hover:text-[#0a84ff]/25 transition-colors">
            <Layers className="w-12 h-12 stroke-[1.2]" />
          </div>
          <div className="relative z-10">
            <span className="text-xs text-zinc-400 font-semibold block mb-1">Total de PSDs</span>
            <span className="text-2xl md:text-3xl font-black text-white leading-none block">
              {psdData?.totalPsds || 0}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-[#0a84ff] font-medium leading-none">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Templates editáveis ativos</span>
          </div>
        </div>

        {/* MISSING WEBPS */}
        <div className="bg-[#121216]/40 border border-white/[0.05] rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-zinc-700 group-hover:text-amber-500/20 transition-colors">
            <AlertTriangle className="w-12 h-12 stroke-[1.2]" />
          </div>
          <div className="relative z-10">
            <span className="text-xs text-zinc-400 font-semibold block mb-1">Sem WebP (Pendentes)</span>
            <span className="text-2xl md:text-3xl font-black text-amber-500 leading-none block">
              {missingWebpCount}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-amber-500 font-medium leading-none">
            <FolderMinus className="w-3.5 h-3.5" />
            <span>Existem no PSD, mas sem imagem</span>
          </div>
        </div>

        {/* MISSING PSDS */}
        <div className="bg-[#121216]/40 border border-white/[0.05] rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-zinc-700 group-hover:text-[#ff453a]/20 transition-colors">
            <XCircle className="w-12 h-12 stroke-[1.2]" />
          </div>
          <div className="relative z-10">
            <span className="text-xs text-zinc-400 font-semibold block mb-1">Sem PSD (Imagens Órfãs)</span>
            <span className="text-2xl md:text-3xl font-black text-[#ff453a] leading-none block">
              {missingPsdCount}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-[#ff453a] font-medium leading-none">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Imagem exportada na Origem sem o .PSD correspondente</span>
          </div>
        </div>

        {/* UNLISTED */}
        <div className="bg-[#121216]/40 border border-white/[0.05] rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 text-zinc-700 group-hover:text-[#bf5af2]/20 transition-colors">
            <FileCode className="w-12 h-12 stroke-[1.2]" />
          </div>
          <div className="relative z-10">
            <span className="text-xs text-zinc-400 font-semibold block mb-1">Não Listados (Rascunhos)</span>
            <span className="text-2xl md:text-3xl font-black text-[#bf5af2] leading-none block">
              {unlistedCount}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-[#bf5af2] font-medium leading-none">
            <Info className="w-3.5 h-3.5" />
            <span>Arquivos salvos ausentes na lista.txt</span>
          </div>
        </div>

      </div>

      {/* FILTER BUTTONS (SCROLLABLE TAB BAR ON MOBILE) */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-[#121216]/30 p-2 border border-white/[0.03] rounded-2xl">
        <div className="flex gap-1 overflow-x-auto no-scrollbar scroll-smooth pb-1 md:pb-0 shrink-0 select-none">
          
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[40px] flex items-center gap-1.5 ${
              activeFilter === 'all' 
                ? 'bg-white/[0.07] text-white border border-white/[0.05]' 
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <span>Todos</span>
            <span className="bg-white/10 px-1.5 py-0.5 rounded-md text-[10px] text-zinc-300 font-bold">
              {psdData?.items?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('missing-webp')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[40px] flex items-center gap-1.5 ${
              activeFilter === 'missing-webp' 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <span>Falta WebP</span>
            <span className="bg-amber-500/15 text-amber-500 px-1.5 py-0.5 rounded-md text-[10px] font-black">
              {missingWebpCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('missing-psd')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[40px] flex items-center gap-1.5 ${
              activeFilter === 'missing-psd' 
                ? 'bg-[#ff453a]/10 text-[#ff453a] border border-[#ff453a]/25' 
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <span>Falta PSD</span>
            <span className="bg-[#ff453a]/15 text-[#ff453a] px-1.5 py-0.5 rounded-md text-[10px] font-black">
              {missingPsdCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('unlisted')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[40px] flex items-center gap-1.5 ${
              activeFilter === 'unlisted' 
                ? 'bg-[#bf5af2]/10 text-[#bf5af2] border border-[#bf5af2]/20' 
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <span>Rascunhos</span>
            <span className="bg-[#bf5af2]/15 text-[#bf5af2] px-1.5 py-0.5 rounded-md text-[10px] font-black">
              {unlistedCount}
            </span>
          </button>

          <button
            onClick={() => setActiveFilter('synced')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap min-h-[40px] flex items-center gap-1.5 ${
              activeFilter === 'synced' 
                ? 'bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20' 
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            <span>Completo</span>
            <span className="bg-[#30d158]/15 text-[#30d158] px-1.5 py-0.5 rounded-md text-[10px] font-black">
              {syncedCount}
            </span>
          </button>

        </div>

        {/* CONTROLS AREA */}
        <div className="flex gap-2 w-full md:w-auto">
          {/* PROVIDER FILTER */}
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="flex-1 md:flex-initial bg-[#16161b]/80 text-xs font-medium border border-white/[0.06] rounded-xl px-3 py-2 text-white h-[40px] focus:outline-none focus:border-[#0a84ff] cursor-pointer"
          >
            <option value="all">Filtro: Todos Provedores</option>
            {providers.map(prov => (
              <option key={prov} value={prov}>{prov}</option>
            ))}
          </select>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center gap-2.5 bg-[#121216]/40 border border-white/[0.05] rounded-xl px-3.5 py-1.5 focus-within:border-[#0a84ff]/50 transition-colors">
        <Search className="w-4 h-4 text-zinc-500 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar jogo por nome ou provedor no centro de design..."
          className="bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none w-full py-1.5 h-full"
        />
      </div>

      {/* GRID CATÁLOGO */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
          <span>Jogos e Arquivos Coincidentes ({filteredItems.length})</span>
          <span>Status de Produção</span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-[#121216]/20 border border-dashed border-white/[0.05] rounded-2xl text-center">
            <Layers className="w-12 h-12 text-zinc-700 mb-3 animate-pulse" />
            <span className="text-sm font-semibold text-zinc-300">Nenhum vínculo correspondente encontrado</span>
            <span className="text-xs text-zinc-500 mt-1 max-w-[300px]">
              Tente redefinir seus filtros, buscar outro termo ou configurar a pasta PSD em Configurações.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="psd-catalog-cards-container">
            {filteredItems.map((item) => {
              // Decide visual tags and theme for the matching block
              const statusTheme = (() => {
                if (item.hasPsd && !item.hasSourceWebp && !item.hasDestWebp) {
                  return {
                    border: 'border-amber-500/15 bg-amber-500/[0.01]',
                    badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                    label: 'Exportar WebP',
                    desc: 'PSD salvo, mas nenhuma imagem exportada do Photoshop como .webp ainda.'
                  };
                }
                if (!item.hasPsd && (item.hasSourceWebp || item.hasDestWebp)) {
                  return {
                    border: 'border-[#ff453a]/15 bg-[#ff453a]/[0.01]',
                    badge: 'bg-[#ff453a]/10 text-[#ff453a] border border-[#ff453a]/25',
                    label: 'Sem Editável (Órfã)',
                    desc: 'A imagem .webp existe, mas o arquivo editável original .psd está ausente na Origem local.'
                  };
                }
                if (!item.isListed) {
                  return {
                    border: 'border-[#bf5af2]/15 bg-[#bf5af2]/[0.01]',
                    badge: 'bg-[#bf5af2]/10 text-[#bf5af2] border border-[#bf5af2]/20',
                    label: 'Rascunho Não Listado',
                    desc: 'Os arquivos existem no disco, mas o jogo não foi adicionado em lista.txt.'
                  };
                }
                return {
                  border: 'border-white/[0.05] bg-[#121216]/10',
                  badge: 'bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20',
                  label: 'Sincronizado',
                  desc: 'Templates editáveis em .psd e exportações webp ativos e mapeados.'
                };
              })();

              return (
                <motion.div
                  key={item.id}
                  layoutId={`psd-card-${item.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border ${statusTheme.border} p-5 rounded-2xl flex flex-col justify-between hover:bg-white/[0.02] hover:border-white/[0.08] transition-all duration-300 relative`}
                  id={`card-${item.id}`}
                >
                  <div>
                    {/* Header: Provider & Action Status */}
                    <div className="flex items-start justify-between min-h-[26px]">
                      <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#8a8a93]">
                        {item.providerName || 'Sem provedor'}
                      </span>
                      <span className={`text-[10px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full ${statusTheme.badge}`}>
                        {statusTheme.label}
                      </span>
                    </div>

                    {/* Game Name */}
                    <h3 className="text-base font-extrabold text-white tracking-tight mt-1 mb-1.5 truncate">
                      {item.displayName}
                    </h3>

                    {/* Quick description explanation */}
                    <p className="text-[11px] text-zinc-500 font-medium mb-4 line-clamp-2 leading-relaxed">
                      {statusTheme.desc}
                    </p>

                    {/* Technical Assets Links block */}
                    <div className="space-y-2.5 border-t border-white/[0.03] pt-3.5 mb-2">
                      
                      {/* PSD Status Line */}
                      <div className="flex items-center justify-between text-xs font-sans">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Layers className={`w-3.5 h-3.5 shrink-0 ${item.hasPsd ? 'text-[#0a84ff]' : 'text-zinc-600'}`} />
                          <span className="font-semibold">Arquivo .PSD:</span>
                        </div>
                        {item.hasPsd ? (
                          <div className="text-right">
                            <span className="text-white font-mono text-[11px] font-medium block">
                              {item.displayName}.psd
                            </span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {formatFileSize(item.psdSize)} • {formatLastModified(item.psdModifiedAtMs)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-red-500 font-black tracking-wide text-[11px] flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> AUSENTE
                          </span>
                        )}
                      </div>

                      {/* WebP Status Line */}
                      <div className="flex items-center justify-between text-xs font-sans">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${item.hasSourceWebp || item.hasDestWebp ? 'text-[#30d158]' : 'text-zinc-600'}`} />
                          <span className="font-semibold">Imagem .WebP:</span>
                        </div>
                        {item.hasSourceWebp || item.hasDestWebp ? (
                          <div className="text-right">
                            <span className="text-white font-mono text-[11px] font-medium block">
                              {item.displayName}.webp
                            </span>
                            <span className="text-[10px] text-zinc-500 font-semibold block mt-0.5">
                              {item.hasDestWebp && <span className="text-[#30d158] bg-[#30d158]/8 px-1.5 py-0.5 rounded-md border border-[#30d158]/12 text-[9px] font-extrabold uppercase ml-1">No Destino (Site)</span>}
                              {item.hasSourceWebp && !item.hasDestWebp && <span className="text-amber-500 bg-amber-500/8 px-1.5 py-0.5 rounded-md border border-amber-500/12 text-[9px] font-extrabold uppercase ml-1">Só na Origem</span>}
                            </span>
                          </div>
                        ) : (
                          <span className="text-amber-500 font-black tracking-wide text-[11px] flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> AUSENTE (Pendente)
                          </span>
                        )}
                      </div>

                      {/* Listed status Line */}
                      <div className="flex items-center justify-between text-xs font-sans">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <FileCode className={`w-3.5 h-3.5 shrink-0 ${item.isListed ? 'text-zinc-400' : 'text-[#bf5af2]'}`} />
                          <span className="font-semibold">Na lista.txt:</span>
                        </div>
                        {item.isListed ? (
                          <span className="text-[#30d158] font-bold text-[11px]">Presente</span>
                        ) : (
                          <span className="text-[#bf5af2] font-black text-[11px]">Não Listado</span>
                        )}
                      </div>

                    </div>
                  </div>

                  {/* Workflow CTA */}
                  <div className="mt-4 flex items-center justify-end">
                    {item.hasPsd && !item.hasSourceWebp ? (
                      <div className="text-[10px] text-amber-400 bg-amber-400/5 px-2.5 py-1 rounded-lg border border-amber-400/10 flex items-center gap-1 font-bold">
                        <span>Requer exportação para WebP no Photoshop</span>
                      </div>
                    ) : item.hasSourceWebp && !item.hasDestWebp ? (
                      <div className="text-[10px] text-[#0a84ff] bg-[#0a84ff]/5 px-2.5 py-1 rounded-lg border border-[#0a84ff]/10 flex items-center gap-1 font-bold">
                        <span>Use a aba Analisador para sincronizar para o Destino</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-zinc-500 font-bold flex items-center gap-1">
                        <span>Tudo pronto com este ativo</span>
                      </div>
                    )}
                  </div>

                </motion.div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
