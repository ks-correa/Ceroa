import { useCallback, useEffect, useRef, useState } from 'react';

export const useToast = (duration = 3_500) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string) => {
    if (timer.current) clearTimeout(timer.current);
    setToastMessage(message);
    timer.current = setTimeout(() => {
      setToastMessage((current) => current === message ? null : current);
    }, duration);
  }, [duration]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const clearToast = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToastMessage(null);
  }, []);
  return { toastMessage, showToast, clearToast };
};
