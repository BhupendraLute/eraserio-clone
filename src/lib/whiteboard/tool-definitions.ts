import type { WhiteboardTool } from './whiteboard-types';
import {
  MousePointer,
  Square,
  Circle,
  MoveRight,
  Minus,
  Pencil,
  Type,
  StickyNote,
  Frame,
  MessageSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ToolDefinition {
  tool: WhiteboardTool;
  label: string;
  shortcut?: string;
  icon: LucideIcon;
}

/** Tools shared between the top toolbar and the side toolbar. */
export const SHARED_TOOLS: ToolDefinition[] = [
  { tool: 'select',    label: 'Select',            shortcut: 'V', icon: MousePointer },
  { tool: 'rectangle', label: 'Rectangle',         shortcut: 'R', icon: Square },
  { tool: 'circle',    label: 'Circle',            shortcut: 'O', icon: Circle },
  { tool: 'arrow',     label: 'Arrow',             shortcut: 'A', icon: MoveRight },
  { tool: 'line',      label: 'Line',              shortcut: 'L', icon: Minus },
  { tool: 'pencil',    label: 'Pencil',            shortcut: 'P', icon: Pencil },
  { tool: 'text',      label: 'Text',              shortcut: 'T', icon: Type },
  { tool: 'sticky',    label: 'Sticky Note',       shortcut: 'N', icon: StickyNote },
  { tool: 'frame',     label: 'Frame',             shortcut: 'F', icon: Frame },
  { tool: 'comment',   label: 'Comment',           shortcut: 'C', icon: MessageSquare },
];
