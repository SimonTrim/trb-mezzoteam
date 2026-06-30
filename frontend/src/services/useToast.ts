import { useEffect, useState } from 'react';
import { toastService, type Toast } from '@/services/toastService';

export function useToast(): Toast[] {
  const [toasts, setToasts] = useState<Toast[]>([]);
  useEffect(() => toastService.subscribe(setToasts), []);
  return toasts;
}
