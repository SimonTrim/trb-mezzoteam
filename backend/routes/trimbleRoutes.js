import * as trimbleController from '../controllers/trimbleController.js';

export function createTrimbleRoutes(router) {
  router.get('/items', trimbleController.listRoot);
  router.get('/folders/:folderId/items', trimbleController.listFolder);
  router.get('/files/:fileId/content', trimbleController.getFileContent);
  router.post('/folders/:folderId/files', trimbleController.uploadFile);
  router.post('/folders/:parentId/folders', trimbleController.createFolder);
}
