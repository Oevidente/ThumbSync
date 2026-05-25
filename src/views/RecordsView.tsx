import { GlassCard } from "../components/GlassCard.tsx";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  ArrowUpWideNarrow,
  Clock,
  Database,
  Download,
  FileText,
  Layers,
  List,
  Package,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ViewMode = "gallery" | "list";
type SortOrder = "newest" | "oldest";

type RecordGame = {
  providerName: string;
  providerKey: string;
  displayName: string;
  fileName: string;
  relativePath: string;
  destPath: string;
  modifiedAtMs: number;
  createdAtMs: number;
  sizeBytes: number;
  extension: string;
};

type ProviderRecord = {
  providerName: string;
  providerKey: string;
  gameCount: number;
  totalSizeBytes: number;
  coverPath: string;
  latestModifiedAtMs: number;
  oldestModifiedAtMs: number;
  games: RecordGame[];
};

const fallbackImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='480' viewBox='0 0 320 480'%3E%3Crect width='320' height='480' fill='%23242424'/%3E%3Cpath d='M96 180h128v120H96z' fill='%23333333'/%3E%3Ccircle cx='136' cy='220' r='18' fill='%23555555'/%3E%3Cpath d='m96 300 52-58 34 36 20-22 22 44z' fill='%23444444'/%3E%3C/svg%3E";

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatDate(value?: number) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatSize(bytes = 0) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: index === 0 ? 0 : 1 }).format(value)} ${units[index]}`;
}

function escapeCsvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function sanitizeFileName(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "provedor";
}

function downloadCsv(provider: ProviderRecord, games: RecordGame[]) {
  const rows = [
    ["Jogo", "Provedor", "Data de modificacao", "Data de criacao", "Tamanho", "Arquivo", "Caminho relativo", "Caminho destino"],
    ...games.map((game) => [
      game.displayName,
      provider.providerName,
      formatDate(game.modifiedAtMs),
      formatDate(game.createdAtMs),
      formatSize(game.sizeBytes),
      game.fileName,
      game.relativePath,
      game.destPath,
    ]),
  ];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(";")).join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `registros-${sanitizeFileName(provider.providerName)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function getImageUrl(path?: string) {
  return path ? `/api/image?path=${encodeURIComponent(path)}` : fallbackImage;
}

export function RecordsView({ recordsData }: { recordsData: any }) {
  const [selectedProviderKey, setSelectedProviderKey] = useState<string | null>(null);
  const [providerFilter, setProviderFilter] = useState("");
  const [gameFilter, setGameFilter] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("gallery");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  const providers: ProviderRecord[] = recordsData?.providers || [];
  const totalGames = recordsData?.totalGames ?? providers.reduce((total, provider) => total + provider.gameCount, 0);
  const selectedProvider = providers.find((provider) => provider.providerKey === selectedProviderKey);
  const latestUpdateMs = providers.reduce((latest, provider) => Math.max(latest, provider.latestModifiedAtMs || 0), 0);

  useEffect(() => {
    if (selectedProviderKey && providers.length && !selectedProvider) {
      setSelectedProviderKey(null);
    }
  }, [providers, selectedProvider, selectedProviderKey]);

  const filteredProviders = useMemo(() => {
    const query = normalizeText(providerFilter.trim());
    if (!query) return providers;
    return providers.filter((provider) => normalizeText(provider.providerName).includes(query));
  }, [providerFilter, providers]);

  const visibleGames = useMemo(() => {
    if (!selectedProvider) return [];

    const query = normalizeText(gameFilter.trim());
    const filtered = query
      ? selectedProvider.games.filter((game) =>
          normalizeText(`${game.displayName} ${game.fileName} ${game.relativePath}`).includes(query)
        )
      : selectedProvider.games;

    return [...filtered].sort((a, b) => {
      const diff = (a.modifiedAtMs || 0) - (b.modifiedAtMs || 0);
      return sortOrder === "newest" ? -diff : diff;
    });
  }, [gameFilter, selectedProvider, sortOrder]);

  if (!recordsData) {
    return <div className="p-10 text-center opacity-50">Carregando registros...</div>;
  }

  if (selectedProvider) {
    return (
      <div className="space-y-8 relative">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div className="space-y-4">
            <button
              onClick={() => {
                setSelectedProviderKey(null);
                setGameFilter("");
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-sm text-gray-300 hover:text-white active:scale-95"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              Provedores
            </button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
                <Database className="w-8 h-8 text-fluent-accent" />
                {selectedProvider.providerName}
              </h1>
              <p className="text-gray-400">Jogos encontrados no destino para este provedor.</p>
            </div>
          </div>

          <div className="min-w-[220px] rounded-xl border border-fluent-accent/25 bg-fluent-accent/10 p-5 shadow-[0_0_25px_rgba(0,120,212,0.15)]">
            <p className="text-[10px] uppercase tracking-widest font-bold text-fluent-accent mb-1">Total do provedor</p>
            <div className="flex items-end gap-2">
              <span className="text-5xl font-black tracking-tight text-white">{selectedProvider.gameCount}</span>
              <span className="pb-2 text-sm text-gray-400">jogos</span>
            </div>
          </div>
        </div>

        <GlassCard className="!p-4">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Filtrar jogos deste provedor..."
                value={gameFilter}
                onChange={(event) => setGameFilter(event.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-fluent-accent transition-colors text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setViewMode("gallery")}
                className={`min-h-10 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${viewMode === "gallery" ? "bg-fluent-accent text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <Layers className="w-4 h-4" />
                Galeria
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`min-h-10 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${viewMode === "list" ? "bg-fluent-accent text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <List className="w-4 h-4" />
                Lista
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setSortOrder("newest")}
                className={`min-h-10 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${sortOrder === "newest" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <ArrowDownWideNarrow className="w-4 h-4" />
                Recente
              </button>
              <button
                onClick={() => setSortOrder("oldest")}
                className={`min-h-10 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all ${sortOrder === "oldest" ? "bg-white/15 text-white" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                <ArrowUpWideNarrow className="w-4 h-4" />
                Antigo
              </button>
            </div>

            <button
              onClick={() => downloadCsv(selectedProvider, visibleGames)}
              disabled={visibleGames.length === 0}
              className="min-h-11 px-4 rounded-lg bg-fluent-accent text-white hover:bg-fluent-accent-hover transition-colors text-sm font-semibold active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </GlassCard>

        {viewMode === "gallery" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {visibleGames.map((game) => (
              <div key={game.destPath} className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.03] group">
                <div className="aspect-[2/3] bg-white/[0.03] overflow-hidden">
                  <img
                    src={getImageUrl(game.destPath)}
                    alt={game.displayName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(event) => {
                      (event.currentTarget as HTMLImageElement).src = fallbackImage;
                    }}
                  />
                </div>
                <div className="p-3 space-y-2">
                  <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2">{game.displayName}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{formatDate(game.modifiedAtMs)}</span>
                  </div>
                </div>
              </div>
            ))}
            {visibleGames.length === 0 && (
              <div className="col-span-full p-16 text-center text-gray-500 border border-white/10 rounded-xl bg-white/[0.02]">
                Nenhum jogo encontrado para o filtro atual.
              </div>
            )}
          </div>
        ) : (
          <GlassCard className="overflow-hidden !p-0">
            <div className="p-5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-fluent-accent" />
                <h3 className="font-semibold">Lista de jogos ({visibleGames.length})</h3>
              </div>
              <p className="text-xs text-gray-500">
                {sortOrder === "newest" ? "Mais recentes primeiro" : "Mais antigos primeiro"}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-white/[0.03] text-gray-400 uppercase text-[10px] tracking-widest border-b border-white/5">
                  <tr>
                    <th className="px-6 py-4 font-bold">Jogo</th>
                    <th className="px-6 py-4 font-bold">Data</th>
                    <th className="px-6 py-4 font-bold">Tamanho</th>
                    <th className="px-6 py-4 font-bold">Arquivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {visibleGames.map((game) => (
                    <tr key={game.destPath} className="hover:bg-white/[0.05] transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-white">{game.displayName}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-300">{formatDate(game.modifiedAtMs)}</td>
                      <td className="px-6 py-4 text-gray-300">{formatSize(game.sizeBytes)}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-gray-300">{game.fileName}</span>
                          <span className="text-xs text-gray-600">{game.relativePath}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {visibleGames.length === 0 && (
                <div className="p-16 text-center text-gray-500">Nenhum jogo encontrado para o filtro atual.</div>
              )}
            </div>
          </GlassCard>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Database className="w-8 h-8 text-fluent-accent" />
            Registros
          </h1>
          <p className="text-gray-400">Galeria dos provedores com jogos já presentes no destino.</p>
        </div>
        <div className="relative w-full lg:w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Filtrar provedores..."
            value={providerFilter}
            onChange={(event) => setProviderFilter(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-fluent-accent transition-colors text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="!p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-fluent-accent/10 text-fluent-accent">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Provedores</p>
              <p className="text-2xl font-bold">{providers.length}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="!p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10 text-green-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Jogos no destino</p>
              <p className="text-2xl font-bold">{totalGames}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="!p-5">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/5 text-gray-300">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Última alteração</p>
              <p className="text-base font-bold">{formatDate(latestUpdateMs)}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {recordsData.status === "missing" ? (
        <div className="p-16 text-center text-gray-500 border border-white/10 rounded-xl bg-white/[0.02]">
          A pasta de destino não foi encontrada.
        </div>
      ) : filteredProviders.length === 0 ? (
        <div className="p-16 text-center text-gray-500 border border-white/10 rounded-xl bg-white/[0.02]">
          Nenhum provedor encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProviders.map((provider) => (
            <button
              key={provider.providerKey}
              onClick={() => setSelectedProviderKey(provider.providerKey)}
              className="group text-left rounded-xl overflow-hidden border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-fluent-accent/40 transition-all active:scale-[0.99]"
            >
              <div className="aspect-[16/9] bg-white/[0.03] overflow-hidden relative">
                <img
                  src={getImageUrl(provider.coverPath)}
                  alt={provider.providerName}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(event) => {
                    (event.currentTarget as HTMLImageElement).src = fallbackImage;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <div className="absolute left-4 right-4 bottom-4 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-white truncate">{provider.providerName}</h2>
                    <p className="text-xs text-gray-300 mt-1 truncate">Atualizado em {formatDate(provider.latestModifiedAtMs)}</p>
                  </div>
                  <div className="shrink-0 rounded-lg bg-black/45 border border-white/10 px-3 py-2 text-center backdrop-blur">
                    <p className="text-lg font-black leading-none">{provider.gameCount}</p>
                    <p className="text-[10px] text-gray-300 uppercase tracking-widest mt-1">jogos</p>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
