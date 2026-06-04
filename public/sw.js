const CACHE_NAME = 'thumbsync-cache-v5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
  '/logodosite.jpg',
  '/favicon.png'
];

// ─── Background polling state ───────────────────────────────────────────────
let bgPollInterval = null;
let lastGameHash = null;   // Hash da última lista conhecida
let pollOrigin = null;     // ex: "https://192.168.1.10:3000"

// Serializa a lista de jogos em uma string comparável
function hashGameList(gameListData) {
  if (!gameListData) return '';
  const ready = (gameListData.readyGames || []);
  const remaining = (gameListData.remainingGames || []);
  const all = [...ready, ...remaining];
  return all
    .map(g => `${g.providerName || ''}::${g.normalized || ''}`)
    .sort()
    .join('|');
}

// Faz o diff e retorna { title, body } ou null se não houver mudança
function diffGameLists(prevHash, newData) {
  if (!newData) return null;
  const ready = (newData.readyGames || []);
  const remaining = (newData.remainingGames || []);
  const currentGames = [...ready, ...remaining];
  const currHash = hashGameList(newData);

  if (prevHash === null || prevHash === currHash) return null; // sem mudança ou primeira carga

  // Reconstruir sets para diff detalhado
  const prevKeys = new Set(prevHash.split('|').filter(Boolean));
  const currKeys = new Set(currHash.split('|').filter(Boolean));

  if (currentGames.length === 0 && prevKeys.size > 0) {
    return { title: 'Lista Esvaziada 🗑️', body: 'O catálogo de jogos da lista.txt foi totalmente esvaziado.' };
  }

  const addedKeys = [...currKeys].filter(k => !prevKeys.has(k));
  const removedKeys = [...prevKeys].filter(k => !currKeys.has(k));

  if (addedKeys.length > 0) {
    const names = addedKeys.map(k => {
      const g = currentGames.find(g => `${g.providerName || ''}::${g.normalized || ''}` === k);
      return g ? g.displayName : k.split('::')[1] || k;
    });
    const preview = names.slice(0, 3).join(', ');
    const suffix = names.length > 3 ? ` e mais ${names.length - 3}...` : '';
    const body = names.length === 1
      ? `O jogo "${names[0]}" foi adicionado à lista.`
      : `${names.length} novos itens adicionados: ${preview}${suffix}`;
    return { title: 'Novos Itens de Jogos 🆕', body };
  }

  if (removedKeys.length > 0) {
    const preview = removedKeys.map(k => k.split('::')[1] || k).slice(0, 3).join(', ');
    const suffix = removedKeys.length > 3 ? ` e mais ${removedKeys.length - 3}...` : '';
    const body = removedKeys.length === 1
      ? `"${removedKeys[0].split('::')[1] || removedKeys[0]}" foi retirado do acervo.`
      : `${removedKeys.length} títulos apagados: ${preview}${suffix}`;
    return { title: 'Itens Removidos da Lista 🗑️', body };
  }

  return { title: 'Lista de Jogos Atualizada 📝', body: 'O arquivo de controle mestre (lista.txt) foi atualizado.' };
}

// Poll da API e disparo de notificação nativa se houver mudança
async function doBgPoll() {
  if (!pollOrigin) return;
  try {
    const res = await fetch(`${pollOrigin}/api/analyze`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    const gameListData = data.gameListData;
    const currentHash = hashGameList(gameListData);

    const diff = diffGameLists(lastGameHash, gameListData);

    // Atualiza hash ANTES de notificar para não repetir
    lastGameHash = currentHash;

    if (diff) {
      await self.registration.showNotification(diff.title, {
        body: diff.body,
        icon: `${pollOrigin}/favicon.png`,
        badge: `${pollOrigin}/icon-192.png`,
        tag: 'thumbsync-list-update',
        renotify: true,
        vibrate: [200, 100, 200],
        data: { url: pollOrigin }
      });

      // Avisar todos os clientes abertos para tocar o som e mostrar o banner in-app
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      clients.forEach(client => {
        client.postMessage({ type: 'THUMBSYNC_CHANGE_DETECTED', title: diff.title, body: diff.body });
      });
    }
  } catch (err) {
    // Silencia erros de rede (servidor offline etc.)
  }
}

// Inicia o polling periódico em background (a cada 30s)
function startBgPolling(origin) {
  pollOrigin = origin;
  if (bgPollInterval) clearInterval(bgPollInterval);
  // Roda imediatamente para capturar baseline
  doBgPoll();
  bgPollInterval = setInterval(doBgPoll, 30000);
}

// ─── Instalação ─────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Erro preliminar de caching de assets:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ─── Ativação ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ─── Fetch (cache-first para assets, bypass para API) ───────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.includes('/api/') || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return new Response('Offline and not in cache', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

// ─── Mensagens vindas do app (React) ────────────────────────────────────────
self.addEventListener('message', (event) => {
  const { type, origin } = event.data || {};

  if (type === 'START_BG_POLL') {
    // O app manda a origin para o SW saber para onde apontar as requests
    startBgPolling(origin || self.location.origin);
  }

  if (type === 'STOP_BG_POLL') {
    if (bgPollInterval) {
      clearInterval(bgPollInterval);
      bgPollInterval = null;
    }
  }

  if (type === 'SET_BASELINE_HASH') {
    // Sincroniza o hash atual para não gerar falso positivo na primeira carga
    lastGameHash = event.data.hash || null;
  }
});

// ─── Clique na notificação nativa ───────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || self.location.origin;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Foca em uma aba já aberta se existir
      for (const client of clientList) {
        if (client.url.startsWith(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Abre uma nova aba
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
