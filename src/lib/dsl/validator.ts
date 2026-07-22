import type { DiagramAST } from './ast';

export interface ValidationError {
  message: string;
  line?: number;
}

export function validate(ast: DiagramAST): ValidationError[] {
  const errors: ValidationError[] = [];

  if (ast.type === 'unknown') {
    errors.push({
      message: "Unknown diagram type. First line must be 'flowchart' or 'sequence-diagram'.",
    });
  }

  const seen = new Set<string>();
  for (const node of ast.nodes) {
    if (!node.id) {
      errors.push({ message: 'Node has an empty name.', line: node.line });
      continue;
    }
    if (seen.has(node.id)) {
      errors.push({ message: `Duplicate node "${node.id}".`, line: node.line });
    }
    seen.add(node.id);
  }

  const nodeIds = new Set(ast.nodes.map((n) => n.id));
  for (const edge of ast.edges) {
    if (!nodeIds.has(edge.from)) {
      errors.push({ message: `Edge references unknown node "${edge.from}".`, line: edge.line });
    }
    if (!nodeIds.has(edge.to)) {
      errors.push({ message: `Edge references unknown node "${edge.to}".`, line: edge.line });
    }
  }

  return errors;
}