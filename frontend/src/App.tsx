import {
  ModusWcAlert,
  ModusWcBadge,
  ModusWcButton,
  ModusWcIcon,
  ModusWcLoader,
  ModusWcThemeProvider,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';

import { AuthGate } from '@/components/AuthGate';
import { DocumentTree } from '@/components/DocumentTree';
import { MockModeBanner } from '@/components/MockModeBanner';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ToastHost } from '@/components/ToastHost';
import { TransferCenter } from '@/components/TransferCenter';
import { TransferHistoryPanel } from '@/components/TransferHistoryPanel';
import { WorkspaceSetup } from '@/components/WorkspaceSetup';
import { getDocumentDownloadUrl } from '@/api/proxyClient';
import { loadAppSettings } from '@/services/appSettingsService';
import { toastService } from '@/services/toastService';
import { useBackendConfig } from '@/services/useBackendConfig';
import { useTrimbleConnect } from '@/services/useTrimbleConnect';
import {
  getWorkspaceMapping,
  type WorkspaceMapping,
} from '@/services/workspaceConfigService';
import type { TreeNodeData } from '@/types';
import { useState } from 'react';
import './App.css';

type AppTab = 'transfer' | 'browse' | 'history' | 'settings';

export default function App() {
  const { project, userSettings, isConnected, isEmbedded, isInitializing, error } =
    useTrimbleConnect();
  const backend = useBackendConfig();

  const projectId = project?.id ?? 'local-dev';
  const [workspaceMapping, setWorkspaceMapping] = useState<WorkspaceMapping | null>(() =>
    getWorkspaceMapping(projectId),
  );
  const [activeTab, setActiveTab] = useState<AppTab>(() => loadAppSettings().defaultTab);

  const handleDocumentSelect = async (node: TreeNodeData) => {
    if (!workspaceMapping) return;

    try {
      const result = await getDocumentDownloadUrl(
        workspaceMapping.mezzoteamWorkspaceId,
        node.id,
      );
      if (result.message) {
        toastService.info('Mode démo', result.message);
      }
      window.open(result.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error('Téléchargement impossible:', err);
      toastService.error('Ouverture impossible', 'Impossible d\'ouvrir ce document.');
    }
  };

  const handleOpenSettings = () => {
    setWorkspaceMapping(null);
  };

  return (
    <ModusWcThemeProvider initialTheme={{ theme: 'modus-modern' }}>
      <ToastHost />
      {isInitializing || backend.isLoading ? (
        <div className="app app__center">
          <ModusWcLoader />
          <ModusWcTypography hierarchy="p">Initialisation…</ModusWcTypography>
        </div>
      ) : error ? (
        <div className="app app__center">
          <ModusWcAlert
            alertTitle="Erreur Trimble Connect"
            alertDescription={error}
            variant="error"
          />
        </div>
      ) : backend.error ? (
        <div className="app app__center">
          <ModusWcAlert
            alertTitle="Backend inaccessible"
            alertDescription={`${backend.error} — Lancez le serveur avec : npm run dev:backend`}
            variant="error"
          />
        </div>
      ) : (
        <div className="app">
          {backend.mockMezzoteam && (
            <MockModeBanner apiVersion={backend.mezzoteamApiVersion} />
          )}

          <header className="app__header">
            <div className="app__header-row">
              <ModusWcTypography hierarchy="h3" label="Mezzoteam" />
              {workspaceMapping && (
                <ModusWcButton
                  color="tertiary"
                  shape="square"
                  size="sm"
                  aria-label="Modifier le workspace Mezzoteam"
                  onButtonClick={handleOpenSettings}
                >
                  <ModusWcIcon name="settings" size="sm" decorative />
                </ModusWcButton>
              )}
            </div>

            {project && (
              <ModusWcTypography hierarchy="p">
                {project.name}
                {!isEmbedded && ' (mode développement)'}
              </ModusWcTypography>
            )}

            {workspaceMapping && (
              <ModusWcTypography hierarchy="p" size="sm">
                Workspace : {workspaceMapping.label ?? workspaceMapping.mezzoteamWorkspaceId}
              </ModusWcTypography>
            )}

            {userSettings?.language && (
              <ModusWcBadge color="tertiary" size="sm">
                {userSettings.language.toUpperCase()}
              </ModusWcBadge>
            )}
          </header>

          <main className="app__main">
            {!isConnected ? (
              <ModusWcAlert
                alertTitle="Connexion requise"
                alertDescription="Connexion à Trimble Connect requise."
                variant="warning"
              />
            ) : !workspaceMapping ? (
              <WorkspaceSetup
                trimbleProjectId={projectId}
                trimbleProjectName={project?.name}
                mockMode={backend.mockMezzoteam}
                onConfigured={setWorkspaceMapping}
              />
            ) : (
              <AuthGate mockMode={backend.mockMezzoteam}>
                <div className="app__tabs" role="tablist">
                  <ModusWcButton
                    color={activeTab === 'transfer' ? 'primary' : 'tertiary'}
                    size="sm"
                    onButtonClick={() => setActiveTab('transfer')}
                  >
                    <ModusWcIcon name="sync" size="sm" decorative />
                    Transfert
                  </ModusWcButton>
                  <ModusWcButton
                    color={activeTab === 'browse' ? 'primary' : 'tertiary'}
                    size="sm"
                    onButtonClick={() => setActiveTab('browse')}
                  >
                    <ModusWcIcon name="folder_open" size="sm" decorative />
                    Arborescence
                  </ModusWcButton>
                  <ModusWcButton
                    color={activeTab === 'history' ? 'primary' : 'tertiary'}
                    size="sm"
                    onButtonClick={() => setActiveTab('history')}
                  >
                    <ModusWcIcon name="history" size="sm" decorative />
                    Historique
                  </ModusWcButton>
                  <ModusWcButton
                    color={activeTab === 'settings' ? 'primary' : 'tertiary'}
                    size="sm"
                    onButtonClick={() => setActiveTab('settings')}
                  >
                    <ModusWcIcon name="tune" size="sm" decorative />
                    Paramètres
                  </ModusWcButton>
                </div>

                {activeTab === 'transfer' && (
                  <TransferCenter
                    workspaceId={workspaceMapping.mezzoteamWorkspaceId}
                    projectId={projectId}
                    onOpenDocument={handleDocumentSelect}
                  />
                )}
                {activeTab === 'browse' && (
                  <DocumentTree
                    workspaceId={workspaceMapping.mezzoteamWorkspaceId}
                    onDocumentSelect={handleDocumentSelect}
                  />
                )}
                {activeTab === 'history' && <TransferHistoryPanel />}
                {activeTab === 'settings' && <SettingsPanel />}
              </AuthGate>
            )}
          </main>
        </div>
      )}
    </ModusWcThemeProvider>
  );
}
