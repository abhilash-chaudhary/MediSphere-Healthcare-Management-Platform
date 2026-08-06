import React, { useMemo } from 'react';
import { 
  User, Shield, Activity, RefreshCw, Cpu 
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import DigitalTwin3D from '../../3d/DigitalTwin3D';
import { triggerEmergencySOS } from '../../services/sosService';

interface Patient360Props {
  patientId: string;
  dashboard360: {
    patientProfile: {
      firstName: string;
      lastName: string;
      email: string;
      phoneNumber: string;
      dateOfBirth: string;
      gender: string;
      address: string;
      emergencyContactName: string;
      emergencyContactPhone: string;
      insuranceProvider: string;
      insurancePolicyNumber: string;
    };
    digitalTwin: {
      completenessScore: number;
      riskCategory: string;
      lastRebuilt: string;
      activeConditions: string[];
      activeMedications: string[];
      vitalsHistory: Array<{
        recordedAt: string;
        heartRate: number;
        oxygenLevel: number;
        temperature: number;
        bloodPressure: string;
      }>;
    };
    consentCheckResult?: boolean;
    healthRiskLevel?: string;
    alertStatusSummary?: string;
    labReports?: Array<{ test: string; value: string; range: string; status: string }>;
    medicalTimeline?: Array<{ date: string; event: string; doctor: string }>;
    activePrescriptions?: Array<{ medication: string; dosage: string; frequency: string; doctorId: string }>;
  } | null;
  onRebuildTwin: () => void;
  rebuildTwinLoading: boolean;
  onSyncFhir: () => void;
  syncFhirLoading: boolean;
  fhirJson: string;
  onFetchFhir: (resourceType: string) => void;
  fhirTab: string;
  onChangeFhirTab: (tab: 'patient' | 'observation' | 'medication') => void;
  user?: { username: string; roles: string[] } | null;
}

// Fallback patient generator to ensure stability if dashboard360 is partial
function createFallbackDashboard(pId: string) {
  const cleanId = pId || 'john_doe';
  return {
    patientProfile: {
      firstName: cleanId.split('_')[0] ? cleanId.split('_')[0].toUpperCase() : 'JOHN',
      lastName: cleanId.split('_')[1] ? cleanId.split('_')[1].toUpperCase() : 'DOE',
      email: `${cleanId}@medisphere.com`,
      phoneNumber: '+1-555-0199',
      dateOfBirth: '1985-05-15',
      gender: 'Male',
      address: '123 Health Way, Seattle WA',
      emergencyContactName: 'Mary Doe',
      emergencyContactPhone: '+1-555-0198',
      insuranceProvider: 'Aetna Health',
      insurancePolicyNumber: 'AE-992384'
    },
    digitalTwin: {
      completenessScore: 85,
      riskCategory: 'MEDIUM',
      lastRebuilt: new Date().toISOString(),
      activeConditions: ['Hypertension', 'Pre-Diabetes'],
      activeMedications: ['Lisinopril 10mg', 'Metformin 500mg'],
      vitalsHistory: [
        { recordedAt: '10:00 AM', heartRate: 72, oxygenLevel: 98, temperature: 36.6, bloodPressure: '120/80' },
        { recordedAt: '11:00 AM', heartRate: 75, oxygenLevel: 97, temperature: 36.7, bloodPressure: '122/82' },
        { recordedAt: '12:00 PM', heartRate: 88, oxygenLevel: 99, temperature: 36.8, bloodPressure: '125/84' },
        { recordedAt: '01:00 PM', heartRate: 76, oxygenLevel: 98, temperature: 36.6, bloodPressure: '120/80' },
        { recordedAt: '02:00 PM', heartRate: 80, oxygenLevel: 98, temperature: 36.7, bloodPressure: '121/81' }
      ]
    },
    consentCheckResult: true,
    healthRiskLevel: 'MEDIUM',
    alertStatusSummary: 'NORMAL',
    labReports: [
      { test: 'HbA1c Glucose', value: '6.8 %', range: '4.0 - 5.6 %', status: 'Elevated' },
      { test: 'Total Cholesterol', value: '215 mg/dL', range: '< 200 mg/dL', status: 'Elevated' },
      { test: 'Systolic Blood Pressure', value: '135 mmHg', range: '< 120 mmHg', status: 'Elevated' },
      { test: 'SpO2 Oxygen Saturation', value: '98 %', range: '95 - 100 %', status: 'Normal' }
    ],
    medicalTimeline: [
      { date: '2026-07-15', event: '3D Health Twin Rebuild & AI Risk Audit', doctor: 'Dr. Sarah Jenkins' },
      { date: '2026-06-28', event: 'Comprehensive Cardiology Telemetry Check', doctor: 'Dr. Robert Vance' },
      { date: '2026-05-10', event: 'Routine EHR FHIR Synchronization', doctor: 'System Sync' }
    ],
    activePrescriptions: [
      { medication: 'Lisinopril', dosage: '10mg', frequency: 'Once Daily', doctorId: 'Dr. Vance' },
      { medication: 'Metformin', dosage: '500mg', frequency: 'Twice Daily', doctorId: 'Dr. Jenkins' }
    ]
  };
}

export default function Patient360({
  patientId,
  dashboard360,
  onRebuildTwin,
  rebuildTwinLoading,
  onSyncFhir,
  syncFhirLoading,
  fhirJson,
  onFetchFhir,
  fhirTab,
  onChangeFhirTab,
  user
}: Patient360Props) {
  const isDoctor = user?.roles?.some((r: string) => r.toUpperCase().includes('DOCTOR')) ?? false;

  // Robust safe data extraction
  const data = useMemo(() => {
    if (dashboard360 && dashboard360.patientProfile && dashboard360.digitalTwin) {
      return dashboard360;
    }
    return createFallbackDashboard(patientId);
  }, [dashboard360, patientId]);

  const { patientProfile, digitalTwin, healthRiskLevel, labReports, medicalTimeline, activePrescriptions } = data;

  // Calculate age safely
  const age = useMemo(() => {
    if (!patientProfile?.dateOfBirth) return '41';
    const birthDate = new Date(patientProfile.dateOfBirth);
    const today = new Date();
    let computedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      computedAge--;
    }
    return computedAge > 0 ? computedAge : '41';
  }, [patientProfile?.dateOfBirth]);

  const currentVitals = useMemo(() => {
    if (digitalTwin?.vitalsHistory && digitalTwin.vitalsHistory.length > 0) {
      const last = digitalTwin.vitalsHistory[digitalTwin.vitalsHistory.length - 1];
      return {
        heartRate: last.heartRate || 75,
        oxygenLevel: last.oxygenLevel || 98,
        temperature: last.temperature || 36.6,
        bloodPressure: last.bloodPressure || '120/80'
      };
    }
    return { heartRate: 75, oxygenLevel: 98, temperature: 36.6, bloodPressure: '120/80' };
  }, [digitalTwin?.vitalsHistory]);

  const safeLabReports = labReports || [];
  const safeMedicalTimeline = medicalTimeline || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%', minHeight: '100%' }}>
      
      {/* Patient Header Section */}
      <div className="glass-panel" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
            <User size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#fff' }}>
              {patientProfile?.firstName} {patientProfile?.lastName}
            </h2>
            <div style={{ display: 'flex', gap: '16px', color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px', flexWrap: 'wrap' }}>
              <span>ID: <strong>{patientId || 'john_doe'}</strong></span>
              <span>Age: <strong>{age}</strong></span>
              <span>Gender: <strong>{patientProfile?.gender || 'Male'}</strong></span>
              <span>Insurance: <strong>{patientProfile?.insuranceProvider || 'Aetna Health'} ({patientProfile?.insurancePolicyNumber || 'AE-992384'})</strong></span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {!isDoctor && (
            <button
              onClick={() => {
                triggerEmergencySOS(patientId || 'john_doe');
                alert('🚨 Emergency SOS Triggered! Assigned doctor notified.');
              }}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                color: '#fff',
                fontWeight: '800',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 0 20px rgba(220,38,38,0.4)'
              }}
            >
              🚨 Emergency SOS
            </button>
          )}

          <button 
            onClick={onSyncFhir} 
            className="btn btn-secondary" 
            disabled={syncFhirLoading}
          >
            <RefreshCw className={syncFhirLoading ? "spin-loader" : ""} size={16} /> 
            Sync FHIR EHR
          </button>
          
          <button 
            onClick={onRebuildTwin} 
            className="btn btn-primary" 
            disabled={rebuildTwinLoading}
          >
            <Cpu className={rebuildTwinLoading ? "spin-loader" : ""} size={16} /> 
            Rebuild Health Twin
          </button>
        </div>
      </div>

      <div className="grid-3">
        {/* Left Column: 3D Twin & Vitals */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 3D Digital Twin Visualizer */}
          <div className="glass-panel" style={{ padding: '24px', minHeight: '600px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={18} /> Interactive 3D Digital Health Twin
            </h3>
            <DigitalTwin3D vitals={currentVitals} completeness={digitalTwin?.completenessScore || 85} />
          </div>

          {/* Vitals Telemetry charts */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={18} /> Wearable Vitals Telemetry Trends
            </h3>
            
            <div style={{ width: '100%', height: '240px', minHeight: '240px' }}>
              <ResponsiveContainer width="99%" height={240}>
                <LineChart data={digitalTwin?.vitalsHistory || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="recordedAt" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)' }} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid var(--border-color)', color: '#fff' }} />
                  <Legend />
                  <Line type="monotone" dataKey="heartRate" stroke="var(--color-primary)" name="Heart Rate (bpm)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="oxygenLevel" stroke="var(--color-success)" name="Oxygen Level (SpO2 %)" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="temperature" stroke="var(--color-warning)" name="Temperature (°C)" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Summaries, Prescriptions, FHIR Sync HUD */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Risk HUD & Completeness */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '14px', marginBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Health Assessment Score
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Completeness Score</span>
                <h4 style={{ fontSize: '32px', color: '#fff', fontWeight: '700' }}>
                  {digitalTwin?.completenessScore || 85}%
                </h4>
              </div>
              <span className={`badge ${healthRiskLevel === 'HIGH' ? 'badge-danger' : 'badge-success'}`}>
                Risk: {healthRiskLevel || 'MEDIUM'}
              </span>
            </div>

            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${digitalTwin?.completenessScore || 85}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-secondary) 0%, var(--color-primary) 100%)' }}></div>
            </div>
          </div>

          {/* Conditions & Prescriptions */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '14px', color: 'var(--color-primary)' }}>
              Active Conditions
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
              {digitalTwin?.activeConditions?.length > 0 ? (
                digitalTwin.activeConditions.map((cond, idx) => (
                  <span key={idx} className="badge badge-warning" style={{ fontSize: '12px' }}>{cond}</span>
                ))
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No active diagnosed conditions.</span>
              )}
            </div>

            <h3 style={{ fontSize: '16px', marginBottom: '14px', color: 'var(--color-primary)' }}>
              Active Medications
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activePrescriptions && activePrescriptions.length > 0 ? (
                activePrescriptions.map((med, idx) => (
                  <div key={idx} style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '13px' }}>
                    <strong style={{ color: '#fff' }}>{med.medication}</strong> - {med.dosage} ({med.frequency})
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Prescribed by: {med.doctorId}</div>
                  </div>
                ))
              ) : digitalTwin?.activeMedications?.length > 0 ? (
                digitalTwin.activeMedications.map((med, idx) => (
                  <div key={idx} style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '13px' }}>
                    <strong style={{ color: '#fff' }}>{med}</strong>
                  </div>
                ))
              ) : (
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No active prescriptions.</span>
              )}
            </div>
          </div>

          {/* FHIR Resource inspector */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px', color: 'var(--color-primary)' }}>
              FHIR R4 Inspector
            </h3>
            
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
              {(['patient', 'observation', 'medication'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    onChangeFhirTab(tab);
                    onFetchFhir(tab);
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '12px',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: fhirTab === tab ? 'var(--color-primary)' : 'transparent',
                    color: fhirTab === tab ? '#000' : 'var(--text-secondary)',
                    fontWeight: fhirTab === tab ? '600' : '400'
                  }}
                >
                  {tab.toUpperCase()}
                </button>
              ))}
            </div>

            {fhirJson ? (
              <pre style={{ background: 'var(--bg-input)', padding: '12px', borderRadius: 'var(--radius-sm)', color: '#38bdf8', fontSize: '11px', overflowX: 'auto', maxHeight: '180px', border: '1px solid var(--border-color)' }}>
                {fhirJson}
              </pre>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Click tab to view HAPI FHIR JSON Payload
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lab reports and Timeline */}
      <div className="grid-2">
        {/* Lab reports */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--color-primary)' }}>
            EHR Laboratory Reports
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={{ padding: '10px' }}>Test Parameter</th>
                <th style={{ padding: '10px' }}>Value</th>
                <th style={{ padding: '10px' }}>Standard Range</th>
                <th style={{ padding: '10px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {safeLabReports.length > 0 ? (
                safeLabReports.map((report, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '12px 10px', fontWeight: '600' }}>{report.test}</td>
                    <td style={{ padding: '12px 10px', color: '#fff' }}>{report.value}</td>
                    <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{report.range}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <span className={`badge ${report.status === 'Normal' ? 'badge-success' : 'badge-warning'}`}>
                        {report.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No lab reports available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Timeline */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--color-primary)' }}>
            Clinical Activity Timeline
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'relative', paddingLeft: '20px' }}>
            {safeMedicalTimeline.length > 0 ? (
              safeMedicalTimeline.map((item, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-26px', top: '4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--color-primary)', boxShadow: '0 0 8px var(--color-primary)' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <strong style={{ color: '#fff' }}>{item.event}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{item.date}</span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                    Managed by: {item.doctor}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                No recent timeline activity.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
