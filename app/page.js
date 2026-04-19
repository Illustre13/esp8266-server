'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  HardHat, Thermometer, Droplets, Wind, Heart,
  AlertTriangle, MapPin, ExternalLink, Plus, X,
  Circle, Trash2, Activity, Terminal, BookOpen,
} from 'lucide-react';

const C = {
  bg:      '#0f0f0f',
  surface: '#161616',
  border:  '#2a2a2a',
  text:    '#e4e4e4',
  muted:   '#555',
  dim:     '#222',
  green:   '#22c55e',
  amber:   '#f59e0b',
  red:     '#ef4444',
  blue:    '#3b82f6',
  teal:    '#14b8a6',
};

const stateColor = { ok: C.green, warn: C.amber, alarm: C.red, idle: C.muted };

function cardState(val, warnAt, alarmAt, reverse = false) {
  if (val == null) return 'idle';
  if (reverse) {
    if (val <= alarmAt) return 'alarm';
    if (val <= warnAt)  return 'warn';
  } else {
    if (val >= alarmAt) return 'alarm';
    if (val >= warnAt)  return 'warn';
  }
  return 'ok';
}

function MiniChart({ values, maxVal, color }) {
  if (!values?.length) return (
    <div style={{ height: 40, display: 'flex', alignItems: 'center', color: C.muted, fontSize: 11 }}>
      no data
    </div>
  );
  return (
    <div style={{ height: 40, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
      {values.slice(-20).map((v, i) => {
        const pct = Math.min(1, Math.max(0.04, (v || 0) / maxVal));
        return (
          <div key={i} style={{
            flex: 1,
            height: Math.round(pct * 40),
            background: color,
            opacity: 0.6,
            borderRadius: '1px 1px 0 0',
            transition: 'height .3s',
          }} />
        );
      })}
    </div>
  );
}

function MetricCard({ Icon, label, value, unit, limit, pct, state }) {
  const color = stateColor[state] || C.muted;
  const borderColor = state === 'alarm' ? C.red : state === 'warn' ? C.amber : C.border;
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${borderColor}`,
      borderRadius: 6,
      padding: 14,
      transition: 'border-color .3s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <Icon size={13} color={C.muted} strokeWidth={1.5} />
        <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: '.8px', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 400, color, lineHeight: 1 }}>
        {value ?? '--'}
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{unit}</div>
      <div style={{ fontSize: 10, color: C.border, marginTop: 2 }}>{limit}</div>
      <div style={{ height: 2, background: C.dim, borderRadius: 1, marginTop: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct || 0}%`, background: color, transition: 'width .4s, background .3s' }} />
      </div>
    </div>
  );
}

export default function Page() {
  const [helmets,   setHelmets]   = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [serverOk,  setServerOk]  = useState(false);
  const [clock,     setClock]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalId,   setModalId]   = useState('');
  const [log,       setLog]       = useState([{ msg: 'Dashboard connected', cls: 'info', t: new Date().toLocaleTimeString() }]);
  const prevAlertRef  = useRef({});
  const prevOnlineRef = useRef({});

  function addLog(msg, cls) {
    setLog(prev => [...prev.slice(-49), { msg, cls, t: new Date().toLocaleTimeString() }]);
  }

  useEffect(() => {
    const iv = setInterval(() => setClock(new Date().toLocaleTimeString('en-US', { hour12: false })), 1000);
    return () => clearInterval(iv);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const r    = await fetch('/api/helmets');
      const list = await r.json();
      setHelmets(list);
      setServerOk(true);
      setSelected(prev => {
        if (!prev) return prev;
        return list.find(h => h.id === prev.id) || prev;
      });
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
    if (!confirm(`Remove ${selected.id}?`)) return;
    await fetch(`/api/helmets/${selected.id}`, { method: 'DELETE' });
    addLog(`${selected.id} removed`, 'warn');
    setSelected(null);
    fetchAll();
  }

  function confirmAdd() {
    if (!modalId.trim()) return;
    setShowModal(false);
    addLog(`${modalId} pre-registered`, 'info');
    setModalId('');
    fetchAll();
  }

  const h = selected;
  const tempState = h ? cardState(h.temp, 32,  35)          : 'idle';
  const humState  = h ? cardState(h.hum,  80,  86)          : 'idle';
  const gasState  = h ? cardState(h.gas,  800, 1000)        : 'idle';
  const hrState   = h && h.hr > 0 ? cardState(h.hr, 65, 60, true) : 'idle';

  const statusStyle = (item) => {
    if (!item.online) return { color: C.muted, label: 'OFFLINE' };
    if (item.status === 'PANIC' || item.status === 'ALARM') return { color: C.red,   label: item.status };
    if (item.status === 'WARNING') return { color: C.amber, label: 'WARN' };
    return { color: C.green, label: 'OK' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.text, background: C.bg }}>

      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 52, flexShrink: 0, background: C.surface, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <HardHat size={18} color={C.amber} strokeWidth={1.5} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>Helmet Monitor</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted }}>
            <Circle size={7} fill={serverOk ? C.green : C.red} color={serverOk ? C.green : C.red} />
            {serverOk ? 'online' : 'offline'}
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.muted }}>{clock}</span>
          <button
            onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 4, background: 'transparent', color: C.text, border: `1px solid ${C.border}`, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <Plus size={13} strokeWidth={1.5} /> Add
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <div style={{ width: 240, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: '.8px', textTransform: 'uppercase' }}>Helmets</span>
            <span style={{ fontSize: 10, color: C.muted }}>{helmets.length}</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {helmets.length === 0 ? (
              <div style={{ padding: '20px 10px', color: C.muted, fontSize: 12, textAlign: 'center', lineHeight: 1.6 }}>
                No helmets yet.
              </div>
            ) : helmets.map(item => {
              const st = statusStyle(item);
              const isActive = h && h.id === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => selectHelmet(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '9px 10px', borderRadius: 5, cursor: 'pointer', marginBottom: 2,
                    border: `1px solid ${isActive ? C.blue : 'transparent'}`,
                    background: isActive ? '#1a2233' : 'transparent',
                    transition: 'background .1s',
                  }}
                >
                  <HardHat size={15} color={st.color} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.id}</div>
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{item.online ? item.lastSeen : 'no signal'}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 600, color: st.color, letterSpacing: '.4px', flexShrink: 0 }}>{st.label}</span>
                </div>
              );
            })}
          </div>

          <div style={{ padding: '10px 12px', borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.5px' }}>POST endpoint</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: C.muted, background: C.dim, border: `1px solid ${C.border}`, borderRadius: 3, padding: '5px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {typeof window !== 'undefined' ? window.location.origin : ''}/api/data
            </div>
          </div>
        </div>

        {/* Detail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {!h ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: C.muted }}>
              <HardHat size={36} strokeWidth={1} color={C.border} />
              <div style={{ fontSize: 14, color: C.muted }}>Select a helmet</div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 500 }}>{h.id}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                    {h.online ? `last seen ${h.lastSeen}` : 'offline — no recent data'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: h.online ? C.green : C.muted }}>
                    <Circle size={7} fill={h.online ? C.green : C.muted} color={h.online ? C.green : C.muted} />
                    {h.online ? 'online' : 'offline'}
                  </div>
                  <button
                    onClick={removeHelmet}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', color: C.red, border: `1px solid ${C.border}` }}
                  >
                    <Trash2 size={12} strokeWidth={1.5} /> Remove
                  </button>
                </div>
              </div>

              {/* Alert banner */}
              {(h.alert === 1 || h.status === 'PANIC') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 5, marginBottom: 18, fontSize: 12, fontWeight: 600, border: `1px solid ${C.red}`, color: C.red }}>
                  <AlertTriangle size={14} strokeWidth={2} />
                  PANIC / ALERT TRIGGERED — IMMEDIATE RESPONSE REQUIRED
                </div>
              )}

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))', gap: 10, marginBottom: 20 }}>
                <MetricCard Icon={Thermometer} label="Temp"       value={h.temp?.toFixed(1)} unit="°C"  limit="warn 32 · alarm 35"   pct={Math.min(100,(h.temp/50)*100)}         state={tempState} />
                <MetricCard Icon={Droplets}    label="Humidity"   value={h.hum?.toFixed(1)}  unit="%"   limit="warn 80 · alarm 86"    pct={h.hum}                                 state={humState} />
                <MetricCard Icon={Wind}        label="Gas"        value={h.gas ? Math.round(h.gas) : '--'} unit="ppm" limit="warn 800 · alarm 1000" pct={Math.min(100,(h.gas/1500)*100)} state={gasState} />
                <MetricCard Icon={Heart}       label="Heart Rate" value={h.hr || '--'}        unit="bpm" limit="normal 60–100"          pct={h.hr ? Math.min(100,((h.hr-40)/100)*100) : 0} state={hrState} />
                <div style={{ background: C.surface, border: `1px solid ${h.alert === 1 ? C.red : C.border}`, borderRadius: 6, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <AlertTriangle size={13} color={C.muted} strokeWidth={1.5} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: '.8px', textTransform: 'uppercase' }}>Alert</span>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 400, color: h.alert === 1 ? C.red : C.green }}>
                    {h.alert === 1 ? 'ACTIVE' : 'CLEAR'}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{h.alert === 1 ? 'panic triggered' : 'all normal'}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>0=clear · 1=panic</div>
                </div>
              </div>

              {/* GPS */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MapPin size={14} color={C.muted} strokeWidth={1.5} />
                  <div>
                    <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>GPS</div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: C.teal }}>
                      {(h.lat && h.lon && (h.lat !== 0 || h.lon !== 0))
                        ? `${h.lat?.toFixed(6)}, ${h.lon?.toFixed(6)}`
                        : 'no fix'}
                    </div>
                  </div>
                </div>
                {h.lat !== 0 && h.lon !== 0 && (
                  <a
                    href={`https://maps.google.com/?q=${h.lat},${h.lon}`}
                    target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 4, fontSize: 11, color: C.blue, border: `1px solid ${C.border}`, textDecoration: 'none' }}
                  >
                    <ExternalLink size={11} strokeWidth={1.5} /> Maps
                  </a>
                )}
              </div>

              {/* Charts */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Activity size={13} color={C.muted} strokeWidth={1.5} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: '.8px', textTransform: 'uppercase' }}>Recent Readings</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 10 }}>
                  {[
                    { label: 'Temperature', key: 'temp', max: 50,   color: C.teal  },
                    { label: 'Gas ppm',     key: 'gas',  max: 1500, color: C.amber },
                    { label: 'Humidity',    key: 'hum',  max: 100,  color: C.blue  },
                    { label: 'Heart Rate',  key: 'hr',   max: 140,  color: C.green },
                  ].map(({ label, key, max, color }) => (
                    <div key={key} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14 }}>
                      <div style={{ fontSize: 10, color: C.muted, marginBottom: 8 }}>{label}</div>
                      <MiniChart values={h.history?.map(r => r[key]) || []} maxVal={max} color={color} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Log */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Terminal size={13} color={C.muted} strokeWidth={1.5} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: '.8px', textTransform: 'uppercase' }}>Event Log</span>
                </div>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 14px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, maxHeight: 140, overflowY: 'auto', lineHeight: 1.9 }}>
                  {log.map((l, i) => (
                    <div key={i} style={{ color: l.cls === 'err' ? C.red : l.cls === 'ok' ? C.green : l.cls === 'warn' ? C.amber : C.blue }}>
                      [{l.t}] {l.msg}
                    </div>
                  ))}
                </div>
              </div>

              {/* API Reference */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <BookOpen size={13} color={C.muted} strokeWidth={1.5} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: '.8px', textTransform: 'uppercase' }}>API Reference</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px,1fr))', gap: 8 }}>
                  {[
                    { method: 'POST',   color: C.blue,  path: '/api/data',               desc: 'ESP8266 posts sensor data. Body: { id, temp, hum, gas, hr, alert, lat, lon }' },
                    { method: 'GET',    color: C.green, path: '/api/helmets',             desc: 'All helmets with latest readings and online status' },
                    { method: 'GET',    color: C.green, path: '/api/helmets/:id',         desc: 'Single helmet with full reading history' },
                    { method: 'GET',    color: C.green, path: '/api/helmets/:id/history', desc: 'History array only (last 50 readings)' },
                    { method: 'DELETE', color: C.red,   path: '/api/helmets/:id',         desc: 'Remove a helmet from the dashboard' },
                    { method: 'GET',    color: C.green, path: '/api/status',              desc: 'Server health — uptime, count, timestamp' },
                  ].map((api, i) => (
                    <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 5, padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, color: api.color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.5px' }}>{api.method}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.text }}>{api.path}</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>{api.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 24, width: 340 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>Add Helmet</span>
              <button onClick={() => { setShowModal(false); setModalId(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: 0 }}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
              Pre-register a helmet ID. It will appear live once the ESP8266 starts posting data.
            </div>
            <label style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: '.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Helmet ID</label>
            <input
              value={modalId}
              onChange={e => setModalId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmAdd()}
              placeholder="e.g. Helmet-1"
              autoFocus
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 4, background: C.dim, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", marginBottom: 16, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowModal(false); setModalId(''); }} style={{ padding: '6px 14px', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', color: C.muted, border: `1px solid ${C.border}` }}>Cancel</button>
              <button onClick={confirmAdd} style={{ padding: '6px 14px', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, background: C.blue, color: '#fff', border: 'none' }}>Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
