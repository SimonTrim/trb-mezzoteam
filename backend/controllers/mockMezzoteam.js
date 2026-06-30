/**
 * Données fictives calquées sur la structure Mezzoteam API 3.4
 * (dossiers de classification + documents). Le store est volontairement
 * mutable en mémoire afin de démontrer la copie de fichiers depuis
 * Trimble Connect vers Mezzoteam (les documents copiés apparaissent ici).
 * @see https://api.mezzoteam.com/swagger/index.html
 */

const MOCK_FOLDERS = [
  { id: 'mock-folder-archi', name: '01 — Architecture', parent_id: null, level: 0 },
  { id: 'mock-folder-plans', name: 'Plans', parent_id: 'mock-folder-archi', level: 1 },
  { id: 'mock-folder-structure', name: '02 — Structure', parent_id: null, level: 0 },
  { id: 'mock-folder-exe', name: '03 — Exécution', parent_id: null, level: 0 },
  { id: 'mock-folder-cvc', name: 'CVC', parent_id: 'mock-folder-exe', level: 1 },
];

/** Documents par dossier (mutable). */
const MOCK_DOCUMENTS = {
  'mock-folder-archi': [
    { id: 'mock-doc-notice', name: 'Notice descriptive.pdf', file_id: 'mock-file-notice' },
  ],
  'mock-folder-plans': [
    { id: 'mock-doc-plan-rdc', name: 'Plan RDC — Ind A.pdf', file_id: 'mock-file-plan-rdc' },
    { id: 'mock-doc-plan-etage', name: 'Plan Étage — Ind A.pdf', file_id: 'mock-file-plan-etage' },
  ],
  'mock-folder-structure': [
    { id: 'mock-doc-rapport', name: 'Rapport structure — Phase PRO.pdf', file_id: 'mock-file-rapport' },
  ],
  'mock-folder-exe': [
    { id: 'mock-doc-devis', name: 'Devis sommaire.xlsx', file_id: 'mock-file-devis' },
  ],
  'mock-folder-cvc': [
    { id: 'mock-doc-cvc', name: 'Schéma CVC — Rez-de-chaussée.dwg', file_id: 'mock-file-cvc' },
  ],
};

/** Contenu binaire fictif (base64) indexé par documentId, généré à la volée. */
const MOCK_CONTENT = {};

function placeholderBase64(label) {
  const text = `Document Mezzoteam (mock) : ${label}\nGénéré le ${new Date().toISOString()}\n`;
  return Buffer.from(text, 'utf-8').toString('base64');
}

export function mockGetRootFolders(_workspaceId) {
  const folders = MOCK_FOLDERS.filter((f) => f.parent_id === null).map(({ id, name }) => ({
    id,
    name,
  }));
  return { folders };
}

export function mockGetFolderContents(folderId) {
  const subFolders = MOCK_FOLDERS.filter((f) => f.parent_id === folderId).map(({ id, name }) => ({
    id,
    name,
  }));
  const documents = (MOCK_DOCUMENTS[folderId] ?? []).map(({ id, name }) => ({ id, name }));
  return { folders: subFolders, documents };
}

function findDocument(documentId) {
  for (const [folderId, docs] of Object.entries(MOCK_DOCUMENTS)) {
    const doc = docs.find((d) => d.id === documentId);
    if (doc) return { doc, folderId };
  }
  return { doc: null, folderId: null };
}

export function mockGetDocumentDownload(documentId) {
  const { doc } = findDocument(documentId);
  const label = doc?.name ?? 'document-demo.pdf';
  return {
    url: `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`,
    mock: true,
    label,
    message: `Mode démo — ouverture d'un PDF exemple à la place de « ${label} »`,
  };
}

/** Renvoie le contenu base64 d'un document (pour copie vers Trimble Connect). */
export function mockGetDocumentContent(documentId) {
  const { doc } = findDocument(documentId);
  const name = doc?.name ?? 'document-demo.txt';
  const base64 = MOCK_CONTENT[documentId] ?? placeholderBase64(name);
  return { name, base64, mock: true };
}

/** Crée un document dans un dossier (pour copie depuis Trimble Connect). */
export function mockUploadDocument(folderId, { name, base64 }) {
  if (!MOCK_DOCUMENTS[folderId]) {
    MOCK_DOCUMENTS[folderId] = [];
  }
  const id = `mock-doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fileId = `mock-file-${id}`;
  const doc = { id, name, file_id: fileId };
  MOCK_DOCUMENTS[folderId].push(doc);
  if (base64) MOCK_CONTENT[id] = base64;
  return { id, name, folderId, mock: true };
}

export function mockCreateFolder(parentId, name) {
  const id = `mock-folder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const parent = MOCK_FOLDERS.find((f) => f.id === parentId);
  const level = parent ? (parent.level ?? 0) + 1 : 0;
  MOCK_FOLDERS.push({ id, name, parent_id: parentId, level });
  if (!MOCK_DOCUMENTS[id]) MOCK_DOCUMENTS[id] = [];
  return { id, name, parentId, mock: true };
}
