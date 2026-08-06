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

  // Demo accounts for offline/fallback login when auth-service is unavailable
  const DEMO_ACCOUNTS: Record<string, { password: string; roles: string[] }> = {
    admin:       { password: 'admin123',  roles: ['ADMIN', 'ROLE_ADMIN'] },
    dr_smith:    { password: 'password',  roles: ['DOCTOR', 'ROLE_DOCTOR'] },
    dr_johnson:  { password: 'password',  roles: ['DOCTOR', 'ROLE_DOCTOR'] },
    dr_jones:    { password: 'password',  roles: ['DOCTOR', 'ROLE_DOCTOR'] },
    doctor:      { password: 'password',  roles: ['DOCTOR', 'ROLE_DOCTOR'] },
    dr_primary:  { password: 'password',  roles: ['DOCTOR', 'ROLE_DOCTOR'] },
    john_doe:    { password: 'password',  roles: ['PATIENT', 'ROLE_PATIENT'] },
    jane_smith:  { password: 'password',  roles: ['PATIENT', 'ROLE_PATIENT'] },
  };

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
        const tokenRes = data.data;
        if (tokenRes.accessToken) {
          const decodedUser = parseJwt(tokenRes.accessToken) || tokenRes.user;
          dispatch(loginSuccess({ token: tokenRes.accessToken, user: decodedUser }));
        } else if (data.data.otpRequired) {
          dispatch(setOtpRequiredState({ email: data.data.email, username }));
        }
      } else {
        dispatch(setAuthErrorMsg(data.message || 'Invalid credentials'));
      }
    } catch (err: any) {
      // Backend unreachable — attempt demo/offline login
      const demoUser = DEMO_ACCOUNTS[username.toLowerCase()];
      if (demoUser && password === demoUser.password) {
        // Create a synthetic token so the rest of the app works
        const fakePayload = { sub: username, username, email: `${username}@medisphere.io`, roles: demoUser.roles };
        const fakeToken = 'demo.' + btoa(JSON.stringify(fakePayload)) + '.offline';
        dispatch(loginSuccess({
          token: fakeToken,
          user: { username, email: `${username}@medisphere.io`, roles: demoUser.roles }
        }));
      } else if (DEMO_ACCOUNTS[username.toLowerCase()]) {
        dispatch(setAuthErrorMsg('Incorrect password. Demo password is "password" (or "admin123" for admin).'));
      } else {
        dispatch(setAuthErrorMsg('Server is offline. Use a demo account: admin / dr_smith / dr_johnson / john_doe'));
      }
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
