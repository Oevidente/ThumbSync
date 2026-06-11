import { GlassCard } from '../components/GlassCard';
import {
  RefreshCw,
  FileCheck,
  AlertCircle,
  Clock,
  Package,
  CheckCircle,
  UploadCloud,
  ChevronDown,
  ChevronRight,
  Copy,
} from 'lucide-react';
import { motion } from 'motion/react';
import { Fragment, useMemo, useState } from 'react';

function getBoundedPercent(value: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.max(0, Math.round((value / total) * 100)));
}

function normalizeGameName(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.webp$/i, '')
    .replace(/:/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function getFileNameFromPath(value = '') {
  return String(value).split(/[\\/]/).pop() || value;
}

function createProviderGameKey(
  providerName: string,
  normalizedGameName: string,
) {
  return `${normalizeGameName(providerName || 'Sem provedor')}::${normalizedGameName}`;
}

function getSentGamesCount(gameListData: any, recordsData: any) {
  if (typeof gameListData?.sentGamesCount === 'number')
    return gameListData.sentGamesCount;

  const listedGames = [
    ...(gameListData?.readyGames || []),
    ...(gameListData?.remainingGames || []),
  ];
  const providers = recordsData?.providers || [];
  if (!listedGames.length || !providers.length) return 0;

  const sentGameNames = new Set<string>();
  const sentProviderGameKeys = new Set<string>();

  providers.forEach((provider: any) => {
    const providerName = provider?.providerName || 'Sem provedor';

    provider?.games?.forEach((game: any) => {
      const fileName =
        game?.fileName ||
        getFileNameFromPath(
          game?.relativePath || game?.destPath || game?.displayName,
        );
      const normalizedGameName = normalizeGameName(
        fileName || game?.displayName,
      );
      if (!normalizedGameName) return;

      sentGameNames.add(normalizedGameName);
      sentProviderGameKeys.add(
        createProviderGameKey(
          game?.providerName || providerName,
          normalizedGameName,
        ),
      );
    });
  });

  return listedGames.filter((game: any) => {
    const providerName = game?.providerName || 'Sem provedor';
    const normalizedGameName =
      game?.normalized || normalizeGameName(game?.displayName);
    if (!normalizedGameName) return false;

    const providerKey = normalizeGameName(providerName);
    const gameKey = createProviderGameKey(providerName, normalizedGameName);

    if (providerKey === normalizeGameName('Sem provedor')) {
      return (
        sentProviderGameKeys.has(gameKey) ||
        sentGameNames.has(normalizedGameName)
      );
    }

    return sentProviderGameKeys.has(gameKey);
  }).length;
}

function getProviderGroups(
  gameListData: any,
  groupedKey: string,
  flatKey: string,
) {
  const groups = gameListData?.[groupedKey];
  if (groups?.length) return groups;

  const games = gameListData?.[flatKey];
  return games?.length ? [{ providerName: 'Sem provedor', games }] : [];
}

const gameFamilyCollator = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
});

const gameAlphabeticCollator = new Intl.Collator('pt-BR', {
  numeric: false,
  sensitivity: 'base',
});

function getGameNameForSort(game: any) {
  return String(game?.displayName || game?.normalized || '').trim();
}

function getGameFamilySortKey(gameName = '') {
  const normalized = normalizeGameName(gameName);
  const withoutStandaloneNumbers = normalized
    .replace(/(^|\s)\d+(?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return withoutStandaloneNumbers || normalized;
}

function sortGamesBySimilarName(games: any[] = []) {
  return [...games].sort((a, b) => {
    const aName = getGameNameForSort(a);
    const bName = getGameNameForSort(b);
    const familyComparison = gameFamilyCollator.compare(
      getGameFamilySortKey(aName),
      getGameFamilySortKey(bName),
    );

    if (familyComparison !== 0) return familyComparison;

    return (
      gameAlphabeticCollator.compare(normalizeGameName(aName), normalizeGameName(bName)) ||
      gameAlphabeticCollator.compare(aName, bName)
    );
  });
}

function DashboardProviderGroupItem({
  title,
  group,
  groupIndex,
  toneClasses,
  sentData,
}: {
  key?: string;
  title: string;
  group: any;
  groupIndex: number;
  toneClasses: any;
  sentData?: { keys: Set<string>; names: Set<string> };
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const sortedGames = useMemo(
    () => sortGamesBySimilarName(group.games || []),
    [group.games],
  );

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`sticky top-0 z-10 w-full flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] px-3.5 py-2.5 font-sans text-xs ${toneClasses.header} backdrop-blur-md text-left cursor-pointer transition-all duration-200 select-none`}
      >
        <span className="font-semibold truncate flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
          )}
          Provedor: <span className="text-white font-bold">{group.providerName}</span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${toneClasses.badge}`}
        >
          {group.games?.length || 0}
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-1.5 pl-2 border-l border-white/[0.05] ml-4.5">
          {sortedGames.map((game: any, i: number) => {
            const normalizedName =
              game.normalized || normalizeGameName(game.displayName);
            const providerName = game.providerName || group.providerName;
            const gameKey = createProviderGameKey(
              providerName,
              normalizedName,
            );

            const isSent = !!(
              sentData?.keys.has(gameKey) ||
              (normalizeGameName(providerName) ===
                normalizeGameName('Sem provedor') &&
                sentData?.names.has(normalizedName))
            );

            const itemClasses = isSent
              ? 'bg-[#30d158]/8 border-[#30d158]/15 text-[#30d158]'
              : toneClasses.item;

            return (
              <div
                key={`${title}-${group.providerName}-${game.displayName}-${i}`}
                className={`group relative flex items-center justify-between py-2 pl-3 pr-9 rounded-lg border text-xs font-semibold font-sans shadow-sm transition-all duration-200 hover:translate-x-0.5 ${itemClasses}`}
              >
                <span className="truncate flex-1 pr-1">{game.displayName}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    navigator.clipboard.writeText(game.displayName);
                    window.dispatchEvent(
                      new CustomEvent('thumbsync-show-notification', {
                        detail: {
                          title: 'Copiado! 📋',
                          message: `"${game.displayName}" copiado para a área de transferência.`,
                        },
                      }),
                    );
                  }}
                  title="Copiar nome do jogo"
                  className="opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-all duration-150 absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-white/[0.04] md:bg-transparent border border-white/[0.04] md:border-transparent text-zinc-400 hover:text-white cursor-pointer active:scale-90"
                >
                  <Copy className="w-3.5 h-3.5 pointer-events-none" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompactProviderList({
  title,
  count,
  groups,
  tone,
  icon: Icon,
  sentData,
}: {
  title: string;
  count: number;
  groups: any[];
  tone: 'blue' | 'green' | 'orange';
  icon: any;
  sentData?: { keys: Set<string>; names: Set<string> };
}) {
  const toneClasses = {
    blue: {
      title: 'text-[#0a84ff]',
      header: 'text-zinc-250',
      badge: 'bg-[#0a84ff]/10 text-[#0a84ff] border border-[#0a84ff]/15',
      item: 'bg-[#0a84ff]/5 border-[#0a84ff]/10 text-zinc-300 hover:text-white',
    },
    green: {
      title: 'text-[#30d158]',
      header: 'text-zinc-250',
      badge: 'bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/15',
      item: 'bg-[#30d158]/5 border-[#30d158]/10 text-[#30d158] hover:text-white',
    },
    orange: {
      title: 'text-[#ff9f0a]',
      header: 'text-zinc-250',
      badge: 'bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/15',
      item: 'bg-[#ff9f0a]/5 border-[#ff9f0a]/10 text-zinc-300 hover:text-white',
    },
  }[tone];

  return (
    <div className="min-h-0 flex flex-col rounded-2xl bg-white/[0.015] border border-white/[0.05] p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h4
          className={`font-bold text-sm tracking-tight flex items-center gap-2 ${toneClasses.title}`}
        >
          <Icon className="w-4 h-4" />
          {title} <span className="text-zinc-500 font-medium">({count})</span>
        </h4>
      </div>
      <div className="max-h-[300px] overflow-y-auto space-y-3.5 pr-2 custom-scrollbar">
        {groups.map((group: any, groupIndex: number) => (
          <DashboardProviderGroupItem
            key={`${title}-${group.providerName}-${groupIndex}`}
            title={title}
            group={group}
            groupIndex={groupIndex}
            toneClasses={toneClasses}
            sentData={sentData}
          />
        ))}
        {count === 0 && (
          <p className="text-center py-16 text-zinc-600 text-xs italic font-medium">
            Nenhum item pendente.
          </p>
        )}
      </div>
    </div>
  );
}

export function Dashboard({
  analysisData,
  onRefresh,
  isLoading,
  isServerOnline = true,
  hasPendingSync = false,
  syncingOfflineChanges = false,
  onManualSync,
}: {
  analysisData: any;
  onRefresh: () => void;
  isLoading: boolean;
  isServerOnline?: boolean;
  hasPendingSync?: boolean;
  syncingOfflineChanges?: boolean;
  onManualSync?: () => void;
}) {
  if (!analysisData)
    return (
      <div className="p-16 text-center text-zinc-400 font-semibold flex flex-col items-center justify-center gap-4 animate-pulse">
        <RefreshCw className="w-6 h-6 animate-spin text-[#0a84ff]" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-white">Carregando console de controle...</p>
          <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Verificando bases de dados locais e remotas</p>
        </div>
      </div>
    );

  const sentData = useMemo(() => {
    const keys = new Set<string>();
    const names = new Set<string>();
    const providers = analysisData.recordsData?.providers || [];

    providers.forEach((provider: any) => {
      const providerName = provider?.providerName || 'Sem provedor';
      provider?.games?.forEach((game: any) => {
        const fileName =
          game?.fileName ||
          getFileNameFromPath(
            game?.relativePath || game?.destPath || game?.displayName,
          );
        const normalizedGameName = normalizeGameName(
          fileName || game?.displayName || '',
        );

        if (normalizedGameName) {
          names.add(normalizedGameName);
          keys.add(
            createProviderGameKey(
              game?.providerName || providerName,
              normalizedGameName,
            ),
          );
        }
      });
    });
    return { keys, names };
  }, [analysisData.recordsData]);

  const totalListedGames = analysisData.gameListData?.totalListedGames || 0;
  const completedGames = analysisData.gameListData?.completedGames || 0;
  const rawSentGames = getSentGamesCount(
    analysisData.gameListData,
    analysisData.recordsData,
  );
  const sentGames = totalListedGames
    ? Math.min(rawSentGames, totalListedGames)
    : rawSentGames;
  const remainingGames =
    analysisData.gameListData?.remainingGames?.length ??
    Math.max(totalListedGames - completedGames, 0);
  const completedPercent = getBoundedPercent(completedGames, totalListedGames);
  const sentPercent = getBoundedPercent(sentGames, totalListedGames);
  const circleLength = 527;
  const completedDashOffset =
    circleLength - (circleLength * completedPercent) / 100;
  const sentDashOffset = circleLength - (circleLength * sentPercent) / 100;

  const stats = [
    {
      label: 'Origem',
      value: analysisData.totalSourceFiles,
      icon: Package,
      color: 'text-[#0a84ff]',
      glow: 'from-[#0a84ff]/20 to-transparent',
    },
    {
      label: 'Pendentes',
      value: analysisData.pendingFiles.length,
      icon: AlertCircle,
      color: 'text-[#ff9f0a]',
      glow: 'from-[#ff9f0a]/20 to-transparent',
    },
    {
      label: 'Jogos Feitos',
      value: completedGames,
      icon: FileCheck,
      color: 'text-[#0a84ff]',
      glow: 'from-[#0a84ff]/20 to-transparent',
    },
    {
      label: 'Enviados',
      value: sentGames,
      icon: UploadCloud,
      color: 'text-[#30d158]',
      glow: 'from-[#30d158]/20 to-transparent',
    },
    {
      label: 'Lista Total',
      value: totalListedGames,
      icon: Clock,
      color: 'text-purple-400',
      glow: 'from-purple-500/20 to-transparent',
    },
  ];
  const readyGroups = getProviderGroups(
    analysisData.gameListData,
    'readyGamesByProvider',
    'readyGames',
  );
  const remainingGroups = getProviderGroups(
    analysisData.gameListData,
    'remainingGamesByProvider',
    'remainingGames',
  );

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-5 relative z-10">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1 bg-gradient-to-r from-white to-zinc-450 bg-clip-text text-transparent">
            Centro de Controle
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm font-semibold tracking-wide">
            Sincronização estendida de miniaturas de jogos
          </p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {hasPendingSync && isServerOnline && onManualSync && (
            <button
              onClick={onManualSync}
              disabled={syncingOfflineChanges}
              className="glass-btn-secondary !py-2.5 !px-5 flex items-center justify-center gap-2 cursor-pointer text-sm font-bold border-amber-500/30 text-amber-500 hover:bg-amber-500/10 w-full sm:w-auto"
            >
              <RefreshCw className={`w-4 h-4 shrink-0 ${syncingOfflineChanges ? 'animate-spin' : ''}`} />
              Sincronizar Manual
            </button>
          )}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="glass-btn-secondary !py-2.5 !px-5 flex items-center justify-center gap-2 cursor-pointer text-sm w-full sm:w-auto"
          >
            <motion.span
              className="inline-flex shrink-0"
              animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
              transition={{
                duration: isLoading ? 0.8 : 0.2,
                ease: 'linear',
                repeat: isLoading ? Infinity : 0,
              }}
            >
              <RefreshCw className="w-4 h-4" />
            </motion.span>
            <span>{isServerOnline ? 'Sincronizar' : 'Verificar Conexão'}</span>
          </button>
        </div>
      </div>

      {/* Server Offline Indicator Banner */}
      {!isServerOnline && (
        <div className="bg-[#ff9f0a]/10 border border-[#ff9f0a]/20 rounded-2xl p-4 flex gap-3 text-left font-sans shadow-lg select-none">
          <Clock className="w-5 h-5 text-[#ff9f0a] shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-black text-white leading-normal">
              Informação Sincronizada Localmente
            </h4>
            <p className="text-[10px] text-zinc-400 font-semibold tracking-wide leading-relaxed">
              Exibindo dados armazenados em cache. O servidor central de arquivos está offline no momento. Você ainda pode usar o app e alterar dados tranquilamente; todo o acervo será sincronizado ao ligar o computador!
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-1.5 sm:gap-4">
        {stats.map((stat) => (
          <Fragment key={stat.label}>
            <GlassCard hover className="!p-1.5 sm:!p-4 h-[72px] sm:h-auto !rounded-xl sm:!rounded-2xl">
              <div className="flex flex-col items-center justify-between h-full relative z-10">
                <div
                  className={`absolute -inset-4 bg-gradient-to-br ${stat.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                />
                <div
                  className={`w-[30px] h-[30px] min-h-[30px] min-w-[30px] sm:w-12 sm:h-12 sm:min-h-[48px] sm:min-w-[48px] shrink-0 flex items-center justify-center rounded-[8px] sm:rounded-xl bg-white/[0.05] ${stat.color} transition-transform duration-300 group-hover:scale-105`}
                >
                  <stat.icon strokeWidth={2.5} className="w-[16px] h-[16px] sm:w-6 sm:h-6 shrink-0 relative z-10" />
                </div>
                <div className="flex flex-col items-center justify-end w-full text-center mt-auto relative z-10">
                  <p className="text-[7px] sm:text-[10px] text-zinc-400 font-bold uppercase tracking-widest leading-none mb-[3px] sm:mb-1 truncate w-full font-sans">
                    {stat.label}
                  </p>
                  <p className="text-[12px] sm:text-2xl font-black tracking-tight text-white truncate w-full font-sans leading-none sm:leading-normal">
                    {stat.value}
                  </p>
                </div>
              </div>
            </GlassCard>
          </Fragment>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        <GlassCard className="lg:col-span-2 !p-6 sm:!p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg md:text-xl font-bold flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-[#0a84ff] shadow-[0_0_8px_#0a84ff]" />
              Próximo Lote Inteligente
            </h3>
            <span className="px-3 py-1 bg-[#0a84ff]/10 border border-[#0a84ff]/20 rounded-full text-[9px] font-bold text-[#0a84ff] uppercase tracking-wide">
              Auto-Schedule Ativo
            </span>
          </div>

          <div className="space-y-5">
            {analysisData.pendingFiles.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                  <CheckCircle className="w-6 h-6 text-[#30d158]" />
                </div>
                <p className="text-zinc-500 font-semibold text-sm">
                  Acervo impecável. Todos os arquivos estão sincronizados!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="p-5 rounded-2xl bg-white/[0.015] border border-white/[0.05]">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">
                    Galeria de Prioridades
                  </p>
                  <div className="grid grid-cols-4 gap-3.5">
                    {analysisData.pendingFiles
                      .slice(0, 4)
                      .map((f: any, i: number) => (
                        <div
                          key={i}
                          className="relative aspect-[2/3] rounded-lg overflow-hidden group border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.5)] bg-zinc-900"
                        >
                          <img
                            src={`/api/image?path=${encodeURIComponent(f.sourcePath)}`}
                            alt={f.relativePath.split('/').pop()}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIwaHB4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iJobsIis+V0VCUDwvdGV4dD48L3N2Zz4=';
                            }}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-end">
                            <span className="text-[8px] font-semibold text-white truncate w-full leading-tight text-center">
                              {f.relativePath
                                .split(/[\/\\]/)
                                .pop()
                                .replace('.webp', '')}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
                <div className="p-6 rounded-2xl bg-[#0a84ff]/5 border border-[#0a84ff]/10 flex flex-col justify-center items-center text-center">
                  <Clock className="w-10 h-10 text-[#0a84ff] mb-3.5 opacity-70" />
                  <p className="text-sm font-bold text-white mb-1.5 font-sans">
                    Lote 01 Programado
                  </p>
                  <p className="text-xs text-zinc-400 max-w-[170px] leading-relaxed">
                    Distribuição equilibrada entre <span className="font-bold text-white">14:10</span> e <span className="font-bold text-white">17:30</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="!p-6 sm:!p-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#0a84ff]/5 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <h3 className="text-lg md:text-xl font-bold mb-6">Saúde do Acervo</h3>
          <div className="relative h-48 flex items-center justify-center">
            <svg
              className="w-48 h-48 transform -rotate-90 overflow-visible"
              viewBox="0 0 192 192"
              aria-hidden="true"
            >
              <circle
                cx="96"
                cy="96"
                r="84"
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.03)"
                strokeWidth="10"
              />
              <motion.circle
                cx="96"
                cy="96"
                r="84"
                fill="transparent"
                stroke="#0a84ff"
                strokeWidth="10"
                strokeDasharray={527}
                initial={{ strokeDashoffset: 527 }}
                animate={{ strokeDashoffset: completedDashOffset }}
                transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
                strokeLinecap="round"
              />
              <motion.circle
                cx="96"
                cy="96"
                r="84"
                fill="transparent"
                stroke="#30d158"
                strokeWidth="11"
                strokeDasharray={527}
                initial={{ strokeDashoffset: 527 }}
                animate={{ strokeDashoffset: sentDashOffset }}
                transition={{
                  duration: 1.6,
                  delay: 0.15,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="drop-shadow-[0_0_12px_rgba(48,209,88,0.4)]"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center select-none">
              <span className="text-4xl font-extrabold text-[#30d158] tracking-tight">
                {sentPercent}%
              </span>
              <span className="text-[9px] text-[#30d158] font-bold uppercase tracking-widest mt-1">
                Enviados
              </span>
              <span className="text-[11px] text-[#0a84ff] font-bold mt-1">
                {completedPercent}% prontos
              </span>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4 border-t border-white/[0.05] pt-5">
            <div className="space-y-1 min-w-0">
              <span className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0a84ff]" />
                Feitos
              </span>
              <span className="text-base sm:text-lg font-bold text-white">
                {completedGames}
              </span>
            </div>
            <div className="space-y-1 min-w-0">
              <span className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30d158]" />
                Enviados
              </span>
              <span className="text-base sm:text-lg font-bold text-white">{sentGames}</span>
            </div>
            <div className="space-y-1 min-w-0">
              <span className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-650" />
                Faltam
              </span>
              <span className="text-base sm:text-lg font-bold text-white">
                {remainingGames}
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="!p-6 sm:!p-8">
        <div className="flex items-center justify-between gap-4 mb-6">
          <h3 className="text-lg md:text-xl font-bold flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-[#0a84ff] shadow-[0_0_8px_#0a84ff]" />
            Preview da lista
          </h3>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            {analysisData.gameListData?.totalListedGames || 0} jogos catalogados
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <CompactProviderList
            title="Sincronizados"
            count={completedGames}
            groups={readyGroups}
            tone="blue"
            icon={CheckCircle}
            sentData={sentData}
          />
          <CompactProviderList
            title="Pendentes no Disco"
            count={remainingGames}
            groups={remainingGroups}
            tone="orange"
            icon={Clock}
          />
        </div>
      </GlassCard>
    </div>
  );
}
