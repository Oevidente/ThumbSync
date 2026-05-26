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

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`sticky top-0 z-10 w-full flex items-center justify-between gap-3 rounded bg-[#151515]/95 hover:bg-[#1a1a1a]/95 border border-white/10 px-2.5 py-1.5 font-sans text-[11px] ${toneClasses.header} backdrop-blur text-left cursor-pointer transition-colors`}
      >
        <span className="font-semibold truncate flex items-center gap-1.5">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          )}
          Provedor: {group.providerName}
        </span>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[10px] ${toneClasses.badge}`}
        >
          {group.games?.length || 0}
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-1 pl-1 border-l border-white/5 ml-2">
          {group.games?.map((game: any, i: number) => {
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
              ? 'bg-green-500/10 border-green-500/20'
              : toneClasses.item;

            return (
              <div
                key={`${title}-${group.providerName}-${game.displayName}-${i}`}
                className={`py-1.5 px-2 rounded border text-xs text-gray-300 font-sans truncate ${itemClasses}`}
              >
                {game.displayName}
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
      title: 'text-fluent-accent',
      header: 'text-blue-200',
      badge: 'bg-blue-500/15 text-blue-300',
      item: 'bg-blue-500/10 border-blue-500/20',
    },
    green: {
      title: 'text-green-400',
      header: 'text-green-200',
      badge: 'bg-green-500/15 text-green-300',
      item: 'bg-green-500/10 border-green-500/20',
    },
    orange: {
      title: 'text-orange-400',
      header: 'text-orange-200',
      badge: 'bg-orange-500/15 text-orange-300',
      item: 'bg-orange-500/10 border-orange-500/20',
    },
  }[tone];

  return (
    <div className="min-h-0 flex flex-col rounded-xl bg-white/[0.02] border border-white/5 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h4
          className={`font-bold flex items-center gap-2 ${toneClasses.title}`}
        >
          <Icon className="w-4 h-4" />
          {title} ({count})
        </h4>
      </div>
      <div className="max-h-[280px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
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
          <p className="text-center py-12 text-gray-600 text-xs italic">
            Nenhum item.
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
}: {
  analysisData: any;
  onRefresh: () => void;
  isLoading: boolean;
}) {
  if (!analysisData)
    return (
      <div className="p-10 text-center opacity-50">Carregando dados...</div>
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
      color: 'text-blue-400',
      glow: 'bg-blue-500/20',
    },
    {
      label: 'Pendentes',
      value: analysisData.pendingFiles.length,
      icon: AlertCircle,
      color: 'text-orange-400',
      glow: 'bg-orange-500/20',
    },
    {
      label: 'Jogos Feitos',
      value: completedGames,
      icon: FileCheck,
      color: 'text-fluent-accent',
      glow: 'bg-blue-500/20',
    },
    {
      label: 'Enviados',
      value: sentGames,
      icon: UploadCloud,
      color: 'text-green-400',
      glow: 'bg-green-500/20',
    },
    {
      label: 'Lista Total',
      value: totalListedGames,
      icon: Clock,
      color: 'text-purple-400',
      glow: 'bg-purple-500/20',
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
    <div className="space-y-10 relative">
      <div className="flex justify-between items-end relative z-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-white to-white/50 bg-clip-text text-transparent">
            Centro de Controle
          </h1>
          <p className="text-gray-400 font-medium">
            ThumbSync • Sincronização & Gestão de Thumbs
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full acrylic hover:bg-white/10 transition-all text-sm font-semibold active:scale-95 disabled:opacity-70 disabled:cursor-wait"
        >
          <motion.span
            className="inline-flex"
            animate={isLoading ? { rotate: 360 } : { rotate: 0 }}
            transition={{
              duration: isLoading ? 0.8 : 0.2,
              ease: 'linear',
              repeat: isLoading ? Infinity : 0,
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </motion.span>
          Sincronizar
        </button>
      </div>

      <div className="grid grid-cols-5 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-4 md:gap-6">
        {stats.map((stat) => (
          <Fragment key={stat.label}>
            <GlassCard hover className="flex flex-col sm:flex-row items-center sm:items-start justify-center sm:justify-start text-center sm:text-left gap-1 sm:gap-5 !p-1.5 sm:!p-5 relative min-w-0 aspect-square sm:aspect-auto">
              <div
                className={`absolute -inset-1 ${stat.glow} rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity`}
              />
              <div
                className={`p-1 sm:p-3 rounded sm:rounded-xl bg-white/5 ${stat.color} relative z-10 shrink-0`}
              >
                <stat.icon className="w-3.5 h-3.5 sm:w-6 sm:h-6" />
              </div>
              <div className="relative z-10 min-w-0 flex flex-col items-center sm:items-start w-full">
                <p className="text-[7px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-0.5 sm:mb-1 truncate max-w-full">
                  {stat.label}
                </p>
                <p className="text-xs sm:text-2xl font-bold tracking-tight truncate max-w-full">
                  {stat.value}
                </p>
              </div>
            </GlassCard>
          </Fragment>
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
                <p className="text-gray-500 italic font-medium">
                  Todos os arquivos estão sincronizados.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
                    Galeria de Prioridades
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {analysisData.pendingFiles
                      .slice(0, 4)
                      .map((f: any, i: number) => (
                        <div
                          key={i}
                          className="relative aspect-[2/3] rounded-lg overflow-hidden group border border-white/10 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                        >
                          <img
                            src={`/api/image?path=${encodeURIComponent(f.sourcePath)}`}
                            alt={f.relativePath.split('/').pop()}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIwaHB4IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzY2NiI+V0VCUDwvdGV4dD48L3N2Zz4=';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                            <span className="text-[10px] truncate w-full font-medium text-white drop-shadow-md">
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
                <div className="p-6 rounded-2xl bg-fluent-accent/5 border border-fluent-accent/10 flex flex-col justify-center items-center text-center">
                  <Clock className="w-10 h-10 text-fluent-accent mb-3 opacity-50" />
                  <p className="text-sm font-bold text-white mb-1">
                    Lote 01 Programado
                  </p>
                  <p className="text-xs text-gray-500 max-w-[140px]">
                    Distribuição de 17 arquivos entre 14:10 e 17:30
                  </p>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="!p-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-fluent-accent/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2" />
          <h3 className="text-xl font-bold mb-8">Saúde do Acervo</h3>
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
                animate={{ strokeDashoffset: completedDashOffset }}
                transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
                className="text-fluent-accent"
                strokeLinecap="round"
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
                animate={{ strokeDashoffset: sentDashOffset }}
                transition={{
                  duration: 1.6,
                  delay: 0.15,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.45)]"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black text-green-300">
                {sentPercent}%
              </span>
              <span className="text-[10px] text-green-400 font-bold uppercase tracking-widest mt-1">
                Enviados
              </span>
              <span className="text-[11px] text-fluent-accent font-semibold mt-1">
                {completedPercent}% feitos
              </span>
            </div>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4">
            <div className="space-y-1 min-w-0">
              <span className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-fluent-accent" />
                Feitos
              </span>
              <span className="text-lg font-bold text-white">
                {completedGames}
              </span>
            </div>
            <div className="space-y-1 min-w-0">
              <span className="flex items-center gap-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                Enviados
              </span>
              <span className="text-lg font-bold text-white">{sentGames}</span>
            </div>
            <div className="space-y-1 min-w-0">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">
                Faltam
              </span>
              <span className="text-lg font-bold text-white">
                {remainingGames}
              </span>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="!p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-fluent-accent" />
            Preview da lista
          </h3>
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            {analysisData.gameListData?.totalListedGames || 0} jogos
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CompactProviderList
            title="Feitos"
            count={completedGames}
            groups={readyGroups}
            tone="blue"
            icon={CheckCircle}
            sentData={sentData}
          />
          <CompactProviderList
            title="Faltando"
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
