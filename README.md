# Connecteur Trimble Connect & Mezzoteam

Extension **Trimble Connect for Browser** (panneau projet) permettant de naviguer dans la GED **Mezzoteam**, de transférer des fichiers entre Mezzoteam et Trimble Connect, et d’accéder à un ensemble d’outils de productivité (recherche, favoris, historique, aperçu, etc.).

L’application front-end s’exécute dans une **iframe** Trimble Connect et communique avec un **proxy Node.js** qui sécurise les appels vers les API Mezzoteam et Trimble Connect (TCPS).

## Sommaire

- [Architecture](#architecture)
- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation locale](#installation-locale)
- [Configuration](#configuration)
- [Build et déploiement](#build-et-déploiement)
- [Enregistrement de l’extension dans Trimble Connect](#enregistrement-de-lextension-dans-trimble-connect)
- [Passage en mode production](#passage-en-mode-production)
- [Structure du projet](#structure-du-projet)
- [API proxy exposées](#api-proxy-exposées)
- [Limitations connues](#limitations-connues)
- [Ressources](#ressources)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Trimble Connect for Browser (iframe parent)                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Frontend React (Vite) — Workspace API                │  │
│  │  • Navigation Mezzoteam / Trimble                     │  │
│  │  • Transfert de fichiers                              │  │
│  └───────────────────────┬───────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────┘
                             │ HTTPS /api/*
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Backend Express (proxy) — port 3001                        │
│  • OAuth2 Mezzoteam (session HTTP-only)                   │
│  • Appels REST Mezzoteam + Trimble Connect                  │
│  • Mode mock pour le développement local                    │
└─────────────────────────────────────────────────────────────┘
```

| Composant | Rôle |
|-----------|------|
| `frontend/` | UI React 19 + Modus Web Components + `@trimble-connect/workspace-api` |
| `backend/` | Proxy Express (CORS, session, tokens) |
| `manifest.json` | Déclaration de l’extension (URL publique requise) |

**Important :** le [TEDF](https://developer.trimble.com/) (Engine Development Framework) n’est **pas** adapté à ce cas d’usage (moteur de traitement back-end, sans UI). La bonne approche est une extension web + Workspace API.

---

## Fonctionnalités

### Navigation & exploration
- Arborescence Mezzoteam avec **chargement paresseux** (lazy loading)
- Double explorateur **Mezzoteam | Trimble Connect**
- **Recherche / filtre** dans l’arborescence
- **Favoris** par nœud (persistés dans le navigateur)
- **Création de dossiers** (Mezzoteam et Trimble Connect)
- **Aperçu** PDF et images
- **Ouverture** d’un document Mezzoteam dans un nouvel onglet

### Transfert de fichiers
- Copie **bidirectionnelle** fichier par fichier
- **Copie multiple** (Ctrl / Shift + clic)
- **Glisser-déposer** d’un fichier vers un dossier de l’autre panneau
- **Historique des transferts** persistant (onglet dédié)
- Confirmation optionnelle avant transfert (paramètres)

### Intégration Trimble Connect
- Connexion via **Workspace API** (`window.parent`)
- Demande de permission **`accesstoken`** pour les appels REST TCPS
- Liaison **projet Trimble ↔ workspace Mezzoteam** (localStorage par projet)
- Toasts et messages de statut

### Développement
- **Mode mock** complet (Mezzoteam + Trimble) sans credentials
- Bannière visible lorsque le mock est actif

---

## Prérequis

| Élément | Version / détail |
|---------|------------------|
| Node.js | 18+ recommandé |
| npm | 9+ |
| Hébergement front-end | **HTTPS** obligatoire en production |
| Hébergement back-end | **HTTPS** + CORS configuré |
| Trimble Connect | Compte avec droits **administrateur projet** pour installer l’extension |
| Mezzoteam | Identifiants API / OAuth (mode production) |

---

## Installation locale

À la racine du dépôt :

```bash
npm run install:all
```

Copier les fichiers d’environnement :

```bash
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```

Démarrer les deux services (deux terminaux) :

```bash
npm run dev:backend    # http://localhost:3001
npm run dev:frontend   # http://localhost:5173
```

Ouvrir [http://localhost:5173](http://localhost:5173) : l’application fonctionne **hors iframe** en mode développement avec des données fictives.

Vérifier le proxy :

```bash
curl http://localhost:3001/health
```

---

## Configuration

### Backend (`backend/.env`)

| Variable | Description | Défaut dev |
|----------|-------------|------------|
| `PORT` | Port du proxy | `3001` |
| `FRONTEND_URL` | Origine autorisée (CORS) | `http://localhost:5173` |
| `USE_MOCK_MEZZOTEAM` | Données Mezzoteam fictives | `true` |
| `USE_MOCK_TRIMBLE` | Données Trimble fictives | `true` |
| `MEZZOTEAM_API_BASE` | Base API Mezzoteam | `https://api.mezzoteam.com` |
| `MEZZOTEAM_API_VERSION` | Version API | `3.4` |
| `TRIMBLE_API_BASE` | Surcharge URL TCPS (optionnel) | déduit de la région projet |
| `TRIMBLE_CLIENT_ID` | OAuth Trimble / App Xchange | vide |
| `TRIMBLE_CLIENT_SECRET` | Secret OAuth | vide |
| `TRIMBLE_REDIRECT_URI` | Callback OAuth | `http://localhost:3001/api/auth/callback` |
| `SESSION_SECRET` | Secret de session Express | à changer en prod |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_BACKEND_URL` | URL du proxy (`http://localhost:3001` en dev) |
| `VITE_DEBUG` | Logs de débogage (`false`) |

En production, `VITE_BACKEND_URL` doit pointer vers l’URL HTTPS publique du proxy (ex. `https://api.mondomaine.com`).

---

## Build et déploiement

### 1. Build du front-end

```bash
npm run build:frontend
```

Les fichiers statiques sont générés dans `frontend/dist/`.

### 2. Héberger le front-end

Déployer le contenu de `frontend/dist/` sur un hébergeur statique ou un serveur web (Azure Static Web Apps, Vercel, Nginx, IIS, etc.).

**Exigences :**
- URL en **HTTPS**
- Servir `index.html` pour les routes SPA si nécessaire
- Ajouter une icône à `frontend/public/assets/mezzoteam-icon.png` avant le build (référencée dans le manifeste)

### 3. Héberger le back-end

```bash
cd backend
npm install --production
NODE_ENV=production node server.js
```

**Exigences production :**
- `FRONTEND_URL` = URL HTTPS exacte du front-end (origine de l’iframe)
- `SESSION_SECRET` fort et unique
- Cookie `sameSite: 'none'` + `secure: true` (déjà configuré si `NODE_ENV=production`)
- Certificat TLS valide

### 4. Publier le manifeste

Le fichier `manifest.json` (ou variante, voir ci-dessous) doit être accessible publiquement en **HTTPS**, par exemple :

```
https://extensions.mondomaine.com/manifest.json
```

**CORS obligatoire** sur l’URL du manifeste : Trimble Connect télécharge ce fichier depuis le navigateur. Le serveur doit renvoyer au minimum :

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

Référence : [Trimble Connect Workspace API — Manifests and CORS](https://components.connect.trimble.com/trimble-connect-workspace-api/index.html)

### 5. Mettre à jour les URLs du manifeste

Remplacer `[DOMAINE_DE_L_EXTENSION_HEBERGEE]` dans `manifest.json` :

```json
{
  "name": "Navigateur Mezzoteam",
  "version": "1.1.0",
  "description": "Navigateur Mezzoteam et copie bidirectionnelle de fichiers depuis Trimble Connect",
  "app_url": "https://extensions.mondomaine.com/",
  "icon_url": "https://extensions.mondomaine.com/assets/mezzoteam-icon.png",
  "permissions": [
    "project.read",
    "user.read",
    "data.read",
    "data.write",
    "accesstoken"
  ],
  "extension_points": [
    {
      "type": "ProjectLeftPanel",
      "label": "Mezzoteam",
      "icon_url": "https://extensions.mondomaine.com/assets/mezzoteam-icon.png"
    }
  ]
}
```

> **Format alternatif :** si l’enregistrement échoue avec `manifest.json`, utilisez `manifest.workspace.json` (format documenté officiellement avec les champs `title`, `url`, `icon`, `description`, `enabled`). Voir la section [Enregistrement](#enregistrement-de-lextension-dans-trimble-connect).

---

## Enregistrement de l’extension dans Trimble Connect

Cette procédure ne nécessite **pas** App Xchange pour l’affichage de base dans Trimble Connect. App Xchange reste utile pour un flux OAuth Mezzoteam centralisé côté organisation.

### Prérequis avant enregistrement

- [ ] Front-end déployé en HTTPS et accessible
- [ ] `manifest.json` (ou `manifest.workspace.json`) déployé en HTTPS avec **CORS activé**
- [ ] URLs `app_url` / `url` et icônes mises à jour dans le manifeste
- [ ] Back-end déployé et `VITE_BACKEND_URL` configuré au build du front-end
- [ ] Compte Trimble Connect avec rôle **administrateur du projet**

### Étape 1 — Ouvrir les paramètres du projet

1. Connectez-vous à [Trimble Connect for Browser](https://web.connect.trimble.com/).
2. Ouvrez le **projet** cible.
3. Dans le panneau gauche, ouvrez **Paramètres** (*Settings*).

### Étape 2 — Ajouter l’extension

1. Allez dans l’onglet **Extensions**.
2. Dans le champ **Extension manifest URL** (URL du manifeste d’extension), saisissez l’URL publique de votre manifeste, par exemple :
   ```
   https://extensions.mondomaine.com/manifest.json
   ```
3. Cliquez sur **Add** (*Ajouter*).

Trimble Connect télécharge et valide le manifeste. En cas d’erreur, vérifiez le CORS et que le JSON est valide.

### Étape 3 — Activer l’extension

1. Dans la section **Custom Extensions** (*Extensions personnalisées*), localisez **Navigateur Mezzoteam**.
2. **Activez** l’extension (interrupteur / case à cocher).
3. Si proposé, accordez les **permissions** demandées (`project.read`, `data.read`, `data.write`, `accesstoken`, etc.).

> Seuls les **administrateurs de projet** peuvent installer ou modifier des extensions. Une fois activée, l’extension est disponible pour tous les membres du projet.

### Étape 4 — Utiliser l’extension

1. Retournez à la vue **projet** (explorateur de fichiers).
2. Un nouvel élément **Mezzoteam** apparaît dans la navigation gauche (point d’extension `ProjectLeftPanel`).
3. Au premier lancement :
   - Liez le **workspace Mezzoteam** au projet Trimble (écran de configuration).
   - Acceptez la demande de **jeton d’accès** Trimble Connect si le transfert vers TC est utilisé.
   - Connectez-vous à Mezzoteam via le proxy OAuth si le mode réel est activé.

### Étape 5 — Vérifications post-installation

| Vérification | Attendu |
|--------------|---------|
| Panneau Mezzoteam visible | Oui, dans la navigation gauche |
| Arborescence Mezzoteam | Dossiers et fichiers chargés |
| Transfert Mezzoteam → TC | Fichier copié dans le dossier Trimble cible |
| Transfert TC → Mezzoteam | Fichier copié dans le dossier Mezzoteam cible |
| Console navigateur (F12) | Pas d’erreur CORS vers le proxy |

### Dépannage enregistrement

| Problème | Cause probable | Action |
|----------|----------------|--------|
| « Impossible d’ajouter l’extension » | CORS sur le manifeste | Activer `Access-Control-Allow-Origin` sur l’URL du manifeste |
| Page blanche dans l’iframe | URL `app_url` / `url` incorrecte | Vérifier HTTPS et que `index.html` est servi |
| Erreurs API | `VITE_BACKEND_URL` incorrect au build | Rebuild le front-end avec la bonne URL backend |
| Transfert Trimble échoue | Permission `accesstoken` refusée | Paramètres extension → réinitialiser le consentement |
| Session Mezzoteam perdue | Cookie bloqué | Vérifier `sameSite=none`, `secure`, CORS `credentials` |

### Variante de manifeste (format Workspace API officiel)

Fichier fourni : [`manifest.workspace.json`](./manifest.workspace.json)

```json
{
  "title": "Navigateur Mezzoteam",
  "url": "https://extensions.mondomaine.com/",
  "icon": "https://extensions.mondomaine.com/assets/mezzoteam-icon.png",
  "description": "Navigateur Mezzoteam et copie bidirectionnelle de fichiers depuis Trimble Connect",
  "enabled": true
}
```

Utilisez ce format si votre tenant Trimble Connect attend le schéma documenté dans la [Workspace API](https://components.connect.trimble.com/trimble-connect-workspace-api/index.html) (`title` + `url` au lieu de `extension_points`).

---

## Passage en mode production

### 1. Désactiver les mocks

Dans `backend/.env` :

```env
USE_MOCK_MEZZOTEAM=false
USE_MOCK_TRIMBLE=false
```

### 2. Configurer Mezzoteam

- Renseigner les credentials OAuth / API selon votre contrat Mezzoteam
- Vérifier `MEZZOTEAM_API_BASE` et `MEZZOTEAM_API_VERSION` (Swagger : [api.mezzoteam.com](https://api.mezzoteam.com/swagger/index.html))

### 3. Configurer Trimble Connect

- Le jeton utilisateur est obtenu via `extension.requestPermission('accesstoken')` dans l’iframe
- La région TCPS est déduite de `project.location` (ex. `europe` → `https://europe.connect.trimble.com/tc/api/2.0`)
- Optionnel : enregistrer une application dans **App Xchange** pour le flux OAuth Mezzoteam (`TRIMBLE_CLIENT_ID`, `TRIMBLE_CLIENT_SECRET`)

### 4. Rebuild et redéploiement

```bash
# Mettre à jour frontend/.env avec VITE_BACKEND_URL de production
npm run build:frontend
# Redéployer frontend/dist + redémarrer le backend
```

---

## Structure du projet

```
trb-mezzoteam/
├── manifest.json              # Manifeste extension (format extension_points)
├── manifest.workspace.json    # Manifeste alternatif (format title/url)
├── package.json
├── frontend/
│   ├── src/
│   │   ├── api/               # Client HTTP vers le proxy
│   │   ├── components/        # UI (explorateurs, transfert, historique…)
│   │   ├── services/          # Workspace API, auth, favoris, toasts…
│   │   └── utils/
│   └── dist/                  # Build de production
└── backend/
    ├── controllers/           # Mezzoteam, Trimble, mocks
    ├── routes/
    └── server.js
```

---

## API proxy exposées

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/health` | État du service |
| GET | `/api/auth/status` | Session OAuth Mezzoteam |
| GET | `/api/mezzoteam/workspaces/:id/folders` | Racine workspace |
| GET | `/api/mezzoteam/folders/:id/contents` | Contenu dossier |
| GET | `/api/mezzoteam/documents/:id/download` | URL / binaire document |
| POST | `/api/mezzoteam/workspaces/:ws/folders/:parent/folders` | Créer dossier |
| GET | `/api/trimble/folders/:id/contents` | Contenu dossier TC |
| POST | `/api/trimble/folders/:parent/folders` | Créer dossier TC |
| POST | `/api/trimble/folders/:id/files` | Upload fichier vers TC |
| POST | `/api/mezzoteam/folders/:id/files` | Upload fichier vers Mezzoteam |

Les appels Trimble incluent le jeton et la région en en-têtes / query selon le contrôleur.

---

## Limitations connues

- Les chemins exacts des API Mezzoteam et TCPS peuvent nécessiter un ajustement selon votre version de plateforme et votre région.
- Le lien document Mezzoteam ↔ objet maquette Trimble Connect (mentionné dans le PRD) n’est pas encore implémenté.
- Les extensions du **navigateur** et du **visualiseur 3D** sont indépendantes : ce connecteur cible le **navigateur de projet**.
- Sans App Xchange, l’OAuth Mezzoteam passe par le proxy ; coordonnez les URLs de redirection avec votre administrateur identité.
- Taille maximale des uploads JSON côté proxy : **25 Mo** (`express.json`).

---

## Ressources

- [Extend Trimble Connect (guide développeur)](https://developer.trimble.com/docs/connect/guides/extend/)
- [Trimble Connect Workspace API](https://components.connect.trimble.com/trimble-connect-workspace-api/index.html)
- [Aide Trimble — Extensions projet](https://help.trimble.com/trimble-connect/trimble-connect/connect-for-browser/projects/project-settings/extensions)
- [PRD du projet](./PRD_extension-trimble-connect-mezzoteam.md)

---

## Licence

Projet interne — usage réservé à l’organisation déployante.
