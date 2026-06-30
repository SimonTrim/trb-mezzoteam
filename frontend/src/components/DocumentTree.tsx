import { useCallback, useState } from 'react';
import {
  ModusWcAlert,
  ModusWcButton,
  ModusWcLoader,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';

import { fetchFolderContents, fetchRootFolders } from '@/api/proxyClient';
import type { TreeNodeData } from '@/types';
import { TreeNode } from './TreeNode';

interface DocumentTreeProps {
  workspaceId: string;
  onDocumentSelect?: (node: TreeNodeData) => void;
}

function mapContentsToNodes(
  folders: Array<{ id: string; name: string }>,
  documents: Array<{ id: string; name: string }>,
): TreeNodeData[] {
  const folderNodes: TreeNodeData[] = folders.map((f) => ({
    id: f.id,
    name: f.name,
    type: 'folder',
    hasChildren: true,
  }));

  const documentNodes: TreeNodeData[] = documents.map((d) => ({
    id: d.id,
    name: d.name,
    type: 'document',
    hasChildren: false,
  }));

  return [...folderNodes, ...documentNodes];
}

function updateNodeInTree(
  nodes: TreeNodeData[],
  nodeId: string,
  updater: (node: TreeNodeData) => TreeNodeData,
): TreeNodeData[] {
  return nodes.map((node) => {
    if (node.id === nodeId) return updater(node);
    if (node.children) {
      return { ...node, children: updateNodeInTree(node.children, nodeId, updater) };
    }
    return node;
  });
}

export function DocumentTree({ workspaceId, onDocumentSelect }: DocumentTreeProps) {
  const [nodes, setNodes] = useState<TreeNodeData[]>([]);
  const [isLoadingRoot, setIsLoadingRoot] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedRoot, setHasLoadedRoot] = useState(false);

  const loadRoot = useCallback(async () => {
    if (hasLoadedRoot) return;
    setIsLoadingRoot(true);
    setError(null);
    try {
      const { folders } = await fetchRootFolders(workspaceId);
      setNodes(
        folders.map((f) => ({
          id: f.id,
          name: f.name,
          type: 'folder' as const,
          hasChildren: true,
        })),
      );
      setHasLoadedRoot(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les dossiers racines');
    } finally {
      setIsLoadingRoot(false);
    }
  }, [workspaceId, hasLoadedRoot]);

  const handleToggle = useCallback(
    async (nodeId: string) => {
      const findNode = (list: TreeNodeData[]): TreeNodeData | undefined => {
        for (const n of list) {
          if (n.id === nodeId) return n;
          if (n.children) {
            const found = findNode(n.children);
            if (found) return found;
          }
        }
        return undefined;
      };

      const target = findNode(nodes);
      if (!target || target.type !== 'folder') return;

      if (target.isExpanded) {
        setNodes((prev) =>
          updateNodeInTree(prev, nodeId, (n) => ({ ...n, isExpanded: false })),
        );
        return;
      }

      if (target.children) {
        setNodes((prev) =>
          updateNodeInTree(prev, nodeId, (n) => ({ ...n, isExpanded: true })),
        );
        return;
      }

      setNodes((prev) =>
        updateNodeInTree(prev, nodeId, (n) => ({ ...n, isLoading: true, isExpanded: true })),
      );

      try {
        const { folders, documents } = await fetchFolderContents(workspaceId, nodeId);
        const children = mapContentsToNodes(folders, documents);
        setNodes((prev) =>
          updateNodeInTree(prev, nodeId, (n) => ({
            ...n,
            isLoading: false,
            isExpanded: true,
            children,
            hasChildren: children.length > 0,
          })),
        );
      } catch (err) {
        setNodes((prev) =>
          updateNodeInTree(prev, nodeId, (n) => ({
            ...n,
            isLoading: false,
            isExpanded: false,
          })),
        );
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement du dossier');
      }
    },
    [nodes, workspaceId],
  );

  const handleSelect = useCallback(
    (node: TreeNodeData) => {
      if (node.type === 'document') {
        onDocumentSelect?.(node);
      } else {
        handleToggle(node.id);
      }
    },
    [handleToggle, onDocumentSelect],
  );

  const handleRetry = () => {
    setHasLoadedRoot(false);
    setError(null);
    void loadRoot();
  };

  if (!hasLoadedRoot && !isLoadingRoot) {
    return (
      <div className="document-tree app__center">
        <ModusWcTypography hierarchy="p">Arborescence Mezzoteam</ModusWcTypography>
        <ModusWcButton color="primary" onButtonClick={() => void loadRoot()}>
          Charger les dossiers
        </ModusWcButton>
      </div>
    );
  }

  if (isLoadingRoot) {
    return (
      <div className="document-tree app__center">
        <ModusWcLoader />
        <ModusWcTypography hierarchy="p">Chargement de l&apos;arborescence…</ModusWcTypography>
      </div>
    );
  }

  if (error) {
    return (
      <div className="document-tree app__stack">
        <ModusWcAlert alertTitle="Erreur" alertDescription={error} variant="error" />
        <ModusWcButton color="tertiary" onButtonClick={handleRetry}>
          Réessayer
        </ModusWcButton>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <ModusWcTypography hierarchy="p">
        Aucun dossier dans cet espace de travail.
      </ModusWcTypography>
    );
  }

  return (
    <nav className="document-tree" aria-label="Arborescence documentaire Mezzoteam">
      <ul className="document-tree__root" role="tree">
        {nodes.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={0}
            onToggle={handleToggle}
            onSelect={handleSelect}
          />
        ))}
      </ul>
    </nav>
  );
}
