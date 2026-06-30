import { useEffect, useState } from 'react';
import {
  ModusWcButton,
  ModusWcModal,
  ModusWcTextInput,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';
import { readInputString } from '@/utils/modusFormEvents';

interface CreateFolderDialogProps {
  open: boolean;
  parentName?: string;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

const MODAL_ID = 'create-folder-modal';

export function CreateFolderDialog({ open, parentName, onClose, onCreate }: CreateFolderDialogProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(MODAL_ID) as HTMLDialogElement | null;
    if (!el) return;
    el.showModal();
    const onNativeClose = () => {
      setName('');
      setError(null);
      onClose();
    };
    el.addEventListener('close', onNativeClose);
    return () => el.removeEventListener('close', onNativeClose);
  }, [open, onClose]);

  const handleClose = () => {
    setName('');
    setError(null);
    onClose();
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Nom du dossier requis.');
      return;
    }
    setIsBusy(true);
    try {
      await onCreate(trimmed);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setIsBusy(false);
    }
  };

  if (!open) return null;

  return (
    <ModusWcModal modalId={MODAL_ID} backdrop="default" position="center" showClose aria-label="Créer un dossier">
      <span slot="header">Nouveau dossier</span>
      <div slot="content" className="modal-form">
        {parentName && (
          <ModusWcTypography hierarchy="p" size="sm">
            Dans : <strong>{parentName}</strong>
          </ModusWcTypography>
        )}
        <ModusWcTextInput
          label="Nom du dossier"
          value={name}
          required
          feedback={error ? { level: 'error', message: error } : undefined}
          onInputChange={(e) => {
            setName(readInputString(e));
            if (error) setError(null);
          }}
        />
      </div>
      <div slot="footer" className="modal-form__actions">
        <ModusWcButton color="tertiary" disabled={isBusy} onButtonClick={handleClose}>
          Annuler
        </ModusWcButton>
        <ModusWcButton color="primary" disabled={isBusy} onButtonClick={() => void handleCreate()}>
          Créer
        </ModusWcButton>
      </div>
    </ModusWcModal>
  );
}
