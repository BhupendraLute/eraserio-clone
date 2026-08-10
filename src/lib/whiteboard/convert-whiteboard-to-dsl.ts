import type { WhiteboardElement, CloudIconElement } from '@/lib/whiteboard/whiteboard-types';
import { isConnectorElement } from '@/lib/whiteboard/whiteboard-types';

function cleanIdentifier(str: string, fallback: string): string {
  if (!str) return fallback;
  const cleaned = str.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/^_+|_+$/g, '');
  return cleaned || fallback;
}

function hexToDslColor(hex?: string): string {
  if (!hex) return 'blue';
  const lower = hex.toLowerCase();
  if (lower.includes('3b82f6') || lower.includes('blue')) return 'blue';
  if (lower.includes('22c55e') || lower.includes('green')) return 'green';
  if (lower.includes('a855f7') || lower.includes('purple')) return 'purple';
  if (lower.includes('f59e0b') || lower.includes('f97316') || lower.includes('amber')) return 'amber';
  if (lower.includes('f43f5e') || lower.includes('red') || lower.includes('rose')) return 'rose';
  if (lower.includes('6b7280') || lower.includes('gray')) return 'gray';
  return 'blue';
}

function extractIconName(iconKind?: string): string {
  if (!iconKind) return 'box';
  const lower = iconKind.toLowerCase();
  if (lower.includes('redis')) return 'redis';
  if (lower.includes('postgres') || lower.includes('sql')) return 'postgres';
  if (lower.includes('mongo')) return 'mongo';
  if (lower.includes('db') || lower.includes('database')) return 'database';
  if (lower.includes('user') || lower.includes('device')) return 'user';
  if (lower.includes('gateway') || lower.includes('api')) return 'cloud';
  if (lower.includes('auth') || lower.includes('shield') || lower.includes('lock')) return 'shield';
  if (lower.includes('queue') || lower.includes('sqs')) return 'queue';
  if (lower.includes('kafka')) return 'kafka';
  if (lower.includes('docker') || lower.includes('k8s')) return 'docker';
  if (lower.includes('s3') || lower.includes('storage')) return 's3';
  if (lower.includes('server')) return 'server';
  return 'box';
}

/**
 * Serializes an array of native `WhiteboardElement` objects into clean Eraser DSL
 * diagram source code (`flowchart...`).
 */
export function convertWhiteboardToDsl(elements: WhiteboardElement[]): string {
  if (!elements || elements.length === 0) return '';

  const nodes = elements.filter(
    (el) =>
      !isConnectorElement(el) &&
      el.type !== 'pencil' &&
      el.type !== 'comment' &&
      el.type !== 'frame'
  );

  if (nodes.length === 0) return '';

  const nodeNameMap = new Map<string, string>();
  const dslLines: string[] = ['flowchart', ''];

  nodes.forEach((n, idx) => {
    const rawLabel = n.label || `Node ${idx + 1}`;
    const name = cleanIdentifier(rawLabel, `Node_${idx + 1}`);
    nodeNameMap.set(n.id, name);

    const color = hexToDslColor(n.strokeColor || n.fillColor);
    const attrs: string[] = [];

    if (n.type === 'cloud' && (n as CloudIconElement).iconKind) {
      const iconName = extractIconName((n as CloudIconElement).iconKind);
      attrs.push(`icon: ${iconName}`);
    } else if (n.type !== 'rectangle') {
      attrs.push(`shape: ${n.type}`);
    }

    attrs.push(`color: ${color}`);

    const attrString = attrs.length > 0 ? ` [${attrs.join(', ')}]` : '';
    dslLines.push(`${name}: ${rawLabel}${attrString}`);
  });

  dslLines.push('');

  const connectors = elements.filter(isConnectorElement);
  connectors.forEach((c) => {
    const fromName = c.fromElementId ? nodeNameMap.get(c.fromElementId) : undefined;
    const toName = c.toElementId ? nodeNameMap.get(c.toElementId) : undefined;

    if (!fromName || !toName) return;

    const op = c.lineStyle === 'dashed' ? '-->' : '>';
    const labelPart = c.label ? `: ${c.label}` : '';
    dslLines.push(`${fromName} ${op} ${toName}${labelPart}`);
  });

  return dslLines.join('\n');
}
