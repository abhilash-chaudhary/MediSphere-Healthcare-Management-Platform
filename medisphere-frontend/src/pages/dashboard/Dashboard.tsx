import React from 'react';
import { 
  Users, Activity, Building, Cpu, Radio, Shield, RefreshCw, BarChart3, Database, HeartPulse, Clock, AlertTriangle 
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

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
}

export default function Dashboard({ user, metrics }: DashboardProps) {
  // Sparkline data generators
  const generateSparklineData = (base: number) => {
    return Array.from({ length: 10 }, (_, i) => ({
      value: base + Math.sin(i) * (base * 0.1) + Math.random() * (base * 0.05)
    }));
  };

  const cardDetails = [
    { title: 'Total Patients', value: metrics.totalPatients, icon: Users, trend: '+4.2%', status: 'Normal', base: 1200 },
    { title: 'Active Patients', value: metrics.activePatients, icon: Activity, trend: '+2.8%', status: 'Normal', base: 450 },
    { title: 'Connected Hospitals', value: metrics.connectedHospitals, icon: Building, trend: '0.0%', status: 'Healthy', base: 4 },
    { title: 'Digital Twins', value: metrics.digitalTwins, icon: Cpu, trend: '+8.3%', status: 'Active', base: 310 },
    { title: 'Live Devices', value: metrics.liveDevices, icon: Radio, trend: '+12.4%', status: 'Active', base: 85 },
    { title: 'Active Consents', value: metrics.activeConsents, icon: Shield, trend: '+1.5%', status: 'HIPAA Audited', base: 290 },
    { title: 'Pending EHR Sync', value: metrics.pendingSync, icon: RefreshCw, trend: '-5.0%', status: 'Sync Queue', base: 15 },
    { title: 'Kafka Stream Rate', value: metrics.kafkaThroughput, icon: BarChart3, trend: '+25.1%', status: 'Streaming', base: 400 },
    { title: 'MongoDB Instance', value: metrics.mongodbStatus, icon: Database, trend: '100% Up', status: 'Online', base: 100 },
    { title: 'API Gateway Health', value: metrics.apiHealth, icon: HeartPulse, trend: '100% Up', status: 'Optimal', base: 100 },
    { title: 'System Uptime', value: metrics.uptime, icon: Clock, trend: 'Optimal', status: 'Online', base: 99 },
    { title: 'Critical Alerts', value: metrics.criticalAlertsCount, icon: AlertTriangle, trend: 'Immediate Action', status: metrics.criticalAlertsCount > 0 ? 'CRITICAL' : 'Clear', base: metrics.criticalAlertsCount }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="glass-panel" style={{ padding: '24px 32px' }}>
        <h2 style={{ fontSize: '24px', background: 'linear-gradient(135deg, #fff 40%, var(--color-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
          Executive Health Twin Dashboard
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Real-time metrics monitor for Connected Hospital EHR nodes, Kafka Streams, and Clinical Registry audits.
        </p>
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
                padding: '24px', 
                position: 'relative', 
                border: isCritical ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
                boxShadow: isCritical ? '0 0 15px rgba(239, 68, 68, 0.15)' : 'var(--shadow-premium)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {card.title}
                </span>
                <IconComponent size={20} style={{ color: isCritical ? 'var(--color-danger)' : 'var(--color-primary)' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '28px', fontWeight: '700', fontFamily: 'var(--font-display)', color: isCritical ? '#fca5a5' : '#fff' }}>
                  {card.value}
                </span>
                <span style={{ fontSize: '12px', color: card.trend.startsWith('-') ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: '600' }}>
                  {card.trend}
                </span>
              </div>

              {/* Sparkline Chart */}
              <div style={{ width: '100%', height: '40px', marginBottom: '12px' }}>
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
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Live Telemetry
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
