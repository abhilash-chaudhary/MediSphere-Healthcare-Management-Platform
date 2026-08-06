import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Brain, Activity, Heart, Thermometer, TrendingUp, TrendingDown, Minus, RefreshCw, AlertTriangle } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { getAssignedPatientIdsForUser, getAllPatientsMaster } from '../../constants/patientAssignments';

interface RiskPrediction {
  predictionId: string;
  patientId: string;
  heartRate: number;
  spo2: number;
  temperature: number;
  bloodPressure: string;
  respiratoryRate: number;
  risk: string;
  confidence: number;
  score: number;
  factors: string[];
  triggeredRules: string[];
  source: string;
  timestamp: string;
}

interface Props {
  patients?: any[];
  selectedPatientId?: string;
  user?: any;
}

const RISK_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  High:    { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  icon: '🔴' },
  Medium:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: '🟡' },
  Low:     { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: '🟢' },
  Unknown: { color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: '⚪' },
};

const DEFAULT_PATIENTS = getAllPatientsMaster().map(p => ({
  patientId: p.patientId,
  patientName: p.patientName,
  aiRisk: p.aiRisk,
  openAlerts: p.openAlerts
}));

const DEFAULT_PREDICTIONS_MAP: Record<string, RiskPrediction[]> = {
  john_doe: [
    {
      predictionId: 'pred_1',
      patientId: 'john_doe',
      heartRate: 142,
      spo2: 94,
      temperature: 37.2,
      bloodPressure: '148/92',
      respiratoryRate: 22,
      risk: 'High',
      confidence: 94.5,
      score: 88.4,
      factors: [
        'Sustained Tachycardia (> 120 BPM)',
        'Systolic BP Elevation (148 mmHg)',
        'Tachypnea (> 20 breaths/min)'
      ],
      triggeredRules: ['RULE_TACHYCARDIA_HIGH', 'RULE_SYS_BP_HIGH'],
      source: 'XGBoost Clinical Anomaly Engine v3',
      timestamp: new Date().toISOString(),
    },
    {
      predictionId: 'pred_0',
      patientId: 'john_doe',
      heartRate: 118,
      spo2: 96,
      temperature: 37.0,
      bloodPressure: '135/88',
      respiratoryRate: 19,
      risk: 'Medium',
      confidence: 89.1,
      score: 62.0,
      factors: ['Mild Heart Rate Elevation (118 BPM)'],
      triggeredRules: ['RULE_TACHYCARDIA_MEDIUM'],
      source: 'XGBoost Clinical Anomaly Engine v3',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
    }
  ],
  jane_smith: [
    {
      predictionId: 'pred_2',
      patientId: 'jane_smith',
      heartRate: 98,
      spo2: 89,
      temperature: 36.8,
      bloodPressure: '118/76',
      respiratoryRate: 24,
      risk: 'High',
      confidence: 91.2,
      score: 85.0,
      factors: [
        'Hypoxia Alert: SpO2 < 90% (89%)',
        'Elevated Respiratory Rate (24/min)'
      ],
      triggeredRules: ['RULE_HYPOXIA_CRITICAL'],
      source: 'XGBoost Clinical Anomaly Engine v3',
      timestamp: new Date().toISOString(),
    }
  ],
  robert_j: [
    {
      predictionId: 'pred_3',
      patientId: 'robert_j',
      heartRate: 84,
      spo2: 96,
      temperature: 36.6,
      bloodPressure: '178/104',
      respiratoryRate: 18,
      risk: 'Medium',
      confidence: 87.6,
      score: 68.5,
      factors: ['Hypertension Stage 2 (178/104 mmHg)'],
      triggeredRules: ['RULE_HYPERTENSION_STAGE2'],
      source: 'XGBoost Clinical Anomaly Engine v3',
      timestamp: new Date().toISOString(),
    }
  ],
  eleanor_v: [
    {
      predictionId: 'pred_4',
      patientId: 'eleanor_v',
      heartRate: 72,
      spo2: 98,
      temperature: 36.5,
      bloodPressure: '120/80',
      respiratoryRate: 16,
      risk: 'Low',
      confidence: 96.0,
      score: 12.0,
      factors: [],
      triggeredRules: [],
      source: 'XGBoost Clinical Anomaly Engine v3',
      timestamp: new Date().toISOString(),
    }
  ]
};

export default function AIAnomalyView({ patients = [], selectedPatientId, user }: Props) {
  const [predictions, setPredictions] = useState<RiskPrediction[]>([]);
  const assignedPatientIds = getAssignedPatientIdsForUser(user);

  const initialOnline = DEFAULT_PATIENTS.filter(p =>
    assignedPatientIds.includes(p.patientId)
  );

  const [selected, setSelected] = useState<string>(selectedPatientId || initialOnline[0]?.patientId || 'john_doe');
  const [loading, setLoading] = useState(false);
  const [onlinePatients, setOnlinePatients] = useState<any[]>(initialOnline);

  useEffect(() => {
    api.get('/monitoring/patients').then(res => {
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        setOnlinePatients(res.data.data);
        if (!selected) setSelected(res.data.data[0].patientId);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selected) fetchPredictions(selected);
  }, [selected]);

  useEffect(() => {
    if (selectedPatientId && !selected) setSelected(selectedPatientId);
  }, [selectedPatientId]);

  const fetchPredictions = async (pid: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/monitoring/risk/${pid}`);
      if (res.data?.success && res.data.data) {
        const raw = res.data.data;
        const list = Array.isArray(raw) ? raw : [raw];
        setPredictions(list);
      } else {
        setPredictions(DEFAULT_PREDICTIONS_MAP[pid] || DEFAULT_PREDICTIONS_MAP.john_doe);
      }
    } catch {
      setPredictions(DEFAULT_PREDICTIONS_MAP[pid] || DEFAULT_PREDICTIONS_MAP.john_doe);
    } finally {
      setLoading(false);
    }
  };

  const latest = predictions[0] || (DEFAULT_PREDICTIONS_MAP[selected] || DEFAULT_PREDICTIONS_MAP.john_doe)[0];
  const riskConfig = RISK_CONFIG[latest?.risk || 'Unknown'];

  // Build radar chart data from latest vitals
  const radarData = latest ? [
    { metric: 'Heart Rate', value: Math.min(100, ((latest.heartRate - 40) / (160 - 40)) * 100) },
    { metric: 'SpO2', value: 100 - Math.max(0, (100 - latest.spo2) * 5) },
    { metric: 'Temperature', value: Math.min(100, ((latest.temperature - 35) / (42 - 35)) * 100) },
    { metric: 'Risk Score', value: latest.score || 0 },
    { metric: 'Confidence', value: latest.confidence || 0 },
  ] : [];

  // Historical risk trend
  const trendData = predictions.slice(0, 10).reverse().map((p, i) => ({
    time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    score: p.score || 0,
    confidence: p.confidence || 0,
    risk: p.risk,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <Brain size={26} style={{ color: '#a78bfa' }} />
            <h2 style={{ fontSize: '22px', background: 'linear-gradient(135deg, #fff 40%, #a78bfa 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AI Anomaly Detection
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Per-patient real-time risk classification via clinical rule engine + AI scoring
          </p>
        </div>
        <button onClick={() => selected && fetchPredictions(selected)} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Patient Selector */}
      <div className="glass-panel" style={{ padding: '20px 24px' }}>
        <label style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '10px' }}>Select Patient</label>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {onlinePatients.map(p => {
            const rc = RISK_CONFIG[p.aiRisk] || RISK_CONFIG.Unknown;
            return (
              <button
                key={p.patientId}
                onClick={() => setSelected(p.patientId)}
                style={{
                  padding: '8px 14px', borderRadius: '8px', border: `1px solid ${selected === p.patientId ? 'var(--color-primary)' : 'var(--border-color)'}`,
                  background: selected === p.patientId ? 'rgba(0,242,254,0.1)' : 'rgba(255,255,255,0.03)',
                  color: selected === p.patientId ? 'var(--color-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span>{rc.icon}</span> {p.patientName}
              </button>
            );
          })}
          {onlinePatients.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No online patients. Register a wearable device first.</p>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <Activity size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p>Loading risk analysis...</p>
        </div>
      )}

      {!loading && latest && (
        <>
          {/* Risk Overview */}
          <div className="grid-4">
            <div className="glass-panel" style={{ padding: '24px', border: `1px solid ${riskConfig.color}44`, background: riskConfig.bg, gridColumn: '1 / 2' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>AI Risk Level</div>
              <div style={{ fontSize: '42px', fontWeight: '900', color: riskConfig.color }}>{riskConfig.icon} {latest.risk}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>Source: {latest.source}</div>
            </div>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Confidence</div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: '#a78bfa' }}>{latest.confidence}%</div>
            </div>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Anomaly Score</div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: '#f59e0b' }}>{latest.score?.toFixed(1)}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/100</div>
            </div>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Rules Triggered</div>
              <div style={{ fontSize: '36px', fontWeight: '800', color: '#ef4444' }}>{latest.triggeredRules?.length || 0}</div>
            </div>
          </div>

          {/* Contributing Factors + Radar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Factors */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '16px' }}>Contributing Risk Factors</h3>
              {latest.factors?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {latest.factors.map((factor, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px', background: 'rgba(239,68,68,0.06)',
                      borderRadius: '8px', borderLeft: '3px solid #ef4444',
                    }}>
                      <AlertTriangle size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{factor}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: '#10b981' }}>
                  ✓ All vitals within normal limits
                </div>
              )}

              {/* Current Vitals */}
              <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { label: 'HR', value: `${latest.heartRate} bpm`, color: '#ef4444', ok: latest.heartRate >= 60 && latest.heartRate <= 100 },
                  { label: 'SpO2', value: `${latest.spo2}%`, color: '#10b981', ok: latest.spo2 >= 95 },
                  { label: 'Temp', value: `${latest.temperature}°C`, color: '#f59e0b', ok: latest.temperature >= 36.5 && latest.temperature <= 37.5 },
                  { label: 'BP', value: latest.bloodPressure, color: '#8b5cf6', ok: true },
                  { label: 'RR', value: `${latest.respiratoryRate}/min`, color: '#3b82f6', ok: latest.respiratoryRate >= 12 && latest.respiratoryRate <= 20 },
                ].map((v) => (
                  <div key={v.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px', textAlign: 'center', border: `1px solid ${v.ok ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.3)'}` }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>{v.label}</div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: v.ok ? '#fff' : '#fca5a5' }}>{v.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Radar Chart */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '16px' }}>Vitals Risk Radar</h3>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <Radar name="Risk" dataKey="value" stroke={riskConfig.color} fill={riskConfig.color} fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Historical Trend */}
          {trendData.length > 1 && (
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} style={{ color: '#a78bfa' }} /> Anomaly Score History
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="time" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                  <Bar dataKey="score" radius={[3, 3, 0, 0]}>
                    {trendData.map((entry, i) => (
                      <Cell key={i} fill={RISK_CONFIG[entry.risk]?.color || '#64748b'} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {!loading && !latest && selected && (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center' }}>
          <Brain size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-secondary)' }}>No risk predictions yet for this patient.</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Predictions are generated as vitals arrive from the monitoring pipeline.</p>
        </div>
      )}
    </div>
  );
}
