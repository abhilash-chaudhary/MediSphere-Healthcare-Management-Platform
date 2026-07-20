import React, { useState } from 'react';
import { ShieldAlert, Database, RefreshCw, Terminal, Cpu } from 'lucide-react';

interface AuditLog {
  id: string;
  username: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress: string;
  details: string;
}

interface DQLRecord {
  id: string;
  rawPayload: string;
  reason: string;
  timestamp: string;
}

interface AuditLogsProps {
  auditLogs: AuditLog[];
  dlqLogs: DQLRecord[];
  onReplayDlq: (rawPayload: string, reason: string) => void;
  selectedUser: string;
  onChangeUser: (username: string) => void;
  onRefresh: () => void;
}

export default function AuditLogs({
  auditLogs,
  dlqLogs,
  onReplayDlq,
  selectedUser,
  onChangeUser,
  onRefresh
}: AuditLogsProps) {
  const [replayPayload, setReplayPayload] = useState('');
  const [replayReason, setReplayReason] = useState('Corrupted SpO2 vital package');

  const handleReplaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replayPayload.trim()) return;
    onReplayDlq(replayPayload, replayReason);
    setReplayPayload('');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString();
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="glass-panel" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '24px', background: 'linear-gradient(135deg, #fff 40%, var(--color-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
            System Audit & Streaming Console
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Review HIPAA system access logs and manage Dead Letter Queue (DLQ) streams from Kafka pipeline operations.
          </p>
        </div>
        <button onClick={onRefresh} className="btn btn-secondary">
          <RefreshCw size={16} /> Sync Logs
        </button>
      </div>

      <div className="grid-3">
        {/* DLQ replay tool */}
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '18px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={18} /> Kafka DLQ Stream Replayer
          </h3>

          <form onSubmit={handleReplaySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label>Replay Reason</label>
              <input
                type="text"
                value={replayReason}
                onChange={(e) => setReplayReason(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Raw Event JSON Payload</label>
              <textarea
                rows={6}
                placeholder='{ "patientId": "john_doe", "heartRate": 82 }'
                value={replayPayload}
                onChange={(e) => setReplayPayload(e.target.value)}
                style={{
                  width: '100%',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  color: '#38bdf8',
                  padding: '10px'
                }}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              Publish to DLQ Topic
            </button>
          </form>
        </div>

        {/* Audit trail list */}
        <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', color: 'var(--color-primary)' }}>
                System Activity Log
              </h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Filter User:</span>
                <input
                  type="text"
                  placeholder="All Users"
                  value={selectedUser}
                  onChange={(e) => onChangeUser(e.target.value)}
                  style={{ width: '150px', padding: '6px 12px', fontSize: '12px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxH: '350px', overflowY: 'auto' }}>
              {auditLogs.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No audit trail recorded.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      padding: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '13px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>
                        User: <strong style={{ color: 'var(--color-primary)' }}>{log.username}</strong>
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                        {formatDate(log.timestamp)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <span>
                        Action: <strong>{log.action}</strong> | Resource: <strong>{log.resource}</strong>
                      </span>
                      <span>IP: {log.ipAddress}</span>
                    </div>
                    <p style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Details: {log.details}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* DLQ log */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '18px', color: 'var(--text-secondary)' }}>
              Recent Dead Letter Queue Records (Failed Streams)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dlqLogs.length === 0 ? (
                <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No active DLQ messages recorded.
                </div>
              ) : (
                dlqLogs.map((record) => (
                  <div
                    key={record.id}
                    style={{
                      padding: '12px',
                      background: 'rgba(239, 68, 68, 0.03)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ color: '#fca5a5' }}>Reason: {record.reason}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                        {formatDate(record.timestamp)}
                      </span>
                    </div>
                    <pre style={{ margin: '6px 0 0 0', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', overflowX: 'auto', color: 'var(--text-secondary)' }}>
                      {record.rawPayload}
                    </pre>
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
