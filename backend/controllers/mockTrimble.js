/**
 * Données fictives calquées sur la structure de fichiers Trimble Connect
 * (Project File System : dossiers + fichiers). Store mutable en mémoire pour
 * démontrer la copie de documents depuis Mezzoteam vers Trimble Connect.
 * @see https://app.connect.trimble.com/tc/api/2.0/ (TCPS)
 */

const MOCK_FOLDERS = [
  { id: 'tc-root', name: 'Documents du projet', parentId: null },
  { id: 'tc-folder-maquettes', name: 'Maquettes', parentId: 'tc-root' },
  { id: 'tc-folder-comptes-rendus', name: 'Comptes-rendus', parentId: 'tc-root' },
  { id: 'tc-folder-photos', name: 'Photos chantier', parentId: 'tc-root' },
];

const MOCK_FILES = {
  'tc-root': [
    { id: 'tc-file-charte', name: 'Charte projet.pdf' },
  ],
  'tc-folder-maquettes': [
    { id: 'tc-file-ifc', name: 'Bâtiment-A.ifc' },
    { id: 'tc-file-ifc-mep', name: 'MEP-Lot3.ifc' },
  ],
  'tc-folder-comptes-rendus': [
    { id: 'tc-file-cr12', name: 'CR réunion n°12.docx' },
  ],
  'tc-folder-photos': [
    { id: 'tc-file-photo1', name: 'Fondations - semaine 8.jpg' },
  ],
};

const MOCK_CONTENT = {};

function placeholderBase64(label) {
  const text = `Fichier Trimble Connect (mock) : ${label}\nGénéré le ${new Date().toISOString()}\n`;
  return Buffer.from(text, 'utf-8').toString('base64');
}

export function mockListRoot() {
  const folders = MOCK_FOLDERS.filter((f) => f.parentId === 'tc-root').map(({ id, name }) => ({
    id,
    name,
  }));
  const files = (MOCK_FILES['tc-root'] ?? []).map(({ id, name }) => ({ id, name }));
  return { rootId: 'tc-root', folders, files };
}

export function mockListFolder(folderId) {
  const folders = MOCK_FOLDERS.filter((f) => f.parentId === folderId).map(({ id, name }) => ({
    id,
    name,
  }));
  const files = (MOCK_FILES[folderId] ?? []).map(({ id, name }) => ({ id, name }));
  return { folders, files };
}

function findFile(fileId) {
  for (const files of Object.values(MOCK_FILES)) {
    const file = files.find((f) => f.id === fileId);
    if (file) return file;
  }
  return null;
}

export function mockGetFileContent(fileId) {
  const file = findFile(fileId);
  const name = file?.name ?? 'fichier-demo.txt';
  const base64 = MOCK_CONTENT[fileId] ?? placeholderBase64(name);
  return { name, base64, mock: true };
}

export function mockUploadFile(folderId, { name, base64 }) {
  const target = MOCK_FOLDERS.some((f) => f.id === folderId) ? folderId : 'tc-root';
  if (!MOCK_FILES[target]) MOCK_FILES[target] = [];
  const id = `tc-file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  MOCK_FILES[target].push({ id, name });
  if (base64) MOCK_CONTENT[id] = base64;
  return { id, name, folderId: target, mock: true };
}

export function mockCreateFolder(parentId, name) {
  const target = MOCK_FOLDERS.some((f) => f.id === parentId) ? parentId : 'tc-root';
  const id = `tc-folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  MOCK_FOLDERS.push({ id, name, parentId: target });
  if (!MOCK_FILES[id]) MOCK_FILES[id] = [];
  return { id, name, parentId: target, mock: true };
}
