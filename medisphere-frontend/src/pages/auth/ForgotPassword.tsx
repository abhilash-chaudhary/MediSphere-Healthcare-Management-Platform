import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setAuthErrorMsg, setAuthSuccessMsg } from '../../store/authSlice';
import api from '../../services/api';
import { User, Mail, Lock } from 'lucide-react';

interface ForgotPasswordProps {
  onToggleLogin: () => void;
}

export default function ForgotPassword({ onToggleLogin }: ForgotPasswordProps) {
  const dispatch = useDispatch();
  const { authError } = useSelector((state: RootState) => state.auth);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !newPassword || !confirmPassword) {
      dispatch(setAuthErrorMsg('Please fill in all fields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      dispatch(setAuthErrorMsg('Passwords do not match'));
      return;
    }

    setLoading(true);
    dispatch(setAuthErrorMsg(''));
    dispatch(setAuthSuccessMsg(''));

    try {
      const res = await api.post('/auth/forgot-password', {
        username,
        email,
        newPassword,
      });
      const data = res.data;
      if (data.success) {
        dispatch(setAuthSuccessMsg('Password reset successfully! Please sign in.'));
        onToggleLogin();
      } else {
        dispatch(setAuthErrorMsg(data.message || 'Reset failed'));
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
        Reset Password
      </h2>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
        Verify user credentials to change password
      </p>

      {authError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px' }}>
          {authError}
        </div>
      )}

      <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label>Username</label>
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Username"
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
              placeholder="Registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ paddingLeft: '42px' }}
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label>New Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ paddingLeft: '42px' }}
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label>Confirm Password</label>
          <div style={{ position: 'relative' }}>
            <Lock size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ paddingLeft: '42px' }}
              disabled={loading}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
          {loading ? 'Updating...' : 'Save Password'}
        </button>
      </form>

      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
        Back to{' '}
        <button onClick={onToggleLogin} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', padding: '0 4px' }}>
          Sign In
        </button>
      </div>
    </div>
  );
}
