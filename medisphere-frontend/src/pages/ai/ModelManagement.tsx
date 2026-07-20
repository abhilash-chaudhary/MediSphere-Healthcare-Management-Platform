import React, { useState, useEffect } from 'react';
import { getAllModels, createModel, updateModel, deleteModel } from '../../services/aiApi';
import { Database, Plus, Check, Trash2, RefreshCw, Cpu, BarChart3 } from 'lucide-react';

export default function ModelManagement() {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [version, setVersion] = useState('');
  const [accuracy, setAccuracy] = useState('');
  const [status, setStatus] = useState('INACTIVE');

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    setLoading(true);
    try {
      const res = await getAllModels();
      if (res.data?.success) {
        setModels(res.data.data);
      }
    } catch (e) {}
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!version || !accuracy) {
      alert('Please fill in version and accuracy');
      return;
    }
    try {
      const res = await createModel({
        version,
        accuracy: parseFloat(accuracy),
        status
      });
      if (res.data?.success) {
        alert(`Model version ${version} registered successfully`);
        setShowForm(false);
        setVersion('');
        setAccuracy('');
        setStatus('INACTIVE');
        loadModels();
      }
    } catch (e) {
      alert('Failed to create model version');
    }
  };

  const handleActivate = async (ver: string) => {
    try {
      const res = await updateModel(ver, { status: 'ACTIVE' });
      if (res.data?.success) {
        alert(`Model version ${ver} activated`);
        loadModels();
      }
    } catch (e) {
      alert('Failed to activate model');
    }
  };

  const handleDeactivate = async (ver: string) => {
    try {
      const res = await updateModel(ver, { status: 'INACTIVE' });
      if (res.data?.success) {
        loadModels();
      }
    } catch (e) {
      alert('Failed to deactivate model');
    }
  };

  const handleDelete = async (ver: string) => {
    if (!confirm(`Delete model version ${ver}?`)) return;
    try {
      const res = await deleteModel(ver);
      if (res.data?.success) {
        alert(`Model version ${ver} deleted`);
        loadModels();
      }
    } catch (e) {
      alert('Failed to delete model');
    }
  };

  const statusBadge = (s: string) => {
    if (s === 'ACTIVE') return 'badge-success';
    if (s === 'DEPRECATED') return 'badge-danger';
    return 'badge-warning';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Database size={28} style={{ color: 'var(--color-primary)' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '24px' }}>Model Version Management</h2>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
              Track, activate, and manage AI model versions
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={loadModels}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={14} /> Register Model
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-3" style={{ marginBottom: '28px' }}>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <Cpu size={20} style={{ color: 'var(--color-primary)', marginBottom: '8px' }} />
          <div style={{ fontSize: '28px', fontWeight: '700' }}>{models.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Models</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <Check size={20} style={{ color: 'var(--color-success)', marginBottom: '8px' }} />
          <div style={{ fontSize: '28px', fontWeight: '700' }}>
            {models.filter(m => m.status === 'ACTIVE').length}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Active Models</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center' }}>
          <BarChart3 size={20} style={{ color: '#a78bfa', marginBottom: '8px' }} />
          <div style={{ fontSize: '28px', fontWeight: '700' }}>
            {models.length > 0 ? Math.max(...models.map(m => m.accuracy || 0)).toFixed(1) : '—'}%
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Best Accuracy</div>
        </div>
      </div>

      {/* New Model Form */}
      {showForm && (
        <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Register New Model Version</h3>
          <div className="grid-3" style={{ gap: '14px', marginBottom: '16px' }}>
            <div>
              <label>Version</label>
              <input value={version} onChange={e => setVersion(e.target.value)} placeholder="e.g. 2.0" />
            </div>
            <div>
              <label>Accuracy (%)</label>
              <input type="number" step="0.1" value={accuracy} onChange={e => setAccuracy(e.target.value)} placeholder="e.g. 93.5" />
            </div>
            <div>
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="INACTIVE">INACTIVE</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DEPRECATED">DEPRECATED</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={handleCreate}>
              <Plus size={14} /> Register
            </button>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Models Table */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading models...</div>
        ) : models.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No model versions registered yet. Click "Register Model" to add the first version.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  {['Version', 'Accuracy', 'Status', 'Created Date', 'Actions'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px', textAlign: 'left', fontSize: '12px',
                      textTransform: 'uppercase', color: 'var(--text-muted)',
                      fontWeight: '600', letterSpacing: '0.05em'
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {models.map((model: any) => (
                  <tr key={model.id || model.version} style={{
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'var(--transition-smooth)'
                  }}>
                    <td style={{ padding: '14px 16px', fontWeight: '600', fontSize: '14px' }}>
                      v{model.version}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: '600', color: model.accuracy >= 90 ? 'var(--color-success)' : model.accuracy >= 80 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                        {model.accuracy}%
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`badge ${statusBadge(model.status)}`}>{model.status}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {model.createdDate}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {model.status !== 'ACTIVE' ? (
                          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleActivate(model.version)}>
                            <Check size={12} /> Activate
                          </button>
                        ) : (
                          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleDeactivate(model.version)}>
                            Deactivate
                          </button>
                        )}
                        <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }}
                          onClick={() => handleDelete(model.version)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
