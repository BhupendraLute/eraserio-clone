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
  | 'diagram';

export type WhiteboardColor = 'blue' | 'green' | 'amber' | 'purple' | 'rose' | 'gray';

export type CloudIconKind = string;

export type ResizeHandle = 'tl' | 'tc' | 'tr' | 'ml' | 'mr' | 'bl' | 'bc' | 'br';

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
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
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
  routingStyle?: 'orthogonal' | 'straight';
  fromElementId?: string;
  fromPort?: 'top' | 'bottom' | 'left' | 'right';
  toElementId?: string;
  toPort?: 'top' | 'bottom' | 'left' | 'right';
}

export interface LineElement extends BaseElement {
  type: 'line';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  routingStyle?: 'orthogonal' | 'straight';
  fromElementId?: string;
  fromPort?: 'top' | 'bottom' | 'left' | 'right';
  toElementId?: string;
  toPort?: 'top' | 'bottom' | 'left' | 'right';
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
  | DiagramElement;

export const WHITEBOARD_COLORS: Record<
  WhiteboardColor,
  { bg: string; border: string; text: string }
> = {
  blue: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
  green: { bg: '#dcfce7', border: '#22c55e', text: '#166534' },
  amber: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  purple: { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' },
  rose: { bg: '#ffe4e6', border: '#f43f5e', text: '#9f1239' },
  gray: { bg: '#f3f4f6', border: '#6b7280', text: '#1f2937' },
};
