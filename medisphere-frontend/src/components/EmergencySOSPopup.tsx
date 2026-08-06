import React, { useState, useEffect } from 'react';
import { AlertTriangle, Heart, Activity, Thermometer, Eye, CheckCircle, Volume2, VolumeX, X, ShieldAlert, Phone } from 'lucide-react';
import { SOSAlertPayload, playEmergencyAudioChime } from '../services/sosService';

interface Props {
  user?: {
    username: string;
    roles: string[];
  } | null;
  onViewPatientRecord?: (patientId: string) => void;
}

export default function EmergencySOSPopup({ user, onViewPatientRecord }: Props) {
  const [alert, setAlert] = useState<SOSAlertPayload | null>(null);
  const [muted, setMuted] = useState(false);

  const isDoctor = user?.roles?.some((r: string) => r.toUpperCase().includes('DOCTOR')) ?? false;

  useEffect(() => {
    // 1. Listen for custom intra-window SOS events
    const handleSOSEvent = (e: Event) => {
      const customEvent = e as CustomEvent<SOSAlertPayload>;
      if (customEvent.detail) {
        setAlert(customEvent.detail);
        if (!muted) playEmergencyAudioChime();
      }
    };

    // 2. Listen for cross-tab storage events
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'medisphere_latest_sos' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setAlert(parsed);
          if (!muted) playEmergencyAudioChime();
        } catch {}
      }
    };

    window.addEventListener('medisphere_emergency_sos', handleSOSEvent);
    window.addEventListener('storage', handleStorageEvent);

    return () => {
      window.removeEventListener('medisphere_emergency_sos', handleSOSEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, [muted]);

  if (isDoctor || !alert) return null;

  const vitals = alert.vitals || {};

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.25s ease-out',
        padding: '20px'
      }}
    >
      <div
        style={{
          width: '560px',
          maxWidth: '95vw',
          background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
          border: '2px solid #ef4444',
          borderRadius: '20px',
          boxShadow: '0 0 50px rgba(239, 68, 68, 0.45)',
          overflow: 'hidden',
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Top Pulsing Emergency Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            padding: '18px 24px',
            color: '#fff',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                background: '#fff',
                color: '#dc2626',
                borderRadius: '50%',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 15px rgba(255,255,255,0.6)'
              }}
            >
              <ShieldAlert size={24} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '900', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                🚨 EMERGENCY SOS ALERT
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9 }}>
                Immediate Doctor Attention Required
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setMuted(!muted)}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: '600' }}
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              {muted ? 'Muted' : 'Sound On'}
            </button>
            <button
              onClick={() => setAlert(null)}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '8px', padding: '6px', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Patient & Doctor Banner */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>Patient Triggered</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>{alert.patientName}</div>
              <div style={{ fontSize: '12px', color: '#60a5fa' }}>ID: {alert.patientId}</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>Assigned Caregiver</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#34d399', marginTop: '2px' }}>{alert.assignedDoctorName}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>User: {alert.assignedDoctorUsername}</div>
            </div>
          </div>

          {/* Alert Message */}
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '14px 18px', color: '#fca5a5', fontSize: '14px', fontWeight: '500', lineHeight: 1.5 }}>
            {alert.message}
          </div>

          {/* Vital Signs Snapshot */}
          <div>
            <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '700', marginBottom: '10px' }}>
              Telemetry Vitals at Time of SOS
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                <Heart size={16} style={{ color: '#ef4444', marginBottom: '4px' }} />
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#fca5a5' }}>{vitals.heartRate || 138}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>BPM</div>
              </div>

              <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                <Activity size={16} style={{ color: '#10b981', marginBottom: '4px' }} />
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#6ee7b7' }}>{vitals.spo2 || 91}%</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>SpO2</div>
              </div>

              <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                <Thermometer size={16} style={{ color: '#f59e0b', marginBottom: '4px' }} />
                <div style={{ fontSize: '18px', fontWeight: '800', color: '#fcd34d' }}>{vitals.temperature || 37.3}°C</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Temp</div>
              </div>

              <div style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                <Activity size={16} style={{ color: '#3b82f6', marginBottom: '4px' }} />
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#93c5fd', marginTop: '2px' }}>{vitals.bloodPressure || '146/94'}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>BP mmHg</div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={() => {
                if (onViewPatientRecord) {
                  onViewPatientRecord(alert.patientId);
                }
                setAlert(null);
              }}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: '#fff',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(59,130,246,0.3)'
              }}
            >
              <Eye size={16} /> View Patient Record & Telemetry
            </button>

            <button
              onClick={() => setAlert(null)}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(16,185,129,0.4)',
                background: 'rgba(16,185,129,0.15)',
                color: '#34d399',
                fontWeight: '700',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle size={16} /> Acknowledge SOS
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
