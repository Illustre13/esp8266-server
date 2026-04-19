'use client';
// app/page.js
import { useState, useEffect, useCallback, useRef } from 'react';

// ── CSS-in-JS tokens ────────────────────────────────
const T = {
  bg:       '#0A0E17',
  surface:  '#111827',
  surface2: '#1A2234',
  border:   '#1E2D45',
  border2:  '#2A3F5F',
  text:     '#E2E8F0',
  muted:    '#64748B',
  amber:    '#F59E0B',
  amberDim: '#78350F',
  green:    '#10B981',
  greenDim: '#064E3B',
  red:      '#EF4444',
  redDim:   '#7F1D1D',
  blue:     '#3B82F6',
  blueDim:  '#1E3A5F',
  teal:     '#06B6D4',
};

// ── Threshold helpers ───────────────────────────────
function cardState(val, warnAt, alarmAt, reverse = false) {
  if (val === undefined || val === null) return 'idle';
  if (reverse) {
    if (val <= alarmAt) return 'alarm';
    if (val <= warnAt)  return 'warn';
  } else {
    if (val >= alarmAt) return 'alarm';
    if (val >= warnAt)  return 'warn';
  }
  return 'ok';
}

const stateColor = { ok: T.green, warn: T.amber, alarm: T.red, idle: T.muted };

// ── Tiny bar chart ──────────────────────────────────
function MiniChart({ values, maxVal, color }) {
  if (!values || values.length === 0) return (
    <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.muted, fontSize: 11 }}>
      no history yet
    </div>
  );
  return (
    <div style={{ height: 48, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
      {values.slice(-20).map((v, i) => {
        const pct = Math.min(1, Math.max(0.04, (v || 0) / maxVal));
        return (
          <div key={i} style={{
            flex: 1, borderRadius: '2px 2px 0 0',
            height: Math.round(pct * 48),
            background: color, opacity: 0.75,
            transition: 'height .3s',
          }} />
        );
      })}
    </div>
  );
}

// ── Metric card ─────────────────────────────────────
function MetricCard({ icon, label, value, display, unit, limit, pct, state }) {
  const color = stateColor[state] || T.muted;
  const borderColor = state === 'alarm' ? T.red : state === 'warn' ? T.amber : T.border;
  const shadow = state === 'alarm' ? `0 0 14px rgba(239,68,68,.2)` : 'none';
  return (
    <div style={{
      background: T.surface, border: `1px solid ${borderColor}`,
      borderRadius: 10, padding: 16, boxShadow: shadow,
      transition: 'border-color .3s, box-shadow .3s',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{icon}</span>{label}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 32, fontWeight: 500, color, lineHeight: 1 }}>
        {display ?? '--'}
      </div>
      <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{unit}</div>
      <div style={{ fontSize: 10, color: T.border2, marginTop: 3 }}>{limit}</div>
      <div style={{ height: 3, background: T.border, borderRadius: 2, marginTop: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 2, width: `${pct || 0}%`, background: color, transition: 'width .4s, background .3s' }} />
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────
export default function Page() {
  const [helmets,    setHelmets]    = useState([]);
  const [selected,   setSelected]   = useState(null);  // helmet object
  const [serverOk,   setServerOk]   = useState(false);
  const [clock,      setClock]      = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [modalId,    setModalId]    = useState('');
  const [log,        setLog]        = useState([{ msg: 'Dashboard connected', cls: 'info', t: new Date().toLocaleTimeString() }]);
  const prevAlertRef  = useRef({});
  const prevOnlineRef = useRef({});

  function addLog(msg, cls) {
    setLog(prev => [...prev.slice(-49), { msg, cls, t: new Date().toLocaleTimeString() }]);
  }

  // clock
  useEffect(() => {
    const iv = setInterval(() => setClock(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
    return () => clearInterval(iv);
  }, []);

  // poll
  const fetchAll = useCallback(async () => {
    try {
      const r    = await fetch('/api/helmets');
      const list = await r.json();
      setHelmets(list);
      setServerOk(true);

      // update selected if open
      setSelected(prev => {
        if (!prev) return prev;
        const fresh = list.find(h => h.id === prev.id);
        return fresh || prev;
      });

      // check alerts + online changes
      list.forEach(h => {
        const wasAlert  = prevAlertRef.current[h.id];
        const wasOnline = prevOnlineRef.current[h.id];
        if (h.alert === 1 && !wasAlert)  addLog(`ALERT triggered — ${h.id}`, 'err');
        if (!h.alert && wasAlert)         addLog(`Alert cleared — ${h.id}`, 'ok');
        if (wasOnline !== undefined && wasOnline !== h.online) {
          addLog(`${h.id} ${h.online ? 'came online' : 'went offline'}`, h.online ? 'ok' : 'warn');
        }
        prevAlertRef.current[h.id]  = h.alert;
        prevOnlineRef.current[h.id] = h.online;
      });
    } catch {
      setServerOk(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 3000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  async function selectHelmet(id) {
    try {
      const r = await fetch(`/api/helmets/${id}`);
      if (r.ok) setSelected(await r.json());
    } catch { /* use list data */ }
  }

  async function removeHelmet() {
    if (!selected) return;
    if (!confirm(`Remove ${selected.id} from dashboard?`)) return;
    await fetch(`/api/helmets/${selected.id}`, { method: 'DELETE' });
    addLog(`${selected.id} removed`, 'warn');
    setSelected(null);
    fetchAll();
  }

  function confirmAdd() {
    if (!modalId.trim()) return;
    setShowModal(false);
    addLog(`${modalId} pre-registered — waiting for data`, 'info');
    setModalId('');
    fetchAll();
  }

  const h = selected;

  // metric helpers for selected helmet
  const tempState = h ? cardState(h.temp, 32,  35,   false) : 'idle';
  const humState  = h ? cardState(h.hum,  80,  86,   false) : 'idle';
  const gasState  = h ? cardState(h.gas,  800, 1000, false) : 'idle';
  const hrState   = h && h.hr > 0 ? cardState(h.hr, 65, 60, true) : 'idle';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', sans-serif", fontSize: 14 }}>

      {/* ── Topbar ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, flexShrink: 0, background: T.surface, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: T.amber, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⛑</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Helmet Control Room</div>
            <div style={{ fontSize: 11, color: T.muted }}>Smart Safety Monitoring System</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.muted }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: serverOk ? T.green : T.red, boxShadow: serverOk ? `0 0 6px ${T.green}` : 'none' }} />
            {serverOk ? 'Server online' : 'Server offline'}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: T.muted }}>{clock}</div>
          <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, background: T.blueDim, color: T.blue, border: `1px solid ${T.blue}`, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Add Helmet
          </button>
        </div>
      </div>

      {/* ── Body ──────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 260, flexShrink: 0, background: T.surface, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${T.border}`, fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: '.8px', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            Helmets
            <span style={{ background: T.surface2, border: `1px solid ${T.border2}`, borderRadius: 10, padding: '1px 7px', fontSize: 11, color: T.text }}>{helmets.length}</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {helmets.length === 0 ? (
              <div style={{ padding: '20px 12px', color: T.muted, fontSize: 12, textAlign: 'center' }}>No helmets yet.<br />Add one or wait for ESP8266 data.</div>
            ) : helmets.map(item => {
              const st = item.online
                ? (item.status === 'PANIC'   ? { bg: T.redDim,  color: T.red,   label: 'PANIC'   }
                 : item.status === 'ALARM'   ? { bg: T.redDim,  color: T.red,   label: 'ALARM'   }
                 : item.status === 'WARNING' ? { bg: T.amberDim, color: T.amber, label: 'WARN'   }
                 :                             { bg: T.greenDim, color: T.green, label: 'OK'      })
                : { bg: T.surface2, color: T.muted, label: 'OFFLINE' };
              const isActive = h && h.id === item.id;
              return (
                <div key={item.id} onClick={() => selectHelmet(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, border: `1px solid ${isActive ? T.blue : 'transparent'}`, background: isActive ? T.blueDim : 'transparent', transition: 'all .15s' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, background: T.surface2, border: `1px solid ${T.border2}`, flexShrink: 0 }}>⛑</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.id}</div>
                    <div style={{ fontSize: 11, color: T.muted, marginTop: 1 }}>{item.online ? `Last: ${item.lastSeen}` : 'No signal'}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 4, letterSpacing: '.5px', flexShrink: 0, background: st.bg, color: st.color, textTransform: 'uppercase' }}>{st.label}</span>
                </div>
              );
            })}
          </div>

          <div style={{ padding: 12, borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 10, color: T.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>POST data to</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: T.muted, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 4, padding: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {typeof window !== 'undefined' ? window.location.origin : ''}/api/data
            </div>
          </div>
        </div>

        {/* Detail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {!h ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: T.muted }}>
              <div style={{ fontSize: 56, opacity: .2 }}>⛑</div>
              <div style={{ fontSize: 16, fontWeight: 500, color: T.text }}>No helmet selected</div>
              <div style={{ fontSize: 13 }}>Select a helmet from the sidebar or add one</div>
            </div>
          ) : (
            <>
              {/* header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{h.id}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>
                    {h.online ? `Live · last seen ${h.lastSeen}` : 'Offline — no recent data'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, background: h.online ? T.greenDim : T.surface2, color: h.online ? T.green : T.muted, border: `1px solid ${h.online ? T.green : T.border}` }}>
                    <span>●</span> {h.online ? 'Online' : 'Offline'}
                  </div>
                  <button onClick={removeHelmet} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', background: T.redDim, color: T.red, border: `1px solid ${T.red}` }}>
                    ✕ Remove
                  </button>
                </div>
              </div>

              {/* alert banner */}
              {(h.alert === 1 || h.status === 'PANIC') && (
                <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, fontWeight: 600, textAlign: 'center', letterSpacing: '.5px', border: `1px solid ${T.red}`, background: T.redDim, color: '#fca5a5' }}>
                  ⚠ PANIC / ALERT TRIGGERED — IMMEDIATE RESPONSE REQUIRED
                </div>
              )}

              {/* metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
                <MetricCard icon="🌡" label="Temperature" display={h.temp?.toFixed(1)} unit="°C" limit="warn >32 · alarm >35" pct={Math.min(100,(h.temp/50)*100)} state={tempState} />
                <MetricCard icon="💧" label="Humidity"    display={h.hum?.toFixed(1)}  unit="%" limit="warn >80 · alarm >86" pct={h.hum}  state={humState} />
                <MetricCard icon="💨" label="Gas (ppm)"   display={h.gas ? Math.round(h.gas) : '--'} unit="ppm" limit="warn >800 · alarm >1000" pct={Math.min(100,(h.gas/1500)*100)} state={gasState} />
                <MetricCard icon="❤️" label="Heart Rate"  display={h.hr || '--'} unit="bpm" limit="normal 60–100" pct={h.hr ? Math.min(100,((h.hr-40)/100)*100) : 0} state={hrState} />
                <div style={{ background: T.surface, border: `1px solid ${h.alert === 1 ? T.red : T.border}`, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: T.muted, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 10 }}>🔴 Alert / Panic</div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 500, color: h.alert === 1 ? T.red : T.green }}>
                    {h.alert === 1 ? 'ACTIVE' : 'CLEAR'}
                  </div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{h.alert === 1 ? 'panic triggered' : 'all normal'}</div>
                  <div style={{ fontSize: 10, color: T.border2, marginTop: 3 }}>AL field · 0=clear · 1=panic</div>
                </div>
              </div>

              {/* GPS */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: T.blueDim, border: `1px solid ${T.blue}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📍</div>
                  <div>
                    <div style={{ fontSize: 11, color: T.muted, marginBottom: 3 }}>GPS Location</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 500, color: T.teal }}>
                      {(h.lat && h.lon && (h.lat !== 0 || h.lon !== 0)) ? `${h.lat?.toFixed(6)}, ${h.lon?.toFixed(6)}` : 'No GPS fix yet'}
                    </div>
                  </div>
                </div>
                {h.lat !== 0 && h.lon !== 0 && (
                  <a href={`https://maps.google.com/?q=${h.lat},${h.lon}`} target="_blank" rel="noreferrer"
                    style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: T.blueDim, color: T.blue, border: `1px solid ${T.blue}`, textDecoration: 'none' }}>
                    ↗ Google Maps
                  </a>
                )}
              </div>

              {/* charts */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 12 }}>Recent Readings</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 12 }}>
                  {[
                    { label: 'Temperature', key: 'temp', max: 50,   color: T.teal  },
                    { label: 'Gas ppm',     key: 'gas',  max: 1500, color: T.amber },
                    { label: 'Humidity',    key: 'hum',  max: 100,  color: T.blue  },
                    { label: 'Heart Rate',  key: 'hr',   max: 140,  color: T.green },
                  ].map(({ label, key, max, color }) => (
                    <div key={key} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>{label} (last 20)</div>
                      <MiniChart values={h.history?.map(r => r[key]) || []} maxVal={max} color={color} />
                    </div>
                  ))}
                </div>
              </div>

              {/* log */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 12 }}>Event Log</div>
                <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, maxHeight: 160, overflowY: 'auto', lineHeight: 2 }}>
                  {log.map((l, i) => (
                    <div key={i} style={{ color: l.cls === 'err' ? T.red : l.cls === 'ok' ? T.green : l.cls === 'warn' ? T.amber : T.blue }}>
                      [{l.t}] {l.msg}
                    </div>
                  ))}
                </div>
              </div>

              {/* API reference */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.muted, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 12 }}>REST API Reference</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 10 }}>
                  {[
                    { method: 'POST',   color: T.blue,  bg: T.blueDim,  path: '/api/data',                   desc: 'ESP8266 posts sensor data here. Body: { id, temp, hum, gas, hr, alert, lat, lon }' },
                    { method: 'GET',    color: T.green, bg: T.greenDim, path: '/api/helmets',                 desc: 'Returns all helmets with latest readings and online status' },
                    { method: 'GET',    color: T.green, bg: T.greenDim, path: '/api/helmets/:id',             desc: 'Returns one helmet with full reading history' },
                    { method: 'GET',    color: T.green, bg: T.greenDim, path: '/api/helmets/:id/history',     desc: 'Returns just the history array (last 50 readings)' },
                    { method: 'DELETE', color: T.red,   bg: T.redDim,   path: '/api/helmets/:id',             desc: 'Removes a helmet from the dashboard' },
                    { method: 'GET',    color: T.green, bg: T.greenDim, path: '/api/status',                  desc: 'Server health check — uptime, helmet count, timestamp' },
                  ].map((api, i) => (
                    <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '12px 14px' }}>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, marginRight: 8, fontFamily: "'JetBrains Mono', monospace", background: api.bg, color: api.color }}>{api.method}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{api.path}</span>
                      </div>
                      <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>{api.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Add helmet modal ───────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border2}`, borderRadius: 12, padding: 24, width: 360, boxShadow: '0 20px 60px rgba(0,0,0,.5)' }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Add Helmet</div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 20 }}>
              Pre-register a helmet ID. It will appear live once the ESP8266 starts posting data.
            </div>
            <label style={{ fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: '.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Helmet ID</label>
            <input
              value={modalId}
              onChange={e => setModalId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmAdd()}
              placeholder="e.g. Helmet-1"
              autoFocus
              style={{ width: '100%', padding: '9px 12px', borderRadius: 6, background: T.surface2, border: `1px solid ${T.border2}`, color: T.text, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", marginBottom: 20, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowModal(false); setModalId(''); }} style={{ padding: '7px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', background: T.surface2, color: T.muted, border: `1px solid ${T.border}` }}>Cancel</button>
              <button onClick={confirmAdd} style={{ padding: '7px 16px', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, background: T.blue, color: '#fff', border: 'none' }}>Add Helmet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
