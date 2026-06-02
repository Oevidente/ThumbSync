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
    
    // Envelope 1
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.40);
    
    // Envelope 2
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.08, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.45);
    
    osc2.start(now + 0.04);
    osc2.stop(now + 0.50);
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

// Trigger browser native push notification
export function triggerNativeNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: './favicon.png',
        tag: 'thumbsync-list-update',
        renotify: true
      } as any);
      return true;
    } catch (err) {
      console.warn("Browser native Notification constructor failed (common inside non-top-level iframe):", err);
      return false;
    }
  }
  return false;
}
