import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api';

// Custom hook for SSE live vitals streaming
export function useLiveVitals(patientId: string | null) {
  const [liveVital, setLiveVital] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (!patientId) return;
    
    const token = localStorage.getItem('medisphere_token') || '';
    // SSE through a helper endpoint that injects the token
    const url = `http://localhost:8080/vitals/live/${patientId}`;
    
    try {
      // Note: EventSource doesn't support custom headers, so we use a workaround
      // In production, use a token query param or WebSocket
      const es = new EventSource(`${url}?token=${token}`);
      eventSourceRef.current = es;

      es.onopen = () => setConnected(true);

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (!data.error) {
            setLiveVital(data);
          }
        } catch {}
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
      };
    } catch {}
  }, [patientId]);

  const disconnect = useCallback(() => {
    eventSourceRef.current?.close();
    setConnected(false);
  }, []);

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  return { liveVital, connected, connect, disconnect };
}

// Custom hook for polling data with interval
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 5000,
  enabled: boolean = true
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Fetch failed');
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (!enabled) return;
    fetchData();
    intervalRef.current = setInterval(fetchData, intervalMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, intervalMs, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Custom hook for async API call with loading/error state
export function useAsync<T = any>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFn();
      setData(result);
      return result;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error occurred';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, execute };
}

// Hook to determine if user has specific role
export function useRole(roles: string[]) {
  const isAdmin = roles.some(r => r.includes('ADMIN'));
  const isDoctor = roles.some(r => r.includes('DOCTOR'));
  const isPatient = roles.some(r => r.includes('PATIENT'));
  return { isAdmin, isDoctor, isPatient };
}
