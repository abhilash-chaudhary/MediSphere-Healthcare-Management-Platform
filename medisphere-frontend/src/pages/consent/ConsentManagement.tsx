import React, { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Calendar, Clock, Plus, Trash2 } from 'lucide-react';

interface Consent {
  id: string;
  patientId: string;
  doctorId: string;
  status: string; // GRANTED, REVOKED, EXPIRED
  grantedAt: string;
  expiresAt: string;
  authorizedResourceTypes: string[];
}

interface ConsentManagementProps {
  consents: Consent[];
  onGrantConsent: (doctorId: string, resourceTypes: string[], expiresMonths: number) => void;
  onRevokeConsent: (doctorId: string) => void;
}

export default function ConsentManagement({ consents, onGrantConsent, onRevokeConsent }: ConsentManagementProps) {
  const [docId, setDocId] = useState('');
  const [selectedResourceType, setSelectedResourceType] = useState('Vitals');
  const [expiryMonths, setExpiryMonths] = useState(6);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docId.trim()) return;
    onGrantConsent(docId.trim(), [selectedResourceType], expiryMonths);
    setDocId('');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="glass-panel" style={{ padding: '24px 32px' }}>
        <h2 style={{ fontSize: '24px', background: 'linear-gradient(135deg, #fff 40%, var(--color-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
          HIPAA Consent Registry
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Manage which medical staff have permissions to read your 360 Health Twin and EHR observations. Access is checked dynamically on every query.
        </p>
      </div>

      <div className="grid-3">
        {/* Grant consent form */}
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '18px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Authorize Doctor Access
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label>Doctor Username / ID</label>
              <input
                type="text"
                placeholder="e.g. dr_jenkins"
                value={docId}
                onChange={(e) => setDocId(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Shared Resource Category</label>
              <select
                value={selectedResourceType}
                onChange={(e) => setSelectedResourceType(e.target.value)}
              >
                <option value="Vitals">Vitals (Live & Historic streams)</option>
                <option value="Observations">Observations & Lab Reports</option>
                <option value="Medications">Medications & Prescriptions</option>
                <option value="*">All (* - Complete Twin Access)</option>
              </select>
            </div>

            <div>
              <label>Authorization Validity</label>
              <select
                value={expiryMonths}
                onChange={(e) => setExpiryMonths(Number(e.target.value))}
              >
                <option value={1}>1 Month</option>
                <option value={3}>3 Months</option>
                <option value={6}>6 Months (Recommended)</option>
                <option value={12}>1 Year</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              Grant Active Consent
            </button>
          </form>
        </div>

        {/* List of active consents */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '18px', color: 'var(--color-primary)' }}>
              Active Clinical Authorizations
            </h3>

            {consents.filter(c => c.status === 'GRANTED').length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active doctor permissions found. Under federal rules, your clinical records are private by default.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {consents
                  .filter((c) => c.status === 'GRANTED')
                  .map((consent) => (
                    <div
                      key={consent.id}
                      style={{
                        padding: '16px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ color: 'var(--color-success)' }}>
                          <ShieldCheck size={28} />
                        </div>
                        <div>
                          <strong style={{ fontSize: '15px', color: '#fff' }}>
                            Doctor: {consent.doctorId}
                          </strong>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            <span>Resource: <strong>{consent.authorizedResourceTypes.join(', ')}</strong></span>
                            <span>Expires: <strong>{formatDate(consent.expiresAt)}</strong></span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onRevokeConsent(consent.doctorId)}
                        className="btn btn-danger"
                        style={{ padding: '8px 16px', fontSize: '12px' }}
                      >
                        <Trash2 size={14} /> Revoke Access
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Consent History log */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '18px', color: 'var(--text-secondary)' }}>
              Consent Change Audit Trail
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {consents.length === 0 ? (
                <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No historical records found.
                </div>
              ) : (
                consents.map((consent) => (
                  <div
                    key={consent.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '13px',
                      paddingBottom: '10px',
                      borderBottom: '1px solid rgba(255,255,255,0.02)'
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-secondary)' }}>Doctor:</span>{' '}
                      <strong style={{ color: '#fff' }}>{consent.doctorId}</strong>
                      <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>|</span>
                      <span style={{ color: 'var(--text-secondary)' }}>Resource:</span>{' '}
                      <span style={{ color: 'var(--color-primary)' }}>{consent.authorizedResourceTypes.join(', ')}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className={`badge badge-${consent.status.toLowerCase()}`}>
                        {consent.status}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                        {formatDate(consent.grantedAt)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
