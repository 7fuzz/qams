/**
 * Simple persistent state helper with 5-minute expiration.
 */
export const saveState = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  const data = {
    value,
    timestamp: Date.now(),
  };
  localStorage.setItem(`state_${key}`, JSON.stringify(data));
};

export const loadState = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(`state_${key}`);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    const fiveMinutes = 5 * 60 * 1000;
    
    if (Date.now() - data.timestamp > fiveMinutes) {
      localStorage.removeItem(`state_${key}`);
      return null;
    }
    
    return data.value as T;
  } catch {
    return null;
  }
};

export const clearState = (key: string) => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`state_${key}`);
};
