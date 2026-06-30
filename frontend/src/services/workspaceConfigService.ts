const STORAGE_PREFIX = 'mezzoteam-workspace';

export interface WorkspaceMapping {
  mezzoteamWorkspaceId: string;
  label?: string;
  updatedAt: string;
}

function storageKey(trimbleProjectId: string): string {
  return `${STORAGE_PREFIX}:${trimbleProjectId}`;
}

export function getWorkspaceMapping(trimbleProjectId: string): WorkspaceMapping | null {
  try {
    const raw = localStorage.getItem(storageKey(trimbleProjectId));
    if (!raw) return null;
    return JSON.parse(raw) as WorkspaceMapping;
  } catch {
    return null;
  }
}

export function saveWorkspaceMapping(
  trimbleProjectId: string,
  mezzoteamWorkspaceId: string,
  label?: string,
): WorkspaceMapping {
  const mapping: WorkspaceMapping = {
    mezzoteamWorkspaceId: mezzoteamWorkspaceId.trim(),
    label: label?.trim() || undefined,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(storageKey(trimbleProjectId), JSON.stringify(mapping));
  return mapping;
}

export function clearWorkspaceMapping(trimbleProjectId: string): void {
  localStorage.removeItem(storageKey(trimbleProjectId));
}
