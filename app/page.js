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

function CombinedLineChart({ history }) {
  const W = 800, H = 280, PAD = { top: 12, right: 12, bottom: 32, left: 44 };
  const inner = { w: W - PAD.left - PAD.right, h: H - PAD.top - PAD.bottom };
  const pts = history.slice(-50);
  if (pts.length < 2) return (
    <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: 11 }}>
      no data yet
    </div>
  );

  const series = [
    { key: 'temp', color: C.teal,  min: 0,  max: 50   },
    { key: 'hum',  color: C.blue,  min: 0,  max: 100  },
    { key: 'gas',  color: C.amber, min: 0,  max: 1500 },
    { key: 'hr',   color: C.green, min: 0,  max: 140  },
  ];

  const xStep = inner.w / (pts.length - 1);

  function toPath(key, min, max) {
    return pts.map((p, i) => {
      const v = p[key] ?? 0;
      const x = PAD.left + i * xStep;
      const y = PAD.top + inner.h - ((v - min) / (max - min)) * inner.h;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }

  const yTicks = [0, 25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 280, display: 'block' }}>
      {yTicks.map(pct => {
        const y = PAD.top + inner.h * (1 - pct / 100);
        return (
          <g key={pct}>
            <line x1={PAD.left} x2={PAD.left + inner.w} y1={y} y2={y} stroke={C.border} strokeWidth={0.5} />
            <text x={PAD.left - 4} y={y + 3.5} textAnchor="end" fontSize={8} fill={C.muted}>{pct}%</text>
          </g>
        );
      })}
      {pts.filter((_, i) => i % Math.max(1, Math.floor(pts.length / 6)) === 0).map((p, _, arr) => {
        const idx = pts.indexOf(p);
        const x = PAD.left + idx * xStep;
        return (
          <text key={idx} x={x} y={H - 4} textAnchor="middle" fontSize={8} fill={C.muted}>{p.t}</text>
        );
      })}
      {series.map(({ key, color, min, max }) => (
        <path key={key} d={toPath(key, min, max)} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
      ))}
      {series.map(({ key, color, min, max }) => {
        const last = pts[pts.length - 1];
        const v = last[key] ?? 0;
        const x = PAD.left + (pts.length - 1) * xStep;
        const y = PAD.top + inner.h - ((v - min) / (max - min)) * inner.h;
        return <circle key={key} cx={x} cy={y} r={3} fill={color} />;
      })}
    </svg>
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
                <div style={{ background: C.surface, border: `1px solid ${h.status === 'PANIC' ? C.red : h.status === 'ALARM' ? C.amber : C.border}`, borderRadius: 6, padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <AlertTriangle size={13} color={C.muted} strokeWidth={1.5} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: '.8px', textTransform: 'uppercase' }}>Alert</span>
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 400, color: h.status === 'PANIC' ? C.red : h.status === 'ALARM' ? C.amber : C.green }}>
                    {h.status === 'PANIC' || h.status === 'ALARM' ? 'ACTIVE' : 'CLEAR'}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{h.status === 'PANIC' ? 'panic triggered' : h.status === 'ALARM' ? 'alarm triggered' : 'all normal'}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>0=clear · &gt;0=panic · sensors=alarm</div>
                </div>
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
              
              {/* Combined Line Chart */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Activity size={13} color={C.muted} strokeWidth={1.5} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: '.8px', textTransform: 'uppercase' }}>Sensor History</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {[
                      { label: 'Temp °C',  color: C.teal  },
                      { label: 'Hum %',    color: C.blue  },
                      { label: 'Gas ppm',  color: C.amber },
                      { label: 'HR bpm',   color: C.green },
                    ].map(({ label, color }) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 18, height: 2, background: color, borderRadius: 1 }} />
                        <span style={{ fontSize: 10, color: C.muted }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <CombinedLineChart history={h.history || []} />
              </div>
              
              {/* GPS */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: 14, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={13} color={C.muted} strokeWidth={1.5} />
                    <span style={{ fontSize: 10, fontWeight: 600, color: C.muted, letterSpacing: '.8px', textTransform: 'uppercase' }}>GPS</span>
                  </div>
                  {h.lat !== 0 && h.lon !== 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: C.teal }}>
                        {h.lat.toFixed(6)}, {h.lon.toFixed(6)}
                      </span>
                      <a
                        href={`https://maps.google.com/?q=${h.lat},${h.lon}`}
                        target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 4, fontSize: 10, color: C.blue, border: `1px solid ${C.border}`, textDecoration: 'none' }}
                      >
                        <ExternalLink size={10} strokeWidth={1.5} /> Maps
                      </a>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: C.muted }}>GPS not connected</span>
                  )}
                </div>
                {h.lat !== 0 && h.lon !== 0 ? (
                  <iframe
                    key={`${h.lat}-${h.lon}`}
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${h.lon - 0.005},${h.lat - 0.005},${h.lon + 0.005},${h.lat + 0.005}&layer=mapnik&marker=${h.lat},${h.lon}`}
                    style={{ width: '100%', height: 220, border: 'none', borderRadius: 4, filter: 'invert(90%) hue-rotate(180deg)' }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ height: 220, borderRadius: 4, background: C.dim, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, border: `1px dashed ${C.border}` }}>
                    <MapPin size={28} color={C.border} strokeWidth={1} />
                    <span style={{ fontSize: 11, color: C.muted }}>Waiting for GPS fix...</span>
                    <span style={{ fontSize: 10, color: '#333' }}>lat: 0.000000 · lon: 0.000000</span>
                  </div>
                )}
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
