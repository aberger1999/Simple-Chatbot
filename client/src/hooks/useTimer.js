import { useState, useRef, useCallback, useEffect } from 'react';

export function useTimer({ onComplete } = {}) {
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const intervalRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  const startTimeRef = useRef(null);
  const elapsedBeforePauseRef = useRef(0);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback((durationSeconds) => {
    clearTimer();
    setTotalTime(durationSeconds);
    setTimeLeft(durationSeconds);
    setIsRunning(true);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    elapsedBeforePauseRef.current = 0;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          onCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const pause = useCallback(() => {
    if (!isRunning || isPaused) return;
    clearTimer();
    setIsPaused(true);
    const now = Date.now();
    elapsedBeforePauseRef.current += Math.round((now - startTimeRef.current) / 1000);
  }, [isRunning, isPaused, clearTimer]);

  const resume = useCallback(() => {
    if (!isPaused) return;
    setIsPaused(false);
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setIsRunning(false);
          onCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [isPaused, clearTimer]);

  const stop = useCallback(() => {
    clearTimer();
    let elapsed = elapsedBeforePauseRef.current;
    if (!isPaused && startTimeRef.current) {
      elapsed += Math.round((Date.now() - startTimeRef.current) / 1000);
    }
    setIsRunning(false);
    setIsPaused(false);
    return elapsed;
  }, [clearTimer, isPaused]);

  const reset = useCallback(() => {
    clearTimer();
    setTimeLeft(0);
    setTotalTime(0);
    setIsRunning(false);
    setIsPaused(false);
    startTimeRef.current = null;
    elapsedBeforePauseRef.current = 0;
  }, [clearTimer]);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;

  return { timeLeft, totalTime, isRunning, isPaused, progress, start, pause, resume, stop, reset };
}
