import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store';
import { 
  logout, setAuthErrorMsg, setAuthSuccessMsg, clearMessages 
} from './store/authSlice';
import {
  setPatientsList, setSelectedPatientId, setDashboard360, setConsentGranted,
  setFhirTab, setFhirJson, setFhirLoading, setRebuildTwinLoading, setSyncFhirLoading,
  setProviders, setAuditLogs, setDlqLogs, setPatientProfile
} from './store/patientSlice';
import api from './services/api';

import { 
  Activity, Heart, Thermometer, Droplet, User, Shield, Search, RefreshCw, 
  AlertTriangle, Plus, Check, X, FileText, LogOut, Settings, Clock, 
  CheckCircle2, UserCheck, ShieldAlert, Cpu, BarChart3, Database, Lock, Eye, Bell,
  Building, TrendingUp, Wifi, Stethoscope, FlaskConical
} from 'lucide-react';

// Import Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import VerifyOtp from './pages/auth/VerifyOtp';
import Dashboard from './pages/dashboard/Dashboard';
import PatientSearch from './pages/patient/PatientSearch';
import Patient360 from './pages/patient/Patient360';
import PatientProfile from './pages/patient/PatientProfile';
import ConsentManagement from './pages/consent/ConsentManagement';
import WearableSync from './pages/wearables/WearableSync';
import ProvidersList from './pages/provider/ProvidersList';
import AuditLogs from './pages/admin/AuditLogs';
import Analytics from './pages/analytics/Analytics';
import SystemHealth from './pages/admin/SystemHealth';
import LiveVitals from './pages/live-vitals/LiveVitals';

// Milestone 2: AI Architecture Pages
import AIPredictionDashboard from './pages/ai/AIPredictionDashboard';
import PredictionResult from './pages/ai/PredictionResult';
import ShapExplanation from './pages/ai/ShapExplanation';
import ModelManagement from './pages/ai/ModelManagement';

// Milestone 3: Continuous Monitoring & Alerts
import MonitoringDashboard from './pages/monitoring/MonitoringDashboard';
import AIAnomalyView from './pages/monitoring/AIAnomalyView';
import AlertHistoryTable from './pages/monitoring/AlertHistoryTable';
import NotificationCenter from './pages/monitoring/NotificationCenter';
import AdminPatientAssignment from './pages/admin/AdminPatientAssignment';
import EmergencySOSPopup from './components/EmergencySOSPopup';
import { 
  getAllPatientsMaster, getMasterPatientsAsList, getPatientProfileById, getAssignedPatientIdsForUser,
  ALL_PATIENTS_MASTER
} from './constants/patientAssignments';




export default function App() {
  const dispatch = useDispatch();
  
  // Redux Auth States
  const { token, user, otpRequired } = useSelector((state: RootState) => state.auth);
  
  // Redux Patient/Clinical States
  const { 
    patientsList, selectedPatientId, dashboard360, consentGranted, 
    fhirTab, fhirJson, fhirLoading, rebuildTwinLoading, syncFhirLoading,
    providers, auditLogs, dlqLogs, patientProfile
  } = useSelector((state: RootState) => state.patient);

  // Auth Screen Tabs: 'login' | 'register' | 'forgot'
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Sidebar Active Tab
  const [activeTab, setActiveTab] = useState('');

  // Local state arrays
  const [patientConsents, setPatientConsents] = useState([]);
  const [patientDevices, setPatientDevices] = useState([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedAuditUser, setSelectedAuditUser] = useState('');

  // Simulation ref timer
  const [isSimulating, setIsSimulating] = useState(false);
  const simIntervalId = useRef<NodeJS.Timeout | null>(null);

  // Milestone 2: AI prediction state
  const [currentPrediction, setCurrentPrediction] = useState<any>(null);
  const [predictionFormData, setPredictionFormData] = useState<any>(null);

  // Synchronize initial default tabs based on Role
  // Synchronize initial default tabs & patient data based on Role
  useEffect(() => {
    if (user) {
      // Always fetch patients list & providers so Redux store is populated for all views
      fetchPatients('');
      fetchProviders();

      if (user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) {
        setActiveTab('audit');
        fetchAuditLogs();
        fetchDlqLogs();
        const initialPid = selectedPatientId || ALL_PATIENTS_MASTER[0]?.patientId || 'john_doe';
        handleSelectPatient(initialPid);
      } else if (user?.roles?.includes('DOCTOR') || user?.roles?.includes('ROLE_DOCTOR')) {
        setActiveTab('search');
        const assignedIds = getAssignedPatientIdsForUser(user);
        const initialPid = selectedPatientId || assignedIds[0] || 'john_doe';
        handleSelectPatient(initialPid);
      } else {
        setActiveTab('profile');
        const pUsername = user.username || 'john_doe';
        dispatch(setSelectedPatientId(pUsername));
        fetchPatientProfile(pUsername).then((res: any) => {
          const pId = res?.data?.data?.id || pUsername;
          fetchPatientConsents(pId);
          fetchPatientDevices(pId);
          fetchNotifications(pId);
        });
        handleSelectPatient(pUsername);
      }
    }
  }, [user]);

  // Clean simulation timers on unmount
  useEffect(() => {
    return () => {
      if (simIntervalId.current) {
        clearInterval(simIntervalId.current);
      }
    };
  }, []);

  // ==========================================
  // API Fetch Definitions with Fallbacks
  // ==========================================
  
  const fetchProviders = async () => {
    try {
      const res = await api.get('/provider/list');
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        dispatch(setProviders(res.data.data));
        return;
      }
    } catch (e) {}
  };

  const fetchPatients = async (query: string) => {
    try {
      const res = await api.get(`/patients/search?query=${query}`);
      if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
        dispatch(setPatientsList(res.data.data));
        return;
      }
    } catch (e) {}

    // Fallback: Populate Redux state with master patients array
    const masterList = getMasterPatientsAsList();
    const filtered = query
      ? masterList.filter(p => `${p.firstName} ${p.lastName} ${p.id}`.toLowerCase().includes(query.toLowerCase()))
      : masterList;
    dispatch(setPatientsList(filtered as any));
  };

  const handleSelectPatient = async (patientId: string) => {
    const targetId = patientId || selectedPatientId || user?.username || 'john_doe';
    try {
      dispatch(setSelectedPatientId(targetId));
      
      let isAuthorized = true;
      try {
        const consentRes = await api.get(`/consent/check?patientId=${targetId}&doctorId=${user?.username}&resourceType=Vitals`);
        isAuthorized = consentRes.data?.data !== false;
      } catch (consentErr) {
        isAuthorized = true;
      }
      dispatch(setConsentGranted(isAuthorized));

      // Load Patient 360 dashboard from backend API
      const dashRes = await api.get(`/dashboard/patient360?patientId=${targetId}&doctorId=${user?.username}`);
      if (dashRes.data?.success && dashRes.data.data) {
        dispatch(setDashboard360(dashRes.data.data));
        return;
      }
    } catch (err) {}

    // Fallback Patient 360 dashboard object constructed from master registry
    const masterPatient = getAllPatientsMaster().find(p => p.patientId === targetId);
    const profile = getPatientProfileById(targetId);
    
    const fallbackDash = {
      patientProfile: profile,
      digitalTwin: {
        completenessScore: 88,
        riskCategory: masterPatient?.aiRisk || 'MEDIUM',
        lastRebuilt: new Date().toISOString(),
        activeConditions: masterPatient ? [masterPatient.primaryCondition] : ['Hypertension', 'Arrhythmia'],
        activeMedications: ['Lisinopril 10mg', 'Metformin 500mg'],
        vitalsHistory: [
          { recordedAt: '10:00 AM', heartRate: (masterPatient?.vitals?.heartRate || 75) - 5, oxygenLevel: masterPatient?.vitals?.spo2 || 98, temperature: 36.6, bloodPressure: '120/80' },
          { recordedAt: '11:00 AM', heartRate: (masterPatient?.vitals?.heartRate || 75) - 2, oxygenLevel: masterPatient?.vitals?.spo2 || 98, temperature: 36.7, bloodPressure: '122/82' },
          { recordedAt: '12:00 PM', heartRate: masterPatient?.vitals?.heartRate || 75, oxygenLevel: masterPatient?.vitals?.spo2 || 98, temperature: 36.8, bloodPressure: masterPatient?.vitals?.bloodPressure || '125/84' },
          { recordedAt: '01:00 PM', heartRate: (masterPatient?.vitals?.heartRate || 75) + 3, oxygenLevel: masterPatient?.vitals?.spo2 || 98, temperature: 36.6, bloodPressure: '120/80' },
          { recordedAt: '02:00 PM', heartRate: masterPatient?.vitals?.heartRate || 75, oxygenLevel: masterPatient?.vitals?.spo2 || 98, temperature: 36.7, bloodPressure: '121/81' }
        ]
      },
      consentCheckResult: true,
      healthRiskLevel: masterPatient?.aiRisk || 'MEDIUM',
      alertStatusSummary: masterPatient?.openAlerts ? 'ALERT' : 'NORMAL',
      labReports: [
        { test: 'HbA1c Glucose', value: '6.5 %', range: '4.0 - 5.6 %', status: 'Elevated' },
        { test: 'Total Cholesterol', value: '195 mg/dL', range: '< 200 mg/dL', status: 'Normal' },
        { test: 'Systolic Blood Pressure', value: masterPatient?.vitals?.bloodPressure || '120/80 mmHg', range: '< 120 mmHg', status: masterPatient?.aiRisk === 'High' ? 'Elevated' : 'Normal' },
        { test: 'SpO2 Oxygen Saturation', value: `${masterPatient?.vitals?.spo2 || 98} %`, range: '95 - 100 %', status: (masterPatient?.vitals?.spo2 || 98) < 95 ? 'Low' : 'Normal' }
      ],
      medicalTimeline: [
        { date: new Date().toISOString().split('T')[0], event: '3D Health Twin Rebuild & AI Risk Audit', doctor: 'Dr. Sarah Smith' },
        { date: '2026-07-28', event: 'Cardiology Telemetry & Wearable Sync', doctor: 'System Sync' }
      ],
      activePrescriptions: [
        { medication: 'Lisinopril', dosage: '10mg', frequency: 'Once Daily', doctorId: 'Dr. Smith' }
      ]
    };
    dispatch(setDashboard360(fallbackDash));
  };

  const handleOpenPatient360 = async (pId?: string) => {
    const targetId = pId || selectedPatientId || user?.username || 'john_doe';
    await handleSelectPatient(targetId);
    setActiveTab('patient360');
  };

  const ensurePrediction = async () => {
    if (!currentPrediction) {
      const pId = selectedPatientId || user?.username || 'john_doe';
      try {
        const res = await api.get(`/api/prediction/latest/${pId}`);
        if (res.data?.success && res.data.data) {
          setCurrentPrediction(res.data.data);
          return res.data.data;
        }
      } catch (e) {}

      const defaultPred = {
        id: `pred-${Date.now()}`,
        patientId: pId,
        predictionType: 'CVD',
        riskType: 'CARDIO',
        riskLevel: 'HIGH',
        riskPercentage: 78,
        confidence: 92.5,
        modelVersion: 'v1.0.0',
        predictionDate: new Date().toISOString().split('T')[0],
        age: 65, bloodPressure: 145, bmi: 32, hba1c: 7.5, cholesterol: 230, heartRate: 115
      };
      setCurrentPrediction(defaultPred);
      return defaultPred;
    }
    return currentPrediction;
  };

  const handleRebuildTwin = async () => {
    dispatch(setRebuildTwinLoading(true));
    try {
      const res = await api.post(`/twin/rebuild?patientId=${selectedPatientId}`);
      if (res.data?.success) {
        // Reload dashboard
        const dashRes = await api.get(`/dashboard/patient360?patientId=${selectedPatientId}&doctorId=${user?.username}`);
        dispatch(setDashboard360(dashRes.data.data));
        alert('Digital Twin analysis, completeness checks, and vital boundaries successfully recalculated');
      }
    } catch (e) {
      alert('Twin rebuild trigger failed.');
    } finally {
      dispatch(setRebuildTwinLoading(false));
    }
  };

  const handleSyncFhir = async () => {
    dispatch(setSyncFhirLoading(true));
    try {
      const res = await api.post(`/fhir/sync/${selectedPatientId}`);
      if (res.data?.success) {
        alert('FHIR records synced with external hospital APIs successfully');
      }
    } catch (e) {
      alert('FHIR sync operation failed.');
    } finally {
      dispatch(setSyncFhirLoading(false));
    }
  };

  const handleFetchFhir = async (resourceType: string) => {
    dispatch(setFhirLoading(true));
    try {
      const res = await api.get(`/fhir/${resourceType}/${selectedPatientId}`);
      if (res.data?.success) {
        dispatch(setFhirJson(res.data.data));
      }
    } catch (e) {
      dispatch(setFhirJson('{"error": "Resource retrieval failed"}'));
    } finally {
      dispatch(setFhirLoading(false));
    }
  };

  const fetchPatientProfile = async (username: string) => {
    try {
      const res = await api.get(`/patients/${username}`);
      if (res.data?.success && res.data.data) {
        dispatch(setPatientProfile(res.data.data));
        return res;
      }
    } catch (e) {}

    const fallbackProfile = getPatientProfileById(username);
    dispatch(setPatientProfile(fallbackProfile as any));
    return { data: { data: fallbackProfile } };
  };

  const handleSaveProfile = async (profileData: any) => {
    try {
      const res = await api.put(`/patients/${user?.username}`, profileData);
      if (res.data?.success) {
        dispatch(setPatientProfile(res.data.data));
        alert('Patient demographics profile updated successfully');
      }
    } catch (e) {
      alert('Failed to update patient profile');
    }
  };

  const fetchPatientConsents = async (patientId: string) => {
    try {
      const res = await api.get(`/consent/history?patientId=${patientId}`);
      if (res.data?.success) {
        setPatientConsents(res.data.data);
      }
    } catch (e) {}
  };

  const handleGrantConsent = async (doctorId: string, resourceTypes: string[], expiresMonths: number) => {
    try {
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + expiresMonths);
      
      const res = await api.post('/consent/grant', {
        patientId: patientProfile?.id || user?.username,
        doctorId,
        status: 'GRANTED',
        authorizedResourceTypes: resourceTypes,
        expiresAt: expiry.toISOString()
      });

      if (res.data?.success) {
        alert(`Consent granted to Doctor ${doctorId}`);
        fetchPatientConsents(user?.username || '');
      }
    } catch (e) {
      alert('Failed to grant consent');
    }
  };

  const handleRevokeConsent = async (doctorId: string) => {
    try {
      const pId = patientProfile?.id || user?.username;
      const res = await api.post(`/consent/revoke?patientId=${pId}&doctorId=${doctorId}`);
      if (res.data?.success) {
        alert(`Consent revoked from Doctor ${doctorId}`);
        fetchPatientConsents(pId || '');
      }
    } catch (e) {
      alert('Failed to revoke consent');
    }
  };

  const fetchPatientDevices = async (username: string) => {
    try {
      const res = await api.get(`/wearable/patient/${username}`);
      if (res.data?.success) {
        setPatientDevices(res.data.data);
      }
    } catch (e) {}
  };

  const handleRegisterDevice = async (deviceId: string, deviceName: string, deviceType: string) => {
    try {
      const res = await api.post('/wearable/register', {
        patientId: user?.username,
        deviceId,
        deviceName,
        deviceType,
        status: 'ACTIVE'
      });
      if (res.data?.success) {
        alert('Smartwatch paired successfully');
        fetchPatientDevices(user?.username || '');
      }
    } catch (e) {
      alert('Failed to register device');
    }
  };

  const handleToggleSimulation = (active: boolean) => {
    if (simIntervalId.current) {
      clearInterval(simIntervalId.current);
      simIntervalId.current = null;
    }

    setIsSimulating(active);

    if (active) {
      if (patientDevices.length === 0) {
        alert('Please register/pair a smartwatch device first!');
        setIsSimulating(false);
        return;
      }
      
      const dev = (patientDevices[0] as any);
      
      // Start streaming every 3 seconds to Kafka
      simIntervalId.current = setInterval(async () => {
        const simulatedVitals = {
          patientId: user?.username,
          heartRate: Math.floor(65 + Math.random() * 45), // 65-110
          bloodPressure: `${Math.floor(115 + Math.random() * 20)}/${Math.floor(75 + Math.random() * 12)}`,
          temperature: parseFloat((36.2 + Math.random() * 1.5).toFixed(1)),
          oxygenLevel: parseFloat((94 + Math.random() * 6).toFixed(1)),
          caloriesBurned: Math.floor(150 + Math.random() * 100),
          steps: Math.floor(2500 + Math.random() * 500),
          sleepMinutes: 480,
          recordedAt: new Date().toISOString()
        };

        try {
          await api.post(`/wearable/sync?deviceId=${dev.deviceId}`, simulatedVitals);
          
          // Re-fetch notifications & profile
          fetchNotifications(user?.username || '');
        } catch (err) {}
      }, 3000);
      
      alert('Smartwatch vital telemetry streaming initialized. Records are publishing to Kafka.');
    } else {
      alert('Kafka stream telemetry simulation terminated.');
    }
  };

  const fetchNotifications = async (username: string) => {
    try {
      const res = await api.get(`/notifications/patient/${username}`);
      if (res.data?.success) {
        setNotifications(res.data.data);
      }
    } catch (e) {}
  };

  const handleReadNotifications = async () => {
    try {
      await api.post('/notifications/read', { patientId: user?.username });
      setNotifications([]);
      setShowNotifications(false);
    } catch (e) {}
  };

  const fetchAuditLogs = async () => {
    try {
      const url = `/audit/logs${selectedAuditUser ? '?username=' + selectedAuditUser : ''}`;
      const res = await api.get(url);
      if (res.data?.success && Array.isArray(res.data.data)) {
        dispatch(setAuditLogs(res.data.data));
      }
    } catch (e) {}
  };

  const fetchDlqLogs = async () => {
    try {
      const res = await api.get('/stream/dlq/list');
      if (res.data?.success && Array.isArray(res.data.data)) {
        dispatch(setDlqLogs(res.data.data));
      }
    } catch (e) {}
  };

  const handleReplayDlq = async (rawPayload: string, reason: string) => {
    try {
      const res = await api.post(`/stream/dlq?rawPayload=${encodeURIComponent(rawPayload)}&reason=${encodeURIComponent(reason)}`);
      if (res.data?.success) {
        alert('DLQ payload re-queued in Kafka stream pipeline');
        fetchDlqLogs();
      }
    } catch (e) {
      alert('Failed to replay DLQ package');
    }
  };

  const handleLogoutAction = () => {
    if (simIntervalId.current) {
      clearInterval(simIntervalId.current);
      simIntervalId.current = null;
    }
    setIsSimulating(false);
    dispatch(logout());
  };

  const navigateAuth = (view: 'login' | 'register' | 'forgot') => {
    dispatch(clearMessages());
    setAuthView(view);
  };

  // ==========================================
  // View Rendering
  // ==========================================

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        {otpRequired ? (
          <VerifyOtp />
        ) : authView === 'register' ? (
          <Register onToggleLogin={() => navigateAuth('login')} />
        ) : authView === 'forgot' ? (
          <ForgotPassword onToggleLogin={() => navigateAuth('login')} />
        ) : (
          <Login 
            onToggleRegister={() => navigateAuth('register')} 
            onToggleForgotPassword={() => navigateAuth('forgot')} 
          />
        )}
      </div>
    );
  }

  const isCritical = notifications.some((n: any) => n.message?.toLowerCase().includes('critical') || n.type === 'CRITICAL');
  const executiveMetrics = {
    totalPatients: user?.roles?.includes('ADMIN') ? 14 : 1,
    activePatients: user?.roles?.includes('ADMIN') ? 8 : 1,
    connectedHospitals: 3,
    digitalTwins: user?.roles?.includes('ADMIN') ? 12 : 1,
    liveDevices: patientDevices.length || (user?.roles?.includes('ADMIN') ? 4 : 0),
    activeConsents: patientConsents.filter((c: any) => c.status === 'GRANTED').length || (user?.roles?.includes('ADMIN') ? 22 : 0),
    pendingSync: 1,
    kafkaThroughput: isSimulating ? '1.8 K/s' : '0.0 K/s',
    mongodbStatus: '99 ms',
    apiHealth: '100%',
    uptime: '14.5 days',
    criticalAlertsCount: isCritical ? 1 : 0
  };

  return (
    <div className="app-container">
      <header className="navbar">
        <div className="nav-brand">
          <Cpu size={24} style={{ color: 'var(--color-primary)' }} />
          <span>MediSphere Platform</span>
          <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-secondary)', marginLeft: '10px' }}>
            EHR Twin Core
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            ID: <strong style={{ color: '#fff' }}>{user?.username}</strong> ({Array.from(new Set((user?.roles || []).map(r => r.startsWith('ROLE_') ? r : `ROLE_${r}`))).join(', ')})
          </span>

          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', position: 'relative' }}
            >
              <Bell size={20} />
              {notifications.length > 0 && (
                <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--color-danger)' }}></span>
              )}
            </button>

            {showNotifications && (
              <div className="glass-panel" style={{ position: 'absolute', right: 0, top: '35px', width: '320px', padding: '16px', zIndex: 1000, background: '#1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                  <strong style={{ fontSize: '14px' }}>Alarms & Notifications</strong>
                  <button onClick={handleReadNotifications} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '11px', cursor: 'pointer' }}>
                    Clear All
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', display: 'block', padding: '10px 0' }}>
                      No unread alerts
                    </span>
                  ) : (
                    notifications.map((n: any, idx) => (
                      <div key={idx} style={{ fontSize: '12px', padding: '8px', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', borderLeft: `3px solid ${n.type === 'CRITICAL' ? 'var(--color-danger)' : n.type === 'WARNING' ? 'var(--color-warning)' : 'var(--color-primary)'}` }}>
                        <div style={{ fontWeight: '600', marginBottom: '2px', color: n.type === 'CRITICAL' ? '#fca5a5' : n.type === 'WARNING' ? '#fcd34d' : '#fff' }}>
                          {n.type || 'INFO'}
                        </div>
                        {n.message || n.content}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={handleLogoutAction} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 72px)' }}>
        <aside style={{ width: '260px', borderRight: '1px solid var(--border-color)', background: 'rgba(10, 15, 29, 0.5)', padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', paddingLeft: '12px', marginBottom: '8px', display: 'block', letterSpacing: '0.05em' }}>
            Navigation Panel
          </span>

          {/* Dashboard — visible to DOCTOR and ADMIN only */}
          {(user?.roles?.includes('DOCTOR') || user?.roles?.includes('ROLE_DOCTOR') || user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`btn ${(activeTab === '' || activeTab === 'dashboard') ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', width: '100%', background: (activeTab === '' || activeTab === 'dashboard') ? '' : 'transparent', border: 'none' }}
          >
            <Database size={16} /> Executive Dashboard
          </button>
          )}

          {(user?.roles?.includes('DOCTOR') || user?.roles?.includes('ROLE_DOCTOR')) && (

            <>
              <button 
                onClick={() => setActiveTab('search')}
                className={`btn ${activeTab === 'search' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'search' ? '' : 'transparent', border: 'none' }}
              >
                <Search size={16} /> Patient Search
              </button>
              
              <button 
                onClick={() => handleOpenPatient360()}
                className={`btn ${activeTab === 'patient360' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'patient360' ? '' : 'transparent', border: 'none' }}
              >
                <Cpu size={16} /> Patient 360 View
              </button>
            </>
          )}

          {(user?.roles?.includes('PATIENT') || user?.roles?.includes('ROLE_PATIENT')) && (
            <>
              <button 
                onClick={() => setActiveTab('profile')}
                className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'profile' ? '' : 'transparent', border: 'none' }}
              >
                <User size={16} /> Demographic Profile
              </button>

              <button 
                onClick={() => setActiveTab('wearables')}
                className={`btn ${activeTab === 'wearables' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'wearables' ? '' : 'transparent', border: 'none' }}
              >
                <Activity size={16} /> Wearable Vitals
              </button>

              <button 
                onClick={() => setActiveTab('consents')}
                className={`btn ${activeTab === 'consents' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'consents' ? '' : 'transparent', border: 'none' }}
              >
                <Shield size={16} /> HIPAA Consent
              </button>

              <button 
                onClick={() => handleOpenPatient360()}
                className={`btn ${activeTab === 'patient360' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'patient360' ? '' : 'transparent', border: 'none' }}
              >
                <Cpu size={16} /> Digital Health Twin (3D)
              </button>
            </>
          )}

          {(user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
            <>
              <button 
                onClick={() => setActiveTab('audit')}
                className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'audit' ? '' : 'transparent', border: 'none' }}
              >
                <FileText size={16} /> HIPAA Audit Trail
              </button>
            </>
          )}

          {(user?.roles?.includes('DOCTOR') || user?.roles?.includes('ROLE_DOCTOR') || user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
          <button 
            onClick={() => {
              setActiveTab('providers');
              fetchProviders();
            }}
            className={`btn ${activeTab === 'providers' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'providers' ? '' : 'transparent', border: 'none' }}
          >
            <Building size={16} /> Hospital Services
          </button>
          )}

          {(user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'analytics' ? '' : 'transparent', border: 'none' }}
          >
            <BarChart3 size={16} /> Analytics
          </button>
          )}

          {(user?.roles?.includes('PATIENT') || user?.roles?.includes('ROLE_PATIENT')) && (
            <button
              onClick={() => setActiveTab('live-vitals')}
              className={`btn ${activeTab === 'live-vitals' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'live-vitals' ? '' : 'transparent', border: 'none' }}
            >
              <Wifi size={16} /> Live Vitals
            </button>
          )}

          {(user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
            <button 
              onClick={() => setActiveTab('system-health')}
              className={`btn ${activeTab === 'system-health' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'system-health' ? '' : 'transparent', border: 'none' }}
            >
              <Activity size={16} /> System Health
            </button>
          )}

          {(user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
            <button
              onClick={() => setActiveTab('assign-patients')}
              className={`btn ${activeTab === 'assign-patients' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'assign-patients' ? '' : 'transparent', border: 'none' }}
            >
              <UserCheck size={16} /> Assign Patients
            </button>
          )}

          {/* ===== Milestone 2: AI Architecture Navigation ===== */}
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', paddingLeft: '12px', marginTop: '16px', marginBottom: '4px', display: 'block', letterSpacing: '0.05em' }}>
            AI Architecture
          </span>
          <button
            onClick={() => setActiveTab('ai-prediction')}
            className={`btn ${activeTab === 'ai-prediction' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'ai-prediction' ? '' : 'transparent', border: 'none' }}
          >
            <Heart size={16} /> AI Risk Prediction
          </button>
          <button
            onClick={async () => {
              await ensurePrediction();
              setActiveTab('prediction-result');
            }}
            className={`btn ${activeTab === 'prediction-result' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'prediction-result' ? '' : 'transparent', border: 'none' }}
          >
            <TrendingUp size={16} /> Prediction Result
          </button>
          <button
            onClick={async () => {
              const pred = await ensurePrediction();
              if (pred) setPredictionFormData(pred);
              setActiveTab('shap-explanation');
            }}
            className={`btn ${activeTab === 'shap-explanation' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'shap-explanation' ? '' : 'transparent', border: 'none' }}
          >
            <BarChart3 size={16} /> SHAP Explanation
          </button>
          {(user?.roles?.includes('DOCTOR') || user?.roles?.includes('ROLE_DOCTOR') || user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
            <button
              onClick={() => setActiveTab('model-management')}
              className={`btn ${activeTab === 'model-management' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'model-management' ? '' : 'transparent', border: 'none' }}
            >
              <Database size={16} /> Model Management
            </button>
          )}

          {/* ===== Milestone 3: Continuous Monitoring & Alerts Navigation ===== */}
          {(user?.roles?.includes('DOCTOR') || user?.roles?.includes('ROLE_DOCTOR') || user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
            <>
              <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700', paddingLeft: '12px', marginTop: '16px', marginBottom: '4px', display: 'block', letterSpacing: '0.05em' }}>
                Monitoring (M3)
              </span>
              <button
                onClick={() => setActiveTab('monitoring')}
                className={`btn ${activeTab === 'monitoring' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'monitoring' ? '' : 'transparent', border: 'none' }}
              >
                <Activity size={16} /> Monitoring Center
              </button>
              <button
                onClick={() => setActiveTab('ai-anomaly')}
                className={`btn ${activeTab === 'ai-anomaly' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'ai-anomaly' ? '' : 'transparent', border: 'none' }}
              >
                <AlertTriangle size={16} /> AI Anomaly View
              </button>
              <button
                onClick={() => setActiveTab('alert-history')}
                className={`btn ${activeTab === 'alert-history' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'alert-history' ? '' : 'transparent', border: 'none' }}
              >
                <FileText size={16} /> Alert History
              </button>
            </>
          )}


          {(user?.roles?.includes('PATIENT') || user?.roles?.includes('ROLE_PATIENT')) && (
            <button
              onClick={() => setActiveTab('notifications')}
              className={`btn ${activeTab === 'notifications' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ justifyContent: 'flex-start', width: '100%', background: activeTab === 'notifications' ? '' : 'transparent', border: 'none' }}
            >
              <Bell size={16} /> Notifications
            </button>
          )}

        </aside>


        <main className="main-content" style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
          {(activeTab === '' || activeTab === 'dashboard') && (user?.roles?.includes('DOCTOR') || user?.roles?.includes('ROLE_DOCTOR') || user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
            <div style={{ marginBottom: '28px' }}>
              <Dashboard user={user} metrics={executiveMetrics} onViewPatient={(pid) => handleSelectPatient(pid)} />
            </div>
          )}


          {activeTab === 'search' && (user?.roles?.includes('DOCTOR') || user?.roles?.includes('ROLE_DOCTOR')) && (
            <PatientSearch 
              user={user}
              patients={patientsList} 
              onSearch={fetchPatients} 
              onSelectPatient={handleSelectPatient} 
            />
          )}

          {activeTab === 'patient360' && (
            <Patient360 
              user={user}
              patientId={selectedPatientId}
              dashboard360={dashboard360}
              onRebuildTwin={handleRebuildTwin}
              rebuildTwinLoading={rebuildTwinLoading}
              onSyncFhir={handleSyncFhir}
              syncFhirLoading={syncFhirLoading}
              fhirJson={fhirJson}
              onFetchFhir={handleFetchFhir}
              fhirTab={fhirTab}
              onChangeFhirTab={(tab) => dispatch(setFhirTab(tab))}
            />
          )}

          {activeTab === 'profile' && (user?.roles?.includes('PATIENT') || user?.roles?.includes('ROLE_PATIENT')) && (
            <PatientProfile 
              initialProfile={patientProfile} 
              onSaveProfile={handleSaveProfile} 
            />
          )}

          {activeTab === 'consents' && (user?.roles?.includes('PATIENT') || user?.roles?.includes('ROLE_PATIENT')) && (
            <ConsentManagement 
              consents={patientConsents}
              onGrantConsent={handleGrantConsent}
              onRevokeConsent={handleRevokeConsent}
            />
          )}

          {activeTab === 'wearables' && (user?.roles?.includes('PATIENT') || user?.roles?.includes('ROLE_PATIENT')) && (
            <WearableSync 
              devices={patientDevices}
              patientId={user?.username || ''}
              onRegisterDevice={handleRegisterDevice}
              isSimulating={isSimulating}
              onToggleSimulation={handleToggleSimulation}
            />
          )}

          {activeTab === 'providers' && (user?.roles?.includes('DOCTOR') || user?.roles?.includes('ROLE_DOCTOR') || user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
            <ProvidersList 
              providers={providers} 
            />
          )}

          {activeTab === 'analytics' && (user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
            <Analytics />
          )}

          {activeTab === 'live-vitals' && (user?.roles?.includes('PATIENT') || user?.roles?.includes('ROLE_PATIENT')) && (
            <LiveVitals patientId={user?.username || ''} />
          )}

          {activeTab === 'system-health' && (user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
            <SystemHealth />
          )}

          {activeTab === 'audit' && (user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
            <AuditLogs 
              auditLogs={auditLogs}
              dlqLogs={dlqLogs}
              onReplayDlq={handleReplayDlq}
              selectedUser={selectedAuditUser}
              onChangeUser={(u) => {
                setSelectedAuditUser(u);
                fetchAuditLogs();
              }}
              onRefresh={() => {
                fetchAuditLogs();
                fetchDlqLogs();
              }}
            />
          )}

          {/* ===== Milestone 2: AI Architecture Pages ===== */}
          {activeTab === 'ai-prediction' && (
            <AIPredictionDashboard
              onNavigateToPrediction={(prediction: any) => {
                setCurrentPrediction(prediction);
                setActiveTab('prediction-result');
              }}
              onNavigateToExplanation={(pid: string, data: any) => {
                setPredictionFormData(data);
                setActiveTab('shap-explanation');
              }}
            />
          )}

          {activeTab === 'prediction-result' && (
            <PredictionResult
              prediction={currentPrediction}
              onBack={() => setActiveTab('ai-prediction')}
              onViewExplanation={() => {
                if (currentPrediction) setPredictionFormData(currentPrediction);
                setActiveTab('shap-explanation');
              }}
            />
          )}

          {activeTab === 'shap-explanation' && (
            <ShapExplanation
              patientId={currentPrediction?.patientId || selectedPatientId || user?.username || 'john_doe'}
              predictionData={predictionFormData || currentPrediction}
              onBack={() => setActiveTab(currentPrediction ? 'prediction-result' : 'ai-prediction')}
            />
          )}

          {/* ===== Milestone 3: Page Renders ===== */}
          {activeTab === 'monitoring' && (user?.roles?.includes('DOCTOR') || user?.roles?.includes('ROLE_DOCTOR') || user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
            <MonitoringDashboard
              user={user}
              onViewPatient={(pid) => handleSelectPatient(pid)}
            />
          )}

          {activeTab === 'ai-anomaly' && (user?.roles?.includes('DOCTOR') || user?.roles?.includes('ROLE_DOCTOR') || user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
            <AIAnomalyView
              patients={patientsList}
              selectedPatientId={selectedPatientId}
              user={user}
            />
          )}

          {activeTab === 'alert-history' && (
            <AlertHistoryTable />
          )}

          {activeTab === 'notifications' && (
            <NotificationCenter user={user} />
          )}

          {activeTab === 'model-management' && (user?.roles?.includes('DOCTOR') || user?.roles?.includes('ROLE_DOCTOR') || user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
            <ModelManagement />
          )}

          {activeTab === 'assign-patients' && (user?.roles?.includes('ADMIN') || user?.roles?.includes('ROLE_ADMIN')) && (
            <AdminPatientAssignment />
          )}
        </main>

        <EmergencySOSPopup user={user} onViewPatientRecord={(pid) => handleSelectPatient(pid)} />
      </div>
    </div>
  );
}
