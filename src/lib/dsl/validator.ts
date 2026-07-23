import type { DiagramAST } from './ast';
import { resolveIconName, ICON_NAMES } from '../render/node-style';

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationError {
  message: string;
  line?: number;
  severity: ValidationSeverity;
}

export function validate(ast: DiagramAST): ValidationError[] {
  const errors: ValidationError[] = [];

  if (ast.type === 'unknown') {
    errors.push({
      message: "Unknown diagram type. First line must be 'flowchart' or 'sequence-diagram'.",
      severity: 'error',
    });
  }

  const seen = new Set<string>();
  for (const node of ast.nodes) {
    if (!node.id) {
      errors.push({ message: 'Node has an empty name.', line: node.line, severity: 'error' });
      continue;
    }
    if (seen.has(node.id)) {
      errors.push({
        message: `Duplicate node "${node.id}".`,
        line: node.line,
        severity: 'error',
      });
    }
    seen.add(node.id);

    // Unknown icon names are non-blocking — the diagram still renders
    // fine without the icon, so this is a hint, not a hard failure.
    if (node.attrs.icon && resolveIconName(node.attrs.icon) === null) {
      errors.push({
        message: `Unknown icon "${node.attrs.icon}". Supported: ${ICON_NAMES.join(', ')}.`,
        line: node.line,
        severity: 'warning',
      });
    }
  }

  const nodeIds = new Set(ast.nodes.map((n) => n.id));
  for (const edge of ast.edges) {
    if (!nodeIds.has(edge.from)) {
      errors.push({
        message: `Edge references unknown node "${edge.from}".`,
        line: edge.line,
        severity: 'error',
      });
    }
    if (!nodeIds.has(edge.to)) {
      errors.push({
        message: `Edge references unknown node "${edge.to}".`,
        line: edge.line,
        severity: 'error',
      });
    }
  }

  return errors;
}