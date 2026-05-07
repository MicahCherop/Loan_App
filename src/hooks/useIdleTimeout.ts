import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const IDLE_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

export function useIdleTimeout() {
  const timerRef = useRef<number | null>(null);

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

  useEffect(() => {
    // Events to track user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Initial timer set
    resetTimer();

    // Listen for any of the activity events
    const handleActivity = () => resetTimer();
    
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);
}
