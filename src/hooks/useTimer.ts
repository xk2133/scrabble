import { useState, useCallback, useEffect, useRef } from 'react';

export function useTimer(initialSeconds: number, onExpire?: () => void) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const onExpireRef = useRef(onExpire);

  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  useEffect(() => {
    if (!isRunning || seconds <= 0) return;
    intervalRef.current = window.setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) { setIsRunning(false); onExpireRef.current?.(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, seconds]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => setIsRunning(false), []);
  const reset = useCallback((s?: number) => {
    setIsRunning(false);
    setSeconds(s ?? initialSeconds);
  }, [initialSeconds]);

  return { seconds, isRunning, start, pause, reset };
}
