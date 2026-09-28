/**
 * FloodGuard API Client
 */

// Allow override via localStorage or environment, defaulting to window.location.origin (via Vite proxy) or direct IP
export const getBaseUrl = () => {
  const custom = localStorage.getItem('floodguard_api_url');
  if (custom) return custom.replace(/\/+$/, '');
  // Default to relative (Vite proxy)
  return '';
};

export const setBaseUrl = (url) => {
  if (!url) {
    localStorage.removeItem('floodguard_api_url');
  } else {
    localStorage.setItem('floodguard_api_url', url.replace(/\/+$/, ''));
  }
};

export async function fetchHealth() {
  const base = getBaseUrl();
  const res = await fetch(`${base}/health`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return await res.json();
}

export async function fetchZones() {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/zones`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch zones failed: ${res.statusText}`);
  return await res.json();
}

export async function fetchLatestReading(zoneId = 'Z001') {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/zones/${zoneId}/latest`, { cache: 'no-store' });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Fetch latest reading failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchReadingHistory(zoneId = 'Z001', limit = 50) {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/zones/${zoneId}/history?limit=${limit}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch history failed: ${res.statusText}`);
  return await res.json();
}

export async function fetchMap() {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/map`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetch map failed: ${res.statusText}`);
  return await res.json();
}

export async function postSensorReading(payload) {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/readings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Ingest reading failed (${res.status}): ${errorText}`);
  }
  return await res.json();
}
