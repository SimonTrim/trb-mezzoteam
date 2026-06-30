import { useState } from 'react';
import {
  ModusWcButton,
  ModusWcCheckbox,
  ModusWcSelect,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';
import {
  loadAppSettings,
  saveAppSettings,
  type AppSettings,
} from '@/services/appSettingsService';
import { readInputChecked, readInputString } from '@/utils/modusFormEvents';

export function SettingsPanel() {
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<AppSettings>) => {
    const next = saveAppSettings(patch);
    setSettings(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-panel">
      <ModusWcTypography hierarchy="h5" label="Paramètres" />
      <ModusWcTypography hierarchy="p" size="sm">
        Préférences locales de l&apos;extension (stockées dans le navigateur).
      </ModusWcTypography>

      <div className="settings-panel__form">
        <ModusWcCheckbox
          label="Demander confirmation avant chaque transfert"
          value={settings.confirmBeforeTransfer}
          onInputChange={(e) => update({ confirmBeforeTransfer: readInputChecked(e) })}
        />
        <ModusWcCheckbox
          label="Rafraîchir automatiquement le dossier de destination"
          value={settings.autoRefreshAfterTransfer}
          onInputChange={(e) => update({ autoRefreshAfterTransfer: readInputChecked(e) })}
        />
        <ModusWcCheckbox
          label="Afficher les extensions de fichiers"
          value={settings.showFileExtensions}
          onInputChange={(e) => update({ showFileExtensions: readInputChecked(e) })}
        />

        <ModusWcSelect
          label="Onglet par défaut"
          value={settings.defaultTab}
          options={[
            { label: 'Transfert de fichiers', value: 'transfer' },
            { label: 'Arborescence', value: 'browse' },
            { label: 'Historique', value: 'history' },
          ]}
          onInputChange={(e) =>
            update({ defaultTab: readInputString(e) as AppSettings['defaultTab'] })
          }
        />
      </div>

      {saved && (
        <ModusWcTypography hierarchy="p" size="sm">
          Paramètres enregistrés.
        </ModusWcTypography>
      )}

      <ModusWcButton
        color="tertiary"
        size="sm"
        onButtonClick={() => {
          const defaults = saveAppSettings({
            confirmBeforeTransfer: true,
            autoRefreshAfterTransfer: true,
            showFileExtensions: true,
            defaultTab: 'transfer',
          });
          setSettings(defaults);
        }}
      >
        Réinitialiser
      </ModusWcButton>
    </div>
  );
}
