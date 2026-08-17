/**
 * Types and data contracts for Real-time Collaboration Engine
 */

export interface CursorPosition {
  x: number;
  y: number;
}

export interface UserColor {
  hex: string;
  name: string;
  bgLight: string;
  borderHex: string;
}

export const COLLABORATOR_COLORS: UserColor[] = [
  { hex: '#ef4444', name: 'Red', bgLight: 'rgba(239, 68, 68, 0.15)', borderHex: '#f87171' },
  { hex: '#3b82f6', name: 'Blue', bgLight: 'rgba(59, 130, 246, 0.15)', borderHex: '#60a5fa' },
  { hex: '#10b981', name: 'Emerald', bgLight: 'rgba(16, 185, 129, 0.15)', borderHex: '#34d399' },
  { hex: '#f59e0b', name: 'Amber', bgLight: 'rgba(245, 158, 11, 0.15)', borderHex: '#fbbf24' },
  { hex: '#8b5cf6', name: 'Purple', bgLight: 'rgba(139, 92, 246, 0.15)', borderHex: '#a78bfa' },
  { hex: '#ec4899', name: 'Pink', bgLight: 'rgba(236, 72, 153, 0.15)', borderHex: '#f472b6' },
  { hex: '#06b6d4', name: 'Cyan', bgLight: 'rgba(6, 182, 212, 0.15)', borderHex: '#22d3ee' },
  { hex: '#f97316', name: 'Orange', bgLight: 'rgba(249, 115, 22, 0.15)', borderHex: '#fb923c' },
];

export function getCollaboratorColor(userIdOrSeed: string): UserColor {
  let hash = 0;
  for (let i = 0; i < userIdOrSeed.length; i++) {
    hash = (hash << 5) - hash + userIdOrSeed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COLLABORATOR_COLORS.length;
  return COLLABORATOR_COLORS[index];
}

export interface CollaboratorPresence {
  id: string;
  name: string;
  email?: string;
  image?: string;
  color: UserColor;
  cursor: CursorPosition | null;
  selectedElementIds: string[];
  activeTool?: string;
  lastActive: number;
}

export type CollaborationMessageType =
  | 'PRESENCE_SNAPSHOT'
  | 'CURSOR_MOVE'
  | 'SELECTION_CHANGE'
  | 'WHITEBOARD_UPDATE'
  | 'DIAGRAM_UPDATE'
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'PING'
  | 'PONG';

export interface BaseMessage {
  type: CollaborationMessageType;
  senderId: string;
  documentId: string;
  timestamp: number;
}

export interface PresenceSnapshotMessage extends BaseMessage {
  type: 'PRESENCE_SNAPSHOT';
  collaborators: CollaboratorPresence[];
}

export interface CursorMoveMessage extends BaseMessage {
  type: 'CURSOR_MOVE';
  cursor: CursorPosition | null;
}

export interface SelectionChangeMessage extends BaseMessage {
  type: 'SELECTION_CHANGE';
  selectedElementIds: string[];
}

export interface WhiteboardUpdateMessage extends BaseMessage {
  type: 'WHITEBOARD_UPDATE';
  elements: unknown[];
  action?: 'add' | 'update' | 'delete' | 'full';
}

export interface DiagramUpdateMessage extends BaseMessage {
  type: 'DIAGRAM_UPDATE';
  source: string;
}

export interface UserJoinedMessage extends BaseMessage {
  type: 'USER_JOINED';
  user: CollaboratorPresence;
}

export interface UserLeftMessage extends BaseMessage {
  type: 'USER_LEFT';
  userId: string;
}

export interface PingMessage extends BaseMessage {
  type: 'PING';
}

export type CollaborationMessage =
  | PresenceSnapshotMessage
  | CursorMoveMessage
  | SelectionChangeMessage
  | WhiteboardUpdateMessage
  | DiagramUpdateMessage
  | UserJoinedMessage
  | UserLeftMessage
  | PingMessage;
