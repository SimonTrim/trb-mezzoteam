import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import {
  ModusWcAlert,
  ModusWcButton,
  ModusWcIcon,
  ModusWcLoader,
  ModusWcTextInput,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';

import type { FileSource } from '@/services/fileSources';
import { isFavorite, loadFavorites, toggleFavorite } from '@/services/favoritesService';
import { toastService } from '@/services/toastService';
import type { SideId, TreeNodeData } from '@/types';
import { copyTextToClipboard } from '@/utils/clipboard';
import { readInputString } from '@/utils/modusFormEvents';
import {
  filterTree,
  findNode,
  listingToNodes,
  updateNodeInTree,
} from '@/utils/treeUtils';
import { CreateFolderDialog } from './CreateFolderDialog';
import { TreeNode } from './TreeNode';

export interface FileExplorerHandle {
  reloadRoot: () => Promise<void>;
  refreshFolder: (folderId: string) => Promise<void>;
  getSelectedNodes: () => TreeNodeData[];
}

interface FileExplorerProps {
  source: FileSource;
  projectId?: string;
  selectedId?: string | null;
  selectedIds?: Set<string>;
  multiSelect?: boolean;
  dropTargetId?: string | null;
  onSelect?: (node: TreeNodeData, modifiers?: { ctrlKey?: boolean; shiftKey?: boolean }) => void;
  onMultiSelectChange?: (nodes: TreeNodeData[]) => void;
  onDragStart?: (node: TreeNodeData) => void;
  onDragOverFolder?: (node: TreeNodeData) => void;
  onDropOnFolder?: (node: TreeNodeData) => void;
}

export const FileExplorer = forwardRef<FileExplorerHandle, FileExplorerProps>(
  function FileExplorer(
    {
      source,
      projectId = 'local',
      selectedId,
      selectedIds: externalSelectedIds,
      multiSelect = false,
      dropTargetId,
      onSelect,
      onMultiSelectChange,
      onDragStart,
      onDragOverFolder,
      onDropOnFolder,
    },
    ref,
  ) {
    const [nodes, setNodes] = useState<TreeNodeData[]>([]);
    const [isLoadingRoot, setIsLoadingRoot] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
    const [favoriteRevision, setFavoriteRevision] = useState(0);
    const [createFolderParent, setCreateFolderParent] = useState<TreeNodeData | null>(null);
    const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

    const selectedIds = externalSelectedIds ?? internalSelectedIds;

    const favoriteIds = useMemo(() => {
      void favoriteRevision;
      const ids = new Set<string>();
      loadFavorites(projectId)
        .filter((f) => f.side === source.id)
        .forEach((f) => ids.add(f.nodeId));
      return ids;
    }, [projectId, source.id, favoriteRevision]);

    const loadRoot = useCallback(async () => {
      setIsLoadingRoot(true);
      setError(null);
      try {
        const listing = await source.loadRoot();
        setNodes(listingToNodes(listing));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chargement impossible');
      } finally {
        setIsLoadingRoot(false);
      }
    }, [source]);

    useEffect(() => {
      void loadRoot();
    }, [loadRoot]);

    const loadFolderChildren = useCallback(
      async (folderId: string) => {
        const listing = await source.loadChildren(folderId);
        const children = listingToNodes(listing);
        setNodes((prev) =>
          updateNodeInTree(prev, folderId, (n) => ({
            ...n,
            isLoading: false,
            isExpanded: true,
            children,
            hasChildren: children.length > 0,
          })),
        );
      },
      [source],
    );

    const handleToggle = useCallback(
      async (nodeId: string) => {
        const target = findNode(nodes, nodeId);
        if (!target || target.type !== 'folder') return;

        if (target.isExpanded) {
          setNodes((prev) => updateNodeInTree(prev, nodeId, (n) => ({ ...n, isExpanded: false })));
          return;
        }

        if (target.children) {
          setNodes((prev) => updateNodeInTree(prev, nodeId, (n) => ({ ...n, isExpanded: true })));
          return;
        }

        setNodes((prev) =>
          updateNodeInTree(prev, nodeId, (n) => ({ ...n, isLoading: true, isExpanded: true })),
        );
        try {
          await loadFolderChildren(nodeId);
        } catch (err) {
          setNodes((prev) =>
            updateNodeInTree(prev, nodeId, (n) => ({ ...n, isLoading: false, isExpanded: false })),
          );
          setError(err instanceof Error ? err.message : 'Erreur lors du chargement du dossier');
        }
      },
      [nodes, loadFolderChildren],
    );

    const resolveSelectedNodes = useCallback(
      (ids: Set<string>): TreeNodeData[] => {
        const result: TreeNodeData[] = [];
        const walk = (list: TreeNodeData[]) => {
          for (const n of list) {
            if (ids.has(n.id)) result.push(n);
            if (n.children) walk(n.children);
          }
        };
        walk(nodes);
        return result;
      },
      [nodes],
    );

    const handleSelect = useCallback(
      (node: TreeNodeData, modifiers?: { ctrlKey?: boolean; shiftKey?: boolean }) => {
        if (multiSelect && modifiers?.ctrlKey) {
          const next = new Set(selectedIds);
          if (next.has(node.id)) next.delete(node.id);
          else next.add(node.id);
          setInternalSelectedIds(next);
          onMultiSelectChange?.(resolveSelectedNodes(next));
        } else if (multiSelect && modifiers?.shiftKey && lastSelectedId) {
          const flat: TreeNodeData[] = [];
          const walk = (list: TreeNodeData[]) => {
            for (const n of list) {
              flat.push(n);
              if (n.children) walk(n.children);
            }
          };
          walk(nodes);
          const start = flat.findIndex((n) => n.id === lastSelectedId);
          const end = flat.findIndex((n) => n.id === node.id);
          if (start >= 0 && end >= 0) {
            const [from, to] = start < end ? [start, end] : [end, start];
            const range = flat.slice(from, to + 1).filter((n) => n.type === 'document');
            const next = new Set(range.map((n) => n.id));
            setInternalSelectedIds(next);
            onMultiSelectChange?.(range);
          }
        } else {
          setLastSelectedId(node.id);
          if (multiSelect && node.type === 'document') {
            const next = new Set([node.id]);
            setInternalSelectedIds(next);
            onMultiSelectChange?.([node]);
          }
          onSelect?.(node, modifiers);
        }

        if (node.type === 'folder') void handleToggle(node.id);
      },
      [
        multiSelect,
        selectedIds,
        lastSelectedId,
        nodes,
        onSelect,
        onMultiSelectChange,
        resolveSelectedNodes,
        handleToggle,
      ],
    );

    const handleToggleFavorite = (node: TreeNodeData) => {
      toggleFavorite(projectId, {
        side: source.id as SideId,
        nodeId: node.id,
        name: node.name,
        type: node.type,
        projectId,
      });
      setFavoriteRevision((r) => r + 1);
      const fav = isFavorite(projectId, source.id as SideId, node.id);
      toastService.info(fav ? 'Retiré des favoris' : 'Ajouté aux favoris', node.name);
    };

    const handleCopyName = (node: TreeNodeData) => {
      void copyTextToClipboard(node.name, 'Nom du fichier');
    };

    const handleCreateFolder = async (name: string) => {
      if (!createFolderParent) return;
      const created = await source.createFolder(createFolderParent.id, name);
      await loadFolderChildren(createFolderParent.id);
      toastService.success('Dossier créé', created.name);
    };

    const openCreateFolder = () => {
      const folder = selectedId
        ? findNode(nodes, selectedId)
        : nodes.find((n) => n.type === 'folder');
      if (folder?.type === 'folder') setCreateFolderParent(folder);
      else toastService.warning('Sélectionnez un dossier parent');
    };

    useImperativeHandle(
      ref,
      () => ({
        reloadRoot: loadRoot,
        async refreshFolder(folderId: string) {
          const target = findNode(nodes, folderId);
          if (!target) {
            await loadRoot();
            return;
          }
          await loadFolderChildren(folderId).catch(() => undefined);
        },
        getSelectedNodes: () => resolveSelectedNodes(selectedIds),
      }),
      [nodes, loadRoot, loadFolderChildren, resolveSelectedNodes, selectedIds],
    );

    const displayedNodes = useMemo(() => filterTree(nodes, search), [nodes, search]);

    return (
      <div className="explorer">
        <div className="explorer__toolbar">
          <ModusWcTextInput
            label="Rechercher"
            size="sm"
            value={search}
            placeholder="Filtrer…"
            onInputChange={(e) => setSearch(readInputString(e))}
          />
          <ModusWcButton color="tertiary" size="sm" aria-label="Actualiser" onButtonClick={() => void loadRoot()}>
            <ModusWcIcon name="refresh" size="sm" decorative />
          </ModusWcButton>
          <ModusWcButton color="tertiary" size="sm" aria-label="Nouveau dossier" onButtonClick={openCreateFolder}>
            <ModusWcIcon name="create_new_folder" size="sm" decorative />
          </ModusWcButton>
        </div>

        {isLoadingRoot ? (
          <div className="explorer app__center">
            <ModusWcLoader />
            <ModusWcTypography hierarchy="p">Chargement…</ModusWcTypography>
          </div>
        ) : error ? (
          <div className="explorer app__stack">
            <ModusWcAlert alertTitle="Erreur" alertDescription={error} variant="error" />
            <ModusWcButton color="tertiary" onButtonClick={() => void loadRoot()}>
              Réessayer
            </ModusWcButton>
          </div>
        ) : displayedNodes.length === 0 ? (
          <ModusWcTypography hierarchy="p" size="sm">
            Aucun élément.
          </ModusWcTypography>
        ) : (
          <nav className="document-tree" aria-label={`Arborescence ${source.label}`}>
            <ul className="document-tree__root" role="tree">
              {displayedNodes.map((node) => (
                <TreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  selectedId={selectedId}
                  selectedIds={selectedIds}
                  multiSelect={multiSelect}
                  favoriteIds={favoriteIds}
                  dropTargetId={dropTargetId}
                  onToggle={handleToggle}
                  onSelect={handleSelect}
                  onToggleFavorite={handleToggleFavorite}
                  onCopyName={handleCopyName}
                  onDragStart={onDragStart}
                  onDragOver={onDragOverFolder}
                  onDrop={onDropOnFolder}
                />
              ))}
            </ul>
          </nav>
        )}

        <CreateFolderDialog
          open={Boolean(createFolderParent)}
          parentName={createFolderParent?.name}
          onClose={() => setCreateFolderParent(null)}
          onCreate={handleCreateFolder}
        />
      </div>
    );
  },
);
