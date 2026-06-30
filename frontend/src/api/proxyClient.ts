import type { AuthStatus, FileContent, FolderListing, RemoteItem } from '@/types';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';

export interface BackendHealth {
  status: string;
  mockMezzoteam: boolean;
  mockTrimble: boolean;
  mezzoteamApiVersion: string;
}

interface FetchOptions extends RequestInit {
  trimbleToken?: string | null;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { trimbleToken, headers, ...rest } = options;
  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(trimbleToken ? { 'X-Trimble-Token': trimbleToken } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Erreur HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchBackendHealth(): Promise<BackendHealth> {
  return apiFetch<BackendHealth>('/health');
}

export async function getAuthStatus(): Promise<AuthStatus> {
  return apiFetch<AuthStatus>('/api/auth/status');
}

export function getLoginUrl(): string {
  return `${BACKEND_URL}/api/auth/login`;
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
}

/* ----------------------------- Mezzoteam ----------------------------- */

export async function fetchRootFolders(workspaceId: string) {
  return apiFetch<{ folders: RemoteItem[] }>(
    `/api/mezzoteam/workspaces/${encodeURIComponent(workspaceId)}/folders`,
  );
}

export async function fetchFolderContents(workspaceId: string, folderId: string) {
  return apiFetch<{ folders: RemoteItem[]; documents: RemoteItem[] }>(
    `/api/mezzoteam/workspaces/${encodeURIComponent(workspaceId)}/folders/${encodeURIComponent(folderId)}/contents`,
  );
}

export async function getDocumentDownloadUrl(workspaceId: string, documentId: string) {
  return apiFetch<{ url: string; mock?: boolean; message?: string }>(
    `/api/mezzoteam/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/download`,
  );
}

export async function getMezzoteamDocumentContent(
  workspaceId: string,
  documentId: string,
): Promise<FileContent> {
  return apiFetch<FileContent>(
    `/api/mezzoteam/workspaces/${encodeURIComponent(workspaceId)}/documents/${encodeURIComponent(documentId)}/content`,
  );
}

export async function uploadMezzoteamDocument(
  workspaceId: string,
  folderId: string,
  payload: { name: string; base64: string },
) {
  return apiFetch<{ id: string | null; name: string; folderId: string }>(
    `/api/mezzoteam/workspaces/${encodeURIComponent(workspaceId)}/folders/${encodeURIComponent(folderId)}/documents`,
    { method: 'POST', body: JSON.stringify(payload) },
  );
}

export async function createMezzoteamFolder(
  workspaceId: string,
  parentId: string,
  name: string,
) {
  return apiFetch<{ id: string | null; name: string; parentId: string }>(
    `/api/mezzoteam/workspaces/${encodeURIComponent(workspaceId)}/folders/${encodeURIComponent(parentId)}/folders`,
    { method: 'POST', body: JSON.stringify({ name }) },
  );
}

/* -------------------------- Trimble Connect -------------------------- */

interface TrimbleCtx {
  trimbleToken?: string | null;
  region?: string | null;
  rootId?: string | null;
}

function regionQuery(region?: string | null): string {
  return region ? `?region=${encodeURIComponent(region)}` : '';
}

export async function fetchTrimbleRoot(
  ctx: TrimbleCtx,
): Promise<{ rootId: string; folders: RemoteItem[]; files: RemoteItem[] }> {
  const query = ctx.rootId
    ? `?rootId=${encodeURIComponent(ctx.rootId)}${ctx.region ? `&region=${encodeURIComponent(ctx.region)}` : ''}`
    : regionQuery(ctx.region);
  return apiFetch(`/api/trimble/items${query}`, { trimbleToken: ctx.trimbleToken });
}

export async function fetchTrimbleFolder(
  folderId: string,
  ctx: TrimbleCtx,
): Promise<FolderListing> {
  return apiFetch<FolderListing>(
    `/api/trimble/folders/${encodeURIComponent(folderId)}/items${regionQuery(ctx.region)}`,
    { trimbleToken: ctx.trimbleToken },
  );
}

export async function getTrimbleFileContent(
  fileId: string,
  ctx: TrimbleCtx,
): Promise<FileContent> {
  return apiFetch<FileContent>(
    `/api/trimble/files/${encodeURIComponent(fileId)}/content${regionQuery(ctx.region)}`,
    { trimbleToken: ctx.trimbleToken },
  );
}

export async function uploadTrimbleFile(
  folderId: string,
  payload: { name: string; base64: string },
  ctx: TrimbleCtx,
) {
  return apiFetch<{ id: string | null; name: string; folderId: string }>(
    `/api/trimble/folders/${encodeURIComponent(folderId)}/files${regionQuery(ctx.region)}`,
    { method: 'POST', body: JSON.stringify(payload), trimbleToken: ctx.trimbleToken },
  );
}

export async function createTrimbleFolder(parentId: string, name: string, ctx: TrimbleCtx) {
  return apiFetch<{ id: string | null; name: string; parentId: string }>(
    `/api/trimble/folders/${encodeURIComponent(parentId)}/folders${regionQuery(ctx.region)}`,
    { method: 'POST', body: JSON.stringify({ name }), trimbleToken: ctx.trimbleToken },
  );
}
