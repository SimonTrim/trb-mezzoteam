export interface TrimbleProject {
  id: string;
  name: string;
  location: string;
  rootId?: string;
}

export interface TrimbleUserSettings {
  language?: string;
}

export interface TreeNodeData {
  id: string;
  name: string;
  type: 'folder' | 'document';
  children?: TreeNodeData[];
  isExpanded?: boolean;
  isLoading?: boolean;
  hasChildren?: boolean;
}

export interface MezzoteamFolder {
  id: string;
  name: string;
  type?: string;
}

export interface MezzoteamDocument {
  id: string;
  name: string;
  type?: string;
}

export interface FolderContentsResponse {
  folders: MezzoteamFolder[];
  documents: MezzoteamDocument[];
}

export interface AuthStatus {
  authenticated: boolean;
  expiresAt?: number | null;
  mock?: boolean;
}

export type SideId = 'mezzoteam' | 'trimble';

/** Élément générique listé dans un explorateur (dossier ou fichier). */
export interface RemoteItem {
  id: string;
  name: string;
}

export interface FolderListing {
  folders: RemoteItem[];
  files: RemoteItem[];
}

/** Contenu binaire d'un fichier/document (base64). */
export interface FileContent {
  name: string;
  base64: string;
  mock?: boolean;
}

export type TransferDirection = 'mezzoteam-to-trimble' | 'trimble-to-mezzoteam';
export type TransferStatus = 'pending' | 'running' | 'success' | 'error';

export interface TransferLogEntry {
  id: string;
  direction: TransferDirection;
  fileName: string;
  status: TransferStatus;
  message?: string;
  timestamp: string;
}
