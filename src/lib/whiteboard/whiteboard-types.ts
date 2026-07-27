export type WhiteboardTool =
  | 'select'
  | 'rectangle'
  | 'circle'
  | 'diamond'
  | 'cylinder'
  | 'arrow'
  | 'line'
  | 'sticky'
  | 'pencil'
  | 'text'
  | 'frame'
  | 'badge'
  | 'cloud'
  | 'eraser'
  | 'diagram'
  | 'comment';

export type WhiteboardColor = 'blue' | 'green' | 'amber' | 'purple' | 'rose' | 'gray';

export type CloudIconKind = string;

export type ResizeHandle = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br';

export type LineStyle = 'solid' | 'dashed' | 'dotted' | 'dash-dot';

export type ArrowheadStyle = 'arrow' | 'triangle' | 'diamond' | 'circle' | 'none';

export type RoutingStyle = 'orthogonal' | 'straight' | 'curved';

export type PortDirection = 'top' | 'bottom' | 'left' | 'right';

export interface Point {
  x: number;
  y: number;
}

export interface BaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor?: string;
  strokeWidth: number;
  groupId?: string;
  label?: string;
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  cornerRadius?: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
}

export interface DiamondElement extends BaseElement {
  type: 'diamond';
}

export interface CylinderElement extends BaseElement {
  type: 'cylinder';
}

export interface ArrowElement extends BaseElement {
  type: 'arrow';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  routingStyle?: RoutingStyle;
  lineStyle?: LineStyle;
  arrowheadStyle?: ArrowheadStyle;
  startArrowheadStyle?: ArrowheadStyle;
  arrowheadColor?: string;
  label?: string;
  labelFontSize?: number;
  labelFontFamily?: string;
  labelColor?: string;
  fromElementId?: string;
  fromPort?: PortDirection;
  toElementId?: string;
  toPort?: PortDirection;
  waypoint?: Point;
  isAnimated?: boolean;
}

export interface LineElement extends BaseElement {
  type: 'line';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  routingStyle?: RoutingStyle;
  lineStyle?: LineStyle;
  label?: string;
  labelFontSize?: number;
  labelFontFamily?: string;
  labelColor?: string;
  fromElementId?: string;
  fromPort?: PortDirection;
  toElementId?: string;
  toPort?: PortDirection;
  waypoint?: Point;
  isAnimated?: boolean;
}

export interface StickyElement extends BaseElement {
  type: 'sticky';
  text: string;
  color: WhiteboardColor;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
}

export interface PencilElement extends BaseElement {
  type: 'pencil';
  points: Point[];
  strokePoints?: number[][];
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
}

export interface FrameElement extends BaseElement {
  type: 'frame';
  title: string;
  frameColor?: string;
  frameBg?: string;
}

export interface BadgeElement extends BaseElement {
  type: 'badge';
  number: number;
  color: WhiteboardColor;
}

export interface CloudIconElement extends BaseElement {
  type: 'cloud';
  iconKind: CloudIconKind;
}

export interface DiagramElement extends BaseElement {
  type: 'diagram';
  diagramId: string;
}

export interface CommentElement extends BaseElement {
  type: 'comment';
  text: string;
  author: string;
  resolved: boolean;
  color: WhiteboardColor;
}

export type WhiteboardElement =
  | RectangleElement
  | CircleElement
  | DiamondElement
  | CylinderElement
  | ArrowElement
  | LineElement
  | StickyElement
  | PencilElement
  | TextElement
  | FrameElement
  | BadgeElement
  | CloudIconElement
  | DiagramElement
  | CommentElement;

export const WHITEBOARD_COLORS: Record<
  WhiteboardColor,
  { bg: string; border: string; text: string }
> = {
  blue: { bg: 'rgba(59, 130, 246, 0.12)', border: '#3b82f6', text: 'var(--foreground)' },
  green: { bg: 'rgba(34, 197, 94, 0.12)', border: '#22c55e', text: 'var(--foreground)' },
  amber: { bg: 'rgba(245, 158, 11, 0.12)', border: '#f59e0b', text: 'var(--foreground)' },
  purple: { bg: 'rgba(168, 85, 247, 0.12)', border: '#a855f7', text: 'var(--foreground)' },
  rose: { bg: 'rgba(244, 63, 94, 0.12)', border: '#f43f5e', text: 'var(--foreground)' },
  gray: { bg: 'rgba(107, 114, 128, 0.12)', border: '#6b7280', text: 'var(--foreground)' },
};

export const  LINE_DASH: Record<LineStyle, string> = {
  solid: '',
  dashed: '8 4',
  dotted: '2 4',
  'dash-dot': '8 4 2 4',
};

export function isConnectorElement(el: WhiteboardElement): el is ArrowElement | LineElement {
  return el.type === 'arrow' || el.type === 'line';
}

/** Compute the 4 cardinal port positions for any element. */
export interface PortPosition {
  port: PortDirection;
  x: number;
  y: number;
}

export function getShapePorts(el: WhiteboardElement): PortPosition[] {
  return [
    { port: 'top', x: el.x + el.width / 2, y: el.y },
    { port: 'bottom', x: el.x + el.width / 2, y: el.y + el.height },
    { port: 'left', x: el.x, y: el.y + el.height / 2 },
    { port: 'right', x: el.x + el.width, y: el.y + el.height / 2 },
  ];
}

export function getElementBounds(el: WhiteboardElement): { x: number; y: number; width: number; height: number } {
  if (isConnectorElement(el)) {
    const minX = Math.min(el.startX, el.endX);
    const minY = Math.min(el.startY, el.endY);
    const w = Math.max(10, Math.abs(el.endX - el.startX));
    const h = Math.max(10, Math.abs(el.endY - el.startY));
    return { x: minX, y: minY, width: w, height: h };
  }
  return { x: el.x, y: el.y, width: el.width, height: el.height };
}
