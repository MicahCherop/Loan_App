import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

const IDLE_TIMEOUT = 10 * 60 * 1000;

export function useIdleTimeout() {
  const timerRef = useRef(null);

  useEffect(() => {
    const logout = async () => {
      console.log('User idle for 10 minutes, logging out...');
      await supabase.auth.signOut();
    };

    const resetTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(logout, IDLE_TIMEOUT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    resetTimer();

    const handleActivity = () => resetTimer();

    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);
}
