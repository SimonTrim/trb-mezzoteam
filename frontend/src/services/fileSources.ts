import {
  createMezzoteamFolder,
  createTrimbleFolder,
  fetchFolderContents,
  fetchRootFolders,
  fetchTrimbleFolder,
  fetchTrimbleRoot,
  getMezzoteamDocumentContent,
  getTrimbleFileContent,
  uploadMezzoteamDocument,
  uploadTrimbleFile,
} from '@/api/proxyClient';
import { trimbleConnectService } from '@/services/trimbleConnectService';
import type { FileContent, FolderListing, SideId } from '@/types';

export interface FileSource {
  id: SideId;
  label: string;
  loadRoot(): Promise<FolderListing>;
  loadChildren(folderId: string): Promise<FolderListing>;
  getFileContent(fileId: string): Promise<FileContent>;
  uploadFile(folderId: string, payload: { name: string; base64: string }): Promise<unknown>;
  createFolder(parentId: string, name: string): Promise<{ id: string | null; name: string }>;
}

export function createMezzoteamSource(workspaceId: string): FileSource {
  return {
    id: 'mezzoteam',
    label: 'Mezzoteam',
    async loadRoot() {
      const { folders } = await fetchRootFolders(workspaceId);
      return { folders, files: [] };
    },
    async loadChildren(folderId) {
      const { folders, documents } = await fetchFolderContents(workspaceId, folderId);
      return { folders, files: documents };
    },
    getFileContent(documentId) {
      return getMezzoteamDocumentContent(workspaceId, documentId);
    },
    uploadFile(folderId, payload) {
      return uploadMezzoteamDocument(workspaceId, folderId, payload);
    },
    createFolder(parentId, name) {
      return createMezzoteamFolder(workspaceId, parentId, name);
    },
  };
}

export function createTrimbleSource(): FileSource {
  return {
    id: 'trimble',
    label: 'Trimble Connect',
    async loadRoot() {
      const ctx = await trimbleConnectService.getRestContext();
      const { folders, files } = await fetchTrimbleRoot(ctx);
      return { folders, files };
    },
    async loadChildren(folderId) {
      const ctx = await trimbleConnectService.getRestContext();
      return fetchTrimbleFolder(folderId, ctx);
    },
    async getFileContent(fileId) {
      const ctx = await trimbleConnectService.getRestContext();
      return getTrimbleFileContent(fileId, ctx);
    },
    async uploadFile(folderId, payload) {
      const ctx = await trimbleConnectService.getRestContext();
      return uploadTrimbleFile(folderId, payload, ctx);
    },
    async createFolder(parentId, name) {
      const ctx = await trimbleConnectService.getRestContext();
      return createTrimbleFolder(parentId, name, ctx);
    },
  };
}
