import type { HierarchyNode } from '../domain/admin.types';

// =============================================================================
// Utilidad: buildTree
// Convierte una lista plana de nodos (con parentId) en un árbol jerárquico
// para facilitar el renderizado recursivo del HierarchyTree.
//
// El almacenamiento subyacente siempre es lista plana; esta función
// solo se utiliza en tiempo de renderizado.
// =============================================================================

export interface HierarchyNodeWithChildren extends HierarchyNode {
    children: HierarchyNodeWithChildren[];
}

/**
 * Transforma una lista plana de nodos en un árbol recursivo.
 * Los nodos se ordenan por su campo `order` en cada nivel.
 */
export function buildTree(nodes: HierarchyNode[]): HierarchyNodeWithChildren[] {
    const nodeMap = new Map<string, HierarchyNodeWithChildren>();

    // 1. Crear mapa con children vacíos
    for (const node of nodes) {
        nodeMap.set(node.id, { ...node, children: [] });
    }

    const roots: HierarchyNodeWithChildren[] = [];

    // 2. Construir relaciones padre-hijo
    for (const node of nodeMap.values()) {
        if (node.parentId === null) {
            roots.push(node);
        } else {
            const parent = nodeMap.get(node.parentId);
            if (parent) {
                parent.children.push(node);
            }
        }
    }

    // 3. Ordenar recursivamente cada nivel por `order`
    const sortLevel = (items: HierarchyNodeWithChildren[]) => {
        items.sort((a, b) => a.order - b.order);
        for (const item of items) {
            if (item.children.length > 0) {
                sortLevel(item.children);
            }
        }
    };

    sortLevel(roots);
    return roots;
}

/**
 * Calcula el breadcrumb (ruta de ancestros) para un nodo dado.
 * Retorna una lista en orden [raíz → ... → nodo].
 */
export function getAncestors(
    nodeId: string,
    nodes: HierarchyNode[]
): HierarchyNode[] {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const path: HierarchyNode[] = [];
    let current = nodeMap.get(nodeId);

    while (current) {
        path.unshift(current);
        current = current.parentId ? nodeMap.get(current.parentId) : undefined;
    }

    return path;
}

export function findNodeInTree(
    nodes: HierarchyNodeWithChildren[],
    nodeId: string
): HierarchyNodeWithChildren | null {
    for (const node of nodes) {
        if (node.id === nodeId) {
            return node;
        }

        const nestedMatch = findNodeInTree(node.children, nodeId);
        if (nestedMatch) {
            return nestedMatch;
        }
    }

    return null;
}

export function filterTreeByName(
    nodes: HierarchyNodeWithChildren[],
    query: string
): HierarchyNodeWithChildren[] {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
        return nodes;
    }

    return nodes.reduce<HierarchyNodeWithChildren[]>((acc, node) => {
        const filteredChildren = filterTreeByName(node.children, normalizedQuery);
        const matchesNode = node.name.toLocaleLowerCase().includes(normalizedQuery);

        if (!matchesNode && filteredChildren.length === 0) {
            return acc;
        }

        acc.push({
            ...node,
            children: matchesNode ? node.children : filteredChildren,
        });

        return acc;
    }, []);
}

export function treeContainsNodeId(
    nodes: HierarchyNodeWithChildren[],
    nodeId: string
): boolean {
    return findNodeInTree(nodes, nodeId) !== null;
}
