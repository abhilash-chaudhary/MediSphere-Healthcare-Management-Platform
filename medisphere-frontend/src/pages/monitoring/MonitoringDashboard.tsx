import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api';
import {
  Activity, Heart, AlertTriangle, CheckCircle, Users, Zap,
  Clock, Wifi, Eye, Search, ShieldAlert
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import CriticalAlertModal from './CriticalAlertModal';
import { getAssignedPatientIdsForUser, getAllPatientsMaster } from '../../constants/patientAssignments';

interface OnlinePatient {
  patientId: string;
  patientName: string;
  age: number | null;
  gender: string;
  status: 'ONLINE' | 'OFFLINE';
  vitals: {
    heartRate: number;
    spo2: number;
    temperature: number;
    bloodPressure: string;
    lastUpdated: string;
  };
  aiRisk: 'High' | 'Medium' | 'Low';
  aiConfidence: number;
  openAlerts: number;
}

interface MonitoringStats {
  patientsOnline: number;
  totalPatients: number;
  assignedPatients: number;
  todayAlerts: number;
  criticalAlerts: number;
  openAlerts: number;
  avgResponseTime: string;
  simulatorStatus: string;
}

interface AlertPayload {
  alertId: string;
  patientId: string;
  patientName: string;
  severity: string;
  type: string;
  message: string;
  confidence: number;
  risk: string;
  vitals: {
    heartRate: number;
    spo2: number;
    temperature: number;
    bloodPressure: string;
  };
  status: string;
  createdAt: string;
}

interface Props {
  user: any;
  onViewPatient?: (patientId: string) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#16a34a',
};
const RISK_COLORS: Record<string, string> = {
  High: '#dc2626', Medium: '#d97706', Low: '#16a34a', Unknown: '#64748b',
};

const DEFAULT_STATS: MonitoringStats = {
  patientsOnline: 8,
  totalPatients: 8,
  assignedPatients: 8,
  todayAlerts: 4,
  criticalAlerts: 1,
  openAlerts: 2,
  avgResponseTime: '2.4 min',
  simulatorStatus: 'ACTIVE',
};

const DEFAULT_PATIENTS_LIST: OnlinePatient[] = getAllPatientsMaster().map(p => ({
  patientId: p.patientId,
  patientName: p.patientName,
  age: p.age,
  gender: p.gender,
  status: p.status,
  vitals: { ...p.vitals },
  aiRisk: p.aiRisk,
  aiConfidence: p.aiConfidence,
  openAlerts: p.openAlerts,
}));

const DEFAULT_RECENT_ALERTS: AlertPayload[] = [
  {
    alertId: 'ALT-SIM-001',
    patientId: 'john_doe',
    patientName: 'John Doe',
    severity: 'CRITICAL',
    type: 'AFIB_ANOMALY',
    message: 'Acute Tachycardia Spike detected (142 bpm) with High Risk classification',
    confidence: 94.5,
    risk: 'High',
    vitals: { heartRate: 142, spo2: 94, temperature: 37.2, bloodPressure: '148/92' },
    status: 'NEW',
    createdAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    alertId: 'ALT-SIM-002',
    patientId: 'jane_smith',
    patientName: 'Jane Smith',
    severity: 'HIGH',
    type: 'HYPOXIA_ALERT',
    message: 'Oxygen Saturation below threshold: 89% SpO2 recorded',
    confidence: 91.2,
    risk: 'High',
    vitals: { heartRate: 98, spo2: 89, temperature: 36.8, bloodPressure: '118/76' },
    status: 'NEW',
    createdAt: new Date(Date.now() - 900000).toISOString(),
  },
  {
    alertId: 'ALT-SIM-003',
    patientId: 'robert_j',
    patientName: 'Robert Johnson',
    severity: 'MEDIUM',
    type: 'HYPERTENSION_WARNING',
    message: 'Stage 2 Systolic BP elevation: 178 mmHg',
    confidence: 87.6,
    risk: 'Medium',
    vitals: { heartRate: 84, spo2: 96, temperature: 36.6, bloodPressure: '178/104' },
    status: 'ACKNOWLEDGED',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    alertId: 'ALT-SIM-004',
    patientId: 'marcus_b',
    patientName: 'Marcus Brody',
    severity: 'HIGH',
    type: 'RESPIRATORY_DISTRESS',
    message: 'Asthma exacerbation: Heart rate 110 bpm, SpO2 92%',
    confidence: 85.3,
    risk: 'Medium',
    vitals: { heartRate: 110, spo2: 92, temperature: 37.0, bloodPressure: '135/85' },
    status: 'NEW',
    createdAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    alertId: 'ALT-SIM-005',
    patientId: 'clara_o',
    patientName: 'Clara Oswald',
    severity: 'CRITICAL',
    type: 'TACHYCARDIA_SPIKE',
    message: 'High Risk Tachycardia: Heart rate 128 bpm recorded',
    confidence: 92.8,
    risk: 'High',
    vitals: { heartRate: 128, spo2: 95, temperature: 36.9, bloodPressure: '130/82' },
    status: 'NEW',
    createdAt: new Date(Date.now() - 1200000).toISOString(),
  }
];

const INITIAL_VITALS_HISTORY: Record<string, any[]> = {
  john_doe: [
    { time: '10:00', heartRate: 110, spo2: 96 },
    { time: '10:05', heartRate: 125, spo2: 95 },
    { time: '10:10', heartRate: 142, spo2: 94 },
  ],
  jane_smith: [
    { time: '10:00', heartRate: 92, spo2: 94 },
    { time: '10:05', heartRate: 95, spo2: 91 },
    { time: '10:10', heartRate: 98, spo2: 89 },
  ],
  robert_j: [
    { time: '10:00', heartRate: 80, spo2: 97 },
    { time: '10:05', heartRate: 82, spo2: 96 },
    { time: '10:10', heartRate: 84, spo2: 96 },
  ],
  eleanor_v: [
    { time: '10:00', heartRate: 70, spo2: 98 },
    { time: '10:05', heartRate: 71, spo2: 98 },
    { time: '10:10', heartRate: 72, spo2: 98 },
  ],
  marcus_b: [
    { time: '10:00', heartRate: 105, spo2: 94 },
    { time: '10:05', heartRate: 108, spo2: 93 },
    { time: '10:10', heartRate: 110, spo2: 92 },
  ],
  clara_o: [
    { time: '10:00', heartRate: 118, spo2: 96 },
    { time: '10:05', heartRate: 124, spo2: 95 },
    { time: '10:10', heartRate: 128, spo2: 95 },
  ]
};

export default function MonitoringDashboard({ user, onViewPatient }: Props) {
  const isAdmin = user?.roles?.some((r: string) => r.includes('ADMIN')) ?? false;
  const assignedIds = getAssignedPatientIdsForUser(user);

  const initialPatients = DEFAULT_PATIENTS_LIST.filter(p => assignedIds.includes(p.patientId));
  const initialAlerts = DEFAULT_RECENT_ALERTS.filter(a => assignedIds.includes(a.patientId));

  const [stats, setStats] = useState<MonitoringStats | null>({
    ...DEFAULT_STATS,
    assignedPatients: initialPatients.length,
    patientsOnline: initialPatients.length
  });
  const [patients, setPatients] = useState<OnlinePatient[]>(initialPatients);
  const [criticalAlert, setCriticalAlert] = useState<AlertPayload | null>(null);
  const [recentAlerts, setRecentAlerts] = useState<AlertPayload[]>(initialAlerts);
  const [vitalsHistory, setVitalsHistory] = useState<Record<string, any[]>>(INITIAL_VITALS_HISTORY);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(new Date());
  const sseRef = useRef<EventSource | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/monitoring/stats');
      if (res.data?.success && res.data.data) setStats(res.data.data);
    } catch {}
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await api.get('/monitoring/patients');
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setPatients(res.data.data);
      }
    } catch {}
  }, []);

  const fetchRecentAlerts = useCallback(async () => {
    try {
      const res = await api.get('/monitoring/alerts?limit=10');
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setRecentAlerts(res.data.data);
      }
    } catch {}
  }, []);

  const connectSSE = useCallback(() => {
    if (sseRef.current) sseRef.current.close();
    const token = localStorage.getItem('token');
    const sse = new EventSource(`/monitoring/stream/${user.username}?token=${token}`);
    sse.onopen = () => setConnected(true);
    sse.onerror = () => { setConnected(false); setTimeout(connectSSE, 5000); };

    sse.addEventListener('vitals', (e) => {
      const data = JSON.parse(e.data);
      setLastUpdate(new Date());
      setPatients(prev => prev.map(p =>
        p.patientId === data.patientId
          ? { ...p, vitals: { ...data.vitals, spo2: data.vitals.spo2, lastUpdated: data.timestamp }, aiRisk: data.aiRisk, aiConfidence: data.aiConfidence }
          : p
      ));
      setVitalsHistory(prev => ({
        ...prev,
        [data.patientId]: [...(prev[data.patientId] || []).slice(-19), { time: new Date().toLocaleTimeString(), heartRate: data.vitals.heartRate, spo2: data.vitals.spo2 }]
      }));
    });

    sse.addEventListener('alert', (e) => {
      const alert = JSON.parse(e.data);
      setLastUpdate(new Date());
      setRecentAlerts(prev => [alert, ...prev].slice(0, 10));
      fetchStats();
      setPatients(prev => prev.map(p =>
        p.patientId === alert.patientId ? { ...p, openAlerts: p.openAlerts + 1, aiRisk: alert.risk || p.aiRisk } : p
      ));
      if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
        setCriticalAlert(alert);
      }
    });

    sse.addEventListener('alert_ack', (e) => {
      const { alertId } = JSON.parse(e.data);
      setRecentAlerts(prev => prev.map(a => a.alertId === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a));
    });

    sseRef.current = sse;
  }, [user.username, fetchStats]);

  useEffect(() => {
    fetchStats(); fetchPatients(); fetchRecentAlerts(); connectSSE();
    const interval = setInterval(() => { fetchPatients(); fetchStats(); }, 30000);
    return () => { clearInterval(interval); sseRef.current?.close(); };
  }, [fetchStats, fetchPatients, fetchRecentAlerts, connectSSE]);

  const handleAcknowledge = async (alertId: string) => {
    try {
      await api.post(`/monitoring/alerts/${alertId}/acknowledge`);
      setCriticalAlert(null);
      setRecentAlerts(prev => prev.map(a => a.alertId === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a));
      fetchStats();
    } catch {}
  };

  const handleSimulateCritical = async () => {
    const firstPatient = patients[0]?.patientId || 'john_doe';
    try { await api.post(`/monitoring/simulate/critical?patientId=${firstPatient}`); } catch {}
  };

  const kpiCards = [
    { label: 'Assigned Patients', value: stats?.assignedPatients ?? patients.length, icon: Users, color: '#3b82f6', pulse: false },
    { label: 'Patients Online', value: stats?.patientsOnline ?? '—', icon: Wifi, color: '#10b981', pulse: true },
    { label: "Today's Alerts", value: stats?.todayAlerts ?? '—', icon: AlertTriangle, color: '#f59e0b', pulse: false },
    { label: 'Critical Alerts', value: stats?.criticalAlerts ?? '—', icon: Zap, color: '#ef4444', pulse: (stats?.criticalAlerts ?? 0) > 0 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {criticalAlert && (
        <CriticalAlertModal
          alert={criticalAlert}
          onAcknowledge={handleAcknowledge}
          onClose={() => setCriticalAlert(null)}
          onViewRecord={onViewPatient}
        />
      )}

      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <Activity size={28} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: '24px', background: 'linear-gradient(135deg, #fff 40%, var(--color-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Monitoring Command Center
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Showing <strong style={{ color: 'var(--color-primary)' }}>{isAdmin ? 'All System Patients (Admin Full View)' : `patients assigned to Dr. ${user?.username}`}</strong> — real-time vital telemetry, AI risk scores & alert notifications
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: connected ? '#10b981' : '#ef4444' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected ? '#10b981' : '#ef4444', animation: connected ? 'pulse-glow 1.5s infinite' : 'none' }} />
            {connected ? 'Stream Connected' : 'Stream Offline'}
          </span>
          {lastUpdate && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Updated {lastUpdate.toLocaleTimeString()}</span>}
          <button
            onClick={handleSimulateCritical}
            disabled={patients.length === 0}
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', padding: '8px 14px', borderRadius: '8px', cursor: patients.length === 0 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: '600', opacity: patients.length === 0 ? 0.5 : 1 }}
          >
            ⚡ Simulate Critical
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4">
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', background: `radial-gradient(circle, ${kpi.color}20 0%, transparent 70%)`, borderRadius: '0 0 0 80px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>{kpi.label}</div>
                  <div style={{ fontSize: '36px', fontWeight: '800', color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                </div>
                <Icon size={24} style={{ color: kpi.color, opacity: 0.8, animation: kpi.pulse ? 'pulse-glow 2s infinite' : 'none' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Patients Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} style={{ color: 'var(--color-primary)' }} /> Assigned Patients
            <span style={{ fontSize: '12px', background: 'rgba(59,130,246,0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: '12px', fontWeight: '600' }}>
              {patients.length} assigned & active
            </span>
          </h3>
          <button onClick={() => { fetchPatients(); fetchStats(); }} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '12px' }}>
            Refresh
          </button>
        </div>

        {patients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <ShieldAlert size={48} style={{ margin: '0 auto 16px', opacity: 0.4, color: '#f59e0b' }} />
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '8px' }}>No assigned patients assigned to you yet</p>
            <p style={{ fontSize: '13px' }}>Contact system Administrator to assign patients to your clinical care list.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {['Patient', 'Age', 'Heart Rate', 'SpO2', 'Temp', 'BP', 'AI Risk', 'Alerts', 'Trend', 'View'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const history = vitalsHistory[p.patientId] || [];
                  const riskColor = RISK_COLORS[p.aiRisk] || '#64748b';
                  const isCritical = p.openAlerts > 0;
                  return (
                    <tr key={p.patientId} style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: isCritical ? 'rgba(239,68,68,0.05)' : 'transparent',
                      transition: 'background 0.3s'
                    }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '600', color: '#fff' }}>{p.patientName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.patientId}</div>
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{p.age || '—'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ color: p.vitals?.heartRate && (p.vitals.heartRate > 100 || p.vitals.heartRate < 60) ? '#fca5a5' : '#fff', fontWeight: '600' }}>
                          {p.vitals?.heartRate ?? '—'} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>bpm</span>
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ color: p.vitals?.spo2 && p.vitals.spo2 < 95 ? '#fca5a5' : '#10b981', fontWeight: '600' }}>
                          {p.vitals?.spo2 ?? '—'}<span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>%</span>
                        </span>
                      </td>
                      <td style={{ padding: '12px', color: p.vitals?.temperature && p.vitals.temperature > 37.5 ? '#fcd34d' : 'var(--text-secondary)' }}>
                        {p.vitals?.temperature ?? '—'}°C
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{p.vitals?.bloodPressure || '—'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: `${riskColor}22`, color: riskColor, padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                          {p.aiRisk}{p.aiConfidence && <span style={{ opacity: 0.7, marginLeft: '4px' }}>{p.aiConfidence}%</span>}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {p.openAlerts > 0 ? (
                          <span style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', animation: 'pulse-glow 1.5s infinite' }}>
                            {p.openAlerts} open
                          </span>
                        ) : <span style={{ color: '#10b981', fontSize: '11px' }}>✓ Clear</span>}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {history.length > 1 ? (
                          <ResponsiveContainer width={80} height={32}>
                            <LineChart data={history.slice(-10)}>
                              <Line type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => onViewPatient?.(p.patientId)}
                          style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={12} /> Patient View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Alerts Feed */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={16} style={{ color: '#f59e0b' }} /> Alert Feed — Assigned Patients
        </h3>
        {recentAlerts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <CheckCircle size={32} style={{ margin: '0 auto 12px', color: '#10b981' }} />
            <p style={{ color: '#10b981' }}>All clear — no active alerts for your patients</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
            {recentAlerts.map((alert) => (
              <div key={alert.alertId} style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
                borderLeft: `3px solid ${SEVERITY_COLORS[alert.severity] || '#64748b'}`,
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ background: `${SEVERITY_COLORS[alert.severity]}22`, color: SEVERITY_COLORS[alert.severity], padding: '1px 7px', borderRadius: '8px', fontSize: '10px', fontWeight: '700' }}>
                      {alert.severity}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{alert.type}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· {alert.patientName || alert.patientId}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{alert.message}</p>
                </div>
                <div style={{ textAlign: 'right', minWidth: '80px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(alert.createdAt).toLocaleTimeString()}</div>
                  {alert.status === 'ACKNOWLEDGED' ? (
                    <span style={{ fontSize: '10px', color: '#10b981' }}>✓ ACK</span>
                  ) : (
                    <button
                      onClick={() => handleAcknowledge(alert.alertId)}
                      style={{ background: 'rgba(16,185,129,0.15)', border: 'none', color: '#10b981', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: '600', marginTop: '2px' }}
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
