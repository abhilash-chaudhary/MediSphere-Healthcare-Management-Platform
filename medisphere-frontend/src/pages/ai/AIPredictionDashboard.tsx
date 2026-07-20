import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getPredictionHistory, getLatestPrediction, predictCVD, predictDiabetes } from '../../services/aiApi';
import { Activity, Heart, TrendingUp, AlertTriangle, Clock, Cpu, BarChart3, Zap } from 'lucide-react';

interface Props {
  onNavigateToPrediction: (prediction: any) => void;
  onNavigateToExplanation: (patientId: string, data: any) => void;
}

export default function AIPredictionDashboard({ onNavigateToPrediction, onNavigateToExplanation }: Props) {
  const { user } = useSelector((state: RootState) => state.auth);
  const { selectedPatientId, patientProfile } = useSelector((state: RootState) => state.patient);

  const [predictions, setPredictions] = useState<any[]>([]);
  const [latestPrediction, setLatestPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [patientId, setPatientId] = useState('');

  // Form fields for manual prediction
  const [age, setAge] = useState('65');
  const [bp, setBp] = useState('145');
  const [bmi, setBmi] = useState('32');
  const [hba1c, setHba1c] = useState('7.5');
  const [cholesterol, setCholesterol] = useState('230');
  const [heartRate, setHeartRate] = useState('115');

  useEffect(() => {
    const pid = selectedPatientId || patientProfile?.id || '';
    if (pid) {
      setPatientId(pid);
      loadHistory(pid);
    }
  }, [selectedPatientId, patientProfile]);

  const loadHistory = async (pid: string) => {
    setLoading(true);
    try {
      const [histRes, latestRes] = await Promise.all([
        getPredictionHistory(pid),
        getLatestPrediction(pid)
      ]);
      if (histRes.data?.success) setPredictions(histRes.data.data);
      if (latestRes.data?.success) setLatestPrediction(latestRes.data.data);
    } catch (e) {}
    setLoading(false);
  };

  const handlePredict = async (type: 'cvd' | 'diabetes') => {
    const pid = patientId || selectedPatientId || user?.username;
    if (!pid) { alert('Enter a Patient ID'); return; }
    setPredicting(true);
    try {
      const payload = {
        patientId: pid,
        age: parseInt(age) || null,
        bloodPressure: parseInt(bp) || null,
        bmi: parseFloat(bmi) || null,
        hba1c: parseFloat(hba1c) || null,
        cholesterol: parseFloat(cholesterol) || null,
        heartRate: parseInt(heartRate) || null
      };
      const res = type === 'cvd'
        ? await predictCVD(payload)
        : await predictDiabetes(payload);

      if (res.data?.success) {
        setLatestPrediction(res.data.data);
        loadHistory(pid);
        onNavigateToPrediction(res.data.data);
      }
    } catch (e) {
      alert('Prediction failed. Check backend connectivity.');
    }
    setPredicting(false);
  };

  const riskColor = (level: string) => {
    if (level === 'HIGH') return '#ef4444';
    if (level === 'MEDIUM') return '#f59e0b';
    return '#10b981';
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <Cpu size={28} style={{ color: 'var(--color-primary)' }} />
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>AI Risk Prediction Dashboard</h2>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Rule-based cardiovascular & diabetes risk assessment engine
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      {latestPrediction && (
        <div className="grid-4" style={{ marginBottom: '28px' }}>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <Heart size={20} style={{ color: riskColor(latestPrediction.riskLevel), marginBottom: '8px' }} />
            <div style={{ fontSize: '28px', fontWeight: '700', color: riskColor(latestPrediction.riskLevel) }}>
              {latestPrediction.riskLevel}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Current Risk</div>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <TrendingUp size={20} style={{ color: 'var(--color-primary)', marginBottom: '8px' }} />
            <div style={{ fontSize: '28px', fontWeight: '700' }}>{latestPrediction.riskPercentage}%</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Risk Score</div>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <Zap size={20} style={{ color: '#a78bfa', marginBottom: '8px' }} />
            <div style={{ fontSize: '28px', fontWeight: '700' }}>{latestPrediction.confidence}%</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Confidence</div>
          </div>
          <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
            <Clock size={20} style={{ color: 'var(--color-info)', marginBottom: '8px' }} />
            <div style={{ fontSize: '16px', fontWeight: '600' }}>{latestPrediction.predictionDate}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Prediction Date</div>
          </div>
        </div>
      )}

      <div className="grid-2" style={{ gap: '28px' }}>
        {/* Prediction Input Form */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} style={{ color: 'var(--color-primary)' }} />
            Patient Health Metrics
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label>Patient ID</label>
              <input value={patientId} onChange={e => setPatientId(e.target.value)}
                placeholder="e.g. PAT101" />
            </div>
            <div className="grid-2" style={{ gap: '12px' }}>
              <div>
                <label>Age</label>
                <input type="number" value={age} onChange={e => setAge(e.target.value)} />
              </div>
              <div>
                <label>Blood Pressure (Systolic)</label>
                <input type="number" value={bp} onChange={e => setBp(e.target.value)} />
              </div>
            </div>
            <div className="grid-2" style={{ gap: '12px' }}>
              <div>
                <label>BMI</label>
                <input type="number" step="0.1" value={bmi} onChange={e => setBmi(e.target.value)} />
              </div>
              <div>
                <label>HbA1c (%)</label>
                <input type="number" step="0.1" value={hba1c} onChange={e => setHba1c(e.target.value)} />
              </div>
            </div>
            <div className="grid-2" style={{ gap: '12px' }}>
              <div>
                <label>Cholesterol (mg/dL)</label>
                <input type="number" value={cholesterol} onChange={e => setCholesterol(e.target.value)} />
              </div>
              <div>
                <label>Heart Rate (bpm)</label>
                <input type="number" value={heartRate} onChange={e => setHeartRate(e.target.value)} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button className="btn btn-primary" style={{ flex: 1 }}
                onClick={() => handlePredict('cvd')} disabled={predicting}>
                <Heart size={16} /> {predicting ? 'Analyzing...' : 'Predict CVD Risk'}
              </button>
              <button className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}
                onClick={() => handlePredict('diabetes')} disabled={predicting}>
                <Activity size={16} /> {predicting ? 'Analyzing...' : 'Predict Diabetes Risk'}
              </button>
            </div>
          </div>
        </div>

        {/* Prediction History */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={18} style={{ color: 'var(--color-primary)' }} />
            Prediction History
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
          ) : predictions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
              No prediction history found. Run your first prediction using the form.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
              {predictions.map((p: any, idx: number) => (
                <div key={p.id || idx}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 16px', borderRadius: '8px',
                    background: 'rgba(0,0,0,0.15)', border: '1px solid var(--border-color)',
                    cursor: 'pointer', transition: 'var(--transition-smooth)'
                  }}
                  onClick={() => onNavigateToPrediction(p)}
                  onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--border-glow)')}
                  onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border-color)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {p.riskType === 'CARDIO'
                      ? <Heart size={16} style={{ color: riskColor(p.riskLevel) }} />
                      : <Activity size={16} style={{ color: riskColor(p.riskLevel) }} />
                    }
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>
                        {p.riskType === 'CARDIO' ? 'Cardiovascular' : 'Diabetes'} Risk
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.predictionDate}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className={`badge badge-${p.riskLevel?.toLowerCase()}`}>{p.riskLevel}</span>
                    <span style={{ fontSize: '14px', fontWeight: '700' }}>{p.riskPercentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
