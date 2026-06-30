import { ModusWcButton, ModusWcIcon, ModusWcLoader } from '@trimble-oss/moduswebcomponents-react';
import type { TreeNodeData } from '@/types';

interface TreeNodeProps {
  node: TreeNodeData;
  depth: number;
  selectedId?: string | null;
  selectedIds?: Set<string>;
  multiSelect?: boolean;
  favoriteIds?: Set<string>;
  dropTargetId?: string | null;
  onToggle: (nodeId: string) => void;
  onSelect: (node: TreeNodeData, event?: { ctrlKey?: boolean; shiftKey?: boolean }) => void;
  onToggleFavorite?: (node: TreeNodeData) => void;
  onCopyName?: (node: TreeNodeData) => void;
  onDragStart?: (node: TreeNodeData) => void;
  onDragOver?: (node: TreeNodeData) => void;
  onDrop?: (node: TreeNodeData) => void;
}

export function TreeNode({
  node,
  depth,
  selectedId,
  selectedIds,
  multiSelect,
  favoriteIds,
  dropTargetId,
  onToggle,
  onSelect,
  onToggleFavorite,
  onCopyName,
  onDragStart,
  onDragOver,
  onDrop,
}: TreeNodeProps) {
  const isFolder = node.type === 'folder';
  const canExpand = isFolder && (node.hasChildren ?? true);
  const folderIcon = node.isExpanded ? 'folder_open' : 'folder_closed';
  const fileIcon = 'file';
  const isSelected = multiSelect
    ? selectedIds?.has(node.id)
    : selectedId === node.id;
  const isFavorite = favoriteIds?.has(node.id);
  const isDropTarget = dropTargetId === node.id && isFolder;

  return (
    <li
      className="tree-node"
      role="treeitem"
      aria-expanded={node.isExpanded}
      aria-selected={isSelected}
      draggable={node.type === 'document'}
      onDragStart={(e) => {
        if (node.type !== 'document') return;
        e.dataTransfer.setData('application/x-mezzoteam-node', JSON.stringify(node));
        e.dataTransfer.effectAllowed = 'copy';
        onDragStart?.(node);
      }}
      onDragOver={(e) => {
        if (!isFolder) return;
        e.preventDefault();
        onDragOver?.(node);
      }}
      onDrop={(e) => {
        if (!isFolder) return;
        e.preventDefault();
        onDrop?.(node);
      }}
    >
      <div
        className={`tree-node__row${isSelected ? ' tree-node__row--selected' : ''}${isDropTarget ? ' tree-node__row--drop-target' : ''}`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {canExpand ? (
          <button
            type="button"
            className="tree-node__toggle"
            aria-label={node.isExpanded ? 'Replier' : 'Déplier'}
            disabled={node.isLoading}
            onClick={() => onToggle(node.id)}
          >
            <span className="tree-node__toggle-content" hidden={node.isLoading}>
              <ModusWcIcon
                name={node.isExpanded ? 'expand_more' : 'chevron_right'}
                size="sm"
                decorative
              />
            </span>
            <span className="tree-node__toggle-content" hidden={!node.isLoading}>
              <ModusWcLoader size="sm" />
            </span>
          </button>
        ) : (
          <span className="tree-node__toggle-spacer" aria-hidden />
        )}

        <button
          type="button"
          className="tree-node__label-btn"
          onClick={(e) =>
            onSelect(node, { ctrlKey: e.ctrlKey || e.metaKey, shiftKey: e.shiftKey })
          }
        >
          <ModusWcIcon name={isFolder ? folderIcon : fileIcon} size="sm" decorative />
          <span className="tree-node__name">{node.name}</span>
        </button>

        <div className="tree-node__actions">
          {onToggleFavorite && (
            <ModusWcButton
              color="tertiary"
              shape="square"
              size="sm"
              aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              onButtonClick={() => onToggleFavorite(node)}
            >
              <ModusWcIcon name={isFavorite ? 'bookmark_filled' : 'bookmark'} size="sm" decorative />
            </ModusWcButton>
          )}
          {onCopyName && (
            <ModusWcButton
              color="tertiary"
              shape="square"
              size="sm"
              aria-label="Copier le nom"
              onButtonClick={() => onCopyName(node)}
            >
              <ModusWcIcon name="content_copy" size="sm" decorative />
            </ModusWcButton>
          )}
        </div>
      </div>

      {node.isExpanded && node.children && node.children.length > 0 && (
        <ul className="tree-node__children" role="group">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              selectedIds={selectedIds}
              multiSelect={multiSelect}
              favoriteIds={favoriteIds}
              dropTargetId={dropTargetId}
              onToggle={onToggle}
              onSelect={onSelect}
              onToggleFavorite={onToggleFavorite}
              onCopyName={onCopyName}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
