import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Heart, Droplet, Thermometer, Activity, Phone, Eye, X } from 'lucide-react';

interface Alert {
  alertId: string;
  patientId: string;
  patientName: string;
  severity: string;
  type: string;
  message: string;
  confidence: number;
  risk: string;
  vitals: {
    heartRate?: number;
    spo2?: number;
    temperature?: number;
    bloodPressure?: string;
    respiratoryRate?: number;
  };
  status: string;
  createdAt: string;
}

interface Props {
  alert: Alert;
  onAcknowledge: (alertId: string) => void;
  onClose: () => void;
  onViewRecord?: (patientId: string) => void;
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; glow: string; label: string }> = {
  CRITICAL: { bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.6)', glow: '0 0 40px rgba(220,38,38,0.35)', label: '🚨 CRITICAL' },
  HIGH:     { bg: 'rgba(234,88,12,0.12)',  border: 'rgba(234,88,12,0.6)',  glow: '0 0 40px rgba(234,88,12,0.3)',  label: '⚠️ HIGH' },
  MEDIUM:   { bg: 'rgba(217,119,6,0.12)',  border: 'rgba(217,119,6,0.6)',  glow: '0 0 40px rgba(217,119,6,0.25)', label: '⚠ MEDIUM' },
  LOW:      { bg: 'rgba(22,163,74,0.12)',  border: 'rgba(22,163,74,0.5)',  glow: '0 0 40px rgba(22,163,74,0.2)',  label: 'ℹ LOW' },
};

export default function CriticalAlertModal({ alert, onAcknowledge, onClose, onViewRecord }: Props) {
  const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.HIGH;
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const vitals = alert.vitals || {};

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        width: '520px', maxWidth: '95vw',
        background: 'linear-gradient(135deg, #0d1117 0%, #1a1f2e 100%)',
        border: `1px solid ${style.border}`,
        borderRadius: '16px',
        boxShadow: style.glow,
        overflow: 'hidden',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ background: style.bg, padding: '20px 24px', borderBottom: `1px solid ${style.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <AlertTriangle size={22} style={{ color: style.border.replace('0.6)', '1)') }} />
              <span style={{ fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '0.02em' }}>
                {style.label} ALERT
              </span>
              <span style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                {alert.type}
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Patient: <strong style={{ color: '#fff' }}>{alert.patientName || alert.patientId}</strong>
              <span style={{ marginLeft: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                {new Date(alert.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Alert Message */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: 1.6, margin: 0 }}>{alert.message}</p>
        </div>

        {/* Vitals Snapshot */}
        {Object.keys(vitals).length > 0 && (
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '12px' }}>Vitals at Time of Alert</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {vitals.heartRate != null && (
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <Heart size={14} style={{ color: '#ef4444', marginBottom: '4px' }} />
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#fca5a5' }}>{vitals.heartRate}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>BPM</div>
                </div>
              )}
              {vitals.spo2 != null && (
                <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <Activity size={14} style={{ color: '#10b981', marginBottom: '4px' }} />
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#6ee7b7' }}>{vitals.spo2}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SpO2 %</div>
                </div>
              )}
              {vitals.temperature != null && (
                <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <Thermometer size={14} style={{ color: '#f59e0b', marginBottom: '4px' }} />
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#fcd34d' }}>{vitals.temperature}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>°C</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Prediction */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AI Anomaly Prediction</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                padding: '4px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
                background: alert.risk === 'High' ? 'rgba(220,38,38,0.2)' : alert.risk === 'Medium' ? 'rgba(217,119,6,0.2)' : 'rgba(22,163,74,0.2)',
                color: alert.risk === 'High' ? '#fca5a5' : alert.risk === 'Medium' ? '#fcd34d' : '#6ee7b7',
              }}>
                {alert.risk || 'High'} Risk
              </span>
            </div>
          </div>
          {alert.confidence != null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Confidence</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: '#a78bfa' }}>{alert.confidence}%</div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ padding: '20px 24px', display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onAcknowledge(alert.alertId)}
            style={{
              flex: 1, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
              color: '#fff', padding: '12px', borderRadius: '10px', cursor: 'pointer',
              fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            ✓ Acknowledge Alert
          </button>
          <button
            onClick={() => { onViewRecord?.(alert.patientId); onClose(); }}
            style={{
              flex: 1, background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)',
              color: '#60a5fa', padding: '12px', borderRadius: '10px', cursor: 'pointer',
              fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            <Eye size={14} /> View Record
          </button>
          <button
            style={{
              background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)',
              color: '#a78bfa', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer',
              fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Phone size={14} /> Call
          </button>
        </div>
      </div>
    </div>
  );
}
