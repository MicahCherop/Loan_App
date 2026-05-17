import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function useIdleTimeout(onTimeout) {
  const timerRef = useRef(null);
  const sessionTimerRef = useRef(null);

  useEffect(() => {
    const logout = async () => {
      console.log('User idle for 10 minutes, logging out...');
      await supabase.auth.signOut();
      if (onTimeout) onTimeout('idle');
    };

    const sessionLogout = async () => {
      console.log('Session expired after 15 minutes, logging out...');
      await supabase.auth.signOut();
      if (onTimeout) onTimeout('session');
    };

    const resetTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(logout, IDLE_TIMEOUT);
    };

    const resetSessionTimer = () => {
      if (sessionTimerRef.current) {
        window.clearTimeout(sessionTimerRef.current);
      }
      sessionTimerRef.current = window.setTimeout(sessionLogout, SESSION_TIMEOUT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    resetTimer();
    resetSessionTimer();

    const handleActivity = () => resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      if (sessionTimerRef.current) {
        window.clearTimeout(sessionTimerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [onTimeout]);
}

