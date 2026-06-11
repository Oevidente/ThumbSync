import { GlassCard } from '../components/GlassCard';
import {
  List,
  Download,
  CheckCircle,
  Clock,
  Edit2,
  Save,
  X,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  RefreshCw,
  Upload,
  Copy,
} from 'lucide-react';
import { useState, useEffect, useMemo, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  playChimeSound,
  triggerNativeNotification,
} from '../utils/notificationSystem';
import {
  getCachedListContent,
  saveLocalListContent,
} from '../utils/offlineSync';

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
      gameAlphabeticCollator.compare(
        normalizeGameName(aName),
        normalizeGameName(bName),
      ) || gameAlphabeticCollator.compare(aName, bName)
    );
  });
}

function getGameImageSearchUrl(providerName = '', gameDisplayName = '') {
  const usableProvider =
    normalizeGameName(providerName) === normalizeGameName('Sem provedor')
      ? ''
      : providerName;
  const query = [usableProvider, gameDisplayName]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');
  const params = new URLSearchParams({ udm: '2', q: query });

  return `https://www.google.com/search?${params.toString()}`;
}

function GameSearchLink({
  providerName,
  gameDisplayName,
}: {
  providerName: string;
  gameDisplayName: string;
}) {
  const href = getGameImageSearchUrl(providerName, gameDisplayName);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={`Buscar imagens de ${providerName} ${gameDisplayName}`}
      className="min-w-0 flex-1 truncate pr-1 rounded text-current underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    >
      {gameDisplayName}
    </a>
  );
}

function ListViewProviderGroup({
  group,
  groupIndex,
  sentData,
  isReadySection,
  onRemoveGame,
}: {
  key?: string;
  group: any;
  groupIndex: number;
  sentData?: any;
  isReadySection: boolean;
  onRemoveGame: (providerName: string, gameDisplayName: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const sortedGames = useMemo(
    () => sortGamesBySimilarName(group.games || []),
    [group.games],
  );

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`sticky top-0 z-10 w-full flex items-center justify-between gap-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] active:bg-white/[0.07] border border-white/[0.04] px-4 py-3.5 font-sans text-xs sm:text-sm ${isReadySection ? 'text-[#0a84ff]' : 'text-[#ff9f0a]'
          } backdrop-blur-md text-left cursor-pointer transition-all duration-200 select-none min-h-[44px]`}
      >
        <span className="font-bold truncate flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
          )}
          Provedor:{' '}
          <span className="text-white font-black">{group.providerName}</span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-black ${isReadySection
              ? 'bg-[#0a84ff]/10 text-[#0a84ff] border border-[#0a84ff]/15'
              : 'bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/15'
            }`}
        >
          {group.games?.length || 0}
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-2 pl-2 border-l border-white/[0.05] ml-4 md:ml-5">
          {sortedGames.map((game: any, i: number) => {
            const providerName = game.providerName || group.providerName;

            if (isReadySection) {
              const normalizedName =
                game.normalized || normalizeGameName(game.displayName);
              const gameKey = createProviderGameKey(
                providerName,
                normalizedName,
              );

              let isSent = sentData?.keys.has(gameKey);
              if (
                !isSent &&
                normalizeGameName(providerName) ===
                normalizeGameName('Sem provedor')
              ) {
                isSent = sentData?.names.has(normalizedName);
              }

              return (
                <div
                  key={`${game.displayName}-${i}`}
                  className={`group relative flex items-center justify-between py-3 pl-3.5 pr-[4.5rem] rounded-xl border text-xs sm:text-sm font-semibold font-sans shadow-xs transition-transform duration-200 hover:translate-x-0.5 min-h-[44px] ${isSent
                      ? 'bg-[#30d158]/5 border-[#30d158]/12 text-[#30d158]'
                      : 'bg-[#0a84ff]/5 border-[#0a84ff]/12 text-zinc-300 hover:text-white'
                    }`}
                >
                  <GameSearchLink
                    providerName={providerName}
                    gameDisplayName={game.displayName}
                  />
                  <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-all duration-150 absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 shrink-0 z-20">
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
                      className="p-2 rounded-lg bg-white/[0.04] md:bg-transparent border border-white/[0.04] md:border-transparent text-zinc-400 hover:text-[#0a84ff] cursor-pointer active:scale-90 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5 pointer-events-none" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onRemoveGame(providerName, game.displayName);
                      }}
                      title="Remover item da lista"
                      className="p-2 rounded-lg bg-white/[0.04] md:bg-transparent border border-white/[0.04] md:border-transparent text-zinc-400 hover:text-[#ff453a] cursor-pointer active:scale-90 transition-all"
                    >
                      <X className="w-3.5 h-3.5 pointer-events-none" />
                    </button>
                  </div>
                </div>
              );
            } else {
              return (
                <div
                  key={`${game.displayName}-${i}`}
                  className="group relative flex items-center justify-between py-3 pl-3.5 pr-[4.5rem] rounded-xl bg-[#ff9f0a]/5 border border-[#ff9f0a]/12 text-xs sm:text-sm font-semibold text-zinc-300 hover:text-white font-sans shadow-xs transition-transform duration-200 hover:translate-x-0.5 min-h-[44px]"
                >
                  <GameSearchLink
                    providerName={providerName}
                    gameDisplayName={game.displayName}
                  />
                  <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-all duration-150 absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 shrink-0 z-20">
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
                      className="p-2 rounded-lg bg-white/[0.04] md:bg-transparent border border-white/[0.04] md:border-transparent text-zinc-400 hover:text-[#ff9f0a] cursor-pointer active:scale-90 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5 pointer-events-none" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onRemoveGame(providerName, game.displayName);
                      }}
                      title="Remover item da lista"
                      className="p-2 rounded-lg bg-white/[0.04] md:bg-transparent border border-white/[0.04] md:border-transparent text-zinc-400 hover:text-[#ff453a] cursor-pointer active:scale-90 transition-all"
                    >
                      <X className="w-3.5 h-3.5 pointer-events-none" />
                    </button>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}
    </div>
  );
}

export function ListView({
  gameListData,
  recordsData,
  comparedFiles = [],
  onRefresh,
  isServerOnline = true,
  hasPendingSync = false,
  onOfflineListEdit,
}: {
  gameListData: any;
  recordsData?: any;
  comparedFiles?: any[];
  onRefresh: () => void;
  isServerOnline?: boolean;
  hasPendingSync?: boolean;
  onOfflineListEdit?: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [listContent, setListContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProviderOption, setSelectedProviderOption] =
    useState<string>('Sem provedor');
  const [customProviderInput, setCustomProviderInput] = useState<string>('');
  const [gamesInput, setGamesInput] = useState('');
  const [isSavingMulti, setIsSavingMulti] = useState(false);
  const [activeListTab, setActiveListTab] = useState<'pending' | 'ready'>(
    'pending',
  );

  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadListContent();
    }
  }, [isEditing]);

  const uniqueProviders = useMemo(() => {
    const providersSet = new Set<string>();

    // 1. From comparedFiles (source / origin)
    if (comparedFiles) {
      comparedFiles.forEach((file: any) => {
        const segments =
          file.relativePath?.split(/[\\/]/).filter(Boolean) || [];
        if (segments.length > 1) {
          providersSet.add(segments[0]);
        }
      });
    }

    // 2. From gameListData remaining (origin / source / listed)
    if (gameListData?.remainingGamesByProvider) {
      gameListData.remainingGamesByProvider.forEach((g: any) => {
        if (g.providerName) providersSet.add(g.providerName);
      });
    }

    // 3. From gameListData ready (listed in list.txt and found in dest)
    if (gameListData?.readyGamesByProvider) {
      gameListData.readyGamesByProvider.forEach((g: any) => {
        if (g.providerName) providersSet.add(g.providerName);
      });
    }

    // 4. From recordsData providers (destination)
    if (recordsData?.providers) {
      recordsData.providers.forEach((p: any) => {
        if (p.providerName) providersSet.add(p.providerName);
      });
    }

    // Clean, filter out 'Sem provedor', sort alphabetically
    const list = Array.from(providersSet)
      .map((name) => name.trim())
      .filter(
        (name) => name.length > 0 && name.toLowerCase() !== 'sem provedor',
      );

    list.sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

    return ['Sem provedor', ...list];
  }, [gameListData, recordsData, comparedFiles]);

  const getCurrentListContent = async (): Promise<string> => {
    if (!isServerOnline) {
      return getCachedListContent();
    }
    try {
      const res = await fetch('/api/list/content');
      if (res.ok) {
        const data = await res.json();
        return data.content || '';
      }
    } catch (e) {
      console.warn(
        'Failed standard fetching of list content offline fallback triggered.',
        e,
      );
    }
    return getCachedListContent();
  };

  const notifySync = () => {
    triggerNativeNotification(
      'Lista Sincronizada',
      'As alterações na lista de jogos foram salvas com sucesso!',
    );
    window.dispatchEvent(
      new CustomEvent('thumbsync-show-notification', {
        detail: {
          title: 'Lista Sincronizada 🔄',
          message: 'As alterações foram salvas com sucesso!',
        },
      }),
    );
    playChimeSound();
  };

  const persistListContent = async (updatedContent: string) => {
    if (!isServerOnline) {
      saveLocalListContent(updatedContent, true);
      if (onOfflineListEdit) onOfflineListEdit();
      notifySync();
      onRefresh();
      return;
    }
    try {
      const base = localStorage.getItem('thumbsync_list_server_stable') || '';
      const res = await fetch('/api/list/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: updatedContent, base }),
      });
      if (!res.ok) throw new Error();
      notifySync();
      onRefresh();
    } catch (e) {
      console.warn(
        'Persistent save error offline queue fallback triggered.',
        e,
      );
      saveLocalListContent(updatedContent, true);
      if (onOfflineListEdit) onOfflineListEdit();
      notifySync();
      onRefresh();
    }
  };

  const loadListContent = async () => {
    setIsLoading(true);
    try {
      const content = await getCurrentListContent();
      setListContent(content);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCsvImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length === 0) return;

      const delimiter = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0]
        .split(delimiter)
        .map((h) => h.trim().toLowerCase());

      // Mapeamento inteligente de colunas
      const targetKeywords = [
        'name',
        'customname',
        'jogo',
        'titulo',
        'title',
        'display',
        'nome',
      ];
      let gameColIdx = headers.findIndex((h) =>
        targetKeywords.some((k) => h.includes(k)),
      );
      if (gameColIdx === -1) gameColIdx = 0; // Fallback para primeira coluna

      const importedGames: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter);
        const gameName = cols[gameColIdx]?.trim().replace(/^["']|["']$/g, '');
        if (gameName) importedGames.push(gameName);
      }

      const currentContent = await getCurrentListContent();
      const existingNormalized = new Set<string>();

      // Parse do conteúdo atual para evitar duplicatas globais
      currentContent.split(/\r?\n/).forEach((line) => {
        const clean = line
          .replace(/^\uFEFF/, '')
          .replace(/^\s*(?:[-*•]\s+|\d+\s*[\).\]-]\s*)/, '')
          .trim();
        if (
          !clean ||
          /^provedor\s*:/i.test(clean) ||
          clean.startsWith('#') ||
          clean.includes('?')
        )
          return;
        existingNormalized.add(normalizeGameName(clean));
      });

      const newGamesToAdd: string[] = [];
      const seenInCsv = new Set<string>();

      importedGames.forEach((game) => {
        const norm = normalizeGameName(game);
        // Validação tripla: existe no CSV? Já existe na lista.txt? Já vimos nesta importação?
        if (norm && !existingNormalized.has(norm) && !seenInCsv.has(norm)) {
          newGamesToAdd.push(game);
          seenInCsv.add(norm);
        }
      });

      if (newGamesToAdd.length === 0) {
        alert(
          'Nenhum jogo novo encontrado. Todos os itens já constam na lista ou estão duplicados no arquivo.',
        );
      } else {
        // Popula o modal de adição com os jogos filtrados para revisão do usuário
        setGamesInput(newGamesToAdd.join('\n'));
        setIsAddModalOpen(true);

        window.dispatchEvent(
          new CustomEvent('thumbsync-show-notification', {
            detail: {
              title: 'CSV Processado 📂',
              message: `${newGamesToAdd.length} jogos únicos filtrados e prontos para adicionar.`,
            },
          }),
        );
      }
    } catch (err) {
      console.error('Erro ao importar CSV:', err);
      alert('Erro ao processar o arquivo CSV.');
    } finally {
      setIsLoading(false);
      e.target.value = ''; // Reset input
    }
  };

  const saveListContent = async () => {
    setIsLoading(true);
    try {
      await persistListContent(listContent);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveGame = async (
    providerName: string,
    gameDisplayName: string,
  ) => {
    setIsLoading(true);
    try {
      const currentContent = await getCurrentListContent();
      const lines = currentContent.split(/\r?\n/);

      const isProviderLine = (line: string) => /^provedor\s*:/i.test(line);
      const getProviderName = (line: string) => {
        const match = line.match(/^provedor\s*:\s*(.+)$/i);
        return match?.[1]?.trim() || null;
      };

      let activeProvider = 'Sem provedor';
      let targetIndex = -1;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (isProviderLine(line)) {
          const name = getProviderName(line);
          activeProvider = name || 'Sem provedor';
          continue;
        }

        const cleanLine = line
          .replace(/^\uFEFF/, '')
          .replace(/^\s*(?:[-*•]\s+|\d+\s*[\).\]-]\s*)/, '')
          .trim();
        if (
          !cleanLine ||
          cleanLine.startsWith('#') ||
          cleanLine.includes('?')
        ) {
          continue;
        }

        if (
          normalizeGameName(activeProvider) ===
          normalizeGameName(providerName) &&
          normalizeGameName(cleanLine) === normalizeGameName(gameDisplayName)
        ) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex !== -1) {
        lines.splice(targetIndex, 1);
        const updatedContent = lines.join('\n');
        await persistListContent(updatedContent);
      }
    } catch (e) {
      console.error('Erro ao remover jogo:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearList = async (mode: 'all' | 'delivered') => {
    setIsClearing(true);
    try {
      let finalContent = '';
      if (mode === 'delivered') {
        const currentContent = await getCurrentListContent();
        const lines = currentContent.split(/\r?\n/);
        const updatedLines: string[] = [];

        const isProviderLine = (line: string) => /^provedor\s*:/i.test(line);
        const getProviderName = (line: string) => {
          const match = line.match(/^provedor\s*:\s*(.+)$/i);
          return match?.[1]?.trim() || null;
        };

        let activeProvider = 'Sem provedor';

        // Build a lookup set of provider::game for delivered games
        const deliveredKeys = new Set(
          (gameListData?.readyGames || []).map((g: any) =>
            createProviderGameKey(
              g.providerName || 'Sem provedor',
              g.normalized || normalizeGameName(g.displayName),
            ),
          ),
        );

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmed = line.trim();

          if (isProviderLine(trimmed)) {
            const name = getProviderName(trimmed);
            activeProvider = name || 'Sem provedor';
            updatedLines.push(line);
            continue;
          }

          const cleanLine = trimmed
            .replace(/^\uFEFF/, '')
            .replace(/^\s*(?:[-*•]\s+|\d+\s*[\).\]-]\s*)/, '')
            .trim();
          if (
            !cleanLine ||
            cleanLine.startsWith('#') ||
            cleanLine.includes('?')
          ) {
            updatedLines.push(line);
            continue;
          }

          const gameKey = createProviderGameKey(
            activeProvider,
            normalizeGameName(cleanLine),
          );
          if (deliveredKeys.has(gameKey)) {
            // This is a delivered game, so filter it out (do NOT push to updatedLines)
            continue;
          }

          updatedLines.push(line);
        }

        // Clean up empty provider sections to keep the file tidy
        const cleanedLines: string[] = [];
        let pendingProviderLine: string | null = null;

        for (let i = 0; i < updatedLines.length; i++) {
          const line = updatedLines[i];
          if (isProviderLine(line.trim())) {
            pendingProviderLine = line;
          } else if (line.trim() !== '') {
            if (pendingProviderLine !== null) {
              cleanedLines.push(pendingProviderLine);
              pendingProviderLine = null;
            }
            cleanedLines.push(line);
          } else {
            // empty line
            if (pendingProviderLine === null) {
              cleanedLines.push(line);
            }
          }
        }

        finalContent = cleanedLines.join('\n');
      }

      await persistListContent(finalContent);
      setIsClearModalOpen(false);
    } catch (e) {
      console.error('Erro ao limpar lista:', e);
    } finally {
      setIsClearing(false);
    }
  };

  const handleAddGamesSubmit = async () => {
    const provider = (
      selectedProviderOption === 'outro'
        ? customProviderInput
        : selectedProviderOption
    ).trim();
    const cleanGamesText = gamesInput.trim();
    if (!cleanGamesText) return;

    setIsSavingMulti(true);
    try {
      const currentContent = await getCurrentListContent();
      const isProviderLine = (line: string) => /^provedor\s*:/i.test(line);
      const getProviderName = (line: string) => {
        const match = line.match(/^provedor\s*:\s*(.+)$/i);
        return match?.[1]?.trim() || null;
      };

      const newGamesLines = cleanGamesText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (newGamesLines.length === 0) {
        setIsSavingMulti(false);
        return;
      }

      let lines = currentContent.split(/\r?\n/);
      const targetProvider = provider.toLowerCase();

      const isSemProvedor = !provider || targetProvider === 'sem provedor';

      if (isSemProvedor) {
        let providerFoundIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (isProviderLine(lines[i])) {
            const name = getProviderName(lines[i]);
            if (name && name.toLowerCase() === 'sem provedor') {
              providerFoundIndex = i;
              break;
            }
          }
        }

        if (providerFoundIndex !== -1) {
          let nextProviderIndex = lines.length;
          for (let i = providerFoundIndex + 1; i < lines.length; i++) {
            if (isProviderLine(lines[i])) {
              nextProviderIndex = i;
              break;
            }
          }

          let insertIndex = nextProviderIndex;
          for (let i = nextProviderIndex - 1; i > providerFoundIndex; i--) {
            if (lines[i].trim() !== '') {
              insertIndex = i + 1;
              break;
            }
          }
          lines.splice(insertIndex, 0, ...newGamesLines);
        } else {
          let firstProviderIndex = -1;
          for (let i = 0; i < lines.length; i++) {
            if (isProviderLine(lines[i])) {
              firstProviderIndex = i;
              break;
            }
          }

          let insertIndex =
            firstProviderIndex === -1 ? lines.length : firstProviderIndex;
          for (
            let i =
              (firstProviderIndex === -1 ? lines.length : firstProviderIndex) -
              1;
            i >= 0;
            i--
          ) {
            if (lines[i].trim() !== '') {
              insertIndex = i + 1;
              break;
            }
          }

          lines.splice(insertIndex, 0, ...newGamesLines);
        }
      } else {
        let providerFoundIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (isProviderLine(lines[i])) {
            const name = getProviderName(lines[i]);
            if (name && name.toLowerCase() === targetProvider) {
              providerFoundIndex = i;
              break;
            }
          }
        }

        if (providerFoundIndex !== -1) {
          let nextProviderIndex = lines.length;
          for (let i = providerFoundIndex + 1; i < lines.length; i++) {
            if (isProviderLine(lines[i])) {
              nextProviderIndex = i;
              break;
            }
          }

          let insertIndex = nextProviderIndex;
          for (let i = nextProviderIndex - 1; i > providerFoundIndex; i--) {
            if (lines[i].trim() !== '') {
              insertIndex = i + 1;
              break;
            }
          }

          lines.splice(insertIndex, 0, ...newGamesLines);
        } else {
          while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
            lines.pop();
          }

          if (lines.length > 0) {
            lines.push('');
          }

          lines.push(`Provedor: ${provider}`);
          lines.push(...newGamesLines);
        }
      }

      const finalContent = lines.join('\n');
      await persistListContent(finalContent);

      setSelectedProviderOption('Sem provedor');
      setCustomProviderInput('');
      setGamesInput('');
      setIsAddModalOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingMulti(false);
    }
  };

  if (!gameListData) return null;

  const remainingGroups =
    gameListData.remainingGamesByProvider ??
    (gameListData.remainingGames?.length
      ? [{ providerName: 'Sem provedor', games: gameListData.remainingGames }]
      : []);
  const readyGroups =
    gameListData.readyGamesByProvider ??
    (gameListData.readyGames?.length
      ? [{ providerName: 'Sem provedor', games: gameListData.readyGames }]
      : []);

  const sentData = useMemo(() => {
    const keys = new Set<string>();
    const names = new Set<string>();
    const providers = recordsData?.providers || [];

    providers.forEach((provider: any) => {
      const providerName = provider?.providerName || 'Sem provedor';
      provider?.games?.forEach((game: any) => {
        const fileName =
          game?.fileName ||
          getFileNameFromPath(
            game?.relativePath || game?.destPath || game?.displayName,
          );
        const normalizedName = normalizeGameName(
          fileName || game?.displayName || '',
        );

        if (normalizedName) {
          names.add(normalizedName);
          keys.add(
            createProviderGameKey(
              game?.providerName || providerName,
              normalizedName,
            ),
          );
        }
      });
    });
    return { keys, names };
  }, [recordsData]);

  const exportPendingList = async () => {
    // Exporta todos os jogos encontrados na pasta de destino (arquivos .webp)
    setIsLoading(true);
    try {
      const res = await fetch('/api/analyze');
      if (!res.ok) throw new Error('Erro ao consultar dados do servidor');
      const data = await res.json();
      const providers = data?.recordsData?.providers || [];

      const lines: string[] = [];
      providers.forEach((prov: any) => {
        const providerName = prov.providerName || 'Sem provedor';
        (prov.games || []).forEach((g: any) => {
          const gameName = (g.displayName || g.fileName || '')
            .replace(/\.webp$/i, '')
            .trim();
          if (gameName) lines.push(`${gameName} — ${providerName}`);
        });
      });

      if (lines.length === 0) {
        alert('Nenhum arquivo .webp encontrado no destino!');
        return;
      }

      const fileContent = lines.join('\r\n');
      const blob = new Blob([fileContent], {
        type: 'text/plain;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lista-de-todos-jogos.txt';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao exportar lista de jogos:', err);
      alert('Falha ao gerar a lista. Veja o console para mais detalhes.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-8 animate-fade-in relative z-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Gestão da Lista
          </h1>
          <p className="text-zinc-[#a1a1aa] text-xs sm:text-sm font-semibold tracking-wide">
            Administre os jogos registrados no acervo mestre da aplicação
            (lista.txt).
          </p>
        </div>
        <button
          onClick={exportPendingList}
          disabled={!recordsData?.totalGames}
          className="glass-btn-secondary min-h-[44px] !py-2.5 !px-5 flex items-center justify-center gap-2.5 cursor-pointer text-xs sm:text-sm font-bold disabled:opacity-45 disabled:hover:shadow-none w-full sm:w-auto rounded-xl shadow-md"
        >
          <Download className="w-4 h-4 text-zinc-450 shrink-0" />
          <span>Exportar Todos os Jogos</span>
        </button>
      </div>

      {/* Connection State Informational Banners */}
      {!isServerOnline && (
        <div className="bg-[#ff9f0a]/10 border border-[#ff9f0a]/20 rounded-2xl p-4 flex gap-3 text-left font-sans shadow-lg select-none">
          <Clock className="w-5 h-5 text-[#ff9f0a] shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-black text-white leading-normal">
              Modo Local Ativo — Servidor Desconectado 💻
            </h4>
            <p className="text-[10px] text-zinc-400 font-semibold tracking-wide leading-relaxed">
              Você pode adicionar, excluir ou editar jogos livremente. O acervo
              local atualizará em tempo real no seu celular, e as modificações
              serão enviadas ao computador assim que ele for ligado e reatar
              conexão!
            </p>
          </div>
        </div>
      )}

      {hasPendingSync && isServerOnline && (
        <div className="bg-[#0a84ff]/10 border border-[#0a84ff]/20 rounded-2xl p-4 flex gap-3 text-left font-sans shadow-lg select-none animate-pulse">
          <RefreshCw className="w-5 h-5 text-[#0a84ff] shrink-0 mt-0.5 animate-spin" />
          <div className="space-y-0.5">
            <h4 className="text-xs font-black text-white leading-normal">
              Sincronizando Alterações com o Servidor... ⏳
            </h4>
            <p className="text-[10px] text-zinc-400 font-semibold tracking-wide leading-relaxed">
              Enviando as alterações feitas recentemente no Modo Offline de
              volta para o computador.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <GlassCard className="flex flex-col min-h-[550px] !p-0 overflow-hidden relative shadow-2xl border-white/[0.08]">
          <div className="p-4 sm:p-6 border-b border-white/[0.05] flex flex-col sm:flex-row justify-between sm:items-center bg-white/[0.015] gap-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-[#0a84ff]/10 border border-[#0a84ff]/15 rounded-xl">
                <List className="w-5 h-5 text-[#0a84ff] shrink-0" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  Catalogação do Acervo (lista.txt)
                </h3>
                <p className="text-[10px] text-zinc-400 font-semibold tracking-wide mt-0.5 sm:block hidden">
                  Gerencie os títulos e provedores cadastrados.
                </p>
              </div>
            </div>
            {!isEditing ? (
              <div className="flex flex-wrap items-center gap-2 select-none w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="glass-btn-primary min-h-[44px] py-2 px-3 sm:py-2.5 sm:px-4 text-[11px] sm:text-xs font-black cursor-pointer flex-1 sm:flex-initial flex items-center justify-center gap-1.5 shrink-0 rounded-xl"
                >
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Adicionar</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById('csv-import-input')?.click()
                  }
                  className="glass-btn-secondary min-h-[44px] py-2 px-3 sm:py-2.5 sm:px-4 text-[11px] sm:text-xs font-bold cursor-pointer flex-1 sm:flex-initial flex items-center justify-center gap-1.5 shrink-0 rounded-xl"
                >
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>Importar CSV</span>
                  <input
                    type="file"
                    id="csv-import-input"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCsvImport}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="glass-btn-secondary min-h-[44px] py-2 px-3 sm:py-2.5 sm:px-4 text-[11px] sm:text-xs font-bold cursor-pointer flex-1 sm:flex-initial flex items-center justify-center gap-1.5 shrink-0 rounded-xl"
                >
                  <Edit2 className="w-4 h-4 shrink-0" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsClearModalOpen(true)}
                  className="min-h-[44px] bg-[#ff453a]/12 border border-[#ff453a]/25 text-[#ff453a] hover:bg-[#ff453a]/20 hover:border-[#ff453a]/40 active:scale-95 py-2 px-3 sm:py-2.5 sm:px-4 text-[11px] sm:text-xs font-bold rounded-xl cursor-pointer flex-1 sm:flex-initial flex items-center justify-center gap-1.5 shrink-0 transition-all duration-200"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>Limpar</span>
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 select-none w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isLoading}
                  className="min-h-[44px] flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] sm:text-xs font-semibold hover:bg-white/[0.04] transition-all cursor-pointer text-zinc-400 hover:text-white shrink-0"
                >
                  <X className="w-4 h-4 shrink-0" />
                  <span>Cancelar</span>
                </button>
                <button
                  type="button"
                  onClick={saveListContent}
                  disabled={isLoading}
                  className="glass-btn-primary min-h-[44px] py-2 px-3 sm:py-2.5 sm:px-4 text-[11px] sm:text-xs font-black cursor-pointer flex-1 sm:flex-initial flex items-center justify-center gap-1.5 shrink-0 rounded-xl"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span>Salvar</span>
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 relative flex flex-col">
            {/* Abas com design premium estilo iOS para o Mobile */}
            {!isEditing && (
              <div className="flex md:hidden border border-white/[0.04] p-1.5 bg-zinc-950/40 gap-1 shrink-0 select-none m-4 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveListTab('pending')}
                  className={`flex-1 py-2.5 text-center text-xs font-extrabold rounded-lg transition-all duration-200 cursor-pointer ${activeListTab === 'pending'
                      ? 'bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/20 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-350 border border-transparent'
                    }`}
                >
                  Faltando ({gameListData.remainingGames?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveListTab('ready')}
                  className={`flex-1 py-2.5 text-center text-xs font-extrabold rounded-lg transition-all duration-200 cursor-pointer ${activeListTab === 'ready'
                      ? 'bg-[#0a84ff]/10 text-[#0a84ff] border border-[#0a84ff]/20 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-350 border border-transparent'
                    }`}
                >
                  Prontos ({gameListData.completedGames})
                </button>
              </div>
            )}

            {isEditing ? (
              <textarea
                value={listContent}
                onChange={(e) => setListContent(e.target.value)}
                disabled={isLoading}
                className="flex-1 min-h-[500px] w-full p-5 sm:p-6 bg-zinc-950/70 text-zinc-300 font-mono text-sm resize-y outline-none focus:ring-1 focus:ring-inset focus:ring-[#0a84ff]/50 disabled:opacity-50"
                placeholder="Insira os jogos aqui, um por linha..."
                spellCheck="false"
              />
            ) : (
              <div className="flex-1 p-3 sm:p-4 md:p-5 bg-[#0c0c0f]/40 text-gray-400 text-xs flex flex-col">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 flex-1">
                  {/* Seção Prontos */}
                  <div
                    className={`flex flex-col ${activeListTab === 'ready' ? 'flex' : 'hidden md:flex'}`}
                  >
                    <h4 className="font-extrabold mb-1.5 flex items-center gap-2 text-[#0a84ff] shrink-0 text-xs sm:text-sm">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      Prontos ({gameListData.completedGames})
                    </h4>
                    <p className="text-[10px] md:text-[11px] text-zinc-500 mb-3 bg-zinc-950/30 border border-white/[0.02] py-2 px-3 rounded-xl flex-shrink-0 leading-relaxed font-sans font-semibold">
                      Jogos que constam na lista.txt e já possuem miniatura
                      correspondente no acervo.
                    </p>
                    <div className="space-y-2.5 pr-1.5 overflow-y-auto max-h-[60vh] md:max-h-[560px] custom-scrollbar pb-6">
                      {readyGroups.map((group: any, groupIndex: number) => (
                        <ListViewProviderGroup
                          key={`ready-${group.providerName}-${groupIndex}`}
                          group={group}
                          groupIndex={groupIndex}
                          sentData={sentData}
                          isReadySection={true}
                          onRemoveGame={handleRemoveGame}
                        />
                      ))}
                      {gameListData.readyGames?.length === 0 && (
                        <p className="text-center py-20 text-zinc-650 text-xs italic font-semibold font-sans">
                          Nenhum jogo pronto catalogado.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Seção Faltando */}
                  <div
                    className={`flex flex-col ${activeListTab === 'pending' ? 'flex' : 'hidden md:flex'}`}
                  >
                    <h4 className="font-extrabold mb-1.5 flex items-center gap-2 text-[#ff9f0a] shrink-0 text-xs sm:text-sm">
                      <Clock className="w-4 h-4 shrink-0" />
                      Faltando ({gameListData.remainingGames?.length || 0})
                    </h4>
                    <p className="text-[10px] md:text-[11px] text-zinc-500 mb-3 bg-zinc-950/30 border border-white/[0.02] py-2 px-3 rounded-xl flex-shrink-0 leading-relaxed font-sans font-semibold">
                      Jogos na lista.txt sem imagem correspondente na pasta de
                      origem local.
                    </p>
                    <div className="space-y-2.5 pr-1.5 overflow-y-auto max-h-[60vh] md:max-h-[560px] custom-scrollbar pb-6">
                      {remainingGroups.map((group: any, groupIndex: number) => (
                        <ListViewProviderGroup
                          key={`remaining-${group.providerName}-${groupIndex}`}
                          group={group}
                          groupIndex={groupIndex}
                          isReadySection={false}
                          onRemoveGame={handleRemoveGame}
                        />
                      ))}
                      {gameListData.remainingGames?.length === 0 && (
                        <p className="text-center py-20 text-zinc-650 text-xs italic font-semibold font-sans">
                          Nenhum jogo pendente catalogado!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {isAddModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-fade-in">
            <div className="relative w-full max-w-lg acrylic border border-white/[0.08] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center pb-3.5 border-b border-white/[0.05]">
                <h3 className="font-extrabold text-base flex items-center gap-2 text-white font-sans">
                  <Plus className="w-5 h-5 text-[#0a84ff]" />
                  Adicionar em Lote por Provedor
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProviderOption('Sem provedor');
                    setCustomProviderInput('');
                    setGamesInput('');
                    setIsAddModalOpen(false);
                  }}
                  className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4.5 py-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-400 block font-sans">
                    Nome do Provedor
                  </label>
                  <div className="relative">
                    <select
                      value={selectedProviderOption}
                      onChange={(e) => {
                        setSelectedProviderOption(e.target.value);
                        if (e.target.value !== 'outro') {
                          setCustomProviderInput('');
                        }
                      }}
                      className="w-full bg-white/[0.03] border border-white/[0.08] hover:border-white/15 focus:border-[#0a84ff] focus:bg-white/[0.05] rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all appearance-none cursor-pointer"
                    >
                      {uniqueProviders.map((prov) => (
                        <option
                          key={prov}
                          value={prov}
                          className="bg-zinc-900 text-white"
                        >
                          {prov === 'Sem provedor'
                            ? 'Sem provedor (Geral)'
                            : prov}
                        </option>
                      ))}
                      <option value="outro" className="bg-zinc-900 text-white">
                        ✨ Outro (Digitar manualmente...)
                      </option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-400">
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>

                  {selectedProviderOption === 'outro' && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="mt-2.5"
                    >
                      <input
                        type="text"
                        placeholder="Ex: Pragmatic Play, PG Soft, etc."
                        value={customProviderInput}
                        onChange={(e) => setCustomProviderInput(e.target.value)}
                        className="w-full bg-white/[0.04] border border-white/[0.12] hover:border-white/20 focus:border-[#0a84ff] hover:bg-white/[0.06] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none transition-all"
                      />
                    </motion.div>
                  )}

                  <p className="text-[10px] text-zinc-500 font-medium font-sans leading-relaxed">
                    Escolha um provedor do acervo mestre ou selecione "Outro"
                    para definir um novo provedor.
                  </p>
                </div>

                <div className="space-y-2 flex-1 flex flex-col">
                  <label className="text-xs font-bold text-zinc-400 block font-sans">
                    Jogos (um por linha)
                  </label>
                  <textarea
                    rows={7}
                    placeholder={`Digite um jogo por linha, exemplo:
Sweet Bonanza
Gates of Olympus
Sugar Rush`}
                    value={gamesInput}
                    onChange={(e) => setGamesInput(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] hover:border-white/15 focus:border-[#0a84ff] focus:bg-white/[0.05] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 font-mono focus:outline-none transition-all resize-y custom-scrollbar"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3.5 border-t border-white/[0.05] select-none">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProviderOption('Sem provedor');
                    setCustomProviderInput('');
                    setGamesInput('');
                    setIsAddModalOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.05] text-white text-xs font-bold transition-all cursor-pointer active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAddGamesSubmit}
                  disabled={isSavingMulti || !gamesInput.trim()}
                  className="glass-btn-primary !py-2 !px-4 text-xs font-black cursor-pointer"
                >
                  {isSavingMulti ? 'Salvando...' : 'Adicionar e Salvar'}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {isClearModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-fade-in">
            <div className="relative w-full max-w-md acrylic border border-white/[0.08] rounded-2xl p-6 shadow-2xl flex flex-col gap-5">
              <div className="flex items-center gap-3 text-[#ff453a]">
                <div className="p-2.5 bg-[#ff453a]/10 border border-[#ff453a]/15 rounded-xl">
                  <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white font-sans">
                    Limpar Catalogação
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-semibold font-sans mt-0.5">
                    Confirmar alteração em lista.txt
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs text-zinc-300 font-sans leading-relaxed">
                <p>
                  Como deseja realizar a limpeza da lista? Você pode excluir
                  tudo ou manter os faltantes removendo apenas os itens já
                  entregues.
                </p>
                <div className="p-3 rounded-xl bg-white/[0.015] border border-white/[0.04] space-y-1 mt-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Total na lista:</span>
                    <span className="font-extrabold text-white">
                      {gameListData?.totalListedGames || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">
                      Já entregues (Prontos):
                    </span>
                    <span className="font-extrabold text-[#0a84ff]">
                      {gameListData?.completedGames || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Restantes (Faltando):</span>
                    <span className="font-extrabold text-[#ff9f0a]">
                      {gameListData?.remainingGames?.length || 0}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 select-none pt-2.5">
                <button
                  type="button"
                  onClick={() => handleClearList('delivered')}
                  disabled={isClearing || !gameListData?.completedGames}
                  className="w-full bg-[#0a84ff]/10 hover:bg-[#0a84ff]/20 border border-[#0a84ff]/25 active:scale-95 text-[#0a84ff] py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center flex items-center justify-center gap-2 disabled:opacity-40 disabled:scale-100 min-h-[44px]"
                >
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Limpar apenas Entregues ({gameListData?.completedGames || 0}
                    )
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleClearList('all')}
                  disabled={isClearing}
                  className="w-full bg-[#ff453a] hover:bg-[#ff453a]/90 active:scale-95 text-white py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer text-center flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(255,69,58,0.2)] disabled:opacity-50 min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>
                    Sim, Limpar tudo ({gameListData?.totalListedGames || 0})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsClearModalOpen(false)}
                  disabled={isClearing}
                  className="w-full py-3 px-4 rounded-xl border border-white/[0.08] hover:bg-white/[0.05] active:bg-white/[0.1] text-zinc-300 font-bold text-xs sm:text-sm transition-all cursor-pointer text-center min-h-[44px]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
