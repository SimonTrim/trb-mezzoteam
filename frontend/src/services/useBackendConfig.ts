import { useCallback, useEffect, useState } from 'react';
import { fetchBackendHealth } from '@/api/proxyClient';

interface BackendConfig {
  mockMezzoteam: boolean;
  mockTrimble: boolean;
  mezzoteamApiVersion: string;
  isLoading: boolean;
  error: string | null;
}

const defaultConfig: BackendConfig = {
  mockMezzoteam: false,
  mockTrimble: false,
  mezzoteamApiVersion: '3.4',
  isLoading: true,
  error: null,
};

export function useBackendConfig(): BackendConfig {
  const [config, setConfig] = useState<BackendConfig>(defaultConfig);

  const load = useCallback(async () => {
    try {
      const health = await fetchBackendHealth();
      setConfig({
        mockMezzoteam: health.mockMezzoteam,
        mockTrimble: health.mockTrimble,
        mezzoteamApiVersion: health.mezzoteamApiVersion,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setConfig({
        ...defaultConfig,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Backend inaccessible',
      });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return config;
}
