import type { SideId } from '@/types';

export interface FavoriteItem {
  id: string;
  side: SideId;
  nodeId: string;
  name: string;
  type: 'folder' | 'document';
  projectId: string;
  addedAt: string;
}

const STORAGE_KEY = 'mezzoteam-favorites';

function key(projectId: string): string {
  return `${STORAGE_KEY}:${projectId}`;
}

export function loadFavorites(projectId: string): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(key(projectId));
    return raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
  } catch {
    return [];
  }
}

export function isFavorite(projectId: string, side: SideId, nodeId: string): boolean {
  return loadFavorites(projectId).some((f) => f.side === side && f.nodeId === nodeId);
}

export function toggleFavorite(
  projectId: string,
  item: Omit<FavoriteItem, 'id' | 'addedAt'>,
): FavoriteItem[] {
  const current = loadFavorites(projectId);
  const exists = current.find((f) => f.side === item.side && f.nodeId === item.nodeId);
  const next = exists
    ? current.filter((f) => f.id !== exists.id)
    : [
        {
          ...item,
          id: `fav-${Date.now()}`,
          addedAt: new Date().toISOString(),
        },
        ...current,
      ];
  localStorage.setItem(key(projectId), JSON.stringify(next));
  return next;
}

export function removeFavorite(projectId: string, favoriteId: string): FavoriteItem[] {
  const next = loadFavorites(projectId).filter((f) => f.id !== favoriteId);
  localStorage.setItem(key(projectId), JSON.stringify(next));
  return next;
}
