import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- LOGIC FROM SCRIPTS ---

const DEFAULT_SOURCE = process.platform === 'win32' 
  ? 'G:\\Documentos\\Creative Cloud Files Personal Account andreluiz1902@gmail.com 14392106563A51EF7F000101@AdobeID\\Thumbs'
  : path.join(__dirname, 'mock_data', 'source');
const DEFAULT_DEST = process.platform === 'win32'
  ? 'H:\\Meu Drive\\Thumbs'
  : path.join(__dirname, 'mock_data', 'dest');
const DEFAULT_GAME_LIST = process.platform === 'win32'
  ? 'G:\\Documentos\\Creative Cloud Files Personal Account andreluiz1902@gmail.com 14392106563A51EF7F000101@AdobeID\\cassino\\lista.txt'
  : path.join(__dirname, 'mock_data', 'lista.txt');

const PENDING_LIST_EXPORT_FILE = 'lista-de-pendentes.txt';
const DEFAULT_BATCH_SIZE = 17;
const MAX_BATCH_SIZE = 17;
const FILE_TIME_TOLERANCE_MS = 1000;
type CopyOrder = 'newest' | 'oldest';

// --- TIME LOGIC CONSTANTS ---
const MIN_INTERVAL_MINUTES = 5;
const MAX_INTERVAL_MINUTES = 10;
const WORK_START_HOUR = 14;
const WORK_START_MINUTE = 0;
const WORK_END_HOUR = 17;
const WORK_END_MINUTE = 30;
const FIRST_COPY_RELEASE_MINUTES_AFTER_START = 10;
const STRETCH_VARIATION_OPTIONS_MS = [30 * 1000, 60 * 1000, 2 * 60 * 1000];

function sumDelays(delays: number[]) {
  return delays.reduce((total, delay) => total + delay, 0);
}

function floorToSecond(ms: number) {
  return Math.floor(ms / 1000) * 1000;
}

function buildWorkWindow(now = new Date(), settings: any = {}) {
  const startAt = new Date(now);
  startAt.setHours(settings.startHour ?? WORK_START_HOUR, settings.startMinute ?? WORK_START_MINUTE, 0, 0);

  const endAt = new Date(now);
  endAt.setHours(settings.endHour ?? WORK_END_HOUR, settings.endMinute ?? WORK_END_MINUTE, 0, 0);

  // Se já passou do fim do expediente de hoje, a janela é amanhã.
  if (now.getTime() > endAt.getTime()) {
      startAt.setDate(startAt.getDate() + 1);
      endAt.setDate(endAt.getDate() + 1);
  }

  // Se cruza a meia-noite
  if (startAt.getTime() > endAt.getTime()) {
      if (now.getTime() <= endAt.getTime()) {
          startAt.setDate(startAt.getDate() - 1);
      } else {
          endAt.setDate(endAt.getDate() + 1);
      }
  }

  const firstCopyReleaseAt = new Date(
    startAt.getTime() + FIRST_COPY_RELEASE_MINUTES_AFTER_START * 60 * 1000,
  );
  const fullWindowMs = endAt.getTime() - startAt.getTime();

  return {
    now,
    startAt,
    endAt,
    firstCopyReleaseAt,
    fullWindowMs,
  };
}

// Function to block flow until time window opens
async function waitForWindow(state: any, settings: any) {
    while (state && state.status === 'running') {
        const win = buildWorkWindow(new Date(), settings);
        const now = new Date();
        if (now.getTime() >= win.startAt.getTime() && now.getTime() <= win.endAt.getTime()) {
            state.waitingForWindow = false;
            return true;
        }
        
        state.waitingForWindow = true;
        state.nextCopyAt = win.startAt.getTime();
        await new Promise(r => setTimeout(r, 2000));
    }
    return false;
}

function buildStretchDelaySchedule(queueLength: number, firstCopyDelayMs: number, availableWindowMs: number) {
  if (queueLength <= 0) return [];
  if (queueLength === 1) return [firstCopyDelayMs];

  const intervalCount = queueLength - 1;
  const remainingWindowAfterFirstMs = Math.max(0, availableWindowMs - firstCopyDelayMs);
  const baseIntervalMs = remainingWindowAfterFirstMs / intervalCount;
  const minIntervalMs = Math.max(5 * 1000, Math.min(30 * 1000, baseIntervalMs * 0.25));
  const rawIntervals: number[] = [];

  for (let index = 0; index < intervalCount; index += 1) {
    const variationOptionMs = STRETCH_VARIATION_OPTIONS_MS[Math.floor(Math.random() * STRETCH_VARIATION_OPTIONS_MS.length)];
    const variationMs = Math.min(variationOptionMs, baseIntervalMs * 0.75);
    const direction = Math.random() < 0.5 ? -1 : 1;
    const rawIntervalMs = Math.max(minIntervalMs, baseIntervalMs + direction * variationMs);
    rawIntervals.push(rawIntervalMs);
  }

  const rawTotalMs = sumDelays(rawIntervals);
  const scale = rawTotalMs ? remainingWindowAfterFirstMs / rawTotalMs : 0;
  const delays = [firstCopyDelayMs];
  let usedWindowMs = 0;

  for (let index = 0; index < rawIntervals.length; index += 1) {
    if (index === rawIntervals.length - 1) {
      delays.push(Math.max(0, remainingWindowAfterFirstMs - usedWindowMs));
      continue;
    }
    const scaledIntervalMs = Math.max(0, floorToSecond(rawIntervals[index] * scale));
    delays.push(scaledIntervalMs);
    usedWindowMs += scaledIntervalMs;
  }
  return delays;
}

// Workflow state
let currentCopyState: any = null;
let watchInterval: NodeJS.Timeout | null = null;

function collectWebpFiles(rootDir: string) {
  const results: string[] = [];
  if (!fs.existsSync(rootDir)) return results;
  const stack = [rootDir];

  while (stack.length) {
    const current = stack.pop()!;
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (err) { continue; }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.webp') {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function getFileStats(filePath: string) {
  try { return fs.statSync(filePath); } catch (err) { return null; }
}

function analyzeFileSyncStatus(sourcePath: string, destPath: string) {
  const sourceStats = getFileStats(sourcePath);
  if (!sourceStats) return { isPending: false, reason: 'missing-source', sourceModifiedAtMs: 0 };

  const destStats = getFileStats(destPath);
  if (!destStats) return { isPending: true, reason: 'missing-dest', sourceModifiedAtMs: sourceStats.mtimeMs };

  const sourceIsNewer = sourceStats.mtimeMs - destStats.mtimeMs > FILE_TIME_TOLERANCE_MS;
  return { isPending: sourceIsNewer, reason: sourceIsNewer ? 'source-newer' : 'up-to-date', sourceModifiedAtMs: sourceStats.mtimeMs };
}

function normalizeGameName(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\.webp$/i, '').replace(/:/g, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function cleanGameListLine(line: string) {
  return line.replace(/^\uFEFF/, '').replace(/^\s*(?:[-*•]\s+|\d+\s*[\).\]-]\s*)/, '').trim();
}

function isProviderListLine(line: string) {
  return /^provedor\s*:/i.test(line);
}

function getProviderListName(line: string) {
  const match = line.match(/^provedor\s*:\s*(.+)$/i);
  return match?.[1]?.trim() || null;
}

function normalizeProviderName(providerName: string) {
  return providerName.replace(/\s+/g, ' ').trim() || 'Sem provedor';
}

function getProviderNameFromRelativePath(relativePath: string) {
  const segments = relativePath.split(/[\\/]/).filter(Boolean);
  return segments.length > 1 ? normalizeProviderName(segments[0]) : 'Sem provedor';
}

function getFileNameFromRelativePath(relativePath: string) {
  return relativePath.split(/[\\/]/).pop() || relativePath;
}

function createProviderGameKey(providerName: string, normalizedGameName: string) {
  return `${normalizeGameName(providerName)}::${normalizedGameName}`;
}

function createProviderGameKeyFromRelativePath(relativePath: string) {
  const normalizedGameName = normalizeGameName(getFileNameFromRelativePath(relativePath));
  if (!normalizedGameName) return null;
  return createProviderGameKey(getProviderNameFromRelativePath(relativePath), normalizedGameName);
}

function groupGamesByProvider(games: any[]) {
  const groups: any[] = [];
  const groupsByProvider = new Map<string, any>();

  games.forEach((game) => {
    const providerName = normalizeProviderName(game.providerName || 'Sem provedor');
    const providerKey = normalizeGameName(providerName);
    let group = groupsByProvider.get(providerKey);

    if (!group) {
      group = { providerName, games: [] };
      groupsByProvider.set(providerKey, group);
      groups.push(group);
    }

    group.games.push(game);
  });

  return groups;
}

function getDisplayNameFromFileName(fileName: string) {
  const parsedName = path.parse(fileName).name;
  return parsedName.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || parsedName;
}

function collectDestinationRecords(destDir: string) {
  if (!fs.existsSync(destDir)) {
    return { status: 'missing', totalGames: 0, providers: [] };
  }

  const groupsByProvider = new Map<string, any>();
  let totalGames = 0;

  collectWebpFiles(destDir).forEach((filePath) => {
    const stats = getFileStats(filePath);
    if (!stats) return;

    const relativePath = path.relative(destDir, filePath);
    const fileName = getFileNameFromRelativePath(relativePath);
    const providerName = getProviderNameFromRelativePath(relativePath);
    const providerKey = normalizeGameName(providerName);
    const modifiedAtMs = stats.mtimeMs;
    const createdAtMs = stats.birthtimeMs;
    const sizeBytes = stats.size;
    const extension = path.extname(fileName).replace('.', '').toLowerCase() || 'webp';

    let group = groupsByProvider.get(providerKey);
    if (!group) {
      group = {
        providerName,
        providerKey,
        gameCount: 0,
        totalSizeBytes: 0,
        coverPath: filePath,
        latestModifiedAtMs: modifiedAtMs,
        oldestModifiedAtMs: modifiedAtMs,
        games: [],
      };
      groupsByProvider.set(providerKey, group);
    }

    const gameRecord = {
      providerName,
      providerKey,
      displayName: getDisplayNameFromFileName(fileName),
      fileName,
      relativePath,
      destPath: filePath,
      modifiedAtMs,
      createdAtMs,
      sizeBytes,
      extension,
    };

    group.games.push(gameRecord);
    group.gameCount += 1;
    group.totalSizeBytes += sizeBytes;
    totalGames += 1;

    if (modifiedAtMs > group.latestModifiedAtMs) {
      group.latestModifiedAtMs = modifiedAtMs;
      group.coverPath = filePath;
    }
    if (modifiedAtMs < group.oldestModifiedAtMs) {
      group.oldestModifiedAtMs = modifiedAtMs;
    }
  });

  const providers = Array.from(groupsByProvider.values())
    .map((group) => ({
      ...group,
      games: [...group.games].sort((a, b) => b.modifiedAtMs - a.modifiedAtMs),
    }))
    .sort((a, b) => a.providerName.localeCompare(b.providerName, 'pt-BR', { sensitivity: 'base' }));

  return { status: 'ok', totalGames, providers };
}

function collectComparisonData(sourceDir: string, destDir: string) {
  const sourceFiles = collectWebpFiles(sourceDir);
  const comparedFiles = sourceFiles.map((sourcePath) => {
    const relativePath = path.relative(sourceDir, sourcePath);
    const destPath = path.join(destDir, relativePath);
    const syncStatus = analyzeFileSyncStatus(sourcePath, destPath);
    return { sourcePath, relativePath, destPath, modifiedAtMs: syncStatus.sourceModifiedAtMs, syncStatus };
  });

  const pendingFiles = comparedFiles.filter(f => f.syncStatus.isPending).sort((a, b) => b.modifiedAtMs - a.modifiedAtMs);
  return { comparedFiles, totalSourceFiles: sourceFiles.length, pendingFiles };
}

function getCopyOrder(settings: any = {}): CopyOrder {
  return settings.copyOrder === 'oldest' ? 'oldest' : 'newest';
}

function getFileModifiedAtMs(file: any) {
  return Number(file?.modifiedAtMs ?? file?.syncStatus?.sourceModifiedAtMs ?? 0) || 0;
}

function sortPendingFilesByOrder(files: any[] = [], settings: any = {}) {
  const copyOrder = getCopyOrder(settings);
  return [...files].sort((a, b) => {
    const diff = getFileModifiedAtMs(a) - getFileModifiedAtMs(b);
    return copyOrder === 'newest' ? -diff : diff;
  });
}

function normalizeCopyPathKey(filePath: string) {
  const resolvedPath = path.resolve(filePath);
  return process.platform === 'win32' ? resolvedPath.toLowerCase() : resolvedPath;
}

function getCopyQueueKey(file: any) {
  return normalizeCopyPathKey(file?.destPath || file?.relativePath || file?.sourcePath || '');
}

function dedupePendingFilesByDestination(files: any[] = []) {
  const seen = new Set<string>();
  const uniqueFiles: any[] = [];

  for (const file of files) {
    const key = getCopyQueueKey(file);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    uniqueFiles.push(file);
  }

  return uniqueFiles;
}

function buildCopyQueue(files: any[] = [], settings: any = {}) {
  return sortPendingFilesByOrder(dedupePendingFilesByDestination(files), settings);
}

function getBatchLimit(settings: any = {}) {
  const configuredLimit = Number(settings.sendLimit);
  const limit = Number.isFinite(configuredLimit) && configuredLimit > 0
    ? Math.floor(configuredLimit)
    : DEFAULT_BATCH_SIZE;

  return Math.min(limit, MAX_BATCH_SIZE);
}

function copyPendingFile(file: any) {
  const destFolder = path.dirname(file.destPath);
  if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });

  fs.copyFileSync(file.sourcePath, file.destPath);

  const sourceStats = getFileStats(file.sourcePath);
  if (!sourceStats) return;

  try {
    fs.utimesSync(file.destPath, sourceStats.atime, sourceStats.mtime);
  } catch (err) {
    console.warn(`Copied ${file.destPath}, but could not preserve timestamps:`, err);
  }
}

function getCopiedDisplayName(file: any) {
  const filePath = file?.relativePath || file?.destPath || file?.sourcePath || '';
  return path.basename(filePath, '.webp');
}

function recordCopiedFile(state: any, file: any, copiedAt = new Date()) {
  const name = getCopiedDisplayName(file);
  state.copiedNames.push(name);
  state.copiedLog.push({
    name,
    relativePath: file?.relativePath || '',
    copiedAt: copiedAt.toISOString(),
    copiedAtMs: copiedAt.getTime(),
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Ensure mock data exists for preview purposes if paths don't exist
  if (!fs.existsSync(DEFAULT_SOURCE)) {
    fs.mkdirSync(path.join(__dirname, 'mock_data', 'source'), { recursive: true });
    fs.mkdirSync(path.join(__dirname, 'mock_data', 'dest'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, 'mock_data', 'lista.txt'), "Game 1\nGame 2\nGame 3");
  }

  // --- API ROUTES ---

  app.get("/api/config", (req, res) => {
    res.json({ source: DEFAULT_SOURCE, dest: DEFAULT_DEST, list: DEFAULT_GAME_LIST });
  });

  app.get("/api/analyze", (req, res) => {
    const source = (req.query.source as string) || DEFAULT_SOURCE;
    const dest = (req.query.dest as string) || DEFAULT_DEST;
    const listPath = (req.query.list as string) || DEFAULT_GAME_LIST;

    const data = collectComparisonData(source, dest);
    const recordsData = collectDestinationRecords(dest);
    
    // Game List Logic
    let gameListData: any = { status: 'missing' };
    if (fs.existsSync(listPath)) {
      try {
        const content = fs.readFileSync(listPath, 'utf8');
        const listedGames: any[] = [];
        const createdGameNames = new Set(data.comparedFiles.map(f => normalizeGameName(getFileNameFromRelativePath(f.relativePath))));
        const createdProviderGameKeys = new Set(
          data.comparedFiles
            .map(f => createProviderGameKeyFromRelativePath(f.relativePath))
            .filter(Boolean)
        );
        let currentProviderName = 'Sem provedor';
        
        // Add existing in dest
        collectWebpFiles(dest).forEach(f => {
          const relativePath = path.relative(dest, f);
          const providerGameKey = createProviderGameKeyFromRelativePath(relativePath);
          if (providerGameKey) createdProviderGameKeys.add(providerGameKey);
          createdGameNames.add(normalizeGameName(getFileNameFromRelativePath(relativePath)));
        });

        content.split(/\r?\n/).forEach(line => {
          const displayName = cleanGameListLine(line);
          if (!displayName || displayName.startsWith('#') || displayName.includes('?')) return;

          const providerName = getProviderListName(displayName);
          if (providerName) {
            currentProviderName = normalizeProviderName(providerName);
            return;
          }

          if (isProviderListLine(displayName)) return;

          const normalized = normalizeGameName(displayName);
          if (!normalized) return;
          listedGames.push({ displayName, normalized, providerName: currentProviderName });
        });

        const isGameCreated = (game: any) => {
          const providerKey = normalizeGameName(game.providerName || 'Sem provedor');
          const gameKey = createProviderGameKey(game.providerName || 'Sem provedor', game.normalized);

          if (providerKey === normalizeGameName('Sem provedor')) {
            return createdProviderGameKeys.has(gameKey) || createdGameNames.has(game.normalized);
          }

          return createdProviderGameKeys.has(gameKey);
        };

        const remaining = listedGames.filter(g => !isGameCreated(g));
        const readyGames = listedGames.filter(g => isGameCreated(g));
        gameListData = {
          status: 'ok',
          totalListedGames: listedGames.length,
          completedGames: readyGames.length,
          remainingGames: remaining,
          remainingGamesByProvider: groupGamesByProvider(remaining),
          readyGames: readyGames,
          readyGamesByProvider: groupGamesByProvider(readyGames)
        };
      } catch (err) {
        gameListData = { status: 'error', message: (err as Error).message };
      }
    }

    res.json({ ...data, gameListData, recordsData });
  });

  app.post("/api/copy/start", (req, res) => {
    const { files, settings } = req.body;
    const queuedFiles = buildCopyQueue(Array.isArray(files) ? files : [], settings).slice(0, getBatchLimit(settings));
    if (currentCopyState && currentCopyState.status === 'running') {
      return res.status(400).json({ error: "A copy process is already running." });
    }

    currentCopyState = {
      mode: 'scheduled',
      status: 'running',
      progress: 0,
      total: queuedFiles.length,
      copied: 0,
      skipped: 0,
      failed: 0,
      copiedNames: [],
      copiedLog: [],
      startTime: new Date(),
      nextCopyAt: 0,
      currentFileWaiting: null
    };

    (async () => {
      // First, block if outside the work window
      if (!await waitForWindow(currentCopyState, settings)) return;

      const windowInfo = buildWorkWindow(new Date(), settings);
      const availableWindowMs = windowInfo.endAt.getTime() - windowInfo.now.getTime();
      const firstCopyDelayMs = Math.max(0, windowInfo.firstCopyReleaseAt.getTime() - windowInfo.now.getTime());
      
      console.log(`[Lote] Calculando schedule para ${availableWindowMs} ms disponíveis.`);
      const delays = buildStretchDelaySchedule(queuedFiles.length, firstCopyDelayMs, availableWindowMs);
      
      for (let i = 0; i < queuedFiles.length; i++) {
        if (!currentCopyState || currentCopyState.status !== 'running') break;
        
        // Re-check window just in case (though it should be mostly inside if calculated right)
        if (!await waitForWindow(currentCopyState, settings)) return;

        const file = queuedFiles[i];
        const delay = delays[i] || 0;
        
        currentCopyState.nextCopyAt = Date.now() + delay;
        currentCopyState.currentFileWaiting = file.relativePath.split('/').pop();
        
        if (delay > 0) {
            const step = 2000;
            for(let waited = 0; waited < delay; waited += step) {
                if (!currentCopyState || currentCopyState.status !== 'running') return;
                await new Promise(r => setTimeout(r, Math.min(step, delay - waited)));
            }
        }

        try {
          copyPendingFile(file);
          currentCopyState.copied++;
          recordCopiedFile(currentCopyState, file);
        } catch (err) {
          currentCopyState.failed++;
        }
        currentCopyState.progress = Math.round(((currentCopyState.copied + currentCopyState.failed + currentCopyState.skipped) / currentCopyState.total) * 100);
      }
      if (currentCopyState) {
        currentCopyState.status = 'finished';
        currentCopyState.nextCopyAt = 0;
        currentCopyState.currentFileWaiting = null;
      }
    })();

    res.json({ status: "started" });
  });

  app.post("/api/copy/sync-immediate", (req, res) => {
    const { files, settings } = req.body;
    const queuedFiles = buildCopyQueue(Array.isArray(files) ? files : [], settings);
    if (currentCopyState && currentCopyState.status === 'running') {
      return res.status(400).json({ error: "A copy process is already running." });
    }

    currentCopyState = {
      mode: 'immediate',
      status: 'running',
      progress: 0,
      total: queuedFiles.length,
      copied: 0,
      skipped: 0,
      failed: 0,
      copiedNames: [],
      copiedLog: [],
      startTime: new Date(),
      nextCopyAt: 0,
      currentFileWaiting: null
    };

    (async () => {
      for (let i = 0; i < queuedFiles.length; i++) {
        if (!currentCopyState || currentCopyState.status !== 'running') break;

        // Block if outside window! (The user wants this to be strictly respected too)
        if (!await waitForWindow(currentCopyState, settings)) return;

        const file = queuedFiles[i];
        try {
          copyPendingFile(file);
          currentCopyState.copied++;
          recordCopiedFile(currentCopyState, file);
        } catch (err) {
          currentCopyState.failed++;
        }
        currentCopyState.progress = Math.round(((currentCopyState.copied + currentCopyState.failed + currentCopyState.skipped) / currentCopyState.total) * 100);
      }
      if (currentCopyState) {
        currentCopyState.status = 'finished';
      }
    })();

    res.json({ status: "started" });
  });

  app.post("/api/copy/watch-start", (req, res) => {
    const source = (req.body.source as string) || DEFAULT_SOURCE;
    const dest = (req.body.dest as string) || DEFAULT_DEST;
    const settings = req.body.settings || {};
    
    if (currentCopyState && currentCopyState.status === 'running') {
      return res.status(400).json({ error: "A copy process is already running." });
    }

    if (watchInterval) clearInterval(watchInterval);

    currentCopyState = {
      mode: 'watch',
      status: 'running',
      progress: 100,
      total: 0,
      copied: 0,
      skipped: 0,
      failed: 0,
      copiedNames: [],
      copiedLog: [],
      startTime: new Date(),
      nextCopyAt: 0,
      currentFileWaiting: null
    };

    const copiedSourceVersions = new Map<string, number>();

    // Use interval but skip logic if outside time window
    watchInterval = setInterval(() => {
        if (!currentCopyState || currentCopyState.status !== 'running' || currentCopyState.mode !== 'watch') {
            if (watchInterval) {
              clearInterval(watchInterval);
              watchInterval = null;
            }
            return;
        }

        const win = buildWorkWindow(new Date(), settings);
        const now = new Date();
        if (now.getTime() < win.startAt.getTime() || now.getTime() > win.endAt.getTime()) {
             currentCopyState.waitingForWindow = true;
             currentCopyState.nextCopyAt = win.startAt.getTime();
             return; // Do nothing until time window shifts
        }
        
        currentCopyState.waitingForWindow = false;

        const data = collectComparisonData(source, dest);
        const pendingFiles = buildCopyQueue(data.pendingFiles, settings);
        
        if (pendingFiles.length > 0) {
            for (const file of pendingFiles) {
                const copyKey = getCopyQueueKey(file);
                const sourceVersion = getFileModifiedAtMs(file);
                if (copiedSourceVersions.get(copyKey) === sourceVersion) continue;

                try {
                    copyPendingFile(file);
                    copiedSourceVersions.set(copyKey, sourceVersion);
                    currentCopyState.copied++;
                    recordCopiedFile(currentCopyState, file);
                } catch (err) {
                    currentCopyState.failed++;
                }
            }
        }
    }, 5000);

    res.json({ status: "started" });
  });

  app.get("/api/copy/status", (req, res) => {
    res.json(currentCopyState || { status: 'idle' });
  });

  app.post("/api/copy/stop", (req, res) => {
    if (currentCopyState) {
        currentCopyState.status = 'stopped';
    }
    if (watchInterval) {
        clearInterval(watchInterval);
        watchInterval = null;
    }
    currentCopyState = null;
    res.json({ status: "stopped" });
  });

  app.get("/api/list/content", (req, res) => {
    const listPath = (req.query.list as string) || DEFAULT_GAME_LIST;
    if (!fs.existsSync(listPath)) {
        return res.json({ content: '' });
    }
    try {
        const content = fs.readFileSync(listPath, 'utf8');
        res.json({ content });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post("/api/list/content", (req, res) => {
    const listPath = (req.query.list as string) || DEFAULT_GAME_LIST;
    const { content } = req.body;
    try {
        const destFolder = path.dirname(listPath);
        if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
        fs.writeFileSync(listPath, content, 'utf8');
        res.json({ status: "success" });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get("/api/image", (req, res) => {
    const imagePath = req.query.path as string;
    if (!imagePath || !fs.existsSync(imagePath)) {
      return res.status(404).send("Not found");
    }
    try {
      const ext = path.extname(imagePath).toLowerCase();
      let contentType = 'image/jpeg';
      if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.svg') contentType = 'image/svg+xml';
      
      res.setHeader('Content-Type', contentType);
      const fileStream = fs.createReadStream(imagePath);
      fileStream.pipe(res);
    } catch (err) {
      console.error("Error sending file:", err);
      res.status(500).send("Error reading file");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
