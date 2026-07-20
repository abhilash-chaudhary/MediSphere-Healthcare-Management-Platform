import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setAuthErrorMsg, loginSuccess, clearOtpState } from '../../store/authSlice';
import api from '../../services/api';
import { ShieldAlert, Key } from 'lucide-react';

export default function VerifyOtp() {
  const dispatch = useDispatch();
  const { otpEmail, otpUsername, authError } = useSelector((state: RootState) => state.auth);

  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(300); // 5 mins
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          dispatch(setAuthErrorMsg('OTP has expired. Please sign in again.'));
          dispatch(clearOtpState());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [dispatch]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode) {
      dispatch(setAuthErrorMsg('Please enter the OTP code'));
      return;
    }

    const normalizedOtp = otpCode.trim();
    if (!normalizedOtp) {
      dispatch(setAuthErrorMsg('Please enter the OTP code'));
      return;
    }

    setLoading(true);
    dispatch(setAuthErrorMsg(''));

    try {
      const res = await api.post('/auth/verify-otp', {
        username: otpUsername,
        otp: normalizedOtp,
      });
      const data = res.data;
      if (data.success && data.data) {
        const tokenRes = data.data;
        const decodedUser = parseJwt(tokenRes.accessToken);
        dispatch(loginSuccess({ token: tokenRes.accessToken, user: decodedUser }));
        dispatch(clearOtpState());
      } else {
        dispatch(setAuthErrorMsg(data.message || 'Invalid OTP code'));
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Verification connection error';
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

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <div className="glass-panel" style={{ padding: '40px', width: '100%', maxWidth: '450px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <ShieldAlert size={48} style={{ color: 'var(--color-primary)' }} />
      </div>
      <h2 className="neon-text" style={{ fontSize: '24px', marginBottom: '8px', textAlign: 'center', background: 'linear-gradient(135deg, #fff 30%, var(--color-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Two-Factor Verification
      </h2>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px', fontSize: '13px', lineHeight: '1.5' }}>
        We sent a 6-digit OTP security code to your registered email: <br />
        <strong style={{ color: '#fff' }}>{otpEmail}</strong>
      </p>

      {authError && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: '16px', fontSize: '13px' }}>
          {authError}
        </div>
      )}

      <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div>
          <label>Security Code</label>
          <div style={{ position: 'relative' }}>
            <Key size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ paddingLeft: '42px', letterSpacing: '4px', textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}
              disabled={loading}
            />
          </div>
        </div>

        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
          Code expires in: <strong style={{ color: 'var(--color-warning)' }}>{formatTime(countdown)}</strong>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
          {loading ? 'Verifying...' : 'Verify & Continue'}
        </button>
      </form>

      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px' }}>
        <button onClick={() => dispatch(clearOtpState())} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}>
          Cancel and Sign In
        </button>
      </div>
    </div>
  );
}
