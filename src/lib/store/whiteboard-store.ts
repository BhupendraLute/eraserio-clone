import { create } from 'zustand';
import type {
  WhiteboardTool,
  WhiteboardColor,
  CloudIconKind,
  ResizeHandle,
  WhiteboardElement,
  LineStyle,
  PortDirection,
} from '@/lib/whiteboard/whiteboard-types';
import { isConnectorElement, getShapePorts } from '@/lib/whiteboard/whiteboard-types';
import { getOptimalPortPair, getOptimalSinglePort } from '@/lib/whiteboard/orthogonal-routing';
import { generateId } from '@/lib/utils';

interface HistoryState {
  elements: WhiteboardElement[];
}

export const GRID_SIZE = 24;

const STORAGE_KEY = 'eraser-whiteboard-elements';

function loadElements(): WhiteboardElement[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveElements(elements: WhiteboardElement[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
  } catch {
    // quota exceeded or SSR — ignore
  }
}

interface WhiteboardStore {
  activeTool: WhiteboardTool;
  activeColor: WhiteboardColor;
  activeCloudIcon: CloudIconKind;
  activeStrokeWidth: number;
  activeLineStyle: LineStyle;
  elements: WhiteboardElement[];
  selectedIds: string[];
  history: HistoryState[];
  future: HistoryState[];
  clipboard: WhiteboardElement[];
  showGrid: boolean;

  setActiveTool: (tool: WhiteboardTool) => void;
  setActiveColor: (color: WhiteboardColor) => void;
  setActiveCloudIcon: (icon: CloudIconKind) => void;
  setActiveStrokeWidth: (width: number) => void;
  setActiveLineStyle: (style: LineStyle) => void;
  setShowGrid: (show: boolean) => void;

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
  alignTop: () => void;
  alignMiddle: () => void;
  alignBottom: () => void;

  duplicateSelected: () => void;
  copyToClipboard: () => void;
  pasteFromClipboard: () => void;

  groupSelected: () => void;
  ungroupSelected: () => void;

  hydrate: () => void;
  toggleResolvedComment: (id: string) => void;

  spawnConnectedNode: (sourceId: string, direction: PortDirection) => void;
  reconnectArrowEndpoint: (
    arrowId: string,
    endpoint: 'start' | 'end',
    targetPos: { x: number; y: number },
    targetElementId?: string,
    targetPort?: PortDirection
  ) => void;

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

function pushHistory(state: { history: HistoryState[]; elements: WhiteboardElement[] }) {
  const newHistory = [...state.history, { elements: state.elements }];
  if (newHistory.length > 100) newHistory.shift();
  return newHistory;
}

export const useWhiteboardStore = create<WhiteboardStore>((set, get) => ({
  activeTool: 'select',
  activeColor: 'blue',
  activeCloudIcon: 'iconify-aws-ec2',
  activeStrokeWidth: 2,
  activeLineStyle: 'solid',
  elements: [],
  selectedIds: [],
  history: [],
  future: [],
  clipboard: [],
  showGrid: true,

  canUndo: false,
  canRedo: false,

  setActiveTool: (tool) => set({ activeTool: tool }),
  setActiveColor: (color) => set({ activeColor: color }),
  setActiveCloudIcon: (icon) => set({ activeCloudIcon: icon }),
  setActiveStrokeWidth: (width) => set({ activeStrokeWidth: width }),
  setActiveLineStyle: (style) => set({ activeLineStyle: style }),
  setShowGrid: (show) => set({ showGrid: show }),

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const stored = loadElements();
    if (stored.length > 0) {
      set({ elements: stored });
    }
  },

  addElement: (element) =>
    set((state) => {
      const history = pushHistory(state);
      const elements = [...state.elements, element];
      saveElements(elements);
      return { history, future: [], elements, canUndo: true, canRedo: false };
    }),

  updateElement: (id, patch) =>
    set((state) => {
      const history = pushHistory(state);
      const elements = state.elements.map((el) =>
        el.id === id ? ({ ...el, ...patch } as WhiteboardElement) : el
      );
      saveElements(elements);
      return { history, future: [], elements, canUndo: true, canRedo: false };
    }),

  deleteElements: (ids) =>
    set((state) => {
      const history = pushHistory(state);
      const elements = state.elements.filter((el) => !ids.includes(el.id));
      saveElements(elements);
      return {
        history,
        future: [],
        elements,
        selectedIds: state.selectedIds.filter((id) => !ids.includes(id)),
        canUndo: true,
        canRedo: false,
      };
    }),

  setSelectedIds: (selectedIds) => set({ selectedIds }),
  clearSelection: () => set({ selectedIds: [] }),

  moveSelectedElements: (dx, dy) =>
    set((state) => {
      const updatedElements = state.elements.map((el) => {
        if (!state.selectedIds.includes(el.id)) return el;
        if (isConnectorElement(el)) {
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
        return { ...el, x: el.x + dx, y: el.y + dy };
      });

      const finalElements = updatedElements.map((el) => {
        if (!isConnectorElement(el)) return el;
        const fromEl = el.fromElementId ? updatedElements.find((item) => item.id === el.fromElementId) : undefined;
        const toEl = el.toElementId ? updatedElements.find((item) => item.id === el.toElementId) : undefined;
        if (fromEl && toEl) {
          const optimal = getOptimalPortPair(fromEl, toEl);
          return { ...el, startX: optimal.fromPos.x, startY: optimal.fromPos.y, endX: optimal.toPos.x, endY: optimal.toPos.y, fromPort: optimal.fromPort, toPort: optimal.toPort };
        } else if (fromEl) {
          const optimal = getOptimalSinglePort(fromEl, { x: el.endX, y: el.endY });
          return { ...el, startX: optimal.x, startY: optimal.y, fromPort: optimal.port };
        } else if (toEl) {
          const optimal = getOptimalSinglePort(toEl, { x: el.startX, y: el.startY });
          return { ...el, endX: optimal.x, endY: optimal.y, toPort: optimal.port };
        }
        return el;
      });

      saveElements(finalElements);
      return { elements: finalElements };
    }),

  resizeElement: (id, handle, dx, dy) =>
    set((state) => {
      const updatedElements = state.elements.map((el) => {
        if (el.id !== id) return el;
        let newX = el.x, newY = el.y, newW = el.width, newH = el.height;
        if (handle.includes('r')) newW = Math.max(20, el.width + dx);
        if (handle.includes('l')) { const w = el.width - dx; if (w >= 20) { newX = el.x + dx; newW = w; } }
        if (handle.includes('b')) newH = Math.max(20, el.height + dy);
        if (handle.includes('t')) { const h = el.height - dy; if (h >= 20) { newY = el.y + dy; newH = h; } }
        return { ...el, x: newX, y: newY, width: newW, height: newH };
      });

      const finalElements = updatedElements.map((el) => {
        if (!isConnectorElement(el)) return el;
        const fromEl = el.fromElementId ? updatedElements.find((item) => item.id === el.fromElementId) : undefined;
        const toEl = el.toElementId ? updatedElements.find((item) => item.id === el.toElementId) : undefined;
        if (fromEl && toEl) {
          const optimal = getOptimalPortPair(fromEl, toEl);
          return { ...el, startX: optimal.fromPos.x, startY: optimal.fromPos.y, endX: optimal.toPos.x, endY: optimal.toPos.y, fromPort: optimal.fromPort, toPort: optimal.toPort };
        } else if (fromEl) {
          const optimal = getOptimalSinglePort(fromEl, { x: el.endX, y: el.endY });
          return { ...el, startX: optimal.x, startY: optimal.y, fromPort: optimal.port };
        } else if (toEl) {
          const optimal = getOptimalSinglePort(toEl, { x: el.startX, y: el.startY });
          return { ...el, endX: optimal.x, endY: optimal.y, toPort: optimal.port };
        }
        return el;
      });

      saveElements(finalElements);
      return { elements: finalElements };
    }),

  bringToFront: () =>
    set((state) => {
      const selected = state.elements.filter((el) => state.selectedIds.includes(el.id));
      const unselected = state.elements.filter((el) => !state.selectedIds.includes(el.id));
      const elements = [...unselected, ...selected];
      saveElements(elements);
      return { elements };
    }),

  sendToBack: () =>
    set((state) => {
      const selected = state.elements.filter((el) => state.selectedIds.includes(el.id));
      const unselected = state.elements.filter((el) => !state.selectedIds.includes(el.id));
      const elements = [...selected, ...unselected];
      saveElements(elements);
      return { elements };
    }),

  alignLeft: () =>
    set((state) => {
      if (state.selectedIds.length <= 1) return state;
      const minX = Math.min(...state.elements.filter((el) => state.selectedIds.includes(el.id)).map((el) => el.x));
      const elements = state.elements.map((el) => state.selectedIds.includes(el.id) ? { ...el, x: minX } : el);
      saveElements(elements);
      return { elements };
    }),

  alignCenter: () =>
    set((state) => {
      if (state.selectedIds.length <= 1) return state;
      const selected = state.elements.filter((el) => state.selectedIds.includes(el.id));
      const avgX = selected.reduce((sum, el) => sum + el.x + el.width / 2, 0) / selected.length;
      const elements = state.elements.map((el) => state.selectedIds.includes(el.id) ? { ...el, x: avgX - el.width / 2 } : el);
      saveElements(elements);
      return { elements };
    }),

  alignRight: () =>
    set((state) => {
      if (state.selectedIds.length <= 1) return state;
      const maxRight = Math.max(...state.elements.filter((el) => state.selectedIds.includes(el.id)).map((el) => el.x + el.width));
      const elements = state.elements.map((el) => state.selectedIds.includes(el.id) ? { ...el, x: maxRight - el.width } : el);
      saveElements(elements);
      return { elements };
    }),

  alignTop: () =>
    set((state) => {
      if (state.selectedIds.length <= 1) return state;
      const minY = Math.min(...state.elements.filter((el) => state.selectedIds.includes(el.id)).map((el) => el.y));
      const elements = state.elements.map((el) => state.selectedIds.includes(el.id) ? { ...el, y: minY } : el);
      saveElements(elements);
      return { elements };
    }),

  alignMiddle: () =>
    set((state) => {
      if (state.selectedIds.length <= 1) return state;
      const selected = state.elements.filter((el) => state.selectedIds.includes(el.id));
      const avgY = selected.reduce((sum, el) => sum + el.y + el.height / 2, 0) / selected.length;
      const elements = state.elements.map((el) => state.selectedIds.includes(el.id) ? { ...el, y: avgY - el.height / 2 } : el);
      saveElements(elements);
      return { elements };
    }),

  alignBottom: () =>
    set((state) => {
      if (state.selectedIds.length <= 1) return state;
      const maxBottom = Math.max(...state.elements.filter((el) => state.selectedIds.includes(el.id)).map((el) => el.y + el.height));
      const elements = state.elements.map((el) => state.selectedIds.includes(el.id) ? { ...el, y: maxBottom - el.height } : el);
      saveElements(elements);
      return { elements };
    }),

  duplicateSelected: () =>
    set((state) => {
      const selected = state.elements.filter((el) => state.selectedIds.includes(el.id));
      if (selected.length === 0) return state;
      const history = pushHistory(state);
      const offset = 24;
      const newIds: string[] = [];
      const idMap = new Map<string, string>();
      const newElements = selected.map((el) => {
        const newId = generateId();
        idMap.set(el.id, newId);
        newIds.push(newId);
        return { ...el, id: newId, x: el.x + offset, y: el.y + offset } as WhiteboardElement;
      });
      const elements = [...state.elements, ...newElements];
      saveElements(elements);
      return { history, future: [], elements, selectedIds: newIds, canUndo: true, canRedo: false };
    }),

  copyToClipboard: () =>
    set((state) => {
      const selected = state.elements.filter((el) => state.selectedIds.includes(el.id));
      return { clipboard: selected.map((el) => ({ ...el })) };
    }),

  pasteFromClipboard: () =>
    set((state) => {
      if (state.clipboard.length === 0) return state;
      const history = pushHistory(state);
      const offset = 32;
      const newIds: string[] = [];
      const newElements = state.clipboard.map((el) => {
        const newId = generateId();
        newIds.push(newId);
        return { ...el, id: newId, x: el.x + offset, y: el.y + offset } as WhiteboardElement;
      });
      const elements = [...state.elements, ...newElements];
      saveElements(elements);
      return { history, future: [], elements, selectedIds: newIds, canUndo: true, canRedo: false };
    }),

  groupSelected: () =>
    set((state) => {
      if (state.selectedIds.length <= 1) return state;
      const groupId = `group-${Date.now()}`;
      const elements = state.elements.map((el) =>
        state.selectedIds.includes(el.id) ? { ...el, groupId } : el
      );
      saveElements(elements);
      return { elements };
    }),

  ungroupSelected: () =>
    set((state) => {
      const selectedGroups = new Set(
        state.elements
          .filter((el) => state.selectedIds.includes(el.id) && el.groupId)
          .map((el) => el.groupId)
      );
      if (selectedGroups.size === 0) return state;
      const elements = state.elements.map((el) =>
        el.groupId && selectedGroups.has(el.groupId) ? { ...el, groupId: undefined } : el
      );
      saveElements(elements);
      return { elements };
    }),

  toggleResolvedComment: (id) =>
    set((state) => {
      const elements = state.elements.map((el) =>
        el.id === id && el.type === 'comment' ? { ...el, resolved: !el.resolved } : el
      );
      saveElements(elements);
      return { elements };
    }),

  spawnConnectedNode: (sourceId, direction) =>
    set((state) => {
      const sourceEl = state.elements.find((el) => el.id === sourceId);
      if (!sourceEl) return state;

      const gap = 120;
      let newX = sourceEl.x, newY = sourceEl.y;
      let fromPort: PortDirection = 'right';
      let toPort: PortDirection = 'left';

      if (direction === 'right') { newX = sourceEl.x + sourceEl.width + gap; fromPort = 'right'; toPort = 'left'; }
      else if (direction === 'left') { newX = sourceEl.x - sourceEl.width - gap; fromPort = 'left'; toPort = 'right'; }
      else if (direction === 'bottom') { newY = sourceEl.y + sourceEl.height + gap; fromPort = 'bottom'; toPort = 'top'; }
      else if (direction === 'top') { newY = sourceEl.y - sourceEl.height - gap; fromPort = 'top'; toPort = 'bottom'; }

      const newShapeId = generateId();
      const arrowId = generateId();

      const newShape: WhiteboardElement = { ...sourceEl, id: newShapeId, x: newX, y: newY };

      const portsA = getShapePorts(sourceEl);
      const portsB = getShapePorts(newShape);

      const startPos = portsA.find((p) => p.port === fromPort)!;
      const endPos = portsB.find((p) => p.port === toPort)!;

      const newArrow: WhiteboardElement = {
        id: arrowId, type: 'arrow',
        x: Math.min(startPos.x, endPos.x), y: Math.min(startPos.y, endPos.y),
        width: Math.abs(endPos.x - startPos.x) || 10, height: Math.abs(endPos.y - startPos.y) || 10,
        startX: startPos.x, startY: startPos.y, endX: endPos.x, endY: endPos.y,
        routingStyle: 'orthogonal', lineStyle: 'solid',
        fromElementId: sourceEl.id, fromPort, toElementId: newShapeId, toPort,
        strokeColor: sourceEl.strokeColor, strokeWidth: sourceEl.strokeWidth || 2,
      };

      const history = pushHistory(state);
      const elements = [...state.elements, newShape, newArrow];
      saveElements(elements);
      return { history, future: [], elements, selectedIds: [newShapeId], canUndo: true, canRedo: false };
    }),

  reconnectArrowEndpoint: (arrowId, endpoint, targetPos, targetElementId, targetPort) =>
    set((state) => {
      const updatedElements = state.elements.map((el) => {
        if (el.id !== arrowId || !isConnectorElement(el)) return el;
        const newStartX = endpoint === 'start' ? targetPos.x : el.startX;
        const newStartY = endpoint === 'start' ? targetPos.y : el.startY;
        const newEndX = endpoint === 'end' ? targetPos.x : el.endX;
        const newEndY = endpoint === 'end' ? targetPos.y : el.endY;
        const boundsX = Math.min(newStartX, newEndX);
        const boundsY = Math.min(newStartY, newEndY);
        const boundsW = Math.max(10, Math.abs(newEndX - newStartX));
        const boundsH = Math.max(10, Math.abs(newEndY - newStartY));
        if (endpoint === 'start') {
          return { ...el, x: boundsX, y: boundsY, width: boundsW, height: boundsH, startX: targetPos.x, startY: targetPos.y, fromElementId: targetElementId, fromPort: targetPort };
        } else {
          return { ...el, x: boundsX, y: boundsY, width: boundsW, height: boundsH, endX: targetPos.x, endY: targetPos.y, toElementId: targetElementId, toPort: targetPort };
        }
      });

      const finalElements = updatedElements.map((el) => {
        if (!isConnectorElement(el)) return el;
        if (el.fromElementId && el.toElementId) {
          const fromEl = updatedElements.find((item) => item.id === el.fromElementId);
          const toEl = updatedElements.find((item) => item.id === el.toElementId);
          if (fromEl && toEl) {
            const optimal = getOptimalPortPair(fromEl, toEl);
            return { ...el, x: Math.min(optimal.fromPos.x, optimal.toPos.x), y: Math.min(optimal.fromPos.y, optimal.toPos.y), width: Math.max(10, Math.abs(optimal.toPos.x - optimal.fromPos.x)), height: Math.max(10, Math.abs(optimal.toPos.y - optimal.fromPos.y)), startX: optimal.fromPos.x, startY: optimal.fromPos.y, endX: optimal.toPos.x, endY: optimal.toPos.y, fromPort: optimal.fromPort, toPort: optimal.toPort };
          }
        }
        return el;
      });

      const history = pushHistory(state);
      saveElements(finalElements);
      return { history, future: [], elements: finalElements, canUndo: true, canRedo: false };
    }),

  undo: () =>
    set((state) => {
      if (state.history.length === 0) return state;
      const previous = state.history[state.history.length - 1];
      const newHistory = state.history.slice(0, -1);
      saveElements(previous.elements);
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
      saveElements(next.elements);
      return {
        history: [...state.history, { elements: state.elements }],
        future: newFuture,
        elements: next.elements,
        canUndo: true,
        canRedo: newFuture.length > 0,
      };
    }),
}));
