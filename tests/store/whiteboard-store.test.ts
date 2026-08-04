import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LINE_WIDTH_PRESETS,
  useWhiteboardStore,
  duplicateFrameContents,
} from '@/lib/store/whiteboard-store';
import type {
  ArrowElement,
  CloudIconElement,
  CommentElement,
  FrameElement,
  RectangleElement,
  WhiteboardElement,
} from '@/lib/whiteboard/whiteboard-types';

// Mirrors STORAGE_KEY in src/lib/store/whiteboard-store.ts.
const STORAGE_KEY = 'eraser-whiteboard-elements';

// ---------------------------------------------------------------------------
// Element factories — the store operates on the WhiteboardElement union, so
// tests build minimal-but-valid elements and override only what they need.
// ---------------------------------------------------------------------------

function rect(overrides: Partial<RectangleElement> = {}): RectangleElement {
  return {
    type: 'rectangle',
    id: 'rect-1',
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    strokeColor: '#3b82f6',
    strokeWidth: 2,
    ...overrides,
  };
}

function arrow(overrides: Partial<ArrowElement> = {}): ArrowElement {
  return {
    type: 'arrow',
    id: 'arrow-1',
    x: 100,
    y: 30,
    width: 120,
    height: 20,
    strokeColor: '#3b82f6',
    strokeWidth: 2,
    startX: 100,
    startY: 30,
    endX: 220,
    endY: 30,
    routingStyle: 'straight',
    ...overrides,
  };
}

function frame(overrides: Partial<FrameElement> = {}): FrameElement {
  return {
    type: 'frame',
    id: 'frame-1',
    x: 0,
    y: 0,
    width: 300,
    height: 200,
    strokeColor: '#3b82f6',
    strokeWidth: 2,
    title: 'Figure',
    ...overrides,
  };
}

function cloud(overrides: Partial<CloudIconElement> = {}): CloudIconElement {
  return {
    type: 'cloud',
    id: 'cloud-1',
    x: 0,
    y: 0,
    width: 48,
    height: 48,
    strokeColor: '#3b82f6',
    strokeWidth: 2,
    iconKind: 'iconify-aws-ec2',
    ...overrides,
  };
}

function comment(overrides: Partial<CommentElement> = {}): CommentElement {
  return {
    type: 'comment',
    id: 'comment-1',
    x: 0,
    y: 0,
    width: 220,
    height: 90,
    strokeColor: '#3b82f6',
    strokeWidth: 2,
    text: 'Hello',
    author: 'Alice',
    resolved: false,
    color: 'blue',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function add(element: WhiteboardElement) {
  useWhiteboardStore.getState().addElement(element);
}

function ids() {
  return useWhiteboardStore.getState().elements.map((e) => e.id);
}

// Reset the store's data between tests. setState() merges, so the action
// functions defined by create() are preserved.
beforeEach(() => {
  useWhiteboardStore.setState({
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
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('initial state', () => {
  it('starts with sane defaults', () => {
    const s = useWhiteboardStore.getState();
    expect(s.elements).toEqual([]);
    expect(s.selectedIds).toEqual([]);
    expect(s.history).toEqual([]);
    expect(s.future).toEqual([]);
    expect(s.clipboard).toEqual([]);
    expect(s.canUndo).toBe(false);
    expect(s.canRedo).toBe(false);
    expect(s.activeTool).toBe('select');
    expect(s.activeColor).toBe('blue');
    expect(s.showGrid).toBe(true);
    expect(s.hideUI).toBe(false);
    expect(s.showComments).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Element CRUD
// ---------------------------------------------------------------------------

describe('element CRUD', () => {
  it('addElement appends and arms undo', () => {
    add(rect({ id: 'a' }));
    const s = useWhiteboardStore.getState();
    expect(ids()).toEqual(['a']);
    expect(s.history).toHaveLength(1);
    expect(s.canUndo).toBe(true);
    expect(s.canRedo).toBe(false);
  });

  it('updateElement patches an existing element and pushes history', () => {
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().updateElement('a', { x: 40, label: 'Renamed' });
    const s = useWhiteboardStore.getState();
    expect(s.elements[0]).toMatchObject({ id: 'a', x: 40, label: 'Renamed' });
    expect(s.history).toHaveLength(2);
    expect(s.canUndo).toBe(true);
  });

  it('updateElement still records history when the id is missing', () => {
    // Quirk pinned from the source: the snapshot is taken before the id lookup.
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().updateElement('ghost', { x: 5 });
    const s = useWhiteboardStore.getState();
    expect(ids()).toEqual(['a']);
    expect(s.history).toHaveLength(2);
  });

  it('clears waypoints on non-curved connectors', () => {
    add(arrow({ id: 'a1', waypoint: { x: 50, y: 50 }, routingStyle: 'orthogonal' }));
    useWhiteboardStore.getState().updateElement('a1', { label: 'hi' });
    const el = useWhiteboardStore.getState().elements[0] as ArrowElement;
    expect(el.waypoint).toBeUndefined();
  });

  it('keeps waypoints on curved connectors', () => {
    add(arrow({ id: 'a1', waypoint: { x: 50, y: 50 }, routingStyle: 'curved' }));
    useWhiteboardStore.getState().updateElement('a1', { label: 'hi' });
    const el = useWhiteboardStore.getState().elements[0] as ArrowElement;
    expect(el.waypoint).toEqual({ x: 50, y: 50 });
  });

  it('deleteElements removes elements and cleans the selection', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b' }));
    useWhiteboardStore.setState({ selectedIds: ['a', 'b'] });
    useWhiteboardStore.getState().deleteElements(['a']);
    const s = useWhiteboardStore.getState();
    expect(ids()).toEqual(['b']);
    expect(s.selectedIds).toEqual(['b']);
    expect(s.history).toHaveLength(3);
  });

  it('detaches connectors from deleted elements', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b' }));
    add(
      arrow({
        id: 'conn',
        fromElementId: 'a',
        fromPort: 'right',
        toElementId: 'b',
        toPort: 'left',
      })
    );
    useWhiteboardStore.getState().deleteElements(['a']);
    const conn = useWhiteboardStore
      .getState()
      .elements.find((e) => e.id === 'conn') as ArrowElement;
    expect(conn.fromElementId).toBeUndefined();
    expect(conn.fromPort).toBeUndefined();
    expect(conn.toElementId).toBe('b');
  });

  it('setSelectedIds and clearSelection manage the selection', () => {
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().setSelectedIds(['a']);
    expect(useWhiteboardStore.getState().selectedIds).toEqual(['a']);
    useWhiteboardStore.getState().clearSelection();
    expect(useWhiteboardStore.getState().selectedIds).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Undo / redo
// ---------------------------------------------------------------------------

describe('undo / redo', () => {
  it('undo restores the previous snapshot and feeds the redo stack', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b' }));
    useWhiteboardStore.getState().undo();
    const s = useWhiteboardStore.getState();
    expect(ids()).toEqual(['a']);
    expect(s.future).toHaveLength(1);
    expect(s.canUndo).toBe(true);
    expect(s.canRedo).toBe(true);
  });

  it('redo replays the future snapshot back onto the canvas', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b' }));
    useWhiteboardStore.getState().undo();
    useWhiteboardStore.getState().redo();
    const s = useWhiteboardStore.getState();
    expect(ids()).toEqual(['a', 'b']);
    expect(s.future).toHaveLength(0);
    expect(s.canUndo).toBe(true);
    expect(s.canRedo).toBe(false);
  });

  it('undo is a no-op when history is empty', () => {
    useWhiteboardStore.setState({ elements: [rect({ id: 'a' })], history: [], future: [] });
    useWhiteboardStore.getState().undo();
    expect(ids()).toEqual(['a']);
    expect(useWhiteboardStore.getState().history).toHaveLength(0);
  });

  it('redo is a no-op when future is empty', () => {
    useWhiteboardStore.getState().redo();
    expect(useWhiteboardStore.getState().elements).toEqual([]);
  });

  it('a new mutation clears the redo stack', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b' }));
    useWhiteboardStore.getState().undo();
    expect(useWhiteboardStore.getState().future).toHaveLength(1);
    add(rect({ id: 'c' }));
    const s = useWhiteboardStore.getState();
    expect(s.future).toHaveLength(0);
    expect(s.canRedo).toBe(false);
  });

  it('caps history at 100 snapshots', () => {
    for (let i = 0; i < 150; i++) {
      add(rect({ id: `rect-${i}`, x: i }));
    }
    expect(useWhiteboardStore.getState().history).toHaveLength(100);
    expect(useWhiteboardStore.getState().elements).toHaveLength(150);
  });

  it('tracks canUndo/canRedo across a full cycle', () => {
    add(rect({ id: 'a' }));
    expect(useWhiteboardStore.getState().canUndo).toBe(true);
    expect(useWhiteboardStore.getState().canRedo).toBe(false);

    useWhiteboardStore.getState().undo();
    expect(useWhiteboardStore.getState().canUndo).toBe(false);
    expect(useWhiteboardStore.getState().canRedo).toBe(true);

    useWhiteboardStore.getState().redo();
    expect(useWhiteboardStore.getState().canUndo).toBe(true);
    expect(useWhiteboardStore.getState().canRedo).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Move & resize
// ---------------------------------------------------------------------------

describe('move & resize', () => {
  it('moveSelectedElements translates selected elements without pushing history', () => {
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().setSelectedIds(['a']);
    useWhiteboardStore.getState().moveSelectedElements(10, 20);
    const s = useWhiteboardStore.getState();
    expect(s.elements[0]).toMatchObject({ x: 10, y: 20 });
    // Only the addElement snapshot — drags never capture their own entry.
    expect(s.history).toHaveLength(1);
  });

  it('moveSelectedElements never moves comments', () => {
    add(rect({ id: 'a' }));
    add(comment({ id: 'c1' }));
    useWhiteboardStore.getState().setSelectedIds(['a', 'c1']);
    useWhiteboardStore.getState().moveSelectedElements(10, 10);
    const s = useWhiteboardStore.getState();
    expect(s.elements.find((e) => e.id === 'a')).toMatchObject({ x: 10, y: 10 });
    expect(s.elements.find((e) => e.id === 'c1')).toMatchObject({ x: 0, y: 0 });
  });

  it('moveSelectedElements moves children along with their frame', () => {
    add(frame({ id: 'f1' }));
    add(rect({ id: 'kid', x: 20, y: 20, width: 50, height: 30 }));
    useWhiteboardStore.getState().setSelectedIds(['f1']);
    useWhiteboardStore.getState().moveSelectedElements(10, 10);
    const s = useWhiteboardStore.getState();
    expect(s.elements.find((e) => e.id === 'f1')).toMatchObject({ x: 10, y: 10 });
    expect(s.elements.find((e) => e.id === 'kid')).toMatchObject({ x: 30, y: 30 });
  });

  it('moveSelectedElements re-routes attached connectors', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b', x: 200 }));
    add(
      arrow({
        id: 'conn',
        startX: 100,
        startY: 30,
        endX: 200,
        endY: 30,
        fromElementId: 'a',
        fromPort: 'right',
        toElementId: 'b',
        toPort: 'left',
      })
    );
    useWhiteboardStore.getState().setSelectedIds(['b']);
    useWhiteboardStore.getState().moveSelectedElements(50, 0);
    const s = useWhiteboardStore.getState();
    expect(s.elements.find((e) => e.id === 'b')).toMatchObject({ x: 250 });
    const conn = s.elements.find((e) => e.id === 'conn') as ArrowElement;
    // Optimal port pair for horizontally separated shapes is right -> left.
    expect(conn).toMatchObject({
      startX: 100,
      startY: 30,
      endX: 250,
      endY: 30,
      fromPort: 'right',
      toPort: 'left',
    });
  });

  it('resizeElement grows from the br handle without pushing history', () => {
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().resizeElement('a', 'br', 10, 20);
    const s = useWhiteboardStore.getState();
    expect(s.elements[0]).toMatchObject({ x: 0, y: 0, width: 110, height: 80 });
    expect(s.history).toHaveLength(1);
  });

  it('resizeElement from the tl handle moves the origin and shrinks', () => {
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().resizeElement('a', 'tl', 10, 10);
    expect(useWhiteboardStore.getState().elements[0]).toMatchObject({
      x: 10,
      y: 10,
      width: 90,
      height: 50,
    });
  });

  it('resizeElement keeps cloud icons square', () => {
    add(cloud({ id: 'c1' }));
    // br handle sizes clouds as width + (dx + dy) / 2 = 48 + (20 + 20) / 2 = 68
    useWhiteboardStore.getState().resizeElement('c1', 'br', 20, 20);
    expect(useWhiteboardStore.getState().elements[0]).toMatchObject({
      width: 68,
      height: 68,
    });
  });
});

// ---------------------------------------------------------------------------
// Z-order & alignment
// ---------------------------------------------------------------------------

describe('z-order & alignment', () => {
  it('bringToFront moves selected elements to the end of the array', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b', x: 50 }));
    add(rect({ id: 'c', x: 100 }));
    useWhiteboardStore.getState().setSelectedIds(['a']);
    useWhiteboardStore.getState().bringToFront();
    expect(ids()).toEqual(['b', 'c', 'a']);
  });

  it('sendToBack moves selected elements to the start of the array', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b', x: 50 }));
    add(rect({ id: 'c', x: 100 }));
    useWhiteboardStore.getState().setSelectedIds(['c']);
    useWhiteboardStore.getState().sendToBack();
    expect(ids()).toEqual(['c', 'a', 'b']);
  });

  it('aligns left/right/top/bottom to the extremes', () => {
    // Reset positions before each sub-check: chaining the ops would flatten
    // the x/y extremes (e.g. after alignLeft every x is 0), changing the
    // reference points the next op computes against.
    const setup = () => {
      useWhiteboardStore.setState({
        elements: [
          rect({ id: 'a' }),
          rect({ id: 'b', x: 50, y: 20 }),
          rect({ id: 'c', x: 100, y: 40 }),
        ],
        selectedIds: ['a', 'b', 'c'],
      });
    };

    setup();
    useWhiteboardStore.getState().alignLeft();
    expect(useWhiteboardStore.getState().elements.map((e) => e.x)).toEqual([0, 0, 0]);

    setup();
    // widest right edge is c (200) -> every element moves so its right edge = 200
    useWhiteboardStore.getState().alignRight();
    expect(useWhiteboardStore.getState().elements.map((e) => e.x)).toEqual([100, 100, 100]);

    setup();
    useWhiteboardStore.getState().alignTop();
    expect(useWhiteboardStore.getState().elements.map((e) => e.y)).toEqual([0, 0, 0]);

    setup();
    // lowest bottom edge is c (100) -> every element moves so its bottom edge = 100
    useWhiteboardStore.getState().alignBottom();
    expect(useWhiteboardStore.getState().elements.map((e) => e.y)).toEqual([40, 40, 40]);
  });

  it('centers elements on the group average', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b', x: 50 }));
    add(rect({ id: 'c', x: 100 }));
    useWhiteboardStore.getState().setSelectedIds(['a', 'b', 'c']);
    useWhiteboardStore.getState().alignCenter();
    // average center x = (50 + 100 + 150) / 3 = 100 -> x = 100 - width/2 = 50
    expect(useWhiteboardStore.getState().elements.map((e) => e.x)).toEqual([50, 50, 50]);
  });

  it('alignment is a no-op with a single selection', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b', x: 50 }));
    useWhiteboardStore.getState().setSelectedIds(['a']);
    useWhiteboardStore.getState().alignLeft();
    expect(useWhiteboardStore.getState().elements.map((e) => e.x)).toEqual([0, 50]);
  });
});

// ---------------------------------------------------------------------------
// Clipboard: duplicate / copy / paste
// ---------------------------------------------------------------------------

describe('clipboard (duplicate / copy / paste)', () => {
  it('duplicateSelected offsets a copy by 24px and selects it', () => {
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().setSelectedIds(['a']);
    useWhiteboardStore.getState().duplicateSelected();
    const s = useWhiteboardStore.getState();
    expect(s.elements).toHaveLength(2);
    const copies = s.elements.filter((e) => e.id !== 'a');
    expect(copies).toHaveLength(1);
    expect(copies[0]).toMatchObject({ x: 24, y: 24 });
    expect(s.selectedIds).toEqual([copies[0].id]);
    expect(s.history).toHaveLength(2);
  });

  it('duplicateSelected is a no-op with nothing selected', () => {
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().duplicateSelected();
    expect(useWhiteboardStore.getState().elements).toHaveLength(1);
  });

  it('copyToClipboard snapshots the selection', () => {
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().setSelectedIds(['a']);
    useWhiteboardStore.getState().copyToClipboard();
    expect(useWhiteboardStore.getState().clipboard.map((e) => e.id)).toEqual(['a']);
  });

  it('pasteFromClipboard adds offset copies and re-selects them', () => {
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().setSelectedIds(['a']);
    useWhiteboardStore.getState().copyToClipboard();
    useWhiteboardStore.getState().pasteFromClipboard();
    const s = useWhiteboardStore.getState();
    expect(s.elements).toHaveLength(2);
    const pasted = s.elements.filter((e) => e.id !== 'a');
    expect(pasted).toHaveLength(1);
    expect(pasted[0]).toMatchObject({ x: 32, y: 32 });
    expect(s.selectedIds).toEqual([pasted[0].id]);
  });

  it('repeated pastes cascade by 32px each time', () => {
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().setSelectedIds(['a']);
    useWhiteboardStore.getState().copyToClipboard();
    useWhiteboardStore.getState().pasteFromClipboard();
    useWhiteboardStore.getState().pasteFromClipboard();
    const pasted = useWhiteboardStore.getState().elements.filter((e) => e.id !== 'a');
    expect(pasted.map((e) => e.x).sort((m, n) => m - n)).toEqual([32, 64]);
  });
});

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

describe('grouping', () => {
  it('groupSelected tags the selection with a shared group id', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b', x: 50 }));
    useWhiteboardStore.getState().setSelectedIds(['a', 'b']);
    useWhiteboardStore.getState().groupSelected();
    const s = useWhiteboardStore.getState();
    const groupId = s.elements[0].groupId;
    expect(groupId).toMatch(/^group-/);
    expect(s.elements.every((e) => e.groupId === groupId)).toBe(true);
  });

  it('ungroupSelected removes the group tags', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b', x: 50 }));
    useWhiteboardStore.getState().setSelectedIds(['a', 'b']);
    useWhiteboardStore.getState().groupSelected();
    useWhiteboardStore.getState().ungroupSelected();
    expect(useWhiteboardStore.getState().elements.every((e) => e.groupId === undefined)).toBe(true);
  });

  it('groupSelected is a no-op with fewer than two selections', () => {
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().setSelectedIds(['a']);
    useWhiteboardStore.getState().groupSelected();
    expect(useWhiteboardStore.getState().elements[0].groupId).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Comments
// ---------------------------------------------------------------------------

describe('comments', () => {
  it('toggleResolvedComment flips the resolved flag', () => {
    add(comment({ id: 'c1' }));
    useWhiteboardStore.getState().toggleResolvedComment('c1');
    expect(useWhiteboardStore.getState().elements[0]).toMatchObject({ resolved: true });
    useWhiteboardStore.getState().toggleResolvedComment('c1');
    expect(useWhiteboardStore.getState().elements[0]).toMatchObject({ resolved: false });
  });

  it('addCommentReply appends a reply and clears the draft flag', () => {
    add(comment({ id: 'c1', isDraft: true }));
    useWhiteboardStore.getState().addCommentReply('c1', 'Great point');
    const c = useWhiteboardStore.getState().elements[0] as CommentElement;
    const replies = c.replies ?? [];
    expect(replies).toHaveLength(1);
    expect(replies[0]).toMatchObject({ text: 'Great point', author: 'User' });
    expect(replies[0].id).toMatch(/^el-/);
    expect(c.isDraft).toBe(false);
  });

  it('editCommentText updates the comment body', () => {
    add(comment({ id: 'c1' }));
    useWhiteboardStore.getState().editCommentText('c1', 'Updated');
    expect(useWhiteboardStore.getState().elements[0]).toMatchObject({
      text: 'Updated',
      isDraft: false,
    });
  });

  it('editCommentText updates a single reply', () => {
    add(comment({ id: 'c1' }));
    useWhiteboardStore.getState().addCommentReply('c1', 'original');
    const c = useWhiteboardStore.getState().elements[0] as CommentElement;
    const replyId = (c.replies ?? [])[0].id;
    useWhiteboardStore.getState().editCommentText('c1', 'edited', replyId);
    const replies = (useWhiteboardStore.getState().elements[0] as CommentElement).replies ?? [];
    expect(replies).toHaveLength(1);
    expect(replies[0]).toMatchObject({ id: replyId, text: 'edited' });
  });

  it('deleteCommentReply removes a reply', () => {
    add(comment({ id: 'c1' }));
    useWhiteboardStore.getState().addCommentReply('c1', 'original');
    const c = useWhiteboardStore.getState().elements[0] as CommentElement;
    const replyId = (c.replies ?? [])[0].id;
    useWhiteboardStore.getState().deleteCommentReply('c1', replyId);
    expect((useWhiteboardStore.getState().elements[0] as CommentElement).replies).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// spawnConnectedNode & reconnectArrowEndpoint
// ---------------------------------------------------------------------------

describe('spawnConnectedNode & reconnectArrowEndpoint', () => {
  it('spawnConnectedNode clones the source 120px away with a connecting arrow', () => {
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().spawnConnectedNode('a', 'right');
    const s = useWhiteboardStore.getState();
    expect(s.elements).toHaveLength(3);

    const clones = s.elements.filter((e) => e.id !== 'a' && e.type !== 'arrow');
    expect(clones).toHaveLength(1);
    const clone = clones[0] as RectangleElement;
    // source x (0) + source width (100) + gap (120)
    expect(clone).toMatchObject({ x: 220, y: 0 });

    const conn = s.elements.find((e) => e.type === 'arrow') as ArrowElement;
    expect(conn).toMatchObject({
      fromElementId: 'a',
      fromPort: 'right',
      toElementId: clone.id,
      toPort: 'left',
      startX: 100,
      startY: 30,
      endX: 220,
      endY: 30,
    });
    expect(s.selectedIds).toEqual([clone.id]);
    expect(s.history).toHaveLength(2);
  });

  it('spawnConnectedNode is a no-op for a missing source', () => {
    useWhiteboardStore.getState().spawnConnectedNode('ghost', 'right');
    expect(useWhiteboardStore.getState().elements).toHaveLength(0);
  });

  it('reconnectArrowEndpoint re-attaches the end and pushes history', () => {
    add(arrow({ id: 'conn', startX: 0, startY: 0, endX: 100, endY: 0 }));
    useWhiteboardStore.getState().reconnectArrowEndpoint('conn', 'end', { x: 250, y: 50 });
    const conn = useWhiteboardStore.getState().elements[0] as ArrowElement;
    expect(conn).toMatchObject({ endX: 250, endY: 50, width: 250, height: 50 });
    expect(useWhiteboardStore.getState().history).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Active style setters
// ---------------------------------------------------------------------------

describe('active style setters', () => {
  it('setActiveTool presets arrowhead styles when switching to arrow', () => {
    useWhiteboardStore.getState().setActiveTool('arrow');
    const s = useWhiteboardStore.getState();
    expect(s.activeTool).toBe('arrow');
    expect(s.activeStartArrowheadStyle).toBe('none');
    expect(s.activeArrowheadStyle).toBe('arrow');
  });

  it('setActiveTool sets the tool alone otherwise', () => {
    useWhiteboardStore.getState().setActiveTool('rectangle');
    expect(useWhiteboardStore.getState().activeTool).toBe('rectangle');
  });

  it('setActiveColor syncs the stroke and fill hex values', () => {
    useWhiteboardStore.getState().setActiveColor('green');
    const s = useWhiteboardStore.getState();
    expect(s.activeColor).toBe('green');
    expect(s.activeStrokeHex).toBe('#22c55e');
    expect(s.activeFillHex).toBe('rgba(34, 197, 94, 0.12)');
  });

  it('setActiveStrokeWidth snaps to the matching preset size', () => {
    useWhiteboardStore.getState().setActiveStrokeWidth(4);
    expect(useWhiteboardStore.getState().activeLineWidthSize).toBe('L');
    // 7 is not a preset -> falls back to 'M'
    useWhiteboardStore.getState().setActiveStrokeWidth(7);
    expect(useWhiteboardStore.getState().activeLineWidthSize).toBe('M');
  });

  it('setActiveLineWidthSize maps to the preset width', () => {
    useWhiteboardStore.getState().setActiveLineWidthSize('XL');
    expect(useWhiteboardStore.getState().activeStrokeWidth).toBe(8);
  });

  it('exposes LINE_WIDTH_PRESETS', () => {
    expect(LINE_WIDTH_PRESETS).toEqual({ S: 1, M: 2, L: 4, XL: 8 });
  });

  it('toggleShowComments flips the flag', () => {
    useWhiteboardStore.getState().toggleShowComments();
    expect(useWhiteboardStore.getState().showComments).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// localStorage persistence (debounced)
// ---------------------------------------------------------------------------

describe('localStorage persistence', () => {
  // The store guards every storage call behind `typeof window === 'undefined'`,
  // so tests stub a minimal window + localStorage to exercise the real path.
  function stubPersistence(initial: Record<string, string> = {}) {
    const storage = new Map<string, string>(Object.entries(initial));
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
    return storage;
  }

  it('debounces writes to localStorage by 300ms', () => {
    vi.useFakeTimers();
    const storage = stubPersistence();
    try {
      useWhiteboardStore.getState().addElement(rect({ id: 'a' }));
      expect(storage.has(STORAGE_KEY)).toBe(false); // not yet — debounced
      vi.advanceTimersByTime(299);
      expect(storage.has(STORAGE_KEY)).toBe(false);
      vi.advanceTimersByTime(1);
      expect(storage.get(STORAGE_KEY)).toContain('"a"');
    } finally {
      vi.useRealTimers();
    }
  });

  it('hydrate loads stored elements back into the canvas', () => {
    stubPersistence({ [STORAGE_KEY]: JSON.stringify([rect({ id: 'restored' })]) });
    useWhiteboardStore.getState().hydrate();
    expect(ids()).toEqual(['restored']);
  });

  it('hydrate ignores corrupted localStorage JSON', () => {
    stubPersistence({ [STORAGE_KEY]: '{not valid json' });
    useWhiteboardStore.getState().hydrate();
    expect(ids()).toEqual([]);
  });

  it('re-saves when another mutation lands inside the debounce window', () => {
    vi.useFakeTimers();
    const storage = stubPersistence();
    try {
      useWhiteboardStore.getState().addElement(rect({ id: 'a' }));
      useWhiteboardStore.getState().addElement(rect({ id: 'b' }));
      vi.advanceTimersByTime(300);
      expect(storage.get(STORAGE_KEY)).toContain('"b"');
    } finally {
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// hydrate in an SSR-like environment
// ---------------------------------------------------------------------------

describe('hydrate (no window)', () => {
  it('is a no-op when window is unavailable', () => {
    // No `window` stub here: the vitest node environment has none, so the
    // store's SSR guard must bail out early without touching storage.
    useWhiteboardStore.getState().hydrate();
    expect(useWhiteboardStore.getState().elements).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Remaining simple style setters
// ---------------------------------------------------------------------------

describe('remaining simple style setters', () => {
  it('setActiveStrokeHex updates the stroke hex', () => {
    useWhiteboardStore.getState().setActiveStrokeHex('#ff0000');
    expect(useWhiteboardStore.getState().activeStrokeHex).toBe('#ff0000');
  });

  it('setActiveFillHex updates the fill hex', () => {
    useWhiteboardStore.getState().setActiveFillHex('#00ff00');
    expect(useWhiteboardStore.getState().activeFillHex).toBe('#00ff00');
  });

  it('setActiveCloudIcon updates the cloud icon', () => {
    useWhiteboardStore.getState().setActiveCloudIcon('iconify-aws-s3');
    expect(useWhiteboardStore.getState().activeCloudIcon).toBe('iconify-aws-s3');
  });

  it('setActiveLineStyle updates the line style', () => {
    useWhiteboardStore.getState().setActiveLineStyle('dashed');
    expect(useWhiteboardStore.getState().activeLineStyle).toBe('dashed');
  });

  it('setActiveArrowheadStyle updates the end arrowhead', () => {
    useWhiteboardStore.getState().setActiveArrowheadStyle('diamond');
    expect(useWhiteboardStore.getState().activeArrowheadStyle).toBe('diamond');
  });

  it('setActiveStartArrowheadStyle updates the start arrowhead', () => {
    useWhiteboardStore.getState().setActiveStartArrowheadStyle('arrow');
    expect(useWhiteboardStore.getState().activeStartArrowheadStyle).toBe('arrow');
  });

  it('setActiveRoutingStyle updates the routing style', () => {
    useWhiteboardStore.getState().setActiveRoutingStyle('orthogonal');
    expect(useWhiteboardStore.getState().activeRoutingStyle).toBe('orthogonal');
  });

  it('setActiveIsAnimated toggles the animation flag', () => {
    useWhiteboardStore.getState().setActiveIsAnimated(true);
    expect(useWhiteboardStore.getState().activeIsAnimated).toBe(true);
  });

  it('setActiveCornerRadius updates the corner radius', () => {
    useWhiteboardStore.getState().setActiveCornerRadius(12);
    expect(useWhiteboardStore.getState().activeCornerRadius).toBe(12);
  });

  it('setActiveFillStyle updates the fill style', () => {
    useWhiteboardStore.getState().setActiveFillStyle('watercolor');
    expect(useWhiteboardStore.getState().activeFillStyle).toBe('watercolor');
  });

  it('setShowGrid / setHideUI / setShowComments update view flags', () => {
    const s = useWhiteboardStore.getState();
    s.setShowGrid(false);
    s.setHideUI(true);
    s.setShowComments(false);
    const after = useWhiteboardStore.getState();
    expect(after.showGrid).toBe(false);
    expect(after.hideUI).toBe(true);
    expect(after.showComments).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Edge-case element operations
// ---------------------------------------------------------------------------

describe('edge-case element operations', () => {
  it('keeps connectors that are not attached to deleted elements', () => {
    add(rect({ id: 'a' }));
    add(arrow({ id: 'conn' }));
    useWhiteboardStore.getState().deleteElements(['a']);
    const conn = useWhiteboardStore
      .getState()
      .elements.find((e) => e.id === 'conn') as ArrowElement;
    expect(conn).toBeDefined();
    expect(conn.startX).toBe(100);
  });

  it('moveSelectedElements honors an explicit override id set', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b', x: 50 }));
    useWhiteboardStore.getState().setSelectedIds(['a']);
    useWhiteboardStore.getState().moveSelectedElements(10, 10, new Set(['b']));
    const s = useWhiteboardStore.getState();
    expect(s.elements.find((e) => e.id === 'a')).toMatchObject({ x: 0, y: 0 });
    expect(s.elements.find((e) => e.id === 'b')).toMatchObject({ x: 60, y: 10 });
  });

  it('moveSelectedElements translates a selected connector directly', () => {
    add(arrow({ id: 'conn', startX: 100, startY: 30, endX: 220, endY: 30 }));
    useWhiteboardStore.getState().setSelectedIds(['conn']);
    useWhiteboardStore.getState().moveSelectedElements(10, 5);
    const conn = useWhiteboardStore.getState().elements[0] as ArrowElement;
    expect(conn).toMatchObject({
      x: 110,
      y: 35,
      startX: 110,
      startY: 35,
      endX: 230,
      endY: 35,
    });
  });

  it('moveSelectedElements shifts the waypoint of an attached connector', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b', x: 200 }));
    add(
      arrow({
        id: 'conn',
        startX: 100,
        startY: 30,
        endX: 200,
        endY: 30,
        fromElementId: 'a',
        fromPort: 'right',
        toElementId: 'b',
        toPort: 'left',
        waypoint: { x: 150, y: 30 },
        routingStyle: 'orthogonal',
      })
    );
    useWhiteboardStore.getState().setSelectedIds(['b']);
    useWhiteboardStore.getState().moveSelectedElements(50, 0);
    const conn = useWhiteboardStore
      .getState()
      .elements.find((e) => e.id === 'conn') as ArrowElement;
    expect(conn.waypoint).toEqual({ x: 200, y: 30 });
  });

  it('moveSelectedElements re-routes a connector attached on one side only', () => {
    add(rect({ id: 'a' }));
    add(
      arrow({
        id: 'conn',
        startX: 100,
        startY: 30,
        endX: 400,
        endY: 30,
        fromElementId: 'a',
        fromPort: 'right',
      })
    );
    useWhiteboardStore.getState().setSelectedIds(['a']);
    useWhiteboardStore.getState().moveSelectedElements(50, 0);
    const conn = useWhiteboardStore
      .getState()
      .elements.find((e) => e.id === 'conn') as ArrowElement;
    expect(conn.startX).toBe(150);
    expect(conn.endX).toBe(400);
  });

  it('moveSelectedElements re-routes a connector attached to the target only', () => {
    add(rect({ id: 'b', x: 200 }));
    add(
      arrow({
        id: 'conn',
        startX: 50,
        startY: 30,
        endX: 200,
        endY: 30,
        toElementId: 'b',
        toPort: 'left',
      })
    );
    useWhiteboardStore.getState().setSelectedIds(['b']);
    useWhiteboardStore.getState().moveSelectedElements(50, 0);
    const conn = useWhiteboardStore
      .getState()
      .elements.find((e) => e.id === 'conn') as ArrowElement;
    expect(conn.endX).toBe(250);
  });

  it('resizeElement skips comments and unknown ids', () => {
    add(comment({ id: 'c1' }));
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().resizeElement('c1', 'br', 10, 10);
    expect(
      useWhiteboardStore.getState().elements.find((e) => e.id === 'c1')
    ).toMatchObject({ width: 220, height: 90 });
    useWhiteboardStore.getState().resizeElement('ghost', 'br', 10, 10);
    expect(
      useWhiteboardStore.getState().elements.find((e) => e.id === 'a')
    ).toMatchObject({ width: 100 });
  });

  it('resizeElement keeps cloud icons square from every corner', () => {
    useWhiteboardStore.setState({ elements: [cloud({ id: 'c1' })] });
    useWhiteboardStore.getState().resizeElement('c1', 'tl', 20, 10);
    expect(useWhiteboardStore.getState().elements[0]).toMatchObject({
      width: 28,
      height: 28,
      x: 20,
      y: 20,
    });

    useWhiteboardStore.setState({ elements: [cloud({ id: 'c2' })] });
    useWhiteboardStore.getState().resizeElement('c2', 'tr', 20, 10);
    expect(useWhiteboardStore.getState().elements[0]).toMatchObject({
      width: 53,
      height: 53,
      y: -5,
    });

    useWhiteboardStore.setState({ elements: [cloud({ id: 'c3' })] });
    useWhiteboardStore.getState().resizeElement('c3', 'bl', 20, 10);
    expect(useWhiteboardStore.getState().elements[0]).toMatchObject({
      width: 43,
      height: 43,
      x: 5,
    });
  });

  it('resizeElement re-routes connectors attached to the resized shape', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b', x: 200 }));
    add(
      arrow({
        id: 'conn',
        startX: 100,
        startY: 30,
        endX: 200,
        endY: 30,
        fromElementId: 'a',
        fromPort: 'right',
        toElementId: 'b',
        toPort: 'left',
      })
    );
    useWhiteboardStore.getState().resizeElement('a', 'br', 20, 20);
    const conn = useWhiteboardStore
      .getState()
      .elements.find((e) => e.id === 'conn') as ArrowElement;
    // a grows to 120x80, so its right port moves to (120, 40)
    expect(conn).toMatchObject({ startX: 120, startY: 40, endX: 200, endY: 30 });
  });

  it('resizeElement re-routes a connector attached on one side', () => {
    add(rect({ id: 'a' }));
    add(
      arrow({
        id: 'conn',
        startX: 100,
        startY: 30,
        endX: 400,
        endY: 30,
        fromElementId: 'a',
        fromPort: 'right',
      })
    );
    useWhiteboardStore.getState().resizeElement('a', 'br', 20, 20);
    const conn = useWhiteboardStore
      .getState()
      .elements.find((e) => e.id === 'conn') as ArrowElement;
    expect(conn.startX).toBe(120);
  });

  it('resizeElement re-routes a connector attached to the target only', () => {
    add(rect({ id: 'b', x: 200 }));
    add(
      arrow({
        id: 'conn',
        startX: 50,
        startY: 30,
        endX: 200,
        endY: 30,
        toElementId: 'b',
        toPort: 'left',
      })
    );
    // A 'tl' drag moves b's left edge (and thus its left port) to x=220.
    useWhiteboardStore.getState().resizeElement('b', 'tl', 20, 0);
    const conn = useWhiteboardStore
      .getState()
      .elements.find((e) => e.id === 'conn') as ArrowElement;
    expect(conn.endX).toBe(220);
  });
});

// ---------------------------------------------------------------------------
// Align middle + no-op guards
// ---------------------------------------------------------------------------

describe('align middle & guards', () => {
  it('aligns vertically centered on the group average', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b', y: 20 }));
    add(rect({ id: 'c', y: 40 }));
    useWhiteboardStore.getState().setSelectedIds(['a', 'b', 'c']);
    useWhiteboardStore.getState().alignMiddle();
    // average center y = (30 + 50 + 70) / 3 = 50 -> y = 50 - height/2 = 20
    expect(useWhiteboardStore.getState().elements.map((e) => e.y)).toEqual([20, 20, 20]);
  });

  it('all alignment ops are no-ops with a single selection', () => {
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().setSelectedIds(['a']);
    const s = useWhiteboardStore.getState();
    s.alignLeft();
    s.alignCenter();
    s.alignRight();
    s.alignTop();
    s.alignMiddle();
    s.alignBottom();
    expect(useWhiteboardStore.getState().elements[0]).toMatchObject({
      x: 0,
      y: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// Duplicate / paste edge cases
// ---------------------------------------------------------------------------

describe('duplicate & paste edge cases', () => {
  it('duplicateSelected copies children inside a selected frame', () => {
    add(frame({ id: 'f1' }));
    add(rect({ id: 'kid', x: 20, y: 20, width: 50, height: 30 }));
    useWhiteboardStore.getState().setSelectedIds(['f1']);
    useWhiteboardStore.getState().duplicateSelected();
    const s = useWhiteboardStore.getState();
    expect(s.elements).toHaveLength(4); // frame + kid + 2 copies
    const frameCopy = s.elements.find(
      (e) => e.type === 'frame' && e.id !== 'f1'
    ) as FrameElement;
    expect(frameCopy).toMatchObject({ x: 24, y: 24 });
  });

  it('duplicateSelected remaps connector endpoints to the copies', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b', x: 200 }));
    add(
      arrow({
        id: 'conn',
        startX: 100,
        startY: 30,
        endX: 200,
        endY: 30,
        fromElementId: 'a',
        fromPort: 'right',
        toElementId: 'b',
        toPort: 'left',
      })
    );
    useWhiteboardStore.getState().setSelectedIds(['a', 'b', 'conn']);
    useWhiteboardStore.getState().duplicateSelected();
    const s = useWhiteboardStore.getState();
    const copiedConn = s.elements.find(
      (e) => e.type === 'arrow' && e.id !== 'conn'
    ) as ArrowElement;
    // Copies land 24px right/down of their originals: 'a' -> (24,24), 'b' -> (224,24).
    const copiedA = s.elements.find(
      (e) => e.type === 'rectangle' && e.x === 24 && e.y === 24
    ) as RectangleElement;
    const copiedB = s.elements.find(
      (e) => e.type === 'rectangle' && e.x === 224 && e.y === 24
    ) as RectangleElement;
    expect(copiedA).toBeDefined();
    expect(copiedB).toBeDefined();
    expect(copiedA.id).not.toBe(copiedB.id);
    expect(copiedConn.fromElementId).toBe(copiedA.id);
    expect(copiedConn.toElementId).toBe(copiedB.id);
    expect(copiedConn).toMatchObject({ startX: 124, endX: 224 });
  });

  it('pasteFromClipboard is a no-op with an empty clipboard', () => {
    add(rect({ id: 'a' }));
    useWhiteboardStore.setState({ clipboard: [] });
    useWhiteboardStore.getState().pasteFromClipboard();
    expect(useWhiteboardStore.getState().elements).toHaveLength(1);
  });

  it('pasteFromClipboard remaps connector endpoints and cascades pastes', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b', x: 200 }));
    add(
      arrow({
        id: 'conn',
        startX: 100,
        startY: 30,
        endX: 200,
        endY: 30,
        fromElementId: 'a',
        fromPort: 'right',
        toElementId: 'b',
        toPort: 'left',
      })
    );
    useWhiteboardStore.getState().setSelectedIds(['a', 'b', 'conn']);
    useWhiteboardStore.getState().copyToClipboard();
    useWhiteboardStore.getState().pasteFromClipboard();
    useWhiteboardStore.getState().pasteFromClipboard();
    const s = useWhiteboardStore.getState();
    const pasted = s.elements.filter((e) => !['a', 'b', 'conn'].includes(e.id));
    expect(pasted).toHaveLength(6); // 3 elements pasted twice
    const conns = pasted.filter((e) => e.type === 'arrow') as ArrowElement[];
    expect(conns).toHaveLength(2);
    for (const c of conns) {
      expect(c.fromElementId).not.toBe('a');
      expect(c.toElementId).not.toBe('b');
      expect(c.fromElementId).toBeDefined();
      expect(c.toElementId).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Grouping & comment edge cases
// ---------------------------------------------------------------------------

describe('grouping & comment edge cases', () => {
  it('ungroupSelected is a no-op without a grouped selection', () => {
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().setSelectedIds(['a']);
    useWhiteboardStore.getState().ungroupSelected();
    expect(useWhiteboardStore.getState().elements[0].groupId).toBeUndefined();
  });

  it('comment actions ignore non-comment elements', () => {
    add(rect({ id: 'a' }));
    const s = useWhiteboardStore.getState();
    s.toggleResolvedComment('a');
    s.addCommentReply('a', 'hi');
    s.editCommentText('a', 'x');
    s.editCommentText('a', 'y', 'reply-1');
    s.deleteCommentReply('a', 'reply-1');
    expect(useWhiteboardStore.getState().elements[0]).toMatchObject({
      type: 'rectangle',
      id: 'a',
    });
  });

  it('editCommentText with a reply id that no longer exists keeps replies', () => {
    add(comment({ id: 'c1' }));
    useWhiteboardStore.getState().addCommentReply('c1', 'original');
    const replyId = (useWhiteboardStore.getState().elements[0] as CommentElement)
      .replies![0].id;
    useWhiteboardStore.getState().editCommentText('c1', 'edited', 'ghost-reply');
    const replies = (useWhiteboardStore.getState().elements[0] as CommentElement)
      .replies ?? [];
    expect(replies).toHaveLength(1);
    expect(replies[0]).toMatchObject({ id: replyId, text: 'original' });
  });
});

// ---------------------------------------------------------------------------
// spawnConnectedNode directions
// ---------------------------------------------------------------------------

describe('spawnConnectedNode directions', () => {
  it('supports left, bottom, and top directions', () => {
    add(rect({ id: 'a' }));
    useWhiteboardStore.getState().spawnConnectedNode('a', 'left');
    expect(
      useWhiteboardStore
        .getState()
        .elements.find((e) => e.type !== 'arrow' && e.id !== 'a')
    ).toMatchObject({ x: -220 });

    useWhiteboardStore.setState({ elements: [rect({ id: 'b' })] });
    useWhiteboardStore.getState().spawnConnectedNode('b', 'bottom');
    expect(
      useWhiteboardStore
        .getState()
        .elements.find((e) => e.type !== 'arrow' && e.id !== 'b')
    ).toMatchObject({ y: 180 });

    useWhiteboardStore.setState({ elements: [rect({ id: 'c' })] });
    useWhiteboardStore.getState().spawnConnectedNode('c', 'top');
    expect(
      useWhiteboardStore
        .getState()
        .elements.find((e) => e.type !== 'arrow' && e.id !== 'c')
    ).toMatchObject({ y: -180 });
  });
});

// ---------------------------------------------------------------------------
// reconnectArrowEndpoint edge cases
// ---------------------------------------------------------------------------

describe('reconnectArrowEndpoint edge cases', () => {
  it('re-attaches the start endpoint and leaves unrelated elements alone', () => {
    add(rect({ id: 'a' }));
    add(arrow({ id: 'conn', startX: 100, startY: 30, endX: 220, endY: 30 }));
    useWhiteboardStore.getState().reconnectArrowEndpoint('conn', 'start', {
      x: 40,
      y: 60,
    });
    const conn = useWhiteboardStore
      .getState()
      .elements.find((e) => e.id === 'conn') as ArrowElement;
    expect(conn).toMatchObject({ startX: 40, startY: 60 });
    // rect untouched
    expect(
      useWhiteboardStore.getState().elements.find((e) => e.id === 'a')
    ).toMatchObject({ x: 0 });
  });

  it('re-routes arrows attached to two shapes back to optimal ports', () => {
    add(rect({ id: 'a' }));
    add(rect({ id: 'b', x: 200 }));
    add(
      arrow({
        id: 'conn',
        startX: 100,
        startY: 30,
        endX: 200,
        endY: 30,
        fromElementId: 'a',
        fromPort: 'right',
        toElementId: 'b',
        toPort: 'left',
      })
    );
    // Keep the endpoint attached to 'b' so the reroute logic (fromElementId +
    // toElementId both present) kicks in and snaps back to optimal ports.
    useWhiteboardStore.getState().reconnectArrowEndpoint('conn', 'end', {
      x: 400,
      y: 200,
    }, 'b', 'left');
    const conn = useWhiteboardStore
      .getState()
      .elements.find((e) => e.id === 'conn') as ArrowElement;
    expect(conn).toMatchObject({
      startX: 100,
      startY: 30,
      endX: 200,
      endY: 30,
      fromPort: 'right',
      toPort: 'left',
    });
  });
});

// ---------------------------------------------------------------------------
// duplicateFrameContents (exported helper)
// ---------------------------------------------------------------------------

describe('duplicateFrameContents', () => {
  it('returns [] for non-frame sources', () => {
    expect(duplicateFrameContents(rect({ id: 'r1' }), 10, 10, [rect({ id: 'r1' })])).toEqual(
      []
    );
  });

  it('returns [] for a frame with no children', () => {
    expect(duplicateFrameContents(frame({ id: 'f1' }), 10, 10, [frame({ id: 'f1' })])).toEqual(
      []
    );
  });

  it('clones children with remapped connector endpoints and offsets', () => {
    const f = frame({ id: 'f1' });
    const kid = rect({ id: 'kid', x: 20, y: 20, width: 50, height: 30 });
    const kid2 = rect({ id: 'kid2', x: 150, y: 20, width: 50, height: 30 });
    const conn = arrow({
      id: 'kidConn',
      startX: 100,
      startY: 30,
      endX: 200,
      endY: 30,
      fromElementId: 'kid',
      toElementId: 'kid2',
    });
    const outside = rect({ id: 'outside', x: 400, y: 400 });

    const copies = duplicateFrameContents(f, 24, 24, [f, kid, kid2, conn, outside]);
    expect(copies).toHaveLength(3);

    const copyConn = copies.find((c) => c.type === 'arrow') as ArrowElement;
    const copyKids = copies.filter((c) => c.type === 'rectangle');
    expect(copyKids).toHaveLength(2);
    expect(copyKids.map((c) => c.id).sort()).not.toEqual(['kid', 'kid2']);
    expect(copyConn).toMatchObject({ startX: 124, endX: 224, x: 124, y: 54 });
    expect(copyConn.fromElementId).toBe(copyKids[0].id);
    expect(copyConn.toElementId).toBe(copyKids[1].id);
  });
});
