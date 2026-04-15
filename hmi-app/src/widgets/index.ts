// Barrel export — src/widgets/
// Las páginas y el builder solo importan desde aquí, no de subdirectorios.

export { default as WidgetRenderer } from './WidgetRenderer';

// Resolvers: exportados para permitir uso directo en tests o lógica de preview
export { resolveBinding } from './resolvers/bindingResolver';
export { evaluateThresholds, toCardStatus } from './resolvers/thresholdEvaluator';
export { resolveHierarchyBinding } from './resolvers/hierarchyResolver';
export type { HierarchyContext } from './resolvers/hierarchyResolver';

// Renderers: no se exportan directamente — se consumen vía WidgetRenderer
