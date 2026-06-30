import { config, mezzoteamApiPath } from '../config.js';
import * as mockMezzoteam from './mockMezzoteam.js';

async function mezzoteamFetch(path, accessToken, options = {}) {
  const url = `${config.mezzoteamApiBase}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mezzoteam API ${response.status}: ${body}`);
  }

  return response.json();
}

async function mezzoteamFetchRaw(path, accessToken, options = {}) {
  const url = `${config.mezzoteamApiBase}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mezzoteam API ${response.status}: ${body}`);
  }

  return response;
}

function normalizeViewFolders(data) {
  const items = Array.isArray(data) ? data : (data.items ?? data.folders ?? []);
  return items.map((item) => ({
    id: item.id,
    name: item.title ?? item.name ?? 'Sans nom',
    parent_id: item.parent_id ?? null,
    level: item.level ?? 0,
  }));
}

function normalizeDocumentsList(data) {
  const rawDocs = data.documents ?? data.items ?? [];
  return (Array.isArray(rawDocs) ? rawDocs : []).map((doc) => ({
    id: doc.id ?? doc.document_id,
    name: doc.code ?? doc.title ?? doc.name ?? 'Sans nom',
    file_id: doc.file_id ?? doc.main_file_id ?? null,
  }));
}

export async function getRootFolders(req, res) {
  try {
    const { workspaceId } = req.params;

    if (config.useMockMezzoteam) {
      return res.json(mockMezzoteam.mockGetRootFolders(workspaceId));
    }

    const data = await mezzoteamFetch(
      mezzoteamApiPath(`/workspaces/${workspaceId}/folders`),
      req.mezzoteamToken,
    );

    const allFolders = normalizeViewFolders(data);
    const rootFolders = allFolders.filter(
      (f) => f.parent_id === null || f.level === 0,
    );

    res.json({
      folders: rootFolders.map(({ id, name }) => ({ id, name })),
    });
  } catch (err) {
    console.error('[getRootFolders]', err);
    res.status(502).json({ error: err.message });
  }
}

export async function getFolderContents(req, res) {
  try {
    const { workspaceId, folderId } = req.params;

    if (config.useMockMezzoteam) {
      return res.json(mockMezzoteam.mockGetFolderContents(folderId));
    }

    const [allFoldersData, documentsData] = await Promise.all([
      mezzoteamFetch(mezzoteamApiPath(`/workspaces/${workspaceId}/folders`), req.mezzoteamToken),
      mezzoteamFetch(
        mezzoteamApiPath(`/workspaces/${workspaceId}/folders/${folderId}/documents`),
        req.mezzoteamToken,
      ),
    ]);

    const subFolders = normalizeViewFolders(allFoldersData)
      .filter((f) => f.parent_id === folderId)
      .map(({ id, name }) => ({ id, name }));

    const documents = normalizeDocumentsList(documentsData).map(({ id, name }) => ({ id, name }));

    res.json({ folders: subFolders, documents });
  } catch (err) {
    console.error('[getFolderContents]', err);
    res.status(502).json({ error: err.message });
  }
}

export async function getDocumentDownload(req, res) {
  try {
    const { workspaceId, documentId } = req.params;

    if (config.useMockMezzoteam) {
      return res.json(mockMezzoteam.mockGetDocumentDownload(documentId));
    }

    const doc = await mezzoteamFetch(
      mezzoteamApiPath(`/workspaces/${workspaceId}/documents/${documentId}`),
      req.mezzoteamToken,
    );

    const fileId = doc.main_file_id ?? doc.file_id;
    if (!fileId) {
      return res.status(404).json({ error: 'Fichier introuvable pour ce document' });
    }

    const downloadRequest = await mezzoteamFetch(
      mezzoteamApiPath(`/workspaces/${workspaceId}/files/${fileId}/download`),
      req.mezzoteamToken,
    );

    if (downloadRequest.url) {
      return res.json({ url: downloadRequest.url });
    }

    res.status(502).json({ error: 'URL de téléchargement non disponible' });
  } catch (err) {
    console.error('[getDocumentDownload]', err);
    res.status(502).json({ error: err.message });
  }
}

/**
 * Renvoie le contenu binaire d'un document encodé en base64.
 * Utilisé pour copier un document Mezzoteam vers Trimble Connect.
 */
export async function getDocumentContent(req, res) {
  try {
    const { workspaceId, documentId } = req.params;

    if (config.useMockMezzoteam) {
      return res.json(mockMezzoteam.mockGetDocumentContent(documentId));
    }

    const doc = await mezzoteamFetch(
      mezzoteamApiPath(`/workspaces/${workspaceId}/documents/${documentId}`),
      req.mezzoteamToken,
    );

    const fileId = doc.main_file_id ?? doc.file_id;
    if (!fileId) {
      return res.status(404).json({ error: 'Fichier introuvable pour ce document' });
    }

    const fileResponse = await mezzoteamFetchRaw(
      mezzoteamApiPath(`/workspaces/${workspaceId}/files/${fileId}/content`),
      req.mezzoteamToken,
    );

    const arrayBuffer = await fileResponse.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const name = doc.code ?? doc.title ?? doc.name ?? `document-${documentId}`;

    res.json({ name, base64 });
  } catch (err) {
    console.error('[getDocumentContent]', err);
    res.status(502).json({ error: err.message });
  }
}

/**
 * Crée un document dans un dossier Mezzoteam à partir d'un contenu base64.
 * Utilisé pour copier un fichier Trimble Connect vers Mezzoteam.
 */
export async function uploadDocument(req, res) {
  try {
    const { workspaceId, folderId } = req.params;
    const { name, base64 } = req.body ?? {};

    if (!name || !base64) {
      return res.status(400).json({ error: 'Champs "name" et "base64" requis' });
    }

    if (config.useMockMezzoteam) {
      return res.json(mockMezzoteam.mockUploadDocument(folderId, { name, base64 }));
    }

    const buffer = Buffer.from(base64, 'base64');
    const form = new FormData();
    form.append('file', new Blob([buffer]), name);
    form.append('folderId', folderId);

    const created = await mezzoteamFetch(
      mezzoteamApiPath(`/workspaces/${workspaceId}/folders/${folderId}/documents`),
      req.mezzoteamToken,
      { method: 'POST', body: form },
    );

    res.json({
      id: created.id ?? created.document_id ?? null,
      name,
      folderId,
    });
  } catch (err) {
    console.error('[uploadDocument]', err);
    res.status(502).json({ error: err.message });
  }
}

/** Crée un sous-dossier dans l'arborescence Mezzoteam. */
export async function createFolder(req, res) {
  try {
    const { workspaceId, parentId } = req.params;
    const { name } = req.body ?? {};
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Champ "name" requis' });
    }

    if (config.useMockMezzoteam) {
      return res.json(mockMezzoteam.mockCreateFolder(parentId, name.trim()));
    }

    const created = await mezzoteamFetch(
      mezzoteamApiPath(`/workspaces/${workspaceId}/folders/${parentId}/folders`),
      req.mezzoteamToken,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      },
    );

    res.json({
      id: created.id ?? created.folder_id ?? null,
      name: name.trim(),
      parentId,
    });
  } catch (err) {
    console.error('[createFolder]', err);
    res.status(502).json({ error: err.message });
  }
}
