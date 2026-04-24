// lib/store.js
import clientPromise from '@/lib/mongodb';

const MAX_HISTORY = 50;

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

async function getDb() {
  const client = await clientPromise;
  return client.db('helmet_db');
}

export async function upsertHelmet(raw) {
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

  const historyPoint = {
    t:    entry.lastSeen,
    temp: entry.temp,
    hum:  entry.hum,
    gas:  entry.gas,
    hr:   entry.hr,
  };

  // Update in-memory store
  const prev = helmets[id];
  helmets[id] = {
    ...entry,
    history: prev ? prev.history : [],
  };
  helmets[id].history.push(historyPoint);
  if (helmets[id].history.length > MAX_HISTORY) {
    helmets[id].history.shift();
  }

  // Persist to MongoDB
  try {
    const db = await getDb();
    // Upsert latest state
    await db.collection('helmets').updateOne(
      { id },
      { $set: entry },
      { upsert: true }
    );
    // Append to readings history
    await db.collection('readings').insertOne({ ...entry, _id: undefined });
  } catch (err) {
    console.error('[MongoDB] write error:', err.message);
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
