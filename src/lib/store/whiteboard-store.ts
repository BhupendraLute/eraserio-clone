import { create } from 'zustand';
import type {
  WhiteboardTool,
  WhiteboardColor,
  CloudIconKind,
  ResizeHandle,
  WhiteboardElement,
  CommentReply,
  LineStyle,
  PortDirection,
  FillStyleMode,
} from '@/lib/whiteboard/whiteboard-types';
import { WHITEBOARD_COLORS, isConnectorElement, getShapePorts, getElementBounds, ArrowheadStyle, RoutingStyle } from '@/lib/whiteboard/whiteboard-types';
import { getOptimalPortPair, getOptimalSinglePort, determineAutoRoutingStyle } from '@/lib/whiteboard/orthogonal-routing';
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

/**
 * Debounced localStorage persistence.
 * The Zustand store state updates instantly on every frame (powering live
 * preview during drag/resize). Only the expensive JSON.stringify +
 * localStorage.setItem call is debounced so it runs at most once per 300ms.
 */
let _saveTimer: ReturnType<typeof setTimeout> | null = null;

function saveElements(elements: WhiteboardElement[]) {
  if (typeof window === 'undefined') return;
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
    } catch {
      // quota exceeded or SSR — ignore
    }
  }, 300);
}

export type LineWidthSize = 'S' | 'M' | 'L' | 'XL';

export const LINE_WIDTH_PRESETS: Record<LineWidthSize, number> = {
  S: 1,
  M: 2,
  L: 4,
  XL: 8,
};

interface WhiteboardStore {
  activeTool: WhiteboardTool;
  activeColor: WhiteboardColor;
  activeStrokeHex: string;
  activeFillHex: string;
  activeCloudIcon: CloudIconKind;
  activeStrokeWidth: number;
  activeLineWidthSize: LineWidthSize;
  activeLineStyle: LineStyle;
  activeArrowheadStyle: ArrowheadStyle;
  activeStartArrowheadStyle: ArrowheadStyle;
  activeRoutingStyle: RoutingStyle;
  activeIsAnimated: boolean;
  activeCornerRadius: number;
  activeFillStyle: FillStyleMode;
  elements: WhiteboardElement[];
  selectedIds: string[];
  history: HistoryState[];
  future: HistoryState[];
  clipboard: WhiteboardElement[];
  showGrid: boolean;
  hideUI: boolean;
  showComments: boolean;

  setActiveTool: (tool: WhiteboardTool) => void;
  setActiveColor: (color: WhiteboardColor) => void;
  setActiveStrokeHex: (hex: string) => void;
  setActiveFillHex: (hex: string) => void;
  setActiveCloudIcon: (icon: CloudIconKind) => void;
  setActiveStrokeWidth: (width: number) => void;
  setActiveLineWidthSize: (size: LineWidthSize) => void;
  setActiveLineStyle: (style: LineStyle) => void;
  setActiveArrowheadStyle: (style: ArrowheadStyle) => void;
  setActiveStartArrowheadStyle: (style: ArrowheadStyle) => void;
  setActiveRoutingStyle: (style: RoutingStyle) => void;
  setActiveIsAnimated: (animated: boolean) => void;
  setActiveCornerRadius: (radius: number) => void;
  setActiveFillStyle: (style: FillStyleMode) => void;
  setShowGrid: (show: boolean) => void;
  setHideUI: (hide: boolean) => void;
  setShowComments: (show: boolean) => void;
  toggleShowComments: () => void;

  addElement: (element: WhiteboardElement) => void;
  updateElement: (id: string, patch: Partial<WhiteboardElement>) => void;
  deleteElements: (ids: string[]) => void;
  setSelectedIds: (ids: string[]) => void;
  clearSelection: () => void;
  moveSelectedElements: (dx: number, dy: number, overrideIdsToMove?: Set<string>) => void;
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
  addCommentReply: (commentId: string, text: string, author?: string) => void;
  editCommentText: (commentId: string, text: string, replyId?: string) => void;
  deleteCommentReply: (commentId: string, replyId: string) => void;

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

export function duplicateFrameContents(
  sourceFrame: WhiteboardElement,
  dx: number,
  dy: number,
  allElements: WhiteboardElement[]
): WhiteboardElement[] {
  if (sourceFrame.type !== 'frame') return [];

  const children = allElements.filter((child) => {
    if (child.id === sourceFrame.id || child.type === 'comment') return false;
    const b = getElementBounds(child);
    return (
      b.x >= sourceFrame.x - 5 &&
      b.x + b.width <= sourceFrame.x + sourceFrame.width + 5 &&
      b.y >= sourceFrame.y - 5 &&
      b.y + b.height <= sourceFrame.y + sourceFrame.height + 5
    );
  });

  if (children.length === 0) return [];

  const idMap = new Map<string, string>();
  children.forEach((child) => {
    idMap.set(child.id, generateId());
  });

  return children.map((child) => {
    const newId = idMap.get(child.id)!;
    if (isConnectorElement(child)) {
      const fromId = child.fromElementId && idMap.has(child.fromElementId) ? idMap.get(child.fromElementId) : child.fromElementId;
      const toId = child.toElementId && idMap.has(child.toElementId) ? idMap.get(child.toElementId) : child.toElementId;
      return {
        ...child,
        id: newId,
        x: child.x + dx,
        y: child.y + dy,
        startX: child.startX + dx,
        startY: child.startY + dy,
        endX: child.endX + dx,
        endY: child.endY + dy,
        waypoint: child.waypoint ? { x: child.waypoint.x + dx, y: child.waypoint.y + dy } : undefined,
        fromElementId: fromId,
        toElementId: toId,
      } as WhiteboardElement;
    }
    return {
      ...child,
      id: newId,
      x: child.x + dx,
      y: child.y + dy,
    } as WhiteboardElement;
  });
}

export const useWhiteboardStore = create<WhiteboardStore>((set, get) => ({
  activeTool: 'select',
  activeColor: 'blue',
  activeStrokeHex: 'currentColor',
  activeFillHex: 'transparent',
  activeCloudIcon: 'iconify-aws-ec2',
  activeStrokeWidth: 2,
  activeLineWidthSize: 'M',
  activeLineStyle: 'solid',
  activeArrowheadStyle: 'arrow',
  activeStartArrowheadStyle: 'none',
  activeRoutingStyle: 'straight',
  activeIsAnimated: false,
  activeCornerRadius: 6,
  activeFillStyle: 'plain',
  elements: [],
  selectedIds: [],
  history: [],
  future: [],
  clipboard: [],
  showGrid: true,
  hideUI: false,
  showComments: true,

  canUndo: false,
  canRedo: false,

  setActiveTool: (tool) => {
    if (tool === 'arrow') {
      set({ activeTool: tool, activeStartArrowheadStyle: 'none', activeArrowheadStyle: 'arrow' });
    } else {
      set({ activeTool: tool });
    }
  },
  setActiveColor: (color) => {
    const preset = WHITEBOARD_COLORS[color];
    set({ activeColor: color, activeStrokeHex: preset.border, activeFillHex: preset.bg });
  },
  setActiveStrokeHex: (hex) => set({ activeStrokeHex: hex }),
  setActiveFillHex: (hex) => set({ activeFillHex: hex }),
  setActiveCloudIcon: (icon) => set({ activeCloudIcon: icon }),
  setActiveStrokeWidth: (width) => {
    // Try to sync with a matching preset size
    const match = (Object.entries(LINE_WIDTH_PRESETS) as [LineWidthSize, number][]).find(([, w]) => w === width);
    set({ activeStrokeWidth: width, activeLineWidthSize: match ? match[0] : 'M' });
  },
  setActiveLineWidthSize: (size) => set({ activeLineWidthSize: size, activeStrokeWidth: LINE_WIDTH_PRESETS[size] }),
  setActiveLineStyle: (style) => set({ activeLineStyle: style }),
  setActiveArrowheadStyle: (style) => set({ activeArrowheadStyle: style }),
  setActiveStartArrowheadStyle: (style) => set({ activeStartArrowheadStyle: style }),
  setActiveRoutingStyle: (style) => set({ activeRoutingStyle: style }),
  setActiveIsAnimated: (animated) => set({ activeIsAnimated: animated }),
  setActiveCornerRadius: (radius) => set({ activeCornerRadius: radius }),
  setActiveFillStyle: (style) => set({ activeFillStyle: style }),
  setShowGrid: (show) => set({ showGrid: show }),
  setHideUI: (hide) => set({ hideUI: hide }),
  setShowComments: (show) => set({ showComments: show }),
  toggleShowComments: () => set((state) => ({ showComments: !state.showComments })),

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
      const elements = state.elements.map((el) => {
        if (el.id !== id) return el;
        const updated = { ...el, ...patch } as WhiteboardElement;
        if (isConnectorElement(updated) && updated.routingStyle !== 'curved') {
          delete (updated as any).waypoint;
        }
        return updated;
      });
      saveElements(elements);
      return { history, future: [], elements, canUndo: true, canRedo: false };
    }),

  deleteElements: (ids) =>
    set((state) => {
      const history = pushHistory(state);
      const deletedSet = new Set(ids);
      const rawElements = state.elements.filter((el) => !deletedSet.has(el.id));
      const elements = rawElements.map((el) => {
        if (!isConnectorElement(el)) return el;
        const detachFrom = el.fromElementId && deletedSet.has(el.fromElementId);
        const detachTo = el.toElementId && deletedSet.has(el.toElementId);
        if (!detachFrom && !detachTo) return el;
        return {
          ...el,
          fromElementId: detachFrom ? undefined : el.fromElementId,
          fromPort: detachFrom ? undefined : el.fromPort,
          toElementId: detachTo ? undefined : el.toElementId,
          toPort: detachTo ? undefined : el.toPort,
        };
      });
      saveElements(elements);
      return {
        history,
        future: [],
        elements,
        selectedIds: state.selectedIds.filter((id) => !deletedSet.has(id)),
        canUndo: true,
        canRedo: false,
      };
    }),

  setSelectedIds: (selectedIds) => set({ selectedIds }),
  clearSelection: () => set({ selectedIds: [] }),

  moveSelectedElements: (dx, dy, overrideIdsToMove) =>
    set((state) => {
      let idsToMove: Set<string>;
      if (overrideIdsToMove) {
        idsToMove = overrideIdsToMove;
      } else {
        const selectedFigures = state.elements.filter(
          (el) => state.selectedIds.includes(el.id) && el.type === 'frame'
        );

        idsToMove = new Set<string>(state.selectedIds);

        selectedFigures.forEach((fig) => {
          state.elements.forEach((child) => {
            if (child.id !== fig.id) {
              const b = getElementBounds(child);
              const isInside =
                b.x >= fig.x - 5 &&
                b.x + b.width <= fig.x + fig.width + 5 &&
                b.y >= fig.y - 5 &&
                b.y + b.height <= fig.y + fig.height + 5;

              if (isInside) {
                idsToMove.add(child.id);
              }
            }
          });
        });
      }

      const updatedElements = state.elements.map((el) => {
        if (!idsToMove.has(el.id) || el.type === 'comment') return el;
        if (isConnectorElement(el)) {
          return {
            ...el,
            x: el.x + dx,
            y: el.y + dy,
            startX: el.startX + dx,
            startY: el.startY + dy,
            endX: el.endX + dx,
            endY: el.endY + dy,
            waypoint: el.waypoint ? { x: el.waypoint.x + dx, y: el.waypoint.y + dy } : undefined,
          };
        }
        return { ...el, x: el.x + dx, y: el.y + dy };
      });

      // O(1) element lookup map for connector rerouting
      const idMap = new Map(updatedElements.map((e) => [e.id, e]));

      const finalElements = updatedElements.map((el) => {
        if (!isConnectorElement(el)) return el;
        const fromSelected = el.fromElementId ? state.selectedIds.includes(el.fromElementId) : false;
        const toSelected = el.toElementId ? state.selectedIds.includes(el.toElementId) : false;

        let waypoint = el.waypoint;
        if (!state.selectedIds.includes(el.id) && (fromSelected || toSelected) && waypoint) {
          waypoint = { x: waypoint.x + dx, y: waypoint.y + dy };
        }

        const fromEl = el.fromElementId ? idMap.get(el.fromElementId) : undefined;
        const toEl = el.toElementId ? idMap.get(el.toElementId) : undefined;
        if (fromEl && toEl) {
          const optimal = getOptimalPortPair(fromEl, toEl);
          const autoRouting = el.type === 'line'
            ? 'straight'
            : (!el.isUserRoutingStyle && el.routingStyle !== 'curved')
            ? determineAutoRoutingStyle(optimal.fromPos, optimal.toPos, optimal.fromPort, optimal.toPort)
            : el.routingStyle;
          return { ...el, startX: optimal.fromPos.x, startY: optimal.fromPos.y, endX: optimal.toPos.x, endY: optimal.toPos.y, fromPort: optimal.fromPort, toPort: optimal.toPort, routingStyle: autoRouting, waypoint };
        } else if (fromEl) {
          const optimal = getOptimalSinglePort(fromEl, { x: el.endX, y: el.endY });
          return { ...el, startX: optimal.x, startY: optimal.y, fromPort: optimal.port, waypoint };
        } else if (toEl) {
          const optimal = getOptimalSinglePort(toEl, { x: el.startX, y: el.startY });
          return { ...el, endX: optimal.x, endY: optimal.y, toPort: optimal.port, waypoint };
        }
        return { ...el, waypoint };
      });

      saveElements(finalElements);
      return { elements: finalElements };
    }),

  resizeElement: (id, handle, dx, dy) =>
    set((state) => {
      const updatedElements = state.elements.map((el) => {
        if (el.id !== id || el.type === 'comment') return el;
        let newX = el.x, newY = el.y, newW = el.width, newH = el.height;
        if (el.type === 'cloud') {
          // 1:1 Aspect Ratio Corner Resizing for Icons
          let change = Math.abs(dx) > Math.abs(dy) ? dx : dy;
          if (handle === 'tl') {
            change = -change;
            const newSize = Math.max(24, el.width + change);
            const diff = el.width - newSize;
            newX = el.x + diff;
            newY = el.y + diff;
            newW = newSize;
            newH = newSize;
          } else if (handle === 'tr') {
            const newSize = Math.max(24, el.width + (dx - dy) / 2);
            const diff = el.width - newSize;
            newY = el.y + diff;
            newW = newSize;
            newH = newSize;
          } else if (handle === 'bl') {
            const newSize = Math.max(24, el.width + (-dx + dy) / 2);
            const diff = el.width - newSize;
            newX = el.x + diff;
            newW = newSize;
            newH = newSize;
          } else if (handle === 'br') {
            const newSize = Math.max(24, el.width + (dx + dy) / 2);
            newW = newSize;
            newH = newSize;
          }
          return { ...el, x: newX, y: newY, width: newW, height: newH };
        }
        if (handle.includes('r')) newW = Math.max(20, el.width + dx);
        if (handle.includes('l')) { const w = el.width - dx; if (w >= 20) { newX = el.x + dx; newW = w; } }
        if (handle.includes('b')) newH = Math.max(20, el.height + dy);
        if (handle.includes('t')) { const h = el.height - dy; if (h >= 20) { newY = el.y + dy; newH = h; } }
        return { ...el, x: newX, y: newY, width: newW, height: newH };
      });

      // O(1) element lookup map for connector rerouting
      const idMap = new Map(updatedElements.map((e) => [e.id, e]));

      const finalElements = updatedElements.map((el) => {
        if (!isConnectorElement(el)) return el;
        const fromEl = el.fromElementId ? idMap.get(el.fromElementId) : undefined;
        const toEl = el.toElementId ? idMap.get(el.toElementId) : undefined;
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
      const selectedFigures = state.elements.filter(
        (el) => state.selectedIds.includes(el.id) && el.type === 'frame'
      );
      const selectedSet = new Set<string>(state.selectedIds);
      selectedFigures.forEach((fig) => {
        state.elements.forEach((child) => {
          if (child.id !== fig.id && child.type !== 'comment') {
            const b = getElementBounds(child);
            const isInside =
              b.x >= fig.x - 5 &&
              b.x + b.width <= fig.x + fig.width + 5 &&
              b.y >= fig.y - 5 &&
              b.y + b.height <= fig.y + fig.height + 5;
            if (isInside) {
              selectedSet.add(child.id);
            }
          }
        });
      });

      const selected = state.elements.filter((el) => selectedSet.has(el.id));
      if (selected.length === 0) return state;
      const history = pushHistory(state);
      const offset = 24;
      const newIds: string[] = [];
      const idMap = new Map<string, string>();

      selected.forEach((el) => {
        const newId = generateId();
        idMap.set(el.id, newId);
        newIds.push(newId);
      });

      const newElements = selected.map((el) => {
        const newId = idMap.get(el.id)!;
        if (isConnectorElement(el)) {
          const fromId = el.fromElementId && idMap.has(el.fromElementId) ? idMap.get(el.fromElementId) : undefined;
          const toId = el.toElementId && idMap.has(el.toElementId) ? idMap.get(el.toElementId) : undefined;
          return {
            ...el,
            id: newId,
            x: el.x + offset,
            y: el.y + offset,
            startX: el.startX + offset,
            startY: el.startY + offset,
            endX: el.endX + offset,
            endY: el.endY + offset,
            waypoint: el.waypoint ? { x: el.waypoint.x + offset, y: el.waypoint.y + offset } : undefined,
            fromElementId: fromId,
            toElementId: toId,
          } as WhiteboardElement;
        }
        return {
          ...el,
          id: newId,
          x: el.x + offset,
          y: el.y + offset,
        } as WhiteboardElement;
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
      const idMap = new Map<string, string>();

      state.clipboard.forEach((el) => {
        const newId = generateId();
        idMap.set(el.id, newId);
        newIds.push(newId);
      });

      const newElements = state.clipboard.map((el) => {
        const newId = idMap.get(el.id)!;
        if (isConnectorElement(el)) {
          const fromId = el.fromElementId && idMap.has(el.fromElementId) ? idMap.get(el.fromElementId) : undefined;
          const toId = el.toElementId && idMap.has(el.toElementId) ? idMap.get(el.toElementId) : undefined;
          return {
            ...el,
            id: newId,
            x: el.x + offset,
            y: el.y + offset,
            startX: el.startX + offset,
            startY: el.startY + offset,
            endX: el.endX + offset,
            endY: el.endY + offset,
            waypoint: el.waypoint ? { x: el.waypoint.x + offset, y: el.waypoint.y + offset } : undefined,
            fromElementId: fromId,
            toElementId: toId,
          } as WhiteboardElement;
        }
        return {
          ...el,
          id: newId,
          x: el.x + offset,
          y: el.y + offset,
        } as WhiteboardElement;
      });

      // Update clipboard elements coordinates so repeated pastes cascade further down/right
      const updatedClipboard = state.clipboard.map((el) => {
        if (isConnectorElement(el)) {
          return {
            ...el,
            x: el.x + offset,
            y: el.y + offset,
            startX: el.startX + offset,
            startY: el.startY + offset,
            endX: el.endX + offset,
            endY: el.endY + offset,
            waypoint: el.waypoint ? { x: el.waypoint.x + offset, y: el.waypoint.y + offset } : undefined,
          };
        }
        return { ...el, x: el.x + offset, y: el.y + offset };
      });

      const elements = [...state.elements, ...newElements];
      saveElements(elements);
      return { history, future: [], elements, selectedIds: newIds, clipboard: updatedClipboard, canUndo: true, canRedo: false };
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

  addCommentReply: (commentId, text, author = 'User') =>
    set((state) => {
      const elements = state.elements.map((el) => {
        if (el.id === commentId && el.type === 'comment') {
          const newReply: CommentReply = {
            id: generateId(),
            text,
            author,
            createdAt: Date.now(),
          };
          const replies = [...(el.replies || []), newReply];
          return { ...el, replies, isDraft: false };
        }
        return el;
      });
      saveElements(elements);
      return { elements };
    }),

  editCommentText: (commentId, text, replyId) =>
    set((state) => {
      const elements = state.elements.map((el) => {
        if (el.id === commentId && el.type === 'comment') {
          if (!replyId) {
            return { ...el, text, isDraft: false, updatedAt: Date.now() };
          } else {
            const replies = (el.replies || []).map((r) =>
              r.id === replyId ? { ...r, text, updatedAt: Date.now() } : r
            );
            return { ...el, replies };
          }
        }
        return el;
      });
      saveElements(elements);
      return { elements };
    }),

  deleteCommentReply: (commentId, replyId) =>
    set((state) => {
      const elements = state.elements.map((el) => {
        if (el.id === commentId && el.type === 'comment') {
          const replies = (el.replies || []).filter((r) => r.id !== replyId);
          return { ...el, replies };
        }
        return el;
      });
      saveElements(elements);
      return { elements };
    }),

  spawnConnectedNode: (sourceId, direction) =>
    set((state) => {
      const sourceEl = state.elements.find((el) => el.id === sourceId);
      if (!sourceEl) return state;

      const gap = 120;
      let newX = sourceEl.x;
      let newY = sourceEl.y;
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
        arrowheadStyle: get().activeArrowheadStyle,
        arrowheadColor: sourceEl.strokeColor,
        fromElementId: sourceEl.id, fromPort, toElementId: newShapeId, toPort,
        strokeColor: sourceEl.strokeColor, strokeWidth: sourceEl.strokeWidth || 2,
      };

      const duplicatedChildren = sourceEl.type === 'frame'
        ? duplicateFrameContents(sourceEl, newX - sourceEl.x, newY - sourceEl.y, state.elements)
        : [];

      const history = pushHistory(state);
      const elements = [...state.elements, newShape, ...duplicatedChildren, newArrow];
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

        const fromPort = endpoint === 'start' ? targetPort : el.fromPort;
        const toPort = endpoint === 'end' ? targetPort : el.toPort;
        const isUserChoice = el.isUserRoutingStyle || el.routingStyle === 'curved';
        const newRouting = el.type === 'line'
          ? 'straight'
          : !isUserChoice
          ? determineAutoRoutingStyle({ x: newStartX, y: newStartY }, { x: newEndX, y: newEndY }, fromPort, toPort)
          : el.routingStyle;

        if (endpoint === 'start') {
          return { ...el, x: boundsX, y: boundsY, width: boundsW, height: boundsH, startX: targetPos.x, startY: targetPos.y, fromElementId: targetElementId, fromPort: targetPort, routingStyle: newRouting };
        } else {
          return { ...el, x: boundsX, y: boundsY, width: boundsW, height: boundsH, endX: targetPos.x, endY: targetPos.y, toElementId: targetElementId, toPort: targetPort, routingStyle: newRouting };
        }
      });

      // O(1) element lookup map for connector rerouting
      const idMap = new Map(updatedElements.map((e) => [e.id, e]));

      const finalElements = updatedElements.map((el) => {
        if (!isConnectorElement(el)) return el;
        if (el.fromElementId && el.toElementId) {
          const fromEl = idMap.get(el.fromElementId);
          const toEl = idMap.get(el.toElementId);
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
