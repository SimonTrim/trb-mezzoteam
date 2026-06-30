import { useEffect, useState } from 'react';
import {
  ModusWcAlert,
  ModusWcButton,
  ModusWcCard,
  ModusWcTextInput,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';

import {
  clearWorkspaceMapping,
  getWorkspaceMapping,
  saveWorkspaceMapping,
  type WorkspaceMapping,
} from '@/services/workspaceConfigService';
import { readInputString } from '@/utils/modusFormEvents';

interface WorkspaceSetupProps {
  trimbleProjectId: string;
  trimbleProjectName?: string;
  mockMode?: boolean;
  onConfigured: (mapping: WorkspaceMapping) => void;
}

export function WorkspaceSetup({
  trimbleProjectId,
  trimbleProjectName,
  mockMode = false,
  onConfigured,
}: WorkspaceSetupProps) {
  const existing = getWorkspaceMapping(trimbleProjectId);
  const [workspaceId, setWorkspaceId] = useState(existing?.mezzoteamWorkspaceId ?? '');
  const [label, setLabel] = useState(existing?.label ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mockMode && !workspaceId) {
      setWorkspaceId('demo-workspace');
    }
  }, [mockMode, workspaceId]);

  const handleSubmit = () => {
    const trimmed = workspaceId.trim();
    if (!trimmed) {
      setError('Veuillez saisir l\'identifiant du workspace Mezzoteam.');
      return;
    }
    setError(null);
    const mapping = saveWorkspaceMapping(trimbleProjectId, trimmed, label);
    onConfigured(mapping);
  };

  const handleReset = () => {
    clearWorkspaceMapping(trimbleProjectId);
    setWorkspaceId(mockMode ? 'demo-workspace' : '');
    setLabel('');
    setError(null);
  };

  return (
    <div className="workspace-setup">
      <ModusWcCard bordered padding="comfortable">
        <ModusWcTypography hierarchy="h4" label="Lier ce projet à Mezzoteam" />

        {trimbleProjectName && (
          <ModusWcTypography hierarchy="p">
            Projet Trimble Connect : <strong>{trimbleProjectName}</strong>
          </ModusWcTypography>
        )}

        <ModusWcTypography hierarchy="p">
          Saisissez l&apos;identifiant du workspace Mezzoteam correspondant à ce projet.
          Vous le trouverez dans l&apos;URL Mezzoteam ou via votre administrateur.
        </ModusWcTypography>

        {mockMode && (
          <ModusWcAlert
            alertTitle="Mode démo actif"
            alertDescription="« demo-workspace » fonctionne avec des données fictives."
            variant="info"
          />
        )}

        <div className="workspace-setup__form">
          <ModusWcTextInput
            label="ID Workspace Mezzoteam *"
            value={workspaceId}
            placeholder={mockMode ? 'demo-workspace' : 'ex: abc123-def456'}
            required
            feedback={error ? { level: 'error', message: error } : undefined}
            onInputChange={(e) => {
              setWorkspaceId(readInputString(e));
              if (error) setError(null);
            }}
          />

          <ModusWcTextInput
            label="Libellé (optionnel)"
            value={label}
            placeholder="ex: Chantier Tour Alpha"
            onInputChange={(e) => setLabel(readInputString(e))}
          />

          <div className="app__actions">
            <ModusWcButton color="primary" onButtonClick={handleSubmit}>
              Enregistrer et ouvrir l&apos;arborescence
            </ModusWcButton>
            {existing && (
              <ModusWcButton color="tertiary" onButtonClick={handleReset}>
                Réinitialiser
              </ModusWcButton>
            )}
          </div>
        </div>
      </ModusWcCard>
    </div>
  );
}
