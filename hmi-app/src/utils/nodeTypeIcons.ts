import type { LucideIcon } from 'lucide-react';
import {
    Box,
    CircleDot,
    Container,
    Cpu,
    Droplets,
    Factory,
    Flame,
    Folder,
    Gauge,
    Grid3X3,
    Layers,
    Minus,
    Settings,
    Square,
    Users,
    Wrench,
    Zap,
} from 'lucide-react';

export interface NodeTypeIconDefinition {
    component: LucideIcon;
    defaultColor: string;
}

export const AVAILABLE_NODE_ICONS: Record<string, NodeTypeIconDefinition> = {
    factory: { component: Factory, defaultColor: 'text-accent-cyan' },
    layers: { component: Layers, defaultColor: 'text-accent-blue' },
    grid: { component: Grid3X3, defaultColor: 'text-accent-blue-glow' },
    minus: { component: Minus, defaultColor: 'text-accent-purple-light' },
    square: { component: Square, defaultColor: 'text-accent-purple' },
    box: { component: Box, defaultColor: 'text-accent-amber' },
    cpu: { component: Cpu, defaultColor: 'text-accent-green' },
    folder: { component: Folder, defaultColor: 'text-accent-amber' },
    users: { component: Users, defaultColor: 'text-accent-pink' },
    droplets: { component: Droplets, defaultColor: 'text-accent-blue' },
    flame: { component: Flame, defaultColor: 'text-status-critical' },
    zap: { component: Zap, defaultColor: 'text-status-warning' },
    circle: { component: CircleDot, defaultColor: 'text-accent-cyan' },
    container: { component: Container, defaultColor: 'text-accent-blue' },
    gauge: { component: Gauge, defaultColor: 'text-accent-green' },
    wrench: { component: Wrench, defaultColor: 'text-industrial-muted' },
    settings: { component: Settings, defaultColor: 'text-industrial-muted' },
};

export const DEFAULT_ICON_KEY = 'square';

export const NODE_TYPE_COLOR_OPTIONS = [
    'text-accent-cyan',
    'text-accent-blue',
    'text-accent-blue-glow',
    'text-accent-purple-light',
    'text-accent-purple',
    'text-accent-amber',
    'text-accent-green',
    'text-accent-pink',
    'text-status-warning',
    'text-status-critical',
    'text-industrial-muted',
];
