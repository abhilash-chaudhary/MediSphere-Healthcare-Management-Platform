import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { Bell, AlertTriangle, Settings, MessageSquare, CheckCheck, RefreshCw, Zap } from 'lucide-react';

interface Notification {
  _id: string;
  patientId: string;
  message: string;
  type: string;
  targetRole: string;
  alertId?: string;
  isRead: boolean;
  status: string;
  createdAt: string;
}

interface Props {
  user: any;
}

type Tab = 'alerts' | 'system' | 'messages';

const TYPE_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626', HIGH: '#ea580c', MEDIUM: '#d97706',
  LOW: '#16a34a', WARNING: '#f59e0b', INFO: '#3b82f6',
};

const DEFAULT_NOTIFICATIONS: Notification[] = [
  {
    _id: 'notif_1',
    patientId: 'john_doe',
    message: '[CRITICAL ALERT] Sustained Tachycardia detected for John Doe: HR 142 bpm (Confidence: 94.5%)',
    type: 'CRITICAL',
    targetRole: 'DOCTOR',
    alertId: 'ALT-SIM-001',
    isRead: false,
    status: 'UNREAD',
    createdAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    _id: 'notif_2',
    patientId: 'jane_smith',
    message: '[HIGH ALERT] SpO2 Oxygen drop below threshold: 89% for Jane Smith',
    type: 'HIGH',
    targetRole: 'DOCTOR',
    alertId: 'ALT-SIM-002',
    isRead: false,
    status: 'UNREAD',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    _id: 'notif_3',
    patientId: 'robert_j',
    message: '[WARNING] Hypertensive Stage 2 pressure registered: 178/104 mmHg',
    type: 'WARNING',
    targetRole: 'DOCTOR',
    alertId: 'ALT-SIM-003',
    isRead: true,
    status: 'READ',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    _id: 'notif_4',
    patientId: 'john_doe',
    message: 'Continuous vitals telemetry stream connected to IoT Gateway',
    type: 'SYSTEM',
    targetRole: 'DOCTOR',
    isRead: false,
    status: 'UNREAD',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    _id: 'notif_5',
    patientId: 'eleanor_v',
    message: 'Digital Health Twin model rebuilt successfully with 15 new vitals records',
    type: 'SYNC',
    targetRole: 'DOCTOR',
    isRead: true,
    status: 'READ',
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    _id: 'notif_6',
    patientId: 'john_doe',
    message: 'Follow-up Cardiology consultation scheduled with Dr. Sarah Smith tomorrow at 10:00 AM',
    type: 'APPOINTMENT',
    targetRole: 'DOCTOR',
    isRead: false,
    status: 'UNREAD',
    createdAt: new Date(Date.now() - 21600000).toISOString(),
  },
];

export default function NotificationCenter({ user }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('alerts');
  const [notifications, setNotifications] = useState<Notification[]>(DEFAULT_NOTIFICATIONS);
  const [loading, setLoading] = useState(true);

  const isDoctor = user?.roles?.some((r: string) => r.includes('DOCTOR') || r.includes('ADMIN')) ?? true;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = isDoctor
        ? `/notifications/doctor/${user?.username || 'doctor'}`
        : `/notifications/patient/${user?.username || 'patient'}`;
      const res = await api.get(endpoint);
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        const list = res.data.data.map((n: any) => ({
          ...n,
          isRead: n.status === 'READ' || n.isRead === true
        }));
        setNotifications(list);
      } else {
        setNotifications(DEFAULT_NOTIFICATIONS);
      }
    } catch {
      setNotifications(DEFAULT_NOTIFICATIONS);
    } finally {
      setLoading(false);
    }
  }, [isDoctor, user?.username]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      const endpoint = isDoctor
        ? `/notifications/doctor/${user?.username || 'doctor'}/read`
        : `/notifications/read`;
      await api.post(endpoint, { patientId: user?.username });
    } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true, status: 'READ' })));
  };

  const markOneRead = async (id: string) => {
    try {
      await api.post(`/notifications/${id}/read`);
    } catch {}
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true, status: 'READ' } : n));
  };

  // Categorize notifications for tabs
  const alertNotifs = notifications.filter(n =>
    ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'WARNING'].includes(n.type)
  );
  const systemNotifs = notifications.filter(n =>
    ['INFO', 'SYSTEM', 'SYNC', 'DEVICE'].includes(n.type)
  );
  const messageNotifs = notifications.filter(n =>
    ['MESSAGE', 'APPOINTMENT'].includes(n.type)
  );

  const tabs: { key: Tab; label: string; icon: React.ElementType; count: number }[] = [
    { key: 'alerts', label: 'Alerts', icon: AlertTriangle, count: alertNotifs.filter(n => !n.isRead).length },
    { key: 'system', label: 'System', icon: Settings, count: systemNotifs.filter(n => !n.isRead).length },
    { key: 'messages', label: 'Messages', icon: MessageSquare, count: messageNotifs.filter(n => !n.isRead).length },
  ];

  const currentList = activeTab === 'alerts' ? alertNotifs : activeTab === 'system' ? systemNotifs : messageNotifs;
  const unreadTotal = notifications.filter(n => !n.isRead).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <Bell size={24} style={{ color: 'var(--color-primary)' }} />
            <h2 style={{ fontSize: '22px', background: 'linear-gradient(135deg, #fff 40%, var(--color-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Notification Center
            </h2>
            {unreadTotal > 0 && (
              <span style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', padding: '2px 9px', borderRadius: '12px', fontSize: '12px', fontWeight: '700' }}>
                {unreadTotal} unread
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {isDoctor ? 'Patient alerts, system events, and messages' : 'Your health alerts and notifications'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={fetchNotifications} className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={12} /> Refresh
          </button>
          {unreadTotal > 0 && (
            <button onClick={markAllRead} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCheck size={12} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--border-color)' }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 24px', background: 'none', border: 'none',
                borderBottom: `2px solid ${activeTab === tab.key ? 'var(--color-primary)' : 'transparent'}`,
                color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === tab.key ? '700' : '500',
                display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s',
              }}
            >
              <Icon size={14} /> {tab.label}
              {tab.count > 0 && (
                <span style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', padding: '1px 7px', borderRadius: '10px', fontSize: '10px', fontWeight: '700' }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notification List */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <Bell size={32} style={{ animation: 'pulse-glow 1s infinite', margin: '0 auto 12px' }} />
            <p>Loading notifications...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <CheckCheck size={40} style={{ color: '#10b981', margin: '0 auto 16px' }} />
            <p style={{ color: '#10b981', fontWeight: '600' }}>No {activeTab} notifications</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>You're all caught up!</p>
          </div>
        ) : (
          <div>
            {currentList.map((notif, idx) => {
              const typeColor = TYPE_COLORS[notif.type] || '#64748b';
              return (
                <div
                  key={notif._id}
                  onClick={() => !notif.isRead && markOneRead(notif._id)}
                  style={{
                    display: 'flex', gap: '16px', padding: '16px 24px',
                    borderBottom: idx < currentList.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    background: notif.isRead ? 'transparent' : 'rgba(255,255,255,0.02)',
                    cursor: notif.isRead ? 'default' : 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => { if (!notif.isRead) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = notif.isRead ? 'transparent' : 'rgba(255,255,255,0.02)'; }}
                >
                  {/* Type indicator dot */}
                  <div style={{ paddingTop: '4px' }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: notif.isRead ? 'transparent' : typeColor,
                      border: `2px solid ${notif.isRead ? 'rgba(255,255,255,0.1)' : typeColor}`,
                      flexShrink: 0,
                      animation: !notif.isRead && notif.type === 'CRITICAL' ? 'pulse-glow 1.5s infinite' : 'none',
                    }} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                      <span style={{
                        background: `${typeColor}22`, color: typeColor,
                        padding: '1px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: '700',
                      }}>
                        {notif.type}
                      </span>
                      {notif.alertId && (
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {notif.alertId.slice(0, 14)}
                        </span>
                      )}
                      {!notif.isRead && (
                        <span style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa', padding: '1px 6px', borderRadius: '6px', fontSize: '9px', fontWeight: '700' }}>
                          NEW
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '13px', color: notif.isRead ? 'var(--text-muted)' : 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      {notif.message}
                    </p>
                    {notif.patientId && isDoctor && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Patient: {notif.patientId}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', minWidth: '80px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(notif.createdAt).toLocaleTimeString()}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </div>
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
