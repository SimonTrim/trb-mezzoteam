export interface AppSettings {
  confirmBeforeTransfer: boolean;
  autoRefreshAfterTransfer: boolean;
  showFileExtensions: boolean;
  defaultTab: 'transfer' | 'browse' | 'history';
}

const STORAGE_KEY = 'mezzoteam-app-settings';

const DEFAULTS: AppSettings = {
  confirmBeforeTransfer: true,
  autoRefreshAfterTransfer: true,
  showFileExtensions: true,
  defaultTab: 'transfer',
};

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function saveAppSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...loadAppSettings(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
