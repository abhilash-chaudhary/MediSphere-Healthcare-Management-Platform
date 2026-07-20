import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setAuthErrorMsg, setAuthSuccessMsg } from '../../store/authSlice';
import api from '../../services/api';
import { User, Mail, Lock, Shield } from 'lucide-react';

interface RegisterProps {
  onToggleLogin: () => void;
}

export default function Register({ onToggleLogin }: RegisterProps) {
  const dispatch = useDispatch();
  const { authError } = useSelector((state: RootState) => state.auth);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('PATIENT'); // PATIENT, DOCTOR, ADMIN
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      dispatch(setAuthErrorMsg('Please fill in all fields'));
      return;
    }

    setLoading(true);
    dispatch(setAuthErrorMsg(''));
    dispatch(setAuthSuccessMsg(''));

    try {
      const roles = role === 'ADMIN' ? ['ADMIN'] : role === 'DOCTOR' ? ['DOCTOR'] : ['PATIENT'];
      const res = await api.post('/auth/register', {
        username,
        email,
        password,
        roles,
      });
      const data = res.data;
      if (data.success) {
        dispatch(setAuthSuccessMsg('Registration successful! Please login.'));
        onToggleLogin();
      } else {
        dispatch(setAuthErrorMsg(data.message || 'Registration failed'));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Server connection error';
      dispatch(setAuthErrorMsg(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '40px', width: '100%', maxWidth: '450px' }}>
      <h2 className="neon-text" style={{ fontSize: '28px', marginBottom: '8px', textAlign: 'center', background: 'linear-gradient(135deg, #fff 30%, var(--color-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Create Account
      </h2>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
        Register for clinical EHR sync & twin services
      </p>

      {authError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px' }}>
          {authError}
        </div>
      )}

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label>Username</label>
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Pick a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ paddingLeft: '42px' }}
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label>Email Address</label>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
            <input
              type="email"
              placeholder="yourname@hospital.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ paddingLeft: '42px' }}
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label>Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: '42px' }}
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label>Portal Role</label>
          <div style={{ position: 'relative' }}>
            <Shield size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)', zIndex: 10 }} />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{ paddingLeft: '42px', appearance: 'none', cursor: 'pointer' }}
              disabled={loading}
            >
              <option value="PATIENT">Patient Portal</option>
              <option value="DOCTOR">Clinician / Doctor Portal</option>
              <option value="ADMIN">Clinical System Administrator</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
          {loading ? 'Processing...' : 'Register Profile'}
        </button>
      </form>

      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
        Already registered?{' '}
        <button onClick={onToggleLogin} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', padding: '0 4px' }}>
          Sign In
        </button>
      </div>
    </div>
  );
}
