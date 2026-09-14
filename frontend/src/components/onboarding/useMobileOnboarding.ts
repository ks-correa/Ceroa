import { useCallback, useEffect, useState } from 'react';
import { LocalStorageManager } from '../../services/storage';
import { ONBOARDING_STORAGE_KEY } from './onboarding.constants';

export const useMobileOnboarding = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 1023px)');
    if (mobileQuery.matches && !LocalStorageManager.get<boolean>(ONBOARDING_STORAGE_KEY, false)) {
      setIsOpen(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    LocalStorageManager.set(ONBOARDING_STORAGE_KEY, true);
    setIsOpen(false);
  }, []);

  return { isOpen, dismiss };
};
