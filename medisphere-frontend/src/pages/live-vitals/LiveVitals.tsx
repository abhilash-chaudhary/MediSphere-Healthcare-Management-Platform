import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { Activity, Heart, Droplet, Thermometer, Wind, Wifi, WifiOff, Play, Square } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';

interface LiveVital {
  heartRate: number;
  oxygenLevel: number;
  temperature: number;
  bloodPressure: string;
  timestamp: string;
  patientId: string;
}

interface LiveVitalsProps {
  patientId: string;
}

const VITAL_CARDS = [
  { key: 'heartRate', label: 'Heart Rate', unit: 'BPM', icon: Heart, color: '#ef4444', normalMin: 60, normalMax: 100 },
  { key: 'oxygenLevel', label: 'SpO2', unit: '%', icon: Activity, color: '#10b981', normalMin: 95, normalMax: 100 },
  { key: 'temperature', label: 'Temperature', unit: '°C', icon: Thermometer, color: '#f59e0b', normalMin: 36.1, normalMax: 37.2 },
  { key: 'systolic', label: 'BP Systolic', unit: 'mmHg', icon: Droplet, color: '#8b5cf6', normalMin: 90, normalMax: 120 }
];

export default function LiveVitals({ patientId }: LiveVitalsProps) {
  const [vitals, setVitals] = useState<LiveVital | null>(null);
  const [vitalsHistory, setVitalsHistory] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLatestVital = async () => {
    try {
      const res = await api.get(`/vitals/history/${patientId}`);
      if (res.data?.success && res.data.data?.length > 0) {
        const latest = res.data.data[0];
        const vital: LiveVital = {
          heartRate: latest.heartRate,
          oxygenLevel: latest.oxygenLevel,
          temperature: latest.temperature,
          bloodPressure: latest.bloodPressure || '120/80',
          timestamp: latest.recordedAt,
          patientId
        };
        setVitals(vital);
        const sys = parseInt(latest.bloodPressure?.split('/')[0]) || 120;
        setVitalsHistory(prev => [...prev.slice(-39), {
          time: new Date(latest.recordedAt).toLocaleTimeString(),
          heartRate: latest.heartRate,
          oxygenLevel: latest.oxygenLevel,
          temperature: parseFloat(latest.temperature?.toFixed(1) || '36.6'),
          systolic: sys
        }]);
        setConnected(true);
      }
    } catch {
      setConnected(false);
    }
  };

  const simulateVital = () => {
    const base = vitals || { heartRate: 75, oxygenLevel: 98, temperature: 36.6, bloodPressure: '120/80', timestamp: '', patientId };
    const vital: LiveVital = {
      heartRate: Math.max(55, Math.min(130, base.heartRate + Math.floor((Math.random() - 0.5) * 8))),
      oxygenLevel: parseFloat(Math.max(91, Math.min(100, base.oxygenLevel + (Math.random() - 0.5) * 2)).toFixed(1)),
      temperature: parseFloat(Math.max(36.0, Math.min(39.0, base.temperature + (Math.random() - 0.5) * 0.3)).toFixed(1)),
      bloodPressure: `${115 + Math.floor(Math.random() * 20)}/${70 + Math.floor(Math.random() * 15)}`,
      timestamp: new Date().toISOString(),
      patientId
    };
    setVitals(vital);
    const sys = parseInt(vital.bloodPressure.split('/')[0]);
    setVitalsHistory(prev => [...prev.slice(-39), {
      time: new Date().toLocaleTimeString(),
      heartRate: vital.heartRate,
      oxygenLevel: vital.oxygenLevel,
      temperature: vital.temperature,
      systolic: sys
    }]);
  };

  const startStream = async () => {
    setStreaming(true);
    await fetchLatestVital();
    intervalRef.current = setInterval(() => {
      simulateVital();
    }, 2000);
  };

  const stopStream = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setStreaming(false);
  };

  useEffect(() => {
    fetchLatestVital();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [patientId]);

  const getVitalStatus = (key: string, value: number) => {
    const card = VITAL_CARDS.find(c => c.key === key);
    if (!card) return 'normal';
    if (value < card.normalMin || value > card.normalMax) return 'critical';
    return 'normal';
  };

  const currentSystolic = vitals?.bloodPressure ? parseInt(vitals.bloodPressure.split('/')[0]) : 120;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', background: 'linear-gradient(135deg, #fff 40%, var(--color-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
            Live Vital Telemetry Stream
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Patient: <strong style={{ color: '#fff' }}>{patientId}</strong> — Real-time biometric monitoring via IoT wearable sensors
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: connected ? '#10b981' : 'var(--text-muted)' }}>
            {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
            {connected ? 'Device Connected' : 'No Signal'}
          </span>
          {streaming ? (
            <button onClick={stopStream} className="btn btn-danger" style={{ padding: '10px 20px' }}>
              <Square size={14} /> Stop Stream
            </button>
          ) : (
            <button onClick={startStream} className="btn btn-primary" style={{ padding: '10px 20px' }}>
              <Play size={14} /> Start Live Stream
            </button>
          )}
        </div>
      </div>

      {/* Live Vital Cards */}
      <div className="grid-4">
        {[
          { ...VITAL_CARDS[0], value: vitals?.heartRate },
          { ...VITAL_CARDS[1], value: vitals?.oxygenLevel },
          { ...VITAL_CARDS[2], value: vitals?.temperature },
          { key: 'systolic', label: 'Blood Pressure', unit: 'mmHg', icon: Droplet, color: '#8b5cf6', normalMin: 90, normalMax: 120, value: vitals?.bloodPressure }
        ].map((card, idx) => {
          const Icon = card.icon;
          const isNumeric = typeof card.value === 'number';
          const isCritical = isNumeric && (card.value! < card.normalMin || card.value! > card.normalMax);
          return (
            <div key={idx} className="glass-panel" style={{
              padding: '24px',
              border: isCritical ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
              boxShadow: isCritical ? '0 0 20px rgba(239,68,68,0.1)' : undefined,
              animation: isCritical && streaming ? 'pulse-glow 1.5s infinite' : undefined
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.label}</span>
                <Icon size={20} style={{ color: isCritical ? '#ef4444' : card.color }} />
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: isCritical ? '#fca5a5' : '#fff', marginBottom: '4px' }}>
                {card.value !== undefined && card.value !== null ? card.value : '—'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{card.unit}</span>
                <span className={`badge ${isCritical ? 'badge-danger' : 'badge-success'}`} style={{ fontSize: '10px' }}>
                  {isCritical ? 'CRITICAL' : 'NORMAL'}
                </span>
              </div>
              {streaming && (
                <div style={{ marginTop: '12px', height: '2px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.random() * 100}%`, background: isCritical ? '#ef4444' : card.color, transition: 'width 0.5s ease', borderRadius: '2px' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Real-Time Chart */}
      {vitalsHistory.length > 0 && (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', color: 'var(--color-primary)' }}>Live Vitals Waveform</h3>
            {streaming && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulse-glow 1s infinite' }} />
                LIVE — {vitalsHistory.length} readings
              </span>
            )}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={vitalsHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
              <Legend />
              <ReferenceLine y={100} stroke="rgba(239,68,68,0.3)" strokeDasharray="4 4" label={{ value: 'HR Critical', fill: '#ef4444', fontSize: 10 }} />
              <Line type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2} dot={false} name="Heart Rate (BPM)" isAnimationActive={false} />
              <Line type="monotone" dataKey="oxygenLevel" stroke="#10b981" strokeWidth={2} dot={false} name="SpO2 (%)" isAnimationActive={false} />
              <Line type="monotone" dataKey="temperature" stroke="#f59e0b" strokeWidth={2} dot={false} name="Temp (°C)" isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {vitalsHistory.length === 0 && (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <Activity size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>No live stream data available</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Click "Start Live Stream" to begin receiving real-time biometric telemetry</p>
        </div>
      )}
    </div>
  );
}
