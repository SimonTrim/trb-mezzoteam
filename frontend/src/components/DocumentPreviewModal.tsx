import { useEffect } from 'react';
import {
  ModusWcButton,
  ModusWcModal,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';
import { formatFileSize } from '@/utils/treeUtils';

interface DocumentPreviewModalProps {
  open: boolean;
  fileName: string;
  base64: string;
  onClose: () => void;
  onDownload?: () => void;
}

const MODAL_ID = 'document-preview-modal';

function isPdf(name: string): boolean {
  return name.toLowerCase().endsWith('.pdf');
}

function isImage(name: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(name);
}

export function DocumentPreviewModal({
  open,
  fileName,
  base64,
  onClose,
  onDownload,
}: DocumentPreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    const el = document.getElementById(MODAL_ID) as HTMLDialogElement | null;
    if (!el) return;
    el.showModal();
    const onNativeClose = () => onClose();
    el.addEventListener('close', onNativeClose);
    return () => el.removeEventListener('close', onNativeClose);
  }, [open, onClose]);

  if (!open) return null;

  const dataUrl = `data:${isPdf(fileName) ? 'application/pdf' : 'application/octet-stream'};base64,${base64}`;

  return (
    <ModusWcModal modalId={MODAL_ID} backdrop="default" position="center" fullscreen showClose aria-label="Aperçu document">
      <span slot="header">{fileName}</span>
      <div slot="content" className="preview-modal">
        <ModusWcTypography hierarchy="p" size="sm">
          Taille estimée : {formatFileSize(base64)}
        </ModusWcTypography>
        {isPdf(fileName) ? (
          <iframe title={fileName} src={dataUrl} className="preview-modal__frame" />
        ) : isImage(fileName) ? (
          <img src={dataUrl} alt={fileName} className="preview-modal__image" />
        ) : (
          <ModusWcTypography hierarchy="p">
            Aperçu non disponible pour ce type de fichier. Utilisez Télécharger ou Ouvrir.
          </ModusWcTypography>
        )}
      </div>
      <div slot="footer" className="modal-form__actions">
        <ModusWcButton color="tertiary" onButtonClick={onClose}>
          Fermer
        </ModusWcButton>
        {onDownload && (
          <ModusWcButton color="primary" onButtonClick={onDownload}>
            Télécharger
          </ModusWcButton>
        )}
      </div>
    </ModusWcModal>
  );
}
