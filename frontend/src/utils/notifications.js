// Browser push notification & alert dispatcher for FloodGuard

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.warn('Error requesting notification permission:', err);
    return Notification.permission;
  }
}

export function sendCriticalPushNotification(zoneId, { waterLevel, trend, probability }) {
  try {
    // 1. Native browser push notification
    if (isNotificationSupported() && Notification.permission === 'granted') {
      const title = `🚨 CRITICAL FLOOD ALERT — Zone ${zoneId}`;
      const trendVelocity = Number(trend || 0) / 3600;
      const body = `Water Level: ${waterLevel ? Number(waterLevel).toFixed(1) : '—'} cm | Trend: ${trendVelocity > 0 ? `+${trendVelocity.toFixed(2)}` : trendVelocity.toFixed(2)} cm/s. Immediate safety protocols active!`;

      const notif = new Notification(title, {
        body,
        tag: `floodguard-critical-${zoneId}`,
        renotify: true,
        requireInteraction: true,
        badge: '/favicon.ico',
        icon: '/favicon.ico',
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }

    // 2. Mobile device haptic vibration
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([400, 150, 400, 150, 600]);
    }
  } catch (err) {
    console.warn('Failed to dispatch critical notification:', err);
  }
}
