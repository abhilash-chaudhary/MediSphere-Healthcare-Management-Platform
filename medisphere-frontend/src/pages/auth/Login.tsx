import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setAuthErrorMsg, setOtpRequiredState, loginSuccess, setAuthSuccessMsg } from '../../store/authSlice';
import api from '../../services/api';
import { Lock, User } from 'lucide-react';

interface LoginProps {
  onToggleRegister: () => void;
  onToggleForgotPassword: () => void;
}

export default function Login({ onToggleRegister, onToggleForgotPassword }: LoginProps) {
  const dispatch = useDispatch();
  const { authError, authSuccess } = useSelector((state: RootState) => state.auth);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      dispatch(setAuthErrorMsg('Please fill in all fields'));
      return;
    }

    setLoading(false);
    dispatch(setAuthErrorMsg(''));
    dispatch(setAuthSuccessMsg(''));
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      const data = res.data;
      if (data.success && data.data) {
        if (data.data.otpRequired) {
          dispatch(setOtpRequiredState({ email: data.data.email, username }));
        } else {
          // Parse JWT user claims
          const tokenRes = data.data;
          const decodedUser = parseJwt(tokenRes.accessToken);
          dispatch(loginSuccess({ token: tokenRes.accessToken, user: decodedUser }));
        }
      } else {
        dispatch(setAuthErrorMsg(data.message || 'Invalid credentials'));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Server connection error';
      dispatch(setAuthErrorMsg(msg));
    } finally {
      setLoading(false);
    }
  };

  function parseJwt(token: string) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  return (
    <div className="glass-panel" style={{ padding: '40px', width: '100%', maxWidth: '450px' }}>
      <h2 className="neon-text" style={{ fontSize: '28px', marginBottom: '8px', textAlign: 'center', background: 'linear-gradient(135deg, #fff 30%, var(--color-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Welcome Back
      </h2>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px', fontSize: '14px' }}>
        Enter credentials to access Patient 360 Registry
      </p>

      {authError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px' }}>
          {authError}
        </div>
      )}

      {authSuccess && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#a7f3d0', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px' }}>
          {authSuccess}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <label>Username</label>
          <div style={{ position: 'relative' }}>
            <User size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onToggleForgotPassword} className="link-btn" style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '13px', cursor: 'pointer' }}>
            Forgot Password?
          </button>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
        Need an account?{' '}
        <button onClick={onToggleRegister} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: '600', cursor: 'pointer', padding: '0 4px' }}>
          Register Portal
        </button>
      </div>
    </div>
  );
}
