import React, { useState, useEffect } from 'react';
import { getExplanation, generateExplanation } from '../../services/aiApi';
import { ArrowLeft, BarChart3, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface Props {
  patientId: string;
  predictionData?: any;
  onBack: () => void;
}

export default function ShapExplanation({ patientId, predictionData, onBack }: Props) {
  const [explanation, setExplanation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patientId) {
      loadExplanation();
    }
  }, [patientId]);

  const loadExplanation = async () => {
    setLoading(true);
    try {
      // Try to fetch existing explanation first
      const res = await getExplanation(patientId);
      if (res.data?.success && res.data.data) {
        setExplanation(res.data.data);
      } else if (predictionData) {
        // Generate a new explanation from prediction data
        await handleGenerate();
      }
    } catch (e) {
      // If not found, generate one
      if (predictionData) {
        await handleGenerate();
      }
    }
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!predictionData) return;
    setLoading(true);
    try {
      const payload = {
        patientId,
        age: predictionData.age || 65,
        bloodPressure: predictionData.bloodPressure || 145,
        bmi: predictionData.bmi || 32,
        hba1c: predictionData.hba1c || 7.5,
        cholesterol: predictionData.cholesterol || 230,
        heartRate: predictionData.heartRate || 115,
        riskLevel: predictionData.riskLevel || 'HIGH'
      };
      const res = await generateExplanation(patientId, payload);
      if (res.data?.success) {
        setExplanation(res.data.data);
      }
    } catch (e) {
      alert('Failed to generate explanation');
    }
    setLoading(false);
  };

  const maxContribution = 20; // Maximum possible single-factor contribution

  const factorColors: Record<string, string> = {
    'Blood Pressure': '#ef4444',
    'HbA1c': '#f59e0b',
    'Cholesterol': '#8b5cf6',
    'Age': '#3b82f6',
    'BMI': '#06b6d4',
    'Heart Rate': '#ec4899',
  };

  const riskColor = (level: string) => {
    if (level === 'HIGH') return '#ef4444';
    if (level === 'MEDIUM') return '#f59e0b';
    return '#10b981';
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <button className="btn btn-secondary" onClick={onBack} style={{ padding: '8px 12px' }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '24px' }}>SHAP Explainability Report</h2>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Factor contribution analysis for Patient: <strong>{patientId}</strong>
          </span>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div className="spin-loader" style={{ display: 'inline-block', marginBottom: '12px' }}>
            <BarChart3 size={32} />
          </div>
          <div>Analyzing prediction factors...</div>
        </div>
      ) : !explanation ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <AlertTriangle size={32} style={{ color: 'var(--color-warning)', marginBottom: '12px' }} />
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            No explanation data available for this patient.
          </p>
          <button className="btn btn-primary" onClick={handleGenerate}>
            <BarChart3 size={16} /> Generate Explanation
          </button>
        </div>
      ) : (
        <>
          {/* Risk Overview */}
          <div className="glass-panel" style={{
            padding: '24px', marginBottom: '28px',
            borderLeft: `4px solid ${riskColor(explanation.risk)}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Overall Risk Assessment</div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: riskColor(explanation.risk) }}>
                  {explanation.risk} RISK
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Top Contributing Factors</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {(explanation.topFactors || []).map((f: string) => (
                    <span key={f} className="badge" style={{
                      background: `${factorColors[f] || '#64748b'}15`,
                      color: factorColors[f] || '#94a3b8',
                      border: `1px solid ${factorColors[f] || '#64748b'}30`
                    }}>
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Factor Contribution Bars */}
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} style={{ color: 'var(--color-primary)' }} />
              Factor Contribution Analysis
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {(explanation.factors || []).map((factor: any, idx: number) => {
                const barColor = factorColors[factor.name] || '#64748b';
                const barWidth = (factor.contribution / maxContribution) * 100;

                return (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: barColor
                        }} />
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>{factor.name}</span>
                      </div>
                      <span style={{
                        fontWeight: '700', fontSize: '14px',
                        color: factor.contribution > 0 ? barColor : 'var(--text-muted)'
                      }}>
                        {factor.contribution > 0 ? `+${factor.contribution}` : '0'}
                      </span>
                    </div>

                    <div style={{
                      width: '100%', height: '10px', borderRadius: '5px',
                      background: 'rgba(255,255,255,0.05)', overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${barWidth}%`, height: '100%', borderRadius: '5px',
                        background: `linear-gradient(90deg, ${barColor}, ${barColor}aa)`,
                        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: factor.contribution > 0 ? `0 0 8px ${barColor}30` : 'none'
                      }} />
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {factor.description}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interpretation Guide */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={18} style={{ color: 'var(--color-info)' }} />
              Interpretation Guide
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--color-success)', marginTop: '3px', flexShrink: 0 }} />
                <span>Each bar represents a health factor's contribution to the overall risk score.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--color-success)', marginTop: '3px', flexShrink: 0 }} />
                <span>Higher contributions indicate factors that strongly influence the prediction outcome.</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--color-success)', marginTop: '3px', flexShrink: 0 }} />
                <span>Risk scoring: Age {'>'} 60 (+15), BP {'>'} 140 (+20), BMI {'>'} 30 (+15), HbA1c {'>'} 7 (+20), Cholesterol {'>'} 220 (+20), Heart Rate {'>'} 110 (+10).</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--color-success)', marginTop: '3px', flexShrink: 0 }} />
                <span>Risk levels: 0–30 = LOW, 31–60 = MEDIUM, 61+ = HIGH.</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
