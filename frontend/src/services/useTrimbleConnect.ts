import { useEffect, useState } from 'react';
import {
  trimbleConnectService,
  type TrimbleConnectContext,
} from '@/services/trimbleConnectService';

export function useTrimbleConnect(): TrimbleConnectContext & { isInitializing: boolean } {
  const [context, setContext] = useState<TrimbleConnectContext>(
    trimbleConnectService.getContext(),
  );
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = trimbleConnectService.subscribe(setContext);

    trimbleConnectService.initialize().finally(() => setIsInitializing(false));

    return unsubscribe;
  }, []);

  return { ...context, isInitializing };
}
