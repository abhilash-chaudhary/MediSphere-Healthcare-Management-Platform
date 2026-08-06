import { getAllPatientsMaster, getDoctorAssignmentsMap } from '../constants/patientAssignments';
import api from './api';

export interface SOSAlertPayload {
  sosId: string;
  patientId: string;
  patientName: string;
  assignedDoctorUsername: string;
  assignedDoctorName?: string;
  timestamp: string;
  message: string;
  vitals?: {
    heartRate?: number;
    spo2?: number;
    temperature?: number;
    bloodPressure?: string;
  };
}

export function triggerEmergencySOS(patientId: string, customMsg?: string, customVitals?: any): SOSAlertPayload {
  const cleanId = patientId || 'john_doe';
  const allMaster = getAllPatientsMaster();
  const patientObj = allMaster.find(p => p.patientId === cleanId) || {
    patientId: cleanId,
    patientName: cleanId.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    vitals: { heartRate: 138, spo2: 91, temperature: 37.3, bloodPressure: '146/94' }
  };

  const docMap = getDoctorAssignmentsMap();
  let assignedDoc = 'dr_smith';
  for (const [doc, pList] of Object.entries(docMap)) {
    if (pList.includes(cleanId)) {
      assignedDoc = doc;
      break;
    }
  }

  const docNames: Record<string, string> = {
    dr_smith: 'Dr. Sarah Smith (Cardiology)',
    dr_johnson: 'Dr. Robert Johnson (Pulmonology)',
    doctor: 'Dr. Primary Doctor (General Medicine)',
    dr_jones: 'Dr. Robert Vance'
  };

  const payload: SOSAlertPayload = {
    sosId: `sos_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`,
    patientId: patientObj.patientId,
    patientName: patientObj.patientName || cleanId,
    assignedDoctorUsername: assignedDoc,
    assignedDoctorName: docNames[assignedDoc] || `Dr. ${assignedDoc}`,
    timestamp: new Date().toISOString(),
    message: customMsg || `🚨 EMERGENCY SOS TRIGGERED by ${patientObj.patientName || cleanId}! Immediate medical assistance requested.`,
    vitals: customVitals || patientObj.vitals
  };

  // 1. Dispatch custom event for intra-window listeners
  window.dispatchEvent(new CustomEvent('medisphere_emergency_sos', { detail: payload }));

  // 2. Save to localStorage to notify other tabs/windows via storage listener
  try {
    localStorage.setItem('medisphere_latest_sos', JSON.stringify(payload));
  } catch {}

  // 3. Post to backend API
  api.post('/monitoring/sos', payload).catch(() => {});

  // 4. Play emergency audio alert
  playEmergencyAudioChime();

  return payload;
}

export function playEmergencyAudioChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playBeep = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.25, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    playBeep(880, ctx.currentTime, 0.2);
    playBeep(1174, ctx.currentTime + 0.22, 0.25);
    playBeep(880, ctx.currentTime + 0.5, 0.2);
    playBeep(1174, ctx.currentTime + 0.72, 0.3);
  } catch {}
}
