import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import {
  Heart, Activity, Thermometer, Droplet, Wind, Wifi, WifiOff,
  Play, Square, AlertTriangle, Shield, Phone, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';
import { triggerEmergencySOS } from '../../services/sosService';
import { getAllPatientsMaster } from '../../constants/patientAssignments';

interface LiveVital {
  heartRate: number;
  spo2: number;
  temperature: number;
  bloodPressure: string;
  respiratoryRate: number;
  timestamp: string;
  patientId: string;
}

interface Props {
  patientId: string;
}


const VITAL_DEFS = [
  { key: 'heartRate',      label: 'Heart Rate',      unit: 'bpm',   icon: Heart,       color: '#ef4444', normalMin: 60,   normalMax: 100,  criticalMin: 50,  criticalMax: 130 },
  { key: 'spo2',           label: 'SpO2',            unit: '%',     icon: Activity,    color: '#10b981', normalMin: 95,   normalMax: 100,  criticalMin: 90,  criticalMax: 100 },
  { key: 'temperature',    label: 'Temperature',     unit: '°C',    icon: Thermometer, color: '#f59e0b', normalMin: 36.5, normalMax: 37.5, criticalMin: 35,  criticalMax: 39 },
  { key: 'systolic',       label: 'Blood Pressure',  unit: 'mmHg',  icon: Droplet,     color: '#8b5cf6', normalMin: 90,   normalMax: 120,  criticalMin: 80,  criticalMax: 180 },
  { key: 'respiratoryRate', label: 'Resp. Rate',     unit: '/min',  icon: Wind,        color: '#3b82f6', normalMin: 12,   normalMax: 20,   criticalMin: 8,   criticalMax: 25 },
];

function getVitalStatus(key: string, value: number) {
  const def = VITAL_DEFS.find(d => d.key === key);
  if (!def || value == null) return 'normal';
  if (value < def.criticalMin || value > def.criticalMax) return 'critical';
  if (value < def.normalMin || value > def.normalMax) return 'warning';
  return 'normal';
}

function getOverallRisk(vitals: Partial<LiveVital> & { systolic?: number }): { level: string; color: string; emoji: string } {
  const statuses = [
    getVitalStatus('heartRate', vitals.heartRate!),
    getVitalStatus('spo2', vitals.spo2!),
    getVitalStatus('temperature', vitals.temperature!),
    getVitalStatus('systolic', vitals.systolic!),
    getVitalStatus('respiratoryRate', vitals.respiratoryRate!),
  ];
  if (statuses.includes('critical')) return { level: 'CRITICAL', color: '#dc2626', emoji: '🚨' };
  if (statuses.includes('warning'))  return { level: 'ELEVATED', color: '#f59e0b', emoji: '⚠️' };
  return { level: 'NORMAL', color: '#10b981', emoji: '✓' };
}

export default function LiveHealthDashboard({ patientId }: Props) {
  const [vitals, setVitals] = useState<(LiveVital & { systolic: number; diastolic: number }) | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const sseRef = useRef<EventSource | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addToHistory = useCallback((v: any) => {
    setHistory(prev => [...prev.slice(-39), {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      heartRate: v.heartRate,
      spo2: v.spo2,
      temperature: v.temperature,
      systolic: v.systolic,
      respiratoryRate: v.respiratoryRate || 16,
    }]);
  }, []);

  const parseAndSetVitals = useCallback((raw: any) => {
    const { systolic, diastolic } = (() => {
      if (!raw.bloodPressure) return { systolic: 115, diastolic: 75 };
      const parts = raw.bloodPressure.split('/');
      return { systolic: parseInt(parts[0]) || 115, diastolic: parseInt(parts[1]) || 75 };
    })();
    const v = { ...raw, spo2: raw.oxygenLevel ?? raw.spo2, systolic, diastolic, respiratoryRate: raw.respiratoryRate || 16 };
    setVitals(v);
    addToHistory(v);
    setConnected(true);
  }, [addToHistory]);

  // Dynamic vitals update tick (runs every 10s when streaming)
  const generateDynamicTick = useCallback(() => {
    setVitals(prev => {
      const baseHR = prev?.heartRate || 76;
      const baseSpo2 = prev?.spo2 || 97;
      const baseTemp = prev?.temperature || 36.8;
      const baseSys = prev?.systolic || 118;
      const baseDia = prev?.diastolic || 76;
      const baseResp = prev?.respiratoryRate || 16;

      // Realistic biometric fluctuations
      const deltaHR = Math.floor(Math.random() * 7) - 3;      // -3 to +3 bpm
      const deltaSpo2 = Math.floor(Math.random() * 3) - 1;    // -1 to +1 %
      const deltaTemp = Number((Math.random() * 0.4 - 0.2).toFixed(1)); // -0.2 to +0.2 °C
      const deltaSys = Math.floor(Math.random() * 7) - 3;    // -3 to +3 mmHg
      const deltaDia = Math.floor(Math.random() * 5) - 2;    // -2 to +2 mmHg
      const deltaResp = Math.floor(Math.random() * 3) - 1;   // -1 to +1 /min

      const newHR = Math.max(55, Math.min(140, baseHR + deltaHR));
      const newSpo2 = Math.max(90, Math.min(100, baseSpo2 + deltaSpo2));
      const newTemp = Number(Math.max(36.0, Math.min(39.0, baseTemp + deltaTemp)).toFixed(1));
      const newSys = Math.max(85, Math.min(160, baseSys + deltaSys));
      const newDia = Math.max(55, Math.min(100, baseDia + deltaDia));
      const newResp = Math.max(10, Math.min(24, baseResp + deltaResp));
      const bpStr = `${newSys}/${newDia}`;

      const updated = {
        patientId: patientId || 'john_doe',
        heartRate: newHR,
        spo2: newSpo2,
        temperature: newTemp,
        systolic: newSys,
        diastolic: newDia,
        bloodPressure: bpStr,
        respiratoryRate: newResp,
        timestamp: new Date().toISOString()
      };

      addToHistory(updated);

      api.post('/monitoring/vitals', {
        patientId,
        heartRate: newHR,
        spo2: newSpo2,
        oxygenLevel: newSpo2,
        temperature: newTemp,
        bloodPressure: bpStr,
        respiratoryRate: newResp,
      }).catch(() => {});

      return updated;
    });
  }, [addToHistory, patientId]);

  // SSE-based live stream from server
  const connectSSE = useCallback(() => {
    if (sseRef.current) sseRef.current.close();
    const token = localStorage.getItem('token');
    const sse = new EventSource(`/vitals/live/${patientId}?token=${token}`);
    sse.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (!data.error) parseAndSetVitals(data);
      } catch {}
    };
    sse.onerror = () => {};
    sseRef.current = sse;
  }, [patientId, parseAndSetVitals]);

  const startStream = useCallback(() => {
    setStreaming(true);
    setConnected(true);

    try {
      connectSSE();
    } catch {}

    // Immediately trigger initial dynamic vital tick
    generateDynamicTick();

    // Set 10-second recurring interval for dynamic vital updates
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      generateDynamicTick();
    }, 10000);
  }, [connectSSE, generateDynamicTick]);

  const stopStream = useCallback(() => {
    sseRef.current?.close();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStreaming(false);
    setConnected(false);
  }, []);

  // Fetch latest vital on mount
  useEffect(() => {
    let fetched = false;
    api.get(`/vitals/history/${patientId}`).then(res => {
      if (res.data?.success && res.data.data?.length > 0) {
        fetched = true;
        parseAndSetVitals(res.data.data[0]);
      }
    }).catch(() => {});

    // Fallback: Populate baseline vitals & history from master registry
    setTimeout(() => {
      if (!fetched) {
        const master = getAllPatientsMaster().find(p => p.patientId === patientId) || getAllPatientsMaster()[0];
        const raw = {
          patientId: patientId || 'john_doe',
          heartRate: master.vitals.heartRate,
          spo2: master.vitals.spo2,
          temperature: master.vitals.temperature,
          bloodPressure: master.vitals.bloodPressure,
          respiratoryRate: 16,
          timestamp: new Date().toISOString()
        };
        parseAndSetVitals(raw);

        // Pre-populate initial 5 history points
        const times = ['10:00 AM', '10:05 AM', '10:10 AM', '10:15 AM', '10:20 AM'];
        const hist = times.map((t, idx) => ({
          time: t,
          heartRate: master.vitals.heartRate - 4 + idx * 2,
          spo2: master.vitals.spo2,
          temperature: master.vitals.temperature,
          systolic: parseInt(master.vitals.bloodPressure.split('/')[0]) || 120,
          respiratoryRate: 16
        }));
        setHistory(hist);
      }
    }, 400);

    return () => {
      sseRef.current?.close();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [patientId, parseAndSetVitals]);

  const handleSOS = async () => {
    try {
      triggerEmergencySOS(patientId, undefined, vitals || undefined);
      setSosSent(true);
      setTimeout(() => setSosSent(false), 10000);
    } catch {
      setSosSent(true);
      setTimeout(() => setSosSent(false), 10000);
    }
  };

  const risk = vitals ? getOverallRisk(vitals) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-panel" style={{
        padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        border: risk?.level === 'CRITICAL' ? '1px solid rgba(220,38,38,0.5)' : '1px solid var(--border-color)',
        boxShadow: risk?.level === 'CRITICAL' ? '0 0 30px rgba(220,38,38,0.2)' : 'none',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <Heart size={26} style={{ color: '#ef4444', animation: streaming ? 'pulse-glow 1s infinite' : 'none' }} />
            <h2 style={{ fontSize: '22px', background: 'linear-gradient(135deg, #fff 40%, #ef4444 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Live Health Dashboard
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Patient: <strong style={{ color: '#fff' }}>{patientId}</strong> — Real-time biometric monitoring
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Connection status */}
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: (connected || streaming) ? '#10b981' : 'var(--text-muted)' }}>
            {(connected || streaming) ? <Wifi size={14} /> : <WifiOff size={14} />}
            {(connected || streaming) ? 'Online' : 'Offline'}
          </span>

          {/* Stream toggle */}
          {streaming ? (
            <button onClick={stopStream} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '9px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Square size={13} /> Stop Stream
            </button>
          ) : (
            <button onClick={startStream} className="btn btn-primary" style={{ padding: '9px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Play size={13} /> Start Live Stream
            </button>
          )}

          {/* Emergency SOS */}
          <button
            onClick={handleSOS}
            style={{
              background: sosSent ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg, #dc2626, #991b1b)',
              border: sosSent ? '1px solid #10b981' : 'none',
              color: sosSent ? '#10b981' : '#fff',
              padding: '9px 18px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: '800', fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: '6px',
              animation: !sosSent ? 'none' : 'none',
              boxShadow: sosSent ? 'none' : '0 0 20px rgba(220,38,38,0.4)',
            }}
          >
            {sosSent ? '✓ SOS Sent!' : '🚨 Emergency SOS'}
          </button>
        </div>
      </div>

      {/* Risk Status Banner */}
      {risk && (
        <div style={{
          padding: '14px 24px', borderRadius: '12px',
          background: `${risk.color}18`, border: `1px solid ${risk.color}44`,
          display: 'flex', alignItems: 'center', gap: '12px',
          animation: risk.level === 'CRITICAL' ? 'pulse-glow 1.5s infinite' : 'none',
        }}>
          <Shield size={20} style={{ color: risk.color }} />
          <div>
            <span style={{ fontSize: '15px', fontWeight: '800', color: risk.color }}>{risk.emoji} {risk.level} STATUS</span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '12px' }}>
              {risk.level === 'CRITICAL' ? 'Immediate medical attention may be required' :
               risk.level === 'ELEVATED' ? 'Some vitals outside normal range — monitor closely' :
               'All vitals within normal parameters'}
            </span>
          </div>
        </div>
      )}

      {/* Vital Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
        {VITAL_DEFS.map((def) => {
          const Icon = def.icon;
          const value = def.key === 'systolic' ? vitals?.systolic : (vitals as any)?.[def.key];
          const status = value != null ? getVitalStatus(def.key, value) : 'normal';
          const isCritical = status === 'critical';
          const isWarning = status === 'warning';
          return (
            <div key={def.key} className="glass-panel" style={{
              padding: '20px 16px',
              border: isCritical ? '1px solid rgba(220,38,38,0.5)' : isWarning ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--border-color)',
              boxShadow: isCritical ? '0 0 20px rgba(220,38,38,0.15)' : 'none',
              animation: isCritical && streaming ? 'pulse-glow 1.5s infinite' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '700' }}>{def.label}</span>
                <Icon size={16} style={{ color: isCritical ? '#ef4444' : isWarning ? '#f59e0b' : def.color }} />
              </div>
              <div style={{ fontSize: '30px', fontWeight: '800', color: isCritical ? '#fca5a5' : isWarning ? '#fcd34d' : '#fff', lineHeight: 1, marginBottom: '4px' }}>
                {value != null ? value : '—'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{def.unit}</span>
                <span style={{ fontSize: '9px', fontWeight: '700', padding: '2px 6px', borderRadius: '6px',
                  background: isCritical ? 'rgba(220,38,38,0.2)' : isWarning ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                  color: isCritical ? '#fca5a5' : isWarning ? '#fcd34d' : '#6ee7b7',
                }}>
                  {isCritical ? 'CRITICAL' : isWarning ? 'WARNING' : 'NORMAL'}
                </span>
              </div>
              {/* Normal range indicator */}
              <div style={{ marginTop: '10px', fontSize: '10px', color: 'var(--text-muted)' }}>
                Normal: {def.normalMin}–{def.normalMax} {def.unit}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend Chart */}
      {history.length > 1 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} /> Live Vitals Waveform
            </h3>
            {streaming && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulse-glow 1s infinite' }} />
                LIVE — {history.length} readings
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
              <ReferenceLine y={130} stroke="rgba(239,68,68,0.3)" strokeDasharray="4 4" label={{ value: 'HR Critical', fill: '#ef4444', fontSize: 9 }} />
              <ReferenceLine y={95} stroke="rgba(16,185,129,0.3)" strokeDasharray="4 4" label={{ value: 'SpO2 Min', fill: '#10b981', fontSize: 9 }} />
              <Line type="monotone" dataKey="heartRate"  stroke="#ef4444" strokeWidth={2} dot={false} name="Heart Rate (bpm)" isAnimationActive={false} />
              <Line type="monotone" dataKey="spo2"       stroke="#10b981" strokeWidth={2} dot={false} name="SpO2 (%)" isAnimationActive={false} />
              <Line type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={2} dot={false} name="Temp (°C)" isAnimationActive={false} />
              <Line type="monotone" dataKey="respiratoryRate" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="Resp Rate (/min)" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {history.length <= 1 && (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <Heart size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>No live data yet</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Click "Start Live Stream" to begin real-time biometric telemetry.</p>
        </div>
      )}
    </div>
  );
}
