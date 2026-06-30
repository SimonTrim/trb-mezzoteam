import type { FolderListing, TreeNodeData } from '@/types';

export function listingToNodes(listing: FolderListing): TreeNodeData[] {
  const folders: TreeNodeData[] = listing.folders.map((f) => ({
    id: f.id,
    name: f.name,
    type: 'folder',
    hasChildren: true,
  }));
  const files: TreeNodeData[] = listing.files.map((f) => ({
    id: f.id,
    name: f.name,
    type: 'document',
    hasChildren: false,
  }));
  return [...folders, ...files];
}

export function updateNodeInTree(
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

export function findNode(nodes: TreeNodeData[], nodeId: string): TreeNodeData | undefined {
  for (const n of nodes) {
    if (n.id === nodeId) return n;
    if (n.children) {
      const found = findNode(n.children, nodeId);
      if (found) return found;
    }
  }
  return undefined;
}

export function filterTree(nodes: TreeNodeData[], query: string): TreeNodeData[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  const walk = (list: TreeNodeData[]): TreeNodeData[] =>
    list
      .map((node) => {
        const nameMatch = node.name.toLowerCase().includes(q);
        if (node.type === 'document') {
          return nameMatch ? node : null;
        }
        const children = node.children ? walk(node.children) : [];
        if (nameMatch || children.length > 0) {
          return { ...node, isExpanded: true, children: children.length ? children : node.children };
        }
        return null;
      })
      .filter(Boolean) as TreeNodeData[];

  return walk(nodes);
}

export function collectDocuments(nodes: TreeNodeData[]): TreeNodeData[] {
  const docs: TreeNodeData[] = [];
  const walk = (list: TreeNodeData[]) => {
    for (const n of list) {
      if (n.type === 'document') docs.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(nodes);
  return docs;
}

export function formatFileSize(base64: string): string {
  const bytes = Math.ceil((base64.length * 3) / 4);
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
