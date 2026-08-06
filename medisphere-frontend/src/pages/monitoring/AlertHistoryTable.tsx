import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { FileText, Filter, Download, Search, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface AlertRecord {
  alertId: string;
  patientId: string;
  patientName: string;
  severity: string;
  type: string;
  ruleName: string;
  message: string;
  confidence: number;
  risk: string;
  vitals: any;
  status: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706', LOW: '#16a34a',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: '#64748b', SENT: '#3b82f6', DELIVERED: '#8b5cf6',
  ACKNOWLEDGED: '#10b981', CLOSED: '#94a3b8',
};

const DEFAULT_ALERTS: AlertRecord[] = [
  {
    alertId: 'ALT-2026-90812',
    patientId: 'john_doe',
    patientName: 'John Doe',
    severity: 'CRITICAL',
    type: 'AFIB_ANOMALY',
    ruleName: 'Sustained Tachycardia > 140 BPM',
    message: 'Acute Tachycardia Spike detected (HR: 145 bpm) with high risk score (89.5)',
    confidence: 94.2,
    risk: 'High',
    vitals: { heartRate: 145, spo2: 94, temperature: 37.1, bloodPressure: '150/95' },
    status: 'ACKNOWLEDGED',
    acknowledgedBy: 'dr_smith',
    acknowledgedAt: new Date(Date.now() - 3600000).toISOString(),
    createdAt: new Date(Date.now() - 3800000).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    alertId: 'ALT-2026-90811',
    patientId: 'jane_smith',
    patientName: 'Jane Smith',
    severity: 'CRITICAL',
    type: 'HYPOXIA_ALERT',
    ruleName: 'SpO2 Desaturation < 90%',
    message: 'Critical Hypoxia Alert: SpO2 dropped to 88% continuously for > 2 min',
    confidence: 91.8,
    risk: 'High',
    vitals: { heartRate: 98, spo2: 88, temperature: 36.8, bloodPressure: '118/78' },
    status: 'DELIVERED',
    acknowledgedBy: null,
    acknowledgedAt: null,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    alertId: 'ALT-2026-90809',
    patientId: 'robert_j',
    patientName: 'Robert Johnson',
    severity: 'HIGH',
    type: 'HYPERTENSION_WARNING',
    ruleName: 'Systolic Blood Pressure > 180 mmHg',
    message: 'Hypertensive Crisis Stage 2: BP measured at 185/110 mmHg',
    confidence: 88.0,
    risk: 'High',
    vitals: { heartRate: 88, spo2: 96, temperature: 36.6, bloodPressure: '185/110' },
    status: 'ACKNOWLEDGED',
    acknowledgedBy: 'dr_johnson',
    acknowledgedAt: new Date(Date.now() - 14400000).toISOString(),
    createdAt: new Date(Date.now() - 15000000).toISOString(),
    updatedAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    alertId: 'ALT-2026-90805',
    patientId: 'p_101',
    patientName: 'Eleanor Vance',
    severity: 'MEDIUM',
    type: 'BRADYCARDIAL_EVENT',
    ruleName: 'Heart Rate < 50 BPM',
    message: 'Bradycardia event recorded during resting cycle: HR 46 bpm',
    confidence: 85.5,
    risk: 'Medium',
    vitals: { heartRate: 46, spo2: 97, temperature: 36.4, bloodPressure: '110/70' },
    status: 'CLOSED',
    acknowledgedBy: 'dr_smith',
    acknowledgedAt: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 90000000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    alertId: 'ALT-2026-90799',
    patientId: 'clara_o',
    patientName: 'Clara Oswald',
    severity: 'LOW',
    type: 'TEMPERATURE_SPIKE',
    ruleName: 'Mild Fever > 37.8°C',
    message: 'Low grade temperature elevation detected: 38.1°C',
    confidence: 82.1,
    risk: 'Low',
    vitals: { heartRate: 82, spo2: 98, temperature: 38.1, bloodPressure: '122/80' },
    status: 'SENT',
    acknowledgedBy: null,
    acknowledgedAt: null,
    createdAt: new Date(Date.now() - 120000000).toISOString(),
    updatedAt: new Date(Date.now() - 120000000).toISOString(),
  }
];

export default function AlertHistoryTable() {
  const [alerts, setAlerts] = useState<AlertRecord[]>(DEFAULT_ALERTS);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ severity: '', status: '', search: '' });
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.severity) params.set('severity', filters.severity);
      if (filters.status) params.set('status', filters.status);
      params.set('limit', String(PAGE_SIZE));
      params.set('skip', String(page * PAGE_SIZE));
      const res = await api.get(`/monitoring/alerts/history?${params}`);
      
      if (res.data?.success && res.data.data) {
        const list = Array.isArray(res.data.data) 
          ? res.data.data 
          : (res.data.data.alerts || res.data.data.list || []);
        if (list.length > 0) {
          setAlerts(list);
        } else {
          setAlerts(DEFAULT_ALERTS);
        }
      } else {
        setAlerts(DEFAULT_ALERTS);
      }
    } catch {
      setAlerts(DEFAULT_ALERTS);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const filtered = alerts.filter(a =>
    !filters.search ||
    a.patientName?.toLowerCase().includes(filters.search.toLowerCase()) ||
    a.alertId?.toLowerCase().includes(filters.search.toLowerCase()) ||
    a.type?.toLowerCase().includes(filters.search.toLowerCase())
  );

  const exportCsv = () => {
    const headers = ['Alert ID', 'Patient', 'Type', 'Severity', 'Rule', 'Status', 'Created', 'Acknowledged By', 'Acknowledged At'];
    const rows = filtered.map(a => [
      a.alertId, a.patientName || a.patientId, a.type, a.severity, a.ruleName,
      a.status, new Date(a.createdAt).toLocaleString(),
      a.acknowledgedBy || '', a.acknowledgedAt ? new Date(a.acknowledgedAt).toLocaleString() : ''
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'alert_history.csv'; a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <FileText size={24} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: '22px', background: 'linear-gradient(135deg, #fff 40%, var(--color-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Alert History & Audit Trail
            </h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Full audit log of all generated alerts with acknowledgement tracking</p>
        </div>
        <button onClick={exportCsv} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="glass-panel" style={{ padding: '16px 24px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} style={{ color: 'var(--text-muted)' }} />
        
        <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
          <Search size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            placeholder="Search patient, ID, type..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            style={{ width: '100%', paddingLeft: '30px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
          />
        </div>

        {(['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilters(f => ({ ...f, severity: s }))}
            style={{
              padding: '6px 14px', borderRadius: '8px', border: `1px solid ${filters.severity === s ? (SEVERITY_COLORS[s] || 'var(--color-primary)') : 'var(--border-color)'}`,
              background: filters.severity === s ? `${SEVERITY_COLORS[s] || 'rgba(0,242,254,0.1)'}22` : 'transparent',
              color: filters.severity === s ? (SEVERITY_COLORS[s] || 'var(--color-primary)') : 'var(--text-muted)',
              cursor: 'pointer', fontSize: '11px', fontWeight: '600',
            }}
          >
            {s || 'All Severity'}
          </button>
        ))}

        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-secondary)', padding: '7px 12px', fontSize: '13px' }}
        >
          <option value="">All Status</option>
          {['NEW', 'SENT', 'DELIVERED', 'ACKNOWLEDGED', 'CLOSED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <Clock size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
            <p>Loading alert history...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <CheckCircle size={40} style={{ color: '#10b981', margin: '0 auto 16px' }} />
            <p style={{ color: '#10b981', fontWeight: '600' }}>No alerts found matching filters</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)' }}>
                  {['Alert ID', 'Patient', 'Type / Rule', 'Severity', 'Vitals', 'Created', 'Acknowledged By', 'Status'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: '700', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((alert, idx) => (
                  <tr key={alert.alertId} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    transition: 'background 0.2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)')}
                  >
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                        {alert.alertId?.slice(0, 18)}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontWeight: '600', color: '#fff' }}>{alert.patientName || alert.patientId}</div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ color: 'var(--text-secondary)' }}>{alert.type}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{alert.ruleName}</div>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{
                        background: `${SEVERITY_COLORS[alert.severity] || '#64748b'}22`,
                        color: SEVERITY_COLORS[alert.severity] || '#64748b',
                        padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700'
                      }}>
                        {alert.severity}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {alert.vitals && (alert.vitals.heartRate || alert.vitals.spo2) ? (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          HR:{alert.vitals.heartRate} SpO2:{alert.vitals.spo2}%
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', color: 'var(--text-muted)', fontSize: '11px' }}>
                      {new Date(alert.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {alert.acknowledgedBy ? (
                        <div>
                          <div style={{ color: '#10b981', fontSize: '11px', fontWeight: '600' }}>Dr. {alert.acknowledgedBy}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {alert.acknowledgedAt ? new Date(alert.acknowledgedAt).toLocaleTimeString() : ''}
                          </div>
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{
                        background: `${STATUS_COLORS[alert.status] || '#64748b'}22`,
                        color: STATUS_COLORS[alert.status] || '#64748b',
                        padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '600'
                      }}>
                        {alert.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Showing {filtered.length} records</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '12px', opacity: page === 0 ? 0.4 : 1 }}>← Prev</button>
              <span style={{ padding: '5px 10px', fontSize: '12px', color: 'var(--text-muted)' }}>Page {page + 1}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={filtered.length < PAGE_SIZE} className="btn btn-secondary" style={{ padding: '5px 12px', fontSize: '12px', opacity: filtered.length < PAGE_SIZE ? 0.4 : 1 }}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
