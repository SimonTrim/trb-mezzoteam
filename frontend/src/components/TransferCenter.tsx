import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ModusWcAlert,
  ModusWcButton,
  ModusWcCheckbox,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';

import { fetchTrimbleRoot } from '@/api/proxyClient';
import { loadAppSettings } from '@/services/appSettingsService';
import { createMezzoteamSource, createTrimbleSource } from '@/services/fileSources';
import { toastService } from '@/services/toastService';
import {
  loadTransferHistory,
  saveTransferEntry,
  updateTransferEntry,
} from '@/services/transferHistoryService';
import { trimbleConnectService } from '@/services/trimbleConnectService';
import type { TransferDirection, TransferLogEntry, TreeNodeData } from '@/types';
import { readInputChecked } from '@/utils/modusFormEvents';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { FileExplorer, type FileExplorerHandle } from './FileExplorer';

interface TransferCenterProps {
  workspaceId: string;
  projectId: string;
  onOpenDocument?: (node: TreeNodeData) => void;
}

function newLogId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function TransferCenter({ workspaceId, projectId, onOpenDocument }: TransferCenterProps) {
  const mezzoSource = useMemo(() => createMezzoteamSource(workspaceId), [workspaceId]);
  const trimbleSource = useMemo(() => createTrimbleSource(), []);

  const mezzoRef = useRef<FileExplorerHandle>(null);
  const trimbleRef = useRef<FileExplorerHandle>(null);

  const [mezzoSelected, setMezzoSelected] = useState<TreeNodeData | null>(null);
  const [trimbleSelected, setTrimbleSelected] = useState<TreeNodeData | null>(null);
  const [mezzoMulti, setMezzoMulti] = useState<TreeNodeData[]>([]);
  const [trimbleMulti, setTrimbleMulti] = useState<TreeNodeData[]>([]);
  const [trimbleRootId, setTrimbleRootId] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [log, setLog] = useState<TransferLogEntry[]>(() => loadTransferHistory());
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<TreeNodeData | null>(null);
  const [preview, setPreview] = useState<{ name: string; base64: string } | null>(null);

  const settings = loadAppSettings();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ctx = await trimbleConnectService.getRestContext();
        const root = await fetchTrimbleRoot(ctx);
        if (!cancelled) setTrimbleRootId(root.rootId);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pushLog = (entry: TransferLogEntry) => {
    const saved = saveTransferEntry(entry);
    setLog(saved.slice(0, 25));
  };

  const patchLog = (id: string, patch: Partial<TransferLogEntry>) => {
    const updated = updateTransferEntry(id, patch);
    setLog(updated.slice(0, 25));
  };

  function getDestFolder(direction: TransferDirection): string | null {
    const isToTrimble = direction === 'mezzoteam-to-trimble';
    if (isToTrimble) {
      return trimbleSelected?.type === 'folder' ? trimbleSelected.id : trimbleRootId;
    }
    return mezzoSelected?.type === 'folder' ? mezzoSelected.id : null;
  }

  function getSourceNodes(direction: TransferDirection): TreeNodeData[] {
    const isToTrimble = direction === 'mezzoteam-to-trimble';
    if (multiSelectMode) {
      const list = isToTrimble ? mezzoMulti : trimbleMulti;
      return list.filter((n) => n.type === 'document');
    }
    const single = isToTrimble ? mezzoSelected : trimbleSelected;
    return single?.type === 'document' ? [single] : [];
  }

  async function transferOne(
    direction: TransferDirection,
    sourceNode: TreeNodeData,
    destFolderId: string,
  ): Promise<void> {
    const isToTrimble = direction === 'mezzoteam-to-trimble';
    const fromSource = isToTrimble ? mezzoSource : trimbleSource;
    const toSource = isToTrimble ? trimbleSource : mezzoSource;
    const toRef = isToTrimble ? trimbleRef : mezzoRef;

    const content = await fromSource.getFileContent(sourceNode.id);
    await toSource.uploadFile(destFolderId, { name: content.name, base64: content.base64 });

    if (settings.autoRefreshAfterTransfer) {
      await toRef.current?.refreshFolder(destFolderId);
    }
  }

  async function runTransfer(
    direction: TransferDirection,
    forcedNodes?: TreeNodeData[],
    forcedDestFolderId?: string,
  ) {
    const nodes = forcedNodes ?? getSourceNodes(direction);
    const isToTrimble = direction === 'mezzoteam-to-trimble';

    if (nodes.length === 0) {
      toastService.warning(
        'Sélection requise',
        isToTrimble
          ? 'Sélectionnez un ou plusieurs documents Mezzoteam.'
          : 'Sélectionnez un ou plusieurs fichiers Trimble Connect.',
      );
      return;
    }

    const destFolderId = forcedDestFolderId ?? getDestFolder(direction);
    if (!destFolderId) {
      toastService.warning(
        'Destination requise',
        isToTrimble
          ? 'Sélectionnez un dossier Trimble Connect de destination.'
          : 'Sélectionnez un dossier Mezzoteam de destination.',
      );
      return;
    }

    if (settings.confirmBeforeTransfer && !forcedNodes) {
      const ok = window.confirm(
        `Copier ${nodes.length} fichier(s) vers ${isToTrimble ? 'Trimble Connect' : 'Mezzoteam'} ?`,
      );
      if (!ok) return;
    }

    setIsBusy(true);
    let success = 0;
    let failed = 0;

    for (const node of nodes) {
      const logId = newLogId();
      pushLog({
        id: logId,
        direction,
        fileName: node.name,
        status: 'running',
        message: 'Transfert en cours…',
        timestamp: new Date().toISOString(),
      });

      try {
        await transferOne(direction, node, destFolderId);
        patchLog(logId, { status: 'success', message: 'Copié avec succès.' });
        success += 1;
      } catch (err) {
        patchLog(logId, {
          status: 'error',
          message: err instanceof Error ? err.message : 'Échec',
        });
        failed += 1;
      }
    }

    setIsBusy(false);
    if (success > 0) {
      toastService.success(
        'Transfert terminé',
        `${success} fichier(s) copié(s)${failed ? `, ${failed} échec(s)` : ''}.`,
      );
    } else {
      toastService.error('Transfert échoué', 'Aucun fichier n\'a pu être copié.');
    }
  }

  const handleDropOnTrimble = (folder: TreeNodeData) => {
    setDropTargetId(null);
    if (!draggedNode || draggedNode.type !== 'document') return;
    void runTransfer('mezzoteam-to-trimble', [draggedNode], folder.id);
    setDraggedNode(null);
  };

  const handleDropOnMezzo = (folder: TreeNodeData) => {
    setDropTargetId(null);
    if (!draggedNode || draggedNode.type !== 'document') return;
    void runTransfer('trimble-to-mezzoteam', [draggedNode], folder.id);
    setDraggedNode(null);
  };

  const handlePreview = async (node: TreeNodeData) => {
    if (node.type !== 'document') return;
    try {
      const content = await mezzoSource.getFileContent(node.id);
      setPreview({ name: content.name, base64: content.base64 });
    } catch (err) {
      toastService.error('Aperçu impossible', err instanceof Error ? err.message : undefined);
    }
  };

  const handleDownloadPreview = () => {
    if (!preview) return;
    const link = document.createElement('a');
    link.href = `data:application/octet-stream;base64,${preview.base64}`;
    link.download = preview.name;
    link.click();
  };

  const selectedMezzoDocs = multiSelectMode
    ? mezzoMulti.filter((n) => n.type === 'document').length
    : mezzoSelected?.type === 'document'
      ? 1
      : 0;

  const selectedTrimbleDocs = multiSelectMode
    ? trimbleMulti.filter((n) => n.type === 'document').length
    : trimbleSelected?.type === 'document'
      ? 1
      : 0;

  return (
    <div className="transfer">
      <div className="transfer__options">
        <ModusWcCheckbox
          label="Sélection multiple (Ctrl+clic, Shift+clic)"
          value={multiSelectMode}
          onInputChange={(e) => setMultiSelectMode(readInputChecked(e))}
        />
      </div>

      <div className="transfer__panes">
        <section className="transfer__pane">
          <header className="transfer__pane-header">
            <ModusWcIcon name="folder_open" size="sm" decorative />
            <ModusWcTypography hierarchy="h5" label="Mezzoteam" />
            {selectedMezzoDocs > 0 && (
              <ModusWcTypography hierarchy="p" size="sm">
                {selectedMezzoDocs} sélectionné(s)
              </ModusWcTypography>
            )}
          </header>
          <div className="transfer__pane-body">
            <FileExplorer
              ref={mezzoRef}
              source={mezzoSource}
              projectId={projectId}
              selectedId={mezzoSelected?.id}
              multiSelect={multiSelectMode}
              dropTargetId={dropTargetId}
              onSelect={(node) => setMezzoSelected(node)}
              onMultiSelectChange={setMezzoMulti}
              onDragStart={setDraggedNode}
              onDragOverFolder={(f) => setDropTargetId(f.id)}
              onDropOnFolder={handleDropOnMezzo}
            />
          </div>
        </section>

        <div className="transfer__actions">
          <ModusWcButton
            color="primary"
            disabled={isBusy || selectedMezzoDocs === 0}
            onButtonClick={() => void runTransfer('mezzoteam-to-trimble')}
          >
            <ModusWcIcon name="arrow_right" size="sm" decorative />
            Vers Trimble
          </ModusWcButton>

          <ModusWcButton
            color="secondary"
            disabled={isBusy || selectedTrimbleDocs === 0}
            onButtonClick={() => void runTransfer('trimble-to-mezzoteam')}
          >
            <ModusWcIcon name="arrow_left" size="sm" decorative />
            Vers Mezzoteam
          </ModusWcButton>

          {mezzoSelected?.type === 'document' && (
            <>
              <ModusWcButton
                color="tertiary"
                size="sm"
                disabled={isBusy}
                onButtonClick={() => void handlePreview(mezzoSelected)}
              >
                <ModusWcIcon name="visibility_on" size="sm" decorative />
                Aperçu
              </ModusWcButton>
              {onOpenDocument && (
                <ModusWcButton
                  color="tertiary"
                  size="sm"
                  disabled={isBusy}
                  onButtonClick={() => onOpenDocument(mezzoSelected)}
                >
                  <ModusWcIcon name="launch" size="sm" decorative />
                  Ouvrir
                </ModusWcButton>
              )}
            </>
          )}
        </div>

        <section className="transfer__pane">
          <header className="transfer__pane-header">
            <ModusWcIcon name="folder_open" size="sm" decorative />
            <ModusWcTypography hierarchy="h5" label="Trimble Connect" />
            {selectedTrimbleDocs > 0 && (
              <ModusWcTypography hierarchy="p" size="sm">
                {selectedTrimbleDocs} sélectionné(s)
              </ModusWcTypography>
            )}
          </header>
          <div className="transfer__pane-body">
            <FileExplorer
              ref={trimbleRef}
              source={trimbleSource}
              projectId={projectId}
              selectedId={trimbleSelected?.id}
              multiSelect={multiSelectMode}
              dropTargetId={dropTargetId}
              onSelect={(node) => setTrimbleSelected(node)}
              onMultiSelectChange={setTrimbleMulti}
              onDragStart={setDraggedNode}
              onDragOverFolder={(f) => setDropTargetId(f.id)}
              onDropOnFolder={handleDropOnTrimble}
            />
          </div>
        </section>
      </div>

      <ModusWcTypography hierarchy="p" size="sm">
        Glissez-déposez un fichier sur un dossier de l&apos;autre panneau, ou utilisez les boutons
        de copie. Ctrl+clic pour multi-sélection.
      </ModusWcTypography>

      {log.length > 0 && (
        <div className="transfer__log">
          <ModusWcTypography hierarchy="h6" label="Activité récente" />
          <ul className="transfer__log-list">
            {log.map((entry) => (
              <li key={entry.id} className={`transfer__log-item transfer__log-item--${entry.status}`}>
                <ModusWcIcon
                  name={
                    entry.status === 'success'
                      ? 'check_circle'
                      : entry.status === 'error'
                        ? 'alert'
                        : 'sync'
                  }
                  size="sm"
                  decorative
                />
                <span className="transfer__log-text">
                  <strong>{entry.fileName}</strong>{' '}
                  {entry.direction === 'mezzoteam-to-trimble'
                    ? '→ Trimble Connect'
                    : '→ Mezzoteam'}
                  {entry.message ? ` — ${entry.message}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isBusy && (
        <ModusWcAlert
          alertTitle="Transfert en cours"
          alertDescription="Veuillez patienter…"
          variant="info"
        />
      )}

      <DocumentPreviewModal
        open={Boolean(preview)}
        fileName={preview?.name ?? ''}
        base64={preview?.base64 ?? ''}
        onClose={() => setPreview(null)}
        onDownload={handleDownloadPreview}
      />
    </div>
  );
}
