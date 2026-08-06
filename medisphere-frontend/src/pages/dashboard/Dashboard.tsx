import React, { useState } from 'react';
import { 
  Users, Activity, Building, Cpu, Radio, Shield, RefreshCw, BarChart3, Database, HeartPulse, Clock, AlertTriangle, Search, Eye, ShieldAlert, Heart
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { getAssignedPatientsForUser, getAllPatientsMaster } from '../../constants/patientAssignments';

interface DashboardProps {
  user: {
    username: string;
    roles: string[];
  } | null;
  metrics: {
    totalPatients: number;
    activePatients: number;
    connectedHospitals: number;
    digitalTwins: number;
    liveDevices: number;
    activeConsents: number;
    pendingSync: number;
    kafkaThroughput: string;
    mongodbStatus: string;
    apiHealth: string;
    uptime: string;
    criticalAlertsCount: number;
  };
  onViewPatient?: (patientId: string) => void;
}

export default function Dashboard({ user, metrics, onViewPatient }: DashboardProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const isAdmin = user?.roles?.some((r: string) => r.includes('ADMIN')) ?? false;
  const [searchTerm, setSearchTerm] = useState('');

  // Get patients for current logged-in role
  const displayedPatients = getAssignedPatientsForUser(user);
  const totalMasterCount = getAllPatientsMaster().length;

  const filteredPatients = displayedPatients.filter(p => 
    !searchTerm || 
    p.patientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.primaryCondition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sparkline data generators
  const generateSparklineData = (base: number) => {
    return Array.from({ length: 10 }, (_, i) => ({
      value: base + Math.sin(i) * (base * 0.1) + Math.random() * (base * 0.05)
    }));
  };

  const cardDetails = [
    { title: 'Total Patients', value: isAdmin ? totalMasterCount : displayedPatients.length, icon: Users, trend: '+4.2%', status: 'Normal', base: 1200 },
    { title: 'Active Patients', value: isAdmin ? totalMasterCount : displayedPatients.length, icon: Activity, trend: '+2.8%', status: 'Normal', base: 450 },
    { title: 'Connected Hospitals', value: metrics.connectedHospitals, icon: Building, trend: '0.0%', status: 'Healthy', base: 4 },
    { title: 'Digital Twins', value: isAdmin ? totalMasterCount : displayedPatients.length, icon: Cpu, trend: '+8.3%', status: 'Active', base: 310 },
    { title: 'Live Devices', value: metrics.liveDevices || (isAdmin ? totalMasterCount : displayedPatients.length), icon: Radio, trend: '+12.4%', status: 'Active', base: 85 },
    { title: 'Active Consents', value: metrics.activeConsents || (isAdmin ? totalMasterCount : displayedPatients.length), icon: Shield, trend: '+1.5%', status: 'HIPAA Audited', base: 290 },
    { title: 'Pending EHR Sync', value: metrics.pendingSync, icon: RefreshCw, trend: '-5.0%', status: 'Sync Queue', base: 15 },
    { title: 'Kafka Stream Rate', value: metrics.kafkaThroughput, icon: BarChart3, trend: '+25.1%', status: 'Streaming', base: 400 },
    { title: 'MongoDB Instance', value: metrics.mongodbStatus, icon: Database, trend: '100% Up', status: 'Online', base: 100 },
    { title: 'API Gateway Health', value: metrics.apiHealth, icon: HeartPulse, trend: '100% Up', status: 'Optimal', base: 100 },
    { title: 'System Uptime', value: metrics.uptime, icon: Clock, trend: 'Optimal', status: 'Online', base: 99 },
    { title: 'Critical Alerts', value: metrics.criticalAlertsCount, icon: AlertTriangle, trend: 'Immediate Action', status: metrics.criticalAlertsCount > 0 ? 'CRITICAL' : 'Clear', base: metrics.criticalAlertsCount }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="glass-panel" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', background: 'linear-gradient(135deg, #fff 40%, var(--color-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
            {isAdmin ? 'Admin Master Patient & EHR Dashboard' : `Doctor Clinical Portal — Dr. ${user?.username || 'Provider'}`}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            {isAdmin 
              ? 'Complete multi-patient clinical view showing all system patient data, live vitals telemetry, and AI risk prediction scores.' 
              : 'Real-time telemetry and clinical data for patients assigned specifically to your portal.'}
          </p>
        </div>

        <div style={{ background: isAdmin ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)', border: `1px solid ${isAdmin ? '#3b82f6' : '#10b981'}`, padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: isAdmin ? '#60a5fa' : '#34d399' }}>
          {isAdmin ? '🛡️ ADMIN FULL ACCESS (8 Patients)' : `👨‍⚕️ DOCTOR PORTAL (${displayedPatients.length} Patients)`}
        </div>
      </div>

      <div className="grid-4">
        {cardDetails.map((card, idx) => {
          const IconComponent = card.icon;
          const sparklineData = generateSparklineData(card.base);
          const isCritical = card.title === 'Critical Alerts' && card.value > 0;
          
          return (
            <div 
              key={idx} 
              className="glass-panel interactive" 
              style={{ 
                padding: '20px', 
                position: 'relative', 
                border: isCritical ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
                boxShadow: isCritical ? '0 0 15px rgba(239, 68, 68, 0.15)' : 'var(--shadow-premium)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {card.title}
                </span>
                <IconComponent size={18} style={{ color: isCritical ? 'var(--color-danger)' : 'var(--color-primary)' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '26px', fontWeight: '700', fontFamily: 'var(--font-display)', color: isCritical ? '#fca5a5' : '#fff' }}>
                  {card.value}
                </span>
                <span style={{ fontSize: '11px', color: card.trend.startsWith('-') ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: '600' }}>
                  {card.trend}
                </span>
              </div>

              {/* Sparkline Chart */}
              <div style={{ width: '100%', height: '32px', marginBottom: '8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sparklineData}>
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke={isCritical ? 'var(--color-danger)' : 'var(--color-primary)'} 
                      strokeWidth={1.5} 
                      dot={false} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge ${isCritical ? 'badge-critical' : 'badge-normal'}`} style={{ fontSize: '10px' }}>
                  {card.status}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Live Telemetry
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== Clinical Patient Data Section ===== */}
      <div className="glass-panel" style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={20} style={{ color: 'var(--color-primary)' }} />
              {isAdmin ? 'All Patient Telemetry & Health Twin Records' : `Patient Records Assigned to Dr. ${user?.username || 'Doctor'}`}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              {isAdmin 
                ? 'Showing complete patient census across all doctor assignments in the system' 
                : 'Showing distinct patients assigned specifically to your doctor account'}
            </p>
          </div>

          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search patient name, ID, or condition..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '13px'
              }}
            />
          </div>
        </div>

        {filteredPatients.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No patient data found matching search criteria.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {filteredPatients.map((p) => {
              const riskColor = p.aiRisk === 'High' ? '#ef4444' : p.aiRisk === 'Medium' ? '#f59e0b' : '#10b981';
              return (
                <div 
                  key={p.patientId}
                  className="glass-panel interactive"
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    border: `1px solid ${p.openAlerts > 0 ? 'rgba(239,68,68,0.4)' : 'var(--border-color)'}`,
                    background: 'rgba(15, 23, 42, 0.65)',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    gap: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                        <h4 style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>{p.patientName}</h4>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        ID: <strong style={{ color: 'var(--text-secondary)' }}>{p.patientId}</strong> | {p.age} yrs • {p.gender}
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>
                        {p.primaryCondition}
                      </div>
                    </div>

                    <span 
                      style={{ 
                        fontSize: '11px', 
                        fontWeight: '700', 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        background: `${riskColor}20`,
                        color: riskColor,
                        border: `1px solid ${riskColor}50`
                      }}
                    >
                      {p.aiRisk} Risk ({p.aiConfidence}%)
                    </span>
                  </div>

                  {/* Vitals Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', background: 'rgba(0,0,0,0.25)', padding: '12px', borderRadius: '8px' }}>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>HR</span>
                      <strong style={{ fontSize: '13px', color: p.vitals.heartRate > 100 ? '#fca5a5' : '#fff' }}>
                        {p.vitals.heartRate} <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>bpm</span>
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>SpO2</span>
                      <strong style={{ fontSize: '13px', color: p.vitals.spo2 < 92 ? '#fca5a5' : '#fff' }}>
                        {p.vitals.spo2}%
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>Temp</span>
                      <strong style={{ fontSize: '13px', color: '#fff' }}>
                        {p.vitals.temperature}°C
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block' }}>BP</span>
                      <strong style={{ fontSize: '13px', color: '#fff' }}>
                        {p.vitals.bloodPressure}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {p.openAlerts > 0 ? (
                        <span style={{ fontSize: '11px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                          <ShieldAlert size={14} /> {p.openAlerts} Active Alert
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#34d399', fontWeight: '500' }}>
                          ✓ Vitals Stable
                        </span>
                      )}
                    </div>

                    {onViewPatient && (
                      <button
                        onClick={() => onViewPatient(p.patientId)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Eye size={14} /> Patient 360
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
