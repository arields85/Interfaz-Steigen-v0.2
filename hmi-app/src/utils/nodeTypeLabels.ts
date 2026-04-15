import { DEFAULT_NODE_TYPES, nodeTypeStorage, type NodeTypeDefinition } from '../services/NodeTypeStorageService';

export function buildNodeTypeLabels(types: NodeTypeDefinition[]): Record<string, string> {
    return Object.fromEntries(types.map((type) => [type.key, type.label]));
}

export const NODE_TYPE_LABELS: Record<string, string> = buildNodeTypeLabels(DEFAULT_NODE_TYPES);

export function applyNodeTypeLabels(types: NodeTypeDefinition[]): Record<string, string> {
    const nextLabels = buildNodeTypeLabels(types);

    for (const key of Object.keys(NODE_TYPE_LABELS)) {
        delete NODE_TYPE_LABELS[key];
    }

    Object.assign(NODE_TYPE_LABELS, nextLabels);
    return NODE_TYPE_LABELS;
}

export async function loadNodeTypeLabels(): Promise<Record<string, string>> {
    const types = await nodeTypeStorage.getAll();
    return applyNodeTypeLabels(types);
}

/** Resolver label de tipo para cualquier string (NodeType, DashboardType, o 'none') */
export function resolveTypeLabel(type: string | undefined, labels: Record<string, string> = NODE_TYPE_LABELS): string {
    if (!type || type === 'none') return '—';
    return labels[type] ?? type;
}
