/**
 * Premium sound synthesizer and Web Notifications controller for ThumbSync
 * Follows macOS/iOS premium sound and interaction guidelines for 2026.
 */

// Play a subtle, premium Apple-style dual-tone "plim" chime sound
export function playChimeSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;

    // Primary High-pitched Glass Chime (G#5 -> C6)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(830.61, now); // G#5
    osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.12); // C6 transition

    // Complementary Higher Chime Harmony (E6) starting slightly later
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now + 0.04); // E6

    // Terceiro toque suave (C7) para riqueza harmônica
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(2093.00, now + 0.08); // C7

    // Envelope 1 — volume aumentado para 0.85
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.85, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.50);

    // Envelope 2 — volume aumentado para 0.65
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.65, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    // Envelope 3 — toque de reforço suave
    gain3.gain.setValueAtTime(0, now);
    gain3.gain.linearRampToValueAtTime(0.40, now + 0.09);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc3.connect(gain3);
    gain3.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.55);

    osc2.start(now + 0.04);
    osc2.stop(now + 0.60);

    osc3.start(now + 0.08);
    osc3.stop(now + 0.50);
  } catch (err) {
    console.warn("Web Audio chime synthesis blocked or not supported:", err);
  }
}

// Check notification compatibility and state
export function getNotificationPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

// Request permission natively and return the result
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn("Failed to request notification permission:", err);
    return Notification.permission;
  }
}

// Trigger browser native push notification (via SW para garantir entrega mesmo em background)
export async function triggerNativeNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration) {
          await registration.showNotification(title, {
            body,
            icon: '/favicon.png',
            badge: '/icon-192.png',
            tag: 'thumbsync-list-update',
            renotify: true,
            vibrate: [200, 100, 200]
          } as any);
          return true;
        }
      }

      // Fallback direto
      new Notification(title, {
        body,
        icon: '/favicon.png',
        tag: 'thumbsync-list-update',
        renotify: true,
      } as any);
      return true;
    } catch (err) {
      console.warn("Browser native Notification failed:", err);
      try {
        new Notification(title, { body, icon: '/favicon.png' });
        return true;
      } catch (e) {
        return false;
      }
    }
  }
  return false;
}

/**
 * Instrui o Service Worker a iniciar polling em background.
 * Deve ser chamado após a permissão de notificação ser concedida.
 * O SW continuará fazendo polling mesmo com a aba fechada/em background.
 */
export async function startSwBackgroundPolling(hash: string | null = null) {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sw = registration.active;
    if (!sw) return;

    // Passa o hash atual da lista para o SW não gerar falso positivo na primeira carga
    if (hash !== null) {
      sw.postMessage({ type: 'SET_BASELINE_HASH', hash });
    }

    // Manda a origin para o SW saber qual URL usar para o fetch
    sw.postMessage({
      type: 'START_BG_POLL',
      origin: window.location.origin
    });
  } catch (err) {
    console.warn('Falha ao iniciar polling em background no SW:', err);
  }
}
