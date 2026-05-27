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

function ListViewProviderGroup({
  group,
  groupIndex,
  sentData,
  isReadySection,
}: {
  key?: string;
  group: any;
  groupIndex: number;
  sentData?: any;
  isReadySection: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`sticky top-0 z-10 w-full flex items-center justify-between gap-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] px-3.5 py-2.5 font-sans text-xs ${
          isReadySection ? 'text-[#0a84ff]' : 'text-[#ff9f0a]'
        } backdrop-blur-md text-left cursor-pointer transition-all duration-200 select-none`}
      >
        <span className="font-bold truncate flex items-center gap-1.5">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
          )}
          Provedor: <span className="text-white font-black">{group.providerName}</span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
            isReadySection
              ? 'bg-[#0a84ff]/10 text-[#0a84ff] border border-[#0a84ff]/15'
              : 'bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/15'
          }`}
        >
          {group.games?.length || 0}
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-1.5 pl-2 border-l border-white/[0.05] ml-4.5">
          {group.games?.map((game: any, i: number) => {
            if (isReadySection) {
              const normalizedName =
                game.normalized || normalizeGameName(game.displayName);
              const providerName = game.providerName || group.providerName;
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
                  className={`py-2 px-3 rounded-lg border text-xs font-semibold font-sans truncate shadow-xs transition-transform duration-200 hover:translate-x-0.5 ${
                    isSent
                      ? 'bg-[#30d158]/5 border-[#30d158]/12 text-[#30d158]'
                      : 'bg-[#0a84ff]/5 border-[#0a84ff]/12 text-zinc-300 hover:text-white'
                  }`}
                >
                  {game.displayName}
                </div>
              );
            } else {
              return (
                <div
                  key={`${game.displayName}-${i}`}
                  className="py-2 px-3 rounded-lg bg-[#ff9f0a]/5 border border-[#ff9f0a]/12 text-xs font-semibold text-zinc-300 hover:text-white font-sans truncate shadow-xs transition-transform duration-200 hover:translate-x-0.5"
                >
                  {game.displayName}
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
  onRefresh,
}: {
  gameListData: any;
  recordsData?: any;
  onRefresh: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [listContent, setListContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [providerInput, setProviderInput] = useState('');
  const [gamesInput, setGamesInput] = useState('');
  const [isSavingMulti, setIsSavingMulti] = useState(false);
  const [activeListTab, setActiveListTab] = useState<'pending' | 'ready'>('pending');

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
    <div className="space-y-8 animate-fade-in relative z-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-1 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Gestão da Lista
          </h1>
          <p className="text-zinc-400 text-xs md:text-sm font-semibold tracking-wide">
            Administre os jogos registrados no acervo mestre da aplicação (lista.txt).
          </p>
        </div>
        <button 
          onClick={exportPendingList}
          disabled={!gameListData?.remainingGames?.length}
          className="glass-btn-secondary !py-2 !px-4 sm:!py-2.5 sm:!px-5 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm font-bold disabled:opacity-45 disabled:hover:shadow-none w-full sm:w-auto"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-500 shrink-0" />
          Exportar Pendentes
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <GlassCard className="flex flex-col min-h-[550px] !p-0 overflow-hidden relative shadow-2xl border-white/[0.08]">
          <div className="p-4 sm:p-6 border-b border-white/[0.05] flex justify-between items-center bg-white/[0.015] gap-3">
            <div className="flex items-center gap-2">
              <List className="w-4.5 h-4.5 text-[#0a84ff] shrink-0" />
              <h3 className="font-extrabold text-xs sm:text-base text-white">
                Catalogação do Acervo (lista.txt)
              </h3>
            </div>
            {!isEditing ? (
              <div className="flex gap-1.5 select-none shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="glass-btn-primary !py-1.5 !px-2.5 sm:!py-2 sm:!px-4 text-[10px] sm:text-xs font-black cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>Adicionar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="glass-btn-secondary !py-1.5 !px-2.5 sm:!py-2 sm:!px-4 text-[10px] sm:text-xs font-bold cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span>Editar</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5 select-none shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isLoading}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-semibold hover:bg-white/[0.04] transition-all cursor-pointer text-zinc-400 hover:text-white shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveListContent}
                  disabled={isLoading}
                  className="glass-btn-primary !py-1.5 !px-2.5 sm:!py-2 sm:!px-4 text-[10px] sm:text-xs font-black cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  Salvar
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 relative flex flex-col">
            {/* Abas discretas e óbvias para o Mobile */}
            {!isEditing && (
              <div className="flex md:hidden border-b border-white/[0.05] p-2 bg-white/[0.015] gap-1.5 shrink-0 select-none">
                <button
                  type="button"
                  onClick={() => setActiveListTab('pending')}
                  className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    activeListTab === 'pending'
                      ? 'bg-[#ff9f0a]/10 text-[#ff9f0a] border border-[#ff9f0a]/15 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-350 border border-transparent'
                  }`}
                >
                  Faltando ({gameListData.remainingGames?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveListTab('ready')}
                  className={`flex-1 py-1.5 text-center text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                    activeListTab === 'ready'
                      ? 'bg-[#0a84ff]/10 text-[#0a84ff] border border-[#0a84ff]/15 shadow-sm'
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
                  <div className={`flex flex-col ${activeListTab === 'ready' ? 'flex' : 'hidden md:flex'}`}>
                    <h4 className="font-extrabold mb-1.5 flex items-center gap-2 text-[#0a84ff] shrink-0 text-xs sm:text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Prontos ({gameListData.completedGames})
                    </h4>
                    <p className="text-[10px] md:text-[11px] text-zinc-500 mb-3 bg-zinc-950/30 border border-white/[0.02] py-1.5 px-3 rounded-lg flex-shrink-0 leading-relaxed font-sans font-semibold">
                      Jogos que constam na lista.txt e já possuem miniatura correspondente no acervo.
                    </p>
                    <div className="space-y-2.5 pr-1.5">
                      {readyGroups.map((group: any, groupIndex: number) => (
                        <ListViewProviderGroup
                          key={`ready-${group.providerName}-${groupIndex}`}
                          group={group}
                          groupIndex={groupIndex}
                          sentData={sentData}
                          isReadySection={true}
                        />
                      ))}
                      {gameListData.readyGames?.length === 0 && (
                        <p className="text-center py-20 text-zinc-600 text-xs italic font-semibold font-sans">
                          Nenhum jogo pronto catalogado.
                        </p>
                      )}
                    </div>
                  </div>
 
                  {/* Seção Faltando */}
                  <div className={`flex flex-col ${activeListTab === 'pending' ? 'flex' : 'hidden md:flex'}`}>
                    <h4 className="font-extrabold mb-1.5 flex items-center gap-2 text-[#ff9f0a] shrink-0 text-xs sm:text-sm">
                      <Clock className="w-4 h-4" />
                      Faltando ({gameListData.remainingGames?.length || 0})
                    </h4>
                    <p className="text-[10px] md:text-[11px] text-zinc-500 mb-3 bg-zinc-950/30 border border-white/[0.02] py-1.5 px-3 rounded-lg flex-shrink-0 leading-relaxed font-sans font-semibold">
                      Jogos na lista.txt sem imagem correspondente na pasta de origem local.
                    </p>
                    <div className="space-y-2.5 pr-1.5">
                      {remainingGroups.map((group: any, groupIndex: number) => (
                        <ListViewProviderGroup
                          key={`remaining-${group.providerName}-${groupIndex}`}
                          group={group}
                          groupIndex={groupIndex}
                          isReadySection={false}
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

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-lg acrylic border border-white/[0.08] rounded-2xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3.5 border-b border-white/[0.05]">
              <h3 className="font-extrabold text-base flex items-center gap-2 text-white font-sans">
                <Plus className="w-5 h-5 text-[#0a84ff]" />
                Adicionar em Lote por Provedor
              </h3>
              <button
                type="button"
                onClick={() => {
                  setProviderInput('');
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
                <input
                  type="text"
                  placeholder="Ex: Pragmatic Play ou Sem provedor"
                  value={providerInput}
                  onChange={(e) => setProviderInput(e.target.value)}
                  className="w-full glass-input"
                />
                <p className="text-[10px] text-zinc-500 font-medium font-sans leading-relaxed">
                  Os jogos informados abaixo serão criados sob este provedor. Se deixado em branco, serão colocados na seção geral de jogos sem provedor.
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
                  setProviderInput('');
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
        </div>
      )}
    </div>
  );
}
