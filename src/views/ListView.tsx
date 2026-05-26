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
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

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

export function ListView({
  gameListData,
  recordsData,
  onRefresh,
}: {
  gameListData: any;
  recordsData?: any;
  onRefresh: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [listContent, setListContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Custom states for adding games
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [providerInput, setProviderInput] = useState('');
  const [gamesInput, setGamesInput] = useState('');
  const [isSavingMulti, setIsSavingMulti] = useState(false);

  useEffect(() => {
    if (isEditing) {
      loadListContent();
    }
  }, [isEditing]);

  const loadListContent = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/list/content');
      const data = await res.json();
      setListContent(data.content || '');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveListContent = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/list/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

  const handleAddGamesSubmit = async () => {
    const provider = providerInput.trim();
    const cleanGamesText = gamesInput.trim();
    if (!cleanGamesText) return;

    setIsSavingMulti(true);
    try {
      const res = await fetch('/api/list/content');
      const data = await res.json();
      const currentContent = data.content || '';

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

          let insertIndex = firstProviderIndex === -1 ? lines.length : firstProviderIndex;
          for (let i = (firstProviderIndex === -1 ? lines.length : firstProviderIndex) - 1; i >= 0; i--) {
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

      await fetch('/api/list/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: finalContent }),
      });

      setProviderInput('');
      setGamesInput('');
      setIsAddModalOpen(false);
      onRefresh();
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
    gameListData.readyGamesByProvider ?? // Corrigido de readyGroupsByProvider para readyGamesByProvider
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

  const exportPendingList = () => {
    const totalPending = gameListData?.remainingGames?.length || 0;
    if (totalPending === 0) {
      alert("Nenhum jogo pendente para exportar!");
      return;
    }

    let fileContent = "";
    remainingGroups.forEach((group: any) => {
      const providerName = group.providerName || "Sem provedor";
      if (normalizeGameName(providerName) !== normalizeGameName("Sem provedor")) {
        fileContent += `Provedor: ${providerName}\r\n`;
      }
      group.games?.forEach((game: any) => {
        fileContent += `${game.displayName || game.normalized}\r\n`;
      });
      fileContent += "\r\n";
    });

    const blob = new Blob([fileContent.trim()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lista-de-pendentes.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <List className="w-8 h-8 text-fluent-accent" />
            Gestão da Lista
          </h1>
          <p className="text-gray-400">
            Gerenciamento da lista mestre (lista.txt).
          </p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportPendingList}
            disabled={!gameListData?.remainingGames?.length}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-fluent-accent text-white hover:bg-fluent-accent/80 transition-colors text-sm font-semibold active:scale-95 shadow-[0_0_15px_rgba(0,120,212,0.3)] disabled:opacity-40 disabled:hover:bg-fluent-accent"
          >
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
              <div className="flex gap-2">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-fluent-accent text-white hover:bg-fluent-accent-hover text-sm font-semibold transition-colors active:scale-95 shadow-[0_4px_12px_rgba(0,120,212,0.25)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Jogos
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-sm transition-colors border border-white/5 hover:border-white/20 active:scale-95 text-white"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Editar Arquivo
                </button>
              </div>
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
                    <h4 className="font-bold mb-3 flex items-center gap-2 text-fluent-accent shrink-0">
                      <CheckCircle className="w-4 h-4" />
                      Prontos ({gameListData.completedGames})
                    </h4>
                    <p className="text-xs text-gray-500 mb-2 italic shrink-0">
                      Jogos que constam na lista e já possuem miniatura.
                    </p>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                      {readyGroups.map((group: any, groupIndex: number) => (
                        <div
                          key={`${group.providerName}-${groupIndex}`}
                          className="space-y-1.5"
                        >
                          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded bg-[#151515]/95 border border-white/10 px-2 py-1.5 font-sans text-[11px] text-blue-200 backdrop-blur">
                            <span className="font-semibold truncate">
                              Provedor: {group.providerName}
                            </span>
                            <span className="shrink-0 rounded bg-blue-500/15 px-2 py-0.5 text-[10px] text-blue-300">
                              {group.games?.length || 0}
                            </span>
                          </div>
                          {group.games?.map((game: any, i: number) => {
                            const normalizedName =
                              game.normalized ||
                              normalizeGameName(game.displayName);
                            const providerName =
                              game.providerName || group.providerName;
                            const gameKey = createProviderGameKey(
                              providerName,
                              normalizedName,
                            );

                            let isSent = sentData.keys.has(gameKey);
                            if (
                              !isSent &&
                              normalizeGameName(providerName) ===
                                normalizeGameName('Sem provedor')
                            ) {
                              isSent = sentData.names.has(normalizedName);
                            }

                            return (
                              <div
                                key={`${game.displayName}-${i}`}
                                className={`py-1.5 px-2 rounded border text-xs text-gray-300 font-sans truncate ${isSent ? 'bg-green-500/10 border-green-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}
                              >
                                {game.displayName}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                      {gameListData.readyGames?.length === 0 && (
                        <p className="text-center py-20 text-gray-600 text-xs italic">
                          Nenhum pronto!
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white/[0.02] rounded-lg border border-white/5 p-4 flex flex-col min-h-0">
                    <h4 className="font-bold mb-3 flex items-center gap-2 text-orange-400 shrink-0">
                      <Clock className="w-4 h-4" />
                      Faltando ({gameListData.remainingGames?.length || 0})
                    </h4>
                    <p className="text-xs text-gray-500 mb-2 italic shrink-0">
                      Jogos na lista que não foram encontrados nas miniaturas
                      prontas.
                    </p>
                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                      {remainingGroups.map((group: any, groupIndex: number) => (
                        <div
                          key={`${group.providerName}-${groupIndex}`}
                          className="space-y-1.5"
                        >
                          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded bg-[#151515]/95 border border-white/10 px-2 py-1.5 font-sans text-[11px] text-orange-200 backdrop-blur">
                            <span className="font-semibold truncate">
                              Provedor: {group.providerName}
                            </span>
                            <span className="shrink-0 rounded bg-orange-500/15 px-2 py-0.5 text-[10px] text-orange-300">
                              {group.games?.length || 0}
                            </span>
                          </div>
                          {group.games?.map((game: any, i: number) => (
                            <div
                              key={`${game.displayName}-${i}`}
                              className="py-1.5 px-2 rounded bg-orange-500/10 border border-orange-500/20 text-xs text-gray-300 font-sans truncate"
                            >
                              {game.displayName}
                            </div>
                          ))}
                        </div>
                      ))}
                      {gameListData.remainingGames?.length === 0 && (
                        <p className="text-center py-20 text-gray-600 text-xs italic">
                          Nenhum pendente!
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

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg acrylic border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h3 className="font-bold text-lg flex items-center gap-2 text-white font-sans">
                <Plus className="w-5 h-5 text-fluent-accent" />
                Adicionar Jogos por Provedor
              </h3>
              <button
                onClick={() => {
                  setProviderInput('');
                  setGamesInput('');
                  setIsAddModalOpen(false);
                }}
                className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 block font-sans">
                  Nome do Provedor
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pragmatic Play ou Sem provedor"
                  value={providerInput}
                  onChange={(e) => setProviderInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-fluent-accent/50 focus:border-transparent transition-all font-sans"
                />
                <p className="text-[11px] text-gray-400 font-sans leading-relaxed">
                  Se deixado em branco ou preenchido com &quot;Sem provedor&quot;, os jogos serão adicionados na seção geral de jogos sem provedor (normalmente no início da lista.txt).
                </p>
              </div>

              <div className="space-y-1.5 flex-1 flex flex-col">
                <label className="text-xs font-semibold text-gray-300 block font-sans">
                  Jogos (um por linha)
                </label>
                <textarea
                  rows={8}
                  placeholder={`Digite um jogo por linha, exemplo:
Sweet Bonanza
Gates of Olympus
Sugar Rush`}
                  value={gamesInput}
                  onChange={(e) => setGamesInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#141414] border border-white/10 text-white placeholder-gray-500 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fluent-accent/50 focus:border-transparent transition-all resize-y custom-scrollbar"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
              <button
                onClick={() => {
                  setProviderInput('');
                  setGamesInput('');
                  setIsAddModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg border border-white/15 text-white hover:bg-white/5 text-sm transition-colors cursor-pointer active:scale-95 font-sans"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddGamesSubmit}
                disabled={isSavingMulti || !gamesInput.trim()}
                className="px-4 py-2 rounded-lg bg-fluent-accent hover:bg-fluent-accent-hover text-white text-sm font-semibold transition-colors cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(0,120,212,0.3)] font-sans"
              >
                {isSavingMulti ? 'Salvando...' : 'Adicionar e Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
