// lib/store.js
// ─────────────────────────────────────────────────
// In-memory helmet store shared across API routes.
// Next.js keeps module scope alive between requests
// in the same server process, so this works perfectly
// for a single-instance deployment on Vercel/Railway.
// ─────────────────────────────────────────────────

const MAX_HISTORY = 50;

// helmets map: { [id]: HelmetRecord }
if (!global._helmets) global._helmets = {};
const helmets = global._helmets;

export const THRESHOLDS = {
  temp: { warn: 32,  alarm: 35   },
  hum:  { warn: 80,  alarm: 86   },
  gas:  { warn: 800, alarm: 1000 },
  hr:   { warnLow: 65, alarmLow: 60, warnHigh: 95, alarmHigh: 100 },
};

export function getStatus(data) {
  const { temp, hum, gas, hr, alert } = data;
  if (alert > 0) return 'PANIC';
  if (
    temp >= THRESHOLDS.temp.alarm ||
    hum  >= THRESHOLDS.hum.alarm  ||
    gas  >= THRESHOLDS.gas.alarm  ||
    (hr > 0 && (hr <= THRESHOLDS.hr.alarmLow || hr >= THRESHOLDS.hr.alarmHigh))
  ) return 'ALARM';
  if (
    temp >= THRESHOLDS.temp.warn ||
    hum  >= THRESHOLDS.hum.warn  ||
    gas  >= THRESHOLDS.gas.warn  ||
    (hr > 0 && (hr <= THRESHOLDS.hr.warnLow || hr >= THRESHOLDS.hr.warnHigh))
  ) return 'WARNING';
  return 'OK';
}

export function upsertHelmet(raw) {
  const id     = raw.id;
  const now    = new Date();
  const status = getStatus(raw);

  const entry = {
    id,
    temp:      parseFloat(raw.temp)  || 0,
    hum:       parseFloat(raw.hum)   || 0,
    gas:       parseFloat(raw.gas)   || 0,
    hr:        parseInt(raw.hr)      || 0,
    alert:     parseInt(raw.alert)   || 0,
    lat:       parseFloat(raw.lat)   || 0,
    lon:       parseFloat(raw.lon)   || 0,
    status,
    timestamp: now.toISOString(),
    lastSeen:  now.toLocaleTimeString('en-US', { hour12: false }),
  };

  const prev = helmets[id];
  helmets[id] = {
    ...entry,
    history: prev ? prev.history : [],
  };

  helmets[id].history.push({
    t:    entry.lastSeen,
    temp: entry.temp,
    hum:  entry.hum,
    gas:  entry.gas,
    hr:   entry.hr,
  });

  if (helmets[id].history.length > MAX_HISTORY) {
    helmets[id].history.shift();
  }

  return { ...helmets[id] };
}

export function getAllHelmets() {
  const now = Date.now();
  return Object.values(helmets).map(h => ({
    ...h,
    online: (now - new Date(h.timestamp).getTime()) < 15000,
  }));
}

export function getHelmet(id) {
  const h = helmets[id];
  if (!h) return null;
  const online = (Date.now() - new Date(h.timestamp).getTime()) < 15000;
  return { ...h, online };
}

export function deleteHelmet(id) {
  if (!helmets[id]) return false;
  delete helmets[id];
  return true;
}
