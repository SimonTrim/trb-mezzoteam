import { config, trimbleApiBase } from '../config.js';
import * as mockTrimble from './mockTrimble.js';

/**
 * Proxy vers l'API REST Trimble Connect (TCPS, v2.0).
 * Le jeton d'accès Trimble Connect est obtenu côté extension via
 * `client.extension.requestPermission('accesstoken')` puis transmis au proxy
 * dans l'en-tête `X-Trimble-Token`. Le proxy ne stocke pas ce jeton.
 *
 * Les chemins REST réels (création/upload de fichiers) suivent le flux TCPS et
 * sont marqués comme « à valider » : ils ne sont exécutés qu'hors mode mock.
 */

function getTrimbleToken(req) {
  return req.get('X-Trimble-Token') ?? null;
}

async function tcFetch(req, path, options = {}) {
  const token = getTrimbleToken(req);
  if (!token) {
    const err = new Error('Jeton Trimble Connect manquant (X-Trimble-Token)');
    err.statusCode = 401;
    throw err;
  }
  const region = req.query.region;
  const url = `${trimbleApiBase(region)}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Trimble Connect API ${response.status}: ${body}`);
  }
  return response;
}

function splitItems(items) {
  const folders = [];
  const files = [];
  for (const item of items ?? []) {
    const type = (item.type ?? '').toUpperCase();
    if (type === 'FOLDER') {
      folders.push({ id: item.id, name: item.name ?? 'Dossier' });
    } else if (type === 'FILE') {
      files.push({ id: item.id, name: item.name ?? 'Fichier' });
    }
  }
  return { folders, files };
}

export async function listRoot(req, res) {
  try {
    if (config.useMockTrimble) {
      return res.json(mockTrimble.mockListRoot());
    }
    const { rootId } = req.query;
    if (!rootId) {
      return res.status(400).json({ error: 'Paramètre rootId requis (project.rootId)' });
    }
    const response = await tcFetch(req, `/folders/${rootId}/items`);
    const data = await response.json();
    const { folders, files } = splitItems(data.items ?? data);
    res.json({ rootId, folders, files });
  } catch (err) {
    console.error('[trimble.listRoot]', err);
    res.status(err.statusCode ?? 502).json({ error: err.message });
  }
}

export async function listFolder(req, res) {
  try {
    const { folderId } = req.params;
    if (config.useMockTrimble) {
      return res.json(mockTrimble.mockListFolder(folderId));
    }
    const response = await tcFetch(req, `/folders/${folderId}/items`);
    const data = await response.json();
    res.json(splitItems(data.items ?? data));
  } catch (err) {
    console.error('[trimble.listFolder]', err);
    res.status(err.statusCode ?? 502).json({ error: err.message });
  }
}

/** Renvoie le contenu d'un fichier Trimble Connect encodé en base64. */
export async function getFileContent(req, res) {
  try {
    const { fileId } = req.params;
    if (config.useMockTrimble) {
      return res.json(mockTrimble.mockGetFileContent(fileId));
    }

    // 1) Métadonnées (nom du fichier).
    const metaResp = await tcFetch(req, `/files/${fileId}`);
    const meta = await metaResp.json();
    const name = meta.name ?? `fichier-${fileId}`;

    // 2) URL de téléchargement signée, puis récupération des octets.
    const dlResp = await tcFetch(req, `/files/${fileId}/downloadurl`);
    const dl = await dlResp.json();
    const downloadUrl = dl.url ?? dl.downloadUrl;
    const binResp = await fetch(downloadUrl);
    const arrayBuffer = await binResp.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    res.json({ name, base64 });
  } catch (err) {
    console.error('[trimble.getFileContent]', err);
    res.status(err.statusCode ?? 502).json({ error: err.message });
  }
}

/** Crée un fichier dans un dossier Trimble Connect à partir d'un contenu base64. */
export async function uploadFile(req, res) {
  try {
    const { folderId } = req.params;
    const { name, base64 } = req.body ?? {};
    if (!name || !base64) {
      return res.status(400).json({ error: 'Champs "name" et "base64" requis' });
    }

    if (config.useMockTrimble) {
      return res.json(mockTrimble.mockUploadFile(folderId, { name, base64 }));
    }

    // Flux TCPS (à valider avec les identifiants réels) :
    // 1) POST /folders/{folderId}/items pour créer l'entrée fichier et obtenir une URL d'upload.
    const buffer = Buffer.from(base64, 'base64');
    const createResp = await tcFetch(req, `/folders/${folderId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'FILE', name, size: buffer.length }),
    });
    const created = await createResp.json();
    const uploadUrl = created.uploadUrl ?? created.versionUploadUrl;

    // 2) PUT des octets vers l'URL signée.
    if (uploadUrl) {
      await fetch(uploadUrl, { method: 'PUT', body: buffer });
    }

    res.json({ id: created.id ?? null, name, folderId });
  } catch (err) {
    console.error('[trimble.uploadFile]', err);
    res.status(err.statusCode ?? 502).json({ error: err.message });
  }
}

/** Crée un sous-dossier dans Trimble Connect. */
export async function createFolder(req, res) {
  try {
    const { parentId } = req.params;
    const { name } = req.body ?? {};
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Champ "name" requis' });
    }

    if (config.useMockTrimble) {
      return res.json(mockTrimble.mockCreateFolder(parentId, name.trim()));
    }

    const createResp = await tcFetch(req, `/folders/${parentId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'FOLDER', name: name.trim() }),
    });
    const created = await createResp.json();
    res.json({ id: created.id ?? null, name: name.trim(), parentId });
  } catch (err) {
    console.error('[trimble.createFolder]', err);
    res.status(err.statusCode ?? 502).json({ error: err.message });
  }
}
