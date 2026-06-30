Product Requirements Document (PRD) : Connecteur Trimble Connect & Mezzoteam
Ce document constitue la source de vérité (Single Source of Truth) pour l'agent IA Cursor en charge de développer l'extension Trimble Connect intégrant le navigateur de projet Mezzoteam. Il contient toutes les spécifications techniques, fonctionnelles et architecturales nécessaires à la création du connecteur.

1. Vue d'ensemble et Architecture Technique
L'objectif est de créer une extension Web intégrée dans l'interface de Trimble Connect permettant aux utilisateurs de naviguer dans l'arborescence documentaire de Mezzoteam, d'afficher les fichiers et de lier potentiellement ces documents aux objets de la maquette.

Composant > Rôle Technique & Responsabilité
Front-End (Extension Iframe) > Application React (ou Vanilla JS/TypeScript) hébergée dans une Iframe au sein de Trimble Connect. Utilise le SDK @trimble-connect/workspace-api pour dialoguer avec l'environnement Trimble.
Back-End (Proxy API / Hub) > Service Node.js/Express (ou Serverless Function) agissant comme intermédiaire. Il stocke de manière sécurisée les clés API/Tokens, gère les problèmes de CORS, et effectue les appels finaux vers l'API Mezzoteam.
AppXchange > Passerelle d'authentification gérant le flux OAuth2. Permet au Front-End d'obtenir un jeton de session validé sans que l'utilisateur n'ait à exposer ses identifiants bruts à l'extension.

2. Structure du Projet (Directives pour Cursor)
L'agent IA Cursor doit générer une architecture monorepo ou deux répertoires distincts séparant le Front-End et le Back-End. Voici la structure de code attendue :
/trimble-mezzoteam-connector
├── /frontend                      # Interface UI de l'extension
│   ├── /src
│   │   ├── /api                   # Fonctions fetch pointant vers le /backend proxy
│   │   ├── /components            # Composants UI (Treeview, Fichiers, Modales)
│   │   ├── /services              # Initialisation du SDK Trimble Workspace API
│   │   └── App.tsx                # Point d'entrée principal
│   └── package.json
├── /backend                       # Proxy Node.js gérant la sécurité et l'API Mezzoteam
│   ├── /routes                    # Endpoints exposés au /frontend
│   ├── /controllers               # Logique de requêtage vers Mezzoteam
│   ├── /auth                      # Logique d'authentification AppXchange OAuth2
│   └── server.js                  # Lancement du serveur Express
└── manifest.json                  # Fichier de déclaration de l'extension Trimble Connect


3. Implémentation du SDK Trimble Connect
Le Front-End doit impérativement s'initialiser et communiquer avec le contexte de Trimble Connect. Cursor devra implémenter les étapes suivantes :
- Installation : Ajouter la dépendance npm install @trimble-connect/workspace-api.
- Initialisation : Créer une instance du client API dès le chargement de l'Iframe.
- Récupération du contexte : Appeler client.project.getProject() et client.user.getUser() pour identifier dynamiquement dans quel projet l'utilisateur se trouve et adapter l'affichage Mezzoteam en conséquence.
- Interaction UI : Utiliser l'API pour envoyer des messages d'alerte ou ouvrir des modales natives de Trimble Connect si besoin.

4. Spécifications de l'API Mezzoteam (Endpoints à intégrer)
Le Proxy Back-End doit exposer des routes simplifiées pour le Front-End, et traduire ces requêtes vers les endpoints Swagger REST de Mezzoteam. L'Agent IA devra implémenter le "Lazy Loading" (chargement asynchrone) pour l'arbre documentaire.
Action de l'Extension > Endpoint Mezzoteam Cible > Comportement attendu
Charger les espaces de travail / dossiers racines > GET /api/v1/workspaces/{id}/folders > Appelé à l'ouverture de l'onglet pour générer le premier niveau du navigateur (Treeview).
Déplier un dossier spécifique > GET /api/v1/folders/{folderId}/contents > Déclenché dynamiquement lorsqu'un utilisateur clique sur l'icône "+" ou "dérouler" d'un dossier.
Afficher / Télécharger un document > GET /api/v1/documents/{documentId}/download > Récupère le binaire du fichier ou un lien temporaire sécurisé pour que l'utilisateur puisse le visualiser.

5. Configuration du Manifest JSON
L'agent IA devra générer le fichier manifest.json qui sera utilisé pour enregistrer l'extension dans le projet Trimble Connect. Ce fichier dicte où l'extension s'affiche et quelles permissions elle requiert.
{
  "name": "Navigateur Mezzoteam",
  "version": "1.0.0",
  "description": "Accès direct à la GED Mezzoteam depuis Trimble Connect",
  "app_url": "https://[DOMAINE_DE_L_EXTENSION_HEBERGEE]/",
  "icon_url": "https://[DOMAINE_DE_L_EXTENSION_HEBERGEE]/assets/mezzoteam-icon.png",
  "permissions": [
    "project.read",
    "user.read"
  ],
  "extension_points": [
    {
      "type": "ProjectLeftPanel",
      "label": "Mezzoteam",
      "icon_url": "https://[DOMAINE_DE_L_EXTENSION_HEBERGEE]/assets/mezzoteam-icon.png"
    }
  ]
}


6. Sécurité et Flux OAuth2 (AppXchange)
Le flux de sécurité est le point critique. Cursor doit coder l'authentification OAuth2 selon les étapes suivantes :
- L'utilisateur Trimble Connect ouvre le panneau Mezzoteam.
- Le Front-End vérifie s'il possède un jeton d'accès (Access Token) valide dans son état ou ses cookies sécurisés.
- Si aucun jeton n'est présent, le Front-End redirige la vue vers l'endpoint d'autorisation généré par l'AppXchange de Trimble, en passant l'ID Client (Client ID) de l'application.
- Une fois l'utilisateur authentifié (Single Sign-On ou validation de consentement), AppXchange renvoie un code d'autorisation (Authorization Code) vers l'URL de Callback gérée par le Back-End Proxy.
- Le Back-End Proxy échange ce code contre un Access Token et un Refresh Token auprès de l'API d'authentification. Il ne renvoie au Front-End qu'un cookie de session HTTP-only, sécurisant ainsi les vrais jetons d'accès.
