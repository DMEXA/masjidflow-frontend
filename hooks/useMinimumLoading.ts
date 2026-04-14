import { useEffect, useRef, useState } from 'react';

export function useMinimumLoading(isLoading: boolean, minimumMs = 420): boolean {
  const [visible, setVisible] = useState(isLoading);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now();
      }
      setVisible(true);
      return;
    }

    if (startTimeRef.current === null) {
      setVisible(false);
      return;
    }

    const elapsed = Date.now() - startTimeRef.current;
    const remaining = Math.max(minimumMs - elapsed, 0);
    const timer = window.setTimeout(() => {
      setVisible(false);
      startTimeRef.current = null;
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [isLoading, minimumMs]);

  return visible;
}
