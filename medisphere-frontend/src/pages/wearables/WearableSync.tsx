import React, { useState } from 'react';
import { Radio, RefreshCw, Cpu, Plus, CheckCircle, Smartphone } from 'lucide-react';
import api from '../../services/api';

interface Device {
  deviceId: string;
  deviceName: string;
  deviceType: string;
  status: string;
  lastSyncedAt: string;
}

interface WearableSyncProps {
  devices: Device[];
  patientId: string;
  onRegisterDevice: (deviceId: string, deviceName: string, deviceType: string) => void;
  isSimulating: boolean;
  onToggleSimulation: (active: boolean) => void;
}

export default function WearableSync({
  devices,
  patientId,
  onRegisterDevice,
  isSimulating,
  onToggleSimulation
}: WearableSyncProps) {
  const [devId, setDevId] = useState('');
  const [devName, setDevName] = useState('');
  const [devType, setDevType] = useState('Smartwatch');

  // Simulation telemetry states
  const [simHeartRate, setSimHeartRate] = useState(75);
  const [simOxy, setSimOxy] = useState(98);
  const [simBP_sys, setSimBP_sys] = useState(120);
  const [simBP_dia, setSimBP_dia] = useState(80);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!devId.trim() || !devName.trim()) return;
    onRegisterDevice(devId.trim(), devName.trim(), devType);
    setDevId('');
    setDevName('');
  };

  const handleSimVitalsChange = (type: string, val: number) => {
    if (type === 'hr') setSimHeartRate(val);
    if (type === 'oxy') setSimOxy(val);
    if (type === 'sys') setSimBP_sys(val);
    if (type === 'dia') setSimBP_dia(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div className="glass-panel" style={{ padding: '24px 32px' }}>
        <h2 style={{ fontSize: '24px', background: 'linear-gradient(135deg, #fff 40%, var(--color-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
          Smartwatch Vital Telemetry
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Connect smartwatch and IoT wearable devices to capture continuous biometric streams. Vitals are published instantly to the Apache Kafka stream queue.
        </p>
      </div>

      <div className="grid-3">
        {/* Register wearable */}
        <div className="glass-panel" style={{ padding: '24px', height: 'fit-content' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '18px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Pair Vital Device
          </h3>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label>Device Serial ID</label>
              <input
                type="text"
                placeholder="e.g. MS_WATCH_X90"
                value={devId}
                onChange={(e) => setDevId(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Device Friendly Name</label>
              <input
                type="text"
                placeholder="e.g. My Apple Watch"
                value={devName}
                onChange={(e) => setDevName(e.target.value)}
                required
              />
            </div>

            <div>
              <label>Wearable Category</label>
              <select
                value={devType}
                onChange={(e) => setDevType(e.target.value)}
              >
                <option value="Smartwatch">Smartwatch (HR + SpO2)</option>
                <option value="ECG Patch">ECG Chest Patch</option>
                <option value="Pulse Oximeter">IoT Pulse Oximeter</option>
                <option value="Health Band">Fitness Health Tracker</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
              Pair New Device
            </button>
          </form>
        </div>

        {/* Live simulations panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '18px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={18} /> Live Stream Simulator
          </h3>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
            Toggle active streaming to simulate live wear telemetry. Adjust vital values below to test threshold alarms on the twin controller.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Heart Rate (bpm)</span>
                <strong style={{ color: 'var(--color-primary)' }}>{simHeartRate}</strong>
              </div>
              <input
                type="range"
                min={40}
                max={150}
                value={simHeartRate}
                onChange={(e) => handleSimVitalsChange('hr', Number(e.target.value))}
                disabled={!isSimulating}
                style={{ width: '100%', height: '4px', cursor: isSimulating ? 'pointer' : 'not-allowed' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Oxygen Saturation (SpO2 %)</span>
                <strong style={{ color: 'var(--color-success)' }}>{simOxy}%</strong>
              </div>
              <input
                type="range"
                min={85}
                max={100}
                value={simOxy}
                onChange={(e) => handleSimVitalsChange('oxy', Number(e.target.value))}
                disabled={!isSimulating}
                style={{ width: '100%', height: '4px', cursor: isSimulating ? 'pointer' : 'not-allowed' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px' }}>Systolic (mmHg)</label>
                <input
                  type="number"
                  min={80}
                  max={180}
                  value={simBP_sys}
                  onChange={(e) => handleSimVitalsChange('sys', Number(e.target.value))}
                  disabled={!isSimulating}
                  style={{ fontSize: '12px', padding: '8px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '11px' }}>Diastolic (mmHg)</label>
                <input
                  type="number"
                  min={50}
                  max={110}
                  value={simBP_dia}
                  onChange={(e) => handleSimVitalsChange('dia', Number(e.target.value))}
                  disabled={!isSimulating}
                  style={{ fontSize: '12px', padding: '8px' }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => onToggleSimulation(!isSimulating)}
            className={`btn ${isSimulating ? 'btn-danger' : 'btn-primary'}`}
            style={{ width: '100%' }}
          >
            {isSimulating ? 'Terminate Telemetry Stream' : 'Initialize Kafka Stream'}
          </button>
        </div>

        {/* Paired devices status list */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '18px', color: 'var(--color-primary)' }}>
            Paired Devices
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {devices.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                No synced smartwatches registered.
              </div>
            ) : (
              devices.map((device, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '14px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <Smartphone size={24} style={{ color: 'var(--color-primary)' }} />
                  <div>
                    <strong style={{ fontSize: '14px', color: '#fff', display: 'block' }}>
                      {device.deviceName}
                    </strong>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Serial: {device.deviceId} ({device.deviceType})
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-success)', marginTop: '4px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)' }}></span>
                      {device.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
