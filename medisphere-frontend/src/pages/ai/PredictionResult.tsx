import React from 'react';
import { Heart, Activity, TrendingUp, Zap, Clock, Shield, ArrowLeft } from 'lucide-react';

interface Props {
  prediction: any;
  onBack: () => void;
  onViewExplanation: () => void;
}

export default function PredictionResult({ prediction, onBack, onViewExplanation }: Props) {
  if (!prediction) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
        No prediction data available. Run a prediction first.
      </div>
    );
  }

  const riskColor = (level: string) => {
    if (level === 'HIGH') return '#ef4444';
    if (level === 'MEDIUM') return '#f59e0b';
    return '#10b981';
  };

  const riskGradient = (level: string) => {
    if (level === 'HIGH') return 'linear-gradient(135deg, #ef4444, #dc2626)';
    if (level === 'MEDIUM') return 'linear-gradient(135deg, #f59e0b, #d97706)';
    return 'linear-gradient(135deg, #10b981, #059669)';
  };

  const color = riskColor(prediction.riskLevel);
  const percentage = prediction.riskPercentage;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ padding: '8px 12px' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>Prediction Result</h2>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {prediction.riskType === 'CARDIO' ? 'Cardiovascular Disease' : 'Diabetes Complication'} Risk Analysis
          </span>
        </div>
      </div>

      {/* Main Result Card */}
      <div className="glass-panel" style={{
        padding: '40px', textAlign: 'center', marginBottom: '28px',
        borderColor: `${color}33`, position: 'relative', overflow: 'hidden'
      }}>
        {/* Glow effect */}
        <div style={{
          position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)',
          width: '300px', height: '300px', borderRadius: '50%',
          background: `radial-gradient(circle, ${color}15, transparent 70%)`,
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {prediction.riskType === 'CARDIO'
            ? <Heart size={48} style={{ color, marginBottom: '16px' }} />
            : <Activity size={48} style={{ color, marginBottom: '16px' }} />
          }

          <div style={{
            fontSize: '56px', fontWeight: '800',
            background: riskGradient(prediction.riskLevel),
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            lineHeight: 1.1
          }}>
            {prediction.riskLevel}
          </div>

          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '32px' }}>
            Patient: <strong style={{ color: '#fff' }}>{prediction.patientId}</strong>
          </div>

          {/* Risk percentage bar */}
          <div style={{ maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Risk Score</span>
              <span style={{ fontWeight: '700', color }}>{percentage}%</span>
            </div>
            <div style={{
              width: '100%', height: '12px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.08)', overflow: 'hidden'
            }}>
              <div style={{
                width: `${percentage}%`, height: '100%', borderRadius: '6px',
                background: riskGradient(prediction.riskLevel),
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: `0 0 12px ${color}40`
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Detail Cards */}
      <div className="grid-3" style={{ marginBottom: '28px' }}>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <TrendingUp size={24} style={{ color: 'var(--color-primary)', marginBottom: '12px' }} />
          <div style={{ fontSize: '32px', fontWeight: '700' }}>{percentage}%</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Risk Percentage</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <Zap size={24} style={{ color: '#a78bfa', marginBottom: '12px' }} />
          <div style={{ fontSize: '32px', fontWeight: '700' }}>{prediction.confidence}%</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Prediction Confidence</div>
        </div>
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center' }}>
          <Shield size={24} style={{ color: 'var(--color-info)', marginBottom: '12px' }} />
          <div style={{ fontSize: '32px', fontWeight: '700' }}>v{prediction.modelVersion}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Model Version</div>
        </div>
      </div>

      {/* Patient Details & Actions */}
      <div className="grid-2">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} style={{ color: 'var(--color-primary)' }} /> Prediction Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              ['Patient ID', prediction.patientId],
              ['Risk Type', prediction.riskType === 'CARDIO' ? 'Cardiovascular Disease' : 'Diabetes Complication'],
              ['Risk Level', prediction.riskLevel],
              ['Risk Score', `${prediction.riskPercentage}%`],
              ['Confidence', `${prediction.confidence}%`],
              ['Prediction Date', prediction.predictionDate],
              ['Model Version', prediction.modelVersion],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px',
                padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight: '600' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>Understand This Prediction</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
              View the SHAP-style explainability report to understand which health factors contributed most to this risk assessment.
            </p>
          </div>
          <button className="btn btn-primary" onClick={onViewExplanation} style={{ padding: '14px 32px' }}>
            <Activity size={16} /> View Explanation Report
          </button>
        </div>
      </div>
    </div>
  );
}
