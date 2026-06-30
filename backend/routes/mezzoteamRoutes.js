import { config } from '../config.js';
import { getValidAccessToken } from '../auth/oauth.js';
import * as mezzoteamController from '../controllers/mezzoteamController.js';

async function requireAuth(req, res, next) {
  if (config.useMockMezzoteam) {
    req.mezzoteamToken = 'mock-token';
    return next();
  }

  try {
    const accessToken = await getValidAccessToken(req.session);
    if (!accessToken) {
      return res.status(401).json({ error: 'Authentification Mezzoteam requise' });
    }
    req.mezzoteamToken = accessToken;
    next();
  } catch (err) {
    console.error('[requireAuth]', err);
    res.status(401).json({ error: 'Session expirée, reconnectez-vous' });
  }
}

export function createMezzoteamRoutes(router) {
  router.use(requireAuth);

  router.get('/workspaces/:workspaceId/folders', mezzoteamController.getRootFolders);
  router.get(
    '/workspaces/:workspaceId/folders/:folderId/contents',
    mezzoteamController.getFolderContents,
  );
  router.get(
    '/workspaces/:workspaceId/documents/:documentId/download',
    mezzoteamController.getDocumentDownload,
  );
  router.get(
    '/workspaces/:workspaceId/documents/:documentId/content',
    mezzoteamController.getDocumentContent,
  );
  router.post(
    '/workspaces/:workspaceId/folders/:folderId/documents',
    mezzoteamController.uploadDocument,
  );
  router.post(
    '/workspaces/:workspaceId/folders/:parentId/folders',
    mezzoteamController.createFolder,
  );
}
