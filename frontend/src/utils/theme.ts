export const applyColorTheme = (darkMode: boolean): void => {
  const root = document.documentElement;
  root.classList.toggle('dark', darkMode);
  root.style.colorScheme = darkMode ? 'dark' : 'light';
};

export const getStoredDarkMode = (): boolean => {
  try {
    const storedPreferences = localStorage.getItem('ceroa_preferences');
    if (!storedPreferences) return false;
    return JSON.parse(storedPreferences).darkMode === true;
  } catch {
    return false;
  }
};
