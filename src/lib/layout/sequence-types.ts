export interface LaidOutActor {
  id: string;
  label: string;
  x: number;
  width: number;
}

export interface LaidOutMessage {
  from: string;
  to: string;
  label?: string;
  arrowType: 'sync' | 'async';
  y: number;
}

export interface SequenceLayoutResult {
  actors: LaidOutActor[];
  messages: LaidOutMessage[];
  width: number;
  height: number;
}