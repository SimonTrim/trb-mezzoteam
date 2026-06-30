import type { TransferLogEntry } from '@/types';

const STORAGE_KEY = 'mezzoteam-transfer-history';
const MAX_ENTRIES = 100;

export function loadTransferHistory(): TransferLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as TransferLogEntry[];
  } catch {
    return [];
  }
}

export function saveTransferEntry(entry: TransferLogEntry): TransferLogEntry[] {
  const history = [entry, ...loadTransferHistory()].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
}

export function updateTransferEntry(id: string, patch: Partial<TransferLogEntry>): TransferLogEntry[] {
  const history = loadTransferHistory().map((e) => (e.id === id ? { ...e, ...patch } : e));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
}

export function clearTransferHistory(): void {
  localStorage.removeItem(STORAGE_KEY);
}
