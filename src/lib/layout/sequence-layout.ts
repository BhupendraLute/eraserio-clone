import type { DiagramAST } from '../dsl/ast';
import { measureTextWidth } from './text-measure';
import { NODE_FONT } from '../render/text-style';
import type { SequenceLayoutResult, LaidOutActor, LaidOutMessage } from './sequence-types';

const ACTOR_MIN_WIDTH = 90;
const ACTOR_PADDING_X = 24;
const ACTOR_GAP = 90;
const HEADER_HEIGHT = 50;
const MESSAGE_GAP = 55;
const TOP_MARGIN = 20;
const BOTTOM_MARGIN = 30;

export function sequenceLayout(ast: DiagramAST): SequenceLayoutResult {
  const actorWidths = ast.nodes.map((n) =>
    Math.max(ACTOR_MIN_WIDTH, measureTextWidth(n.label, NODE_FONT) + ACTOR_PADDING_X)
  );

  const actors: LaidOutActor[] = [];
  let cursorX = TOP_MARGIN;
  ast.nodes.forEach((node, i) => {
    const width = actorWidths[i];
    const x = cursorX + width / 2;
    actors.push({ id: node.id, label: node.label, x, width });
    cursorX += width + ACTOR_GAP;
  });

  const totalWidth = Math.max(200, cursorX - ACTOR_GAP + TOP_MARGIN);

  const messages: LaidOutMessage[] = ast.edges.map((edge, i) => ({
    from: edge.from,
    to: edge.to,
    label: edge.label,
    arrowType: edge.arrowType,
    y: HEADER_HEIGHT + TOP_MARGIN + (i + 0.5) * MESSAGE_GAP,
  }));

  const totalHeight =
    HEADER_HEIGHT + TOP_MARGIN + Math.max(1, ast.edges.length) * MESSAGE_GAP + BOTTOM_MARGIN;

  return { actors, messages, width: totalWidth, height: totalHeight };
}