import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'frontend', 'public');

function resolveBaseUrl() {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.EXTENSION_BASE_URL) {
    return process.env.EXTENSION_BASE_URL.replace(/\/$/, '');
  }
  return 'http://localhost:5173';
}

const base = `${resolveBaseUrl().replace(/\/$/, '')}/`;
const icon = `${base}assets/mezzoteam-icon.png`;

const manifest = {
  name: 'Navigateur Mezzoteam',
  version: '1.1.0',
  description:
    'Navigateur Mezzoteam et copie bidirectionnelle de fichiers depuis Trimble Connect',
  app_url: base,
  icon_url: icon,
  permissions: ['project.read', 'user.read', 'data.read', 'data.write', 'accesstoken'],
  extension_points: [
    {
      type: 'ProjectLeftPanel',
      label: 'Mezzoteam',
      icon_url: icon,
    },
  ],
};

const workspaceManifest = {
  title: 'Navigateur Mezzoteam',
  url: base,
  icon,
  description: manifest.description,
  enabled: true,
};

mkdirSync(publicDir, { recursive: true });
mkdirSync(join(publicDir, 'assets'), { recursive: true });

writeFileSync(join(publicDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(
  join(publicDir, 'manifest.workspace.json'),
  `${JSON.stringify(workspaceManifest, null, 2)}\n`,
);
writeFileSync(join(root, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(
  join(root, 'manifest.workspace.json'),
  `${JSON.stringify(workspaceManifest, null, 2)}\n`,
);

console.log(`[manifest] Généré pour ${base}`);
