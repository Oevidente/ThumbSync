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

function buildWorkWindow(now = new Date()) {
  const startAt = new Date(now);
  startAt.setHours(WORK_START_HOUR, WORK_START_MINUTE, 0, 0);

  const endAt = new Date(now);
  endAt.setHours(WORK_END_HOUR, WORK_END_MINUTE, 0, 0);

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
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\.webp$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function cleanGameListLine(line: string) {
  return line.replace(/^\uFEFF/, '').replace(/^\s*(?:[-*•]\s+|\d+\s*[\).\]-]\s*)/, '').trim();
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

async function startServer() {
  const app = express();
  const PORT = 3000;

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
    
    // Game List Logic
    let gameListData: any = { status: 'missing' };
    if (fs.existsSync(listPath)) {
      try {
        const content = fs.readFileSync(listPath, 'utf8');
        const listedGames: any[] = [];
        const createdGames = new Set(data.comparedFiles.map(f => normalizeGameName(path.basename(f.relativePath, '.webp'))));
        
        // Add existing in dest
        collectWebpFiles(dest).forEach(f => createdGames.add(normalizeGameName(path.basename(f, '.webp'))));

        content.split(/\r?\n/).forEach(line => {
          const displayName = cleanGameListLine(line);
          if (!displayName || displayName.startsWith('#') || displayName.includes('?')) return;
          const normalized = normalizeGameName(displayName);
          if (!normalized) return;
          listedGames.push({ displayName, normalized });
        });

        const remaining = listedGames.filter(g => !createdGames.has(g.normalized));
        const readyGames = listedGames.filter(g => createdGames.has(g.normalized));
        gameListData = {
          status: 'ok',
          totalListedGames: listedGames.length,
          completedGames: readyGames.length,
          remainingGames: remaining,
          readyGames: readyGames
        };
      } catch (err) {
        gameListData = { status: 'error', message: (err as Error).message };
      }
    }

    res.json({ ...data, gameListData });
  });

  app.post("/api/copy/start", (req, res) => {
    const { files, settings } = req.body;
    if (currentCopyState && currentCopyState.status === 'running') {
      return res.status(400).json({ error: "A copy process is already running." });
    }

    // Calcula os atrasos baseados na janela de tempo original
    let delays: number[] = [];
    const windowInfo = buildWorkWindow();
    
    // Simplificando o fallback para garantir que funcione fora do horário comercial (para testes na UI)
    // Se estiver fora do horário, simula uma janela de 10 minutos para fins de demonstração
    let availableWindowMs = windowInfo.endAt.getTime() - windowInfo.now.getTime();
    let firstCopyDelayMs = Math.max(0, windowInfo.firstCopyReleaseAt.getTime() - windowInfo.now.getTime());
    
    if (windowInfo.now.getTime() >= windowInfo.endAt.getTime() || windowInfo.now.getTime() < windowInfo.startAt.getTime()) {
      // Estamos fora do horário de trabalho pretendido. Para a UI não congelar eternamente,
      // usaremos um atraso fixo e rápido
      console.log("Fora do horário (14:00 - 17:30). Usando atrasos simulados rápidos (3-5s).");
      delays = files.map(() => Math.random() * 2000 + 3000);
    } else {
      console.log(`Dentro do horário. Calculando schedule para ${availableWindowMs} ms disponíveis.`);
      delays = buildStretchDelaySchedule(files.length, firstCopyDelayMs, availableWindowMs);
    }

    currentCopyState = {
      status: 'running',
      progress: 0,
      total: files.length,
      copied: 0,
      skipped: 0,
      failed: 0,
      copiedNames: [],
      startTime: new Date(),
      nextCopyAt: 0,
      currentFileWaiting: null
    };

    // Background copy process simulation (keeping logic)
    (async () => {
      for (let i = 0; i < files.length; i++) {
        if (!currentCopyState || currentCopyState.status !== 'running') break;
        
        const file = files[i];
        const delay = delays[i] || 0;
        
        currentCopyState.nextCopyAt = Date.now() + delay;
        currentCopyState.currentFileWaiting = file.relativePath.split('/').pop();
        
        if (delay > 0) {
            const step = 1000; // Aguarda 1 segundo por vez para poder ser interrompido
            for(let waited = 0; waited < delay; waited += step) {
                if (!currentCopyState || currentCopyState.status !== 'running') return;
                await new Promise(r => setTimeout(r, Math.min(step, delay - waited)));
            }
        }

        try {
          const destFolder = path.dirname(file.destPath);
          if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
          fs.copyFileSync(file.sourcePath, file.destPath);
          currentCopyState.copied++;
          currentCopyState.copiedNames.push(path.basename(file.relativePath, '.webp'));
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
    const { files } = req.body;
    if (currentCopyState && currentCopyState.status === 'running') {
      return res.status(400).json({ error: "A copy process is already running." });
    }

    currentCopyState = {
      mode: 'immediate',
      status: 'running',
      progress: 0,
      total: files.length,
      copied: 0,
      skipped: 0,
      failed: 0,
      copiedNames: [],
      startTime: new Date(),
      nextCopyAt: 0,
      currentFileWaiting: null
    };

    (async () => {
      for (let i = 0; i < files.length; i++) {
        if (!currentCopyState || currentCopyState.status !== 'running') break;
        const file = files[i];
        try {
          const destFolder = path.dirname(file.destPath);
          if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
          fs.copyFileSync(file.sourcePath, file.destPath);
          currentCopyState.copied++;
          currentCopyState.copiedNames.push(path.basename(file.relativePath, '.webp'));
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
      startTime: new Date(),
      nextCopyAt: 0,
      currentFileWaiting: null
    };

    watchInterval = setInterval(() => {
        if (!currentCopyState || currentCopyState.status !== 'running' || currentCopyState.mode !== 'watch') {
            if (watchInterval) {
              clearInterval(watchInterval);
              watchInterval = null;
            }
            return;
        }

        const data = collectComparisonData(source, dest);
        const { pendingFiles } = data;
        
        if (pendingFiles.length > 0) {
            for (const file of pendingFiles) {
                try {
                    const destFolder = path.dirname(file.destPath);
                    if (!fs.existsSync(destFolder)) fs.mkdirSync(destFolder, { recursive: true });
                    fs.copyFileSync(file.sourcePath, file.destPath);
                    currentCopyState.copied++;
                    currentCopyState.copiedNames.push(path.basename(file.relativePath, '.webp'));
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
