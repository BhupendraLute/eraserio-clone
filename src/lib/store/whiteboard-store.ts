import { create } from 'zustand';
import type {
  WhiteboardTool,
  WhiteboardColor,
  CloudIconKind,
  ResizeHandle,
  WhiteboardElement,
} from '@/lib/whiteboard/whiteboard-types';

interface HistoryState {
  elements: WhiteboardElement[];
}

function getOptimalPortPair(fromEl: WhiteboardElement, toEl: WhiteboardElement) {
  const portsA: { port: 'top' | 'bottom' | 'left' | 'right'; x: number; y: number }[] = [
    { port: 'top', x: fromEl.x + fromEl.width / 2, y: fromEl.y },
    { port: 'bottom', x: fromEl.x + fromEl.width / 2, y: fromEl.y + fromEl.height },
    { port: 'left', x: fromEl.x, y: fromEl.y + fromEl.height / 2 },
    { port: 'right', x: fromEl.x + fromEl.width, y: fromEl.y + fromEl.height / 2 },
  ];

  const portsB: { port: 'top' | 'bottom' | 'left' | 'right'; x: number; y: number }[] = [
    { port: 'top', x: toEl.x + toEl.width / 2, y: toEl.y },
    { port: 'bottom', x: toEl.x + toEl.width / 2, y: toEl.y + toEl.height },
    { port: 'left', x: toEl.x, y: toEl.y + toEl.height / 2 },
    { port: 'right', x: toEl.x + toEl.width, y: toEl.y + toEl.height / 2 },
  ];

  let bestPair = {
    fromPort: portsA[1].port,
    fromPos: { x: portsA[1].x, y: portsA[1].y },
    toPort: portsB[0].port,
    toPos: { x: portsB[0].x, y: portsB[0].y },
    minDist: Infinity,
  };

  portsA.forEach((pA) => {
    portsB.forEach((pB) => {
      const dist = Math.hypot(pB.x - pA.x, pB.y - pA.y);
      if (dist < bestPair.minDist) {
        bestPair = {
          fromPort: pA.port,
          fromPos: { x: pA.x, y: pA.y },
          toPort: pB.port,
          toPos: { x: pB.x, y: pB.y },
          minDist: dist,
        };
      }
    });
  });

  return bestPair;
}

interface WhiteboardStore {
  activeTool: WhiteboardTool;
  activeColor: WhiteboardColor;
  activeCloudIcon: CloudIconKind;
  activeStrokeWidth: number;
  elements: WhiteboardElement[];
  selectedIds: string[];
  history: HistoryState[];
  future: HistoryState[];

  setActiveTool: (tool: WhiteboardTool) => void;
  setActiveColor: (color: WhiteboardColor) => void;
  setActiveCloudIcon: (icon: CloudIconKind) => void;
  setActiveStrokeWidth: (width: number) => void;

  addElement: (element: WhiteboardElement) => void;
  updateElement: (id: string, patch: Partial<WhiteboardElement>) => void;
  deleteElements: (ids: string[]) => void;
  setSelectedIds: (ids: string[]) => void;
  clearSelection: () => void;
  moveSelectedElements: (dx: number, dy: number) => void;
  resizeElement: (id: string, handle: ResizeHandle, dx: number, dy: number) => void;

  bringToFront: () => void;
  sendToBack: () => void;
  alignLeft: () => void;
  alignCenter: () => void;
  alignRight: () => void;

  spawnConnectedNode: (sourceId: string, direction: 'top' | 'right' | 'bottom' | 'left') => void;
  reconnectArrowEndpoint: (
    arrowId: string,
    endpoint: 'start' | 'end',
    targetPos: { x: number; y: number },
    targetElementId?: string,
    targetPort?: 'top' | 'bottom' | 'left' | 'right'
  ) => void;

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const useWhiteboardStore = create<WhiteboardStore>((set) => ({
  activeTool: 'select',
  activeColor: 'blue',
  activeCloudIcon: 'iconify-aws-ec2',
  activeStrokeWidth: 2,
  elements: [],
  selectedIds: [],
  history: [],
  future: [],

  canUndo: false,
  canRedo: false,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setActiveColor: (color) => set({ activeColor: color }),
  setActiveCloudIcon: (icon) => set({ activeCloudIcon: icon }),
  setActiveStrokeWidth: (width) => set({ activeStrokeWidth: width }),

  addElement: (element) =>
    set((state) => {
      const newHistory = [...state.history, { elements: state.elements }];
      return {
        history: newHistory,
        future: [],
        elements: [...state.elements, element],
        canUndo: true,
        canRedo: false,
      };
    }),

  updateElement: (id, patch) =>
    set((state) => {
      const newHistory = [...state.history, { elements: state.elements }];
      return {
        history: newHistory,
        future: [],
        elements: state.elements.map((el) =>
          el.id === id ? ({ ...el, ...patch } as WhiteboardElement) : el
        ),
        canUndo: true,
        canRedo: false,
      };
    }),

  deleteElements: (ids) =>
    set((state) => {
      const newHistory = [...state.history, { elements: state.elements }];
      return {
        history: newHistory,
        future: [],
        elements: state.elements.filter((el) => !ids.includes(el.id)),
        selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
        canUndo: true,
        canRedo: false,
      };
    }),

  setSelectedIds: (selectedIds) => set({ selectedIds }),
  clearSelection: () => set({ selectedIds: [] }),

  moveSelectedElements: (dx, dy) =>
    set((state) => {
      // 1. Move shapes and un-connected elements
      const updatedElements = state.elements.map((el) => {
        if (!state.selectedIds.includes(el.id)) return el;
        if (el.type === 'arrow' || el.type === 'line') {
          return {
            ...el,
            x: el.x + dx,
            y: el.y + dy,
            startX: el.startX + dx,
            startY: el.startY + dy,
            endX: el.endX + dx,
            endY: el.endY + dy,
          };
        }
        return {
          ...el,
          x: el.x + dx,
          y: el.y + dy,
        };
      });

      // 2. Dynamically re-calculate connection ports & paths in real time as shapes move
      const finalElements = updatedElements.map((el) => {
        if (el.type !== 'arrow' && el.type !== 'line') return el;

        const fromEl = el.fromElementId ? updatedElements.find((item) => item.id === el.fromElementId) : undefined;
        const toEl = el.toElementId ? updatedElements.find((item) => item.id === el.toElementId) : undefined;

        if (fromEl && toEl) {
          const optimal = getOptimalPortPair(fromEl, toEl);
          return {
            ...el,
            startX: optimal.fromPos.x,
            startY: optimal.fromPos.y,
            endX: optimal.toPos.x,
            endY: optimal.toPos.y,
            fromPort: optimal.fromPort,
            toPort: optimal.toPort,
          };
        } else if (fromEl) {
          const port = el.fromPort || 'bottom';
          let px = fromEl.x + fromEl.width / 2;
          let py = fromEl.y + fromEl.height;
          if (port === 'top') { px = fromEl.x + fromEl.width / 2; py = fromEl.y; }
          else if (port === 'left') { px = fromEl.x; py = fromEl.y + fromEl.height / 2; }
          else if (port === 'right') { px = fromEl.x + fromEl.width; py = fromEl.y + fromEl.height / 2; }

          return { ...el, startX: px, startY: py };
        } else if (toEl) {
          const port = el.toPort || 'top';
          let px = toEl.x + toEl.width / 2;
          let py = toEl.y;
          if (port === 'bottom') { px = toEl.x + toEl.width / 2; py = toEl.y + toEl.height; }
          else if (port === 'left') { px = toEl.x; py = toEl.y + toEl.height / 2; }
          else if (port === 'right') { px = toEl.x + toEl.width; py = toEl.y + toEl.height / 2; }

          return { ...el, endX: px, endY: py };
        }

        return el;
      });

      return { elements: finalElements };
    }),

  resizeElement: (id, handle, dx, dy) =>
    set((state) => {
      const updatedElements = state.elements.map((el) => {
        if (el.id !== id) return el;
        let newX = el.x;
        let newY = el.y;
        let newW = el.width;
        let newH = el.height;

        if (handle.includes('r')) newW = Math.max(20, el.width + dx);
        if (handle.includes('l')) {
          const possibleW = el.width - dx;
          if (possibleW >= 20) {
            newX = el.x + dx;
            newW = possibleW;
          }
        }
        if (handle.includes('b')) newH = Math.max(20, el.height + dy);
        if (handle.includes('t')) {
          const possibleH = el.height - dy;
          if (possibleH >= 20) {
            newY = el.y + dy;
            newH = possibleH;
          }
        }

        return {
          ...el,
          x: newX,
          y: newY,
          width: newW,
          height: newH,
        };
      });

      // Re-calculate optimal port routing after shape resize
      const finalElements = updatedElements.map((el) => {
        if (el.type !== 'arrow' && el.type !== 'line') return el;

        const fromEl = el.fromElementId ? updatedElements.find((item) => item.id === el.fromElementId) : undefined;
        const toEl = el.toElementId ? updatedElements.find((item) => item.id === el.toElementId) : undefined;

        if (fromEl && toEl) {
          const optimal = getOptimalPortPair(fromEl, toEl);
          return {
            ...el,
            startX: optimal.fromPos.x,
            startY: optimal.fromPos.y,
            endX: optimal.toPos.x,
            endY: optimal.toPos.y,
            fromPort: optimal.fromPort,
            toPort: optimal.toPort,
          };
        } else if (fromEl) {
          const port = el.fromPort || 'bottom';
          let px = fromEl.x + fromEl.width / 2;
          let py = fromEl.y + fromEl.height;
          if (port === 'top') { px = fromEl.x + fromEl.width / 2; py = fromEl.y; }
          else if (port === 'left') { px = fromEl.x; py = fromEl.y + fromEl.height / 2; }
          else if (port === 'right') { px = fromEl.x + fromEl.width; py = fromEl.y + fromEl.height / 2; }

          return { ...el, startX: px, startY: py };
        } else if (toEl) {
          const port = el.toPort || 'top';
          let px = toEl.x + toEl.width / 2;
          let py = toEl.y;
          if (port === 'bottom') { px = toEl.x + toEl.width / 2; py = toEl.y + toEl.height; }
          else if (port === 'left') { px = toEl.x; py = toEl.y + toEl.height / 2; }
          else if (port === 'right') { px = toEl.x + toEl.width; py = toEl.y + toEl.height / 2; }

          return { ...el, endX: px, endY: py };
        }

        return el;
      });

      return { elements: finalElements };
    }),

  bringToFront: () =>
    set((state) => {
      const selected = state.elements.filter((el) => state.selectedIds.includes(el.id));
      const unselected = state.elements.filter((el) => !state.selectedIds.includes(el.id));
      return { elements: [...unselected, ...selected] };
    }),

  sendToBack: () =>
    set((state) => {
      const selected = state.elements.filter((el) => state.selectedIds.includes(el.id));
      const unselected = state.elements.filter((el) => !state.selectedIds.includes(el.id));
      return { elements: [...selected, ...unselected] };
    }),

  alignLeft: () =>
    set((state) => {
      if (state.selectedIds.length <= 1) return state;
      const selected = state.elements.filter((el) => state.selectedIds.includes(el.id));
      const minX = Math.min(...selected.map((el) => el.x));
      return {
        elements: state.elements.map((el) =>
          state.selectedIds.includes(el.id) ? { ...el, x: minX } : el
        ),
      };
    }),

  alignCenter: () =>
    set((state) => {
      if (state.selectedIds.length <= 1) return state;
      const selected = state.elements.filter((el) => state.selectedIds.includes(el.id));
      const avgX = selected.reduce((sum, el) => sum + el.x + el.width / 2, 0) / selected.length;
      return {
        elements: state.elements.map((el) =>
          state.selectedIds.includes(el.id) ? { ...el, x: avgX - el.width / 2 } : el
        ),
      };
    }),

  alignRight: () =>
    set((state) => {
      if (state.selectedIds.length <= 1) return state;
      const selected = state.elements.filter((el) => state.selectedIds.includes(el.id));
      const maxRight = Math.max(...selected.map((el) => el.x + el.width));
      return {
        elements: state.elements.map((el) =>
          state.selectedIds.includes(el.id) ? { ...el, x: maxRight - el.width } : el
        ),
      };
    }),

  spawnConnectedNode: (sourceId, direction) =>
    set((state) => {
      const sourceEl = state.elements.find((el) => el.id === sourceId);
      if (!sourceEl) return state;

      const gap = 120;
      let newX = sourceEl.x;
      let newY = sourceEl.y;
      let fromPort: 'top' | 'bottom' | 'left' | 'right' = 'right';
      let toPort: 'top' | 'bottom' | 'left' | 'right' = 'left';

      if (direction === 'right') {
        newX = sourceEl.x + sourceEl.width + gap;
        newY = sourceEl.y;
        fromPort = 'right';
        toPort = 'left';
      } else if (direction === 'left') {
        newX = sourceEl.x - sourceEl.width - gap;
        newY = sourceEl.y;
        fromPort = 'left';
        toPort = 'right';
      } else if (direction === 'bottom') {
        newX = sourceEl.x;
        newY = sourceEl.y + sourceEl.height + gap;
        fromPort = 'bottom';
        toPort = 'top';
      } else if (direction === 'top') {
        newX = sourceEl.x;
        newY = sourceEl.y - sourceEl.height - gap;
        fromPort = 'top';
        toPort = 'bottom';
      }

      const newShapeId = `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const arrowId = `el-${Date.now() + 1}-${Math.random().toString(36).slice(2, 6)}`;

      // Create new shape cloned from source style
      const newShape: WhiteboardElement = {
        ...sourceEl,
        id: newShapeId,
        x: newX,
        y: newY,
      };

      // Calculate exact port coordinates
      const portsA: Record<string, { x: number; y: number }> = {
        top: { x: sourceEl.x + sourceEl.width / 2, y: sourceEl.y },
        bottom: { x: sourceEl.x + sourceEl.width / 2, y: sourceEl.y + sourceEl.height },
        left: { x: sourceEl.x, y: sourceEl.y + sourceEl.height / 2 },
        right: { x: sourceEl.x + sourceEl.width, y: sourceEl.y + sourceEl.height / 2 },
      };

      const portsB: Record<string, { x: number; y: number }> = {
        top: { x: newShape.x + newShape.width / 2, y: newShape.y },
        bottom: { x: newShape.x + newShape.width / 2, y: newShape.y + newShape.height },
        left: { x: newShape.x, y: newShape.y + newShape.height / 2 },
        right: { x: newShape.x + newShape.width, y: newShape.y + newShape.height / 2 },
      };

      const startPos = portsA[fromPort];
      const endPos = portsB[toPort];

      const newArrow: WhiteboardElement = {
        id: arrowId,
        type: 'arrow',
        x: Math.min(startPos.x, endPos.x),
        y: Math.min(startPos.y, endPos.y),
        width: Math.abs(endPos.x - startPos.x) || 10,
        height: Math.abs(endPos.y - startPos.y) || 10,
        startX: startPos.x,
        startY: startPos.y,
        endX: endPos.x,
        endY: endPos.y,
        routingStyle: 'orthogonal',
        fromElementId: sourceEl.id,
        fromPort,
        toElementId: newShapeId,
        toPort,
        strokeColor: sourceEl.strokeColor,
        strokeWidth: sourceEl.strokeWidth || 2,
      };

      const newHistory = [...state.history, { elements: state.elements }];

      return {
        history: newHistory,
        future: [],
        elements: [...state.elements, newShape, newArrow],
        selectedIds: [newShapeId],
        canUndo: true,
        canRedo: false,
      };
    }),

  reconnectArrowEndpoint: (arrowId, endpoint, targetPos, targetElementId, targetPort) =>
    set((state) => {
      const updatedElements = state.elements.map((el) => {
        if (el.id !== arrowId || (el.type !== 'arrow' && el.type !== 'line')) return el;

        if (endpoint === 'start') {
          return {
            ...el,
            startX: targetPos.x,
            startY: targetPos.y,
            fromElementId: targetElementId,
            fromPort: targetPort,
          };
        } else {
          return {
            ...el,
            endX: targetPos.x,
            endY: targetPos.y,
            toElementId: targetElementId,
            toPort: targetPort,
          };
        }
      });

      // Recalculate optimal ports if both endpoints are connected
      const finalElements = updatedElements.map((el) => {
        if (el.type !== 'arrow' && el.type !== 'line') return el;
        if (el.fromElementId && el.toElementId) {
          const fromEl = updatedElements.find((item) => item.id === el.fromElementId);
          const toEl = updatedElements.find((item) => item.id === el.toElementId);
          if (fromEl && toEl) {
            const optimal = getOptimalPortPair(fromEl, toEl);
            return {
              ...el,
              startX: optimal.fromPos.x,
              startY: optimal.fromPos.y,
              endX: optimal.toPos.x,
              endY: optimal.toPos.y,
              fromPort: optimal.fromPort,
              toPort: optimal.toPort,
            };
          }
        }
        return el;
      });

      const newHistory = [...state.history, { elements: state.elements }];
      return {
        history: newHistory,
        future: [],
        elements: finalElements,
        canUndo: true,
        canRedo: false,
      };
    }),

  undo: () =>
    set((state) => {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1];
      const newHistory = state.history.slice(0, -1);
      return {
        history: newHistory,
        future: [{ elements: state.elements }, ...state.future],
        elements: previous.elements,
        canUndo: newHistory.length > 0,
        canRedo: true,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        history: [...state.history, { elements: state.elements }],
        future: newFuture,
        elements: next.elements,
        canUndo: true,
        canRedo: newFuture.length > 0,
      };
    }),
}));
