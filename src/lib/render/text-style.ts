// Single source of truth for text styling, imported by both the layout
// engine (which needs to measure text) and the SVG renderer (which needs
// to draw it identically). If these ever drift apart, node boxes will be
// sized for a font that isn't the one actually rendered.

export const NODE_FONT_SIZE = 13;
export const NODE_FONT_FAMILY = 'ui-sans-serif, system-ui, sans-serif';
export const NODE_FONT = `${NODE_FONT_SIZE}px ${NODE_FONT_FAMILY}`;
export const NODE_LINE_HEIGHT = 16; // px between wrapped lines

export const EDGE_LABEL_FONT_SIZE = 11;
export const EDGE_LABEL_FONT = `${EDGE_LABEL_FONT_SIZE}px ${NODE_FONT_FAMILY}`;

export const NODE_PADDING_X = 40;
export const NODE_PADDING_Y = 14; // top+bottom padding around wrapped text block
export const NODE_MIN_WIDTH = 120;
export const NODE_MAX_WIDTH = 280;
export const NODE_MIN_HEIGHT = 50;
export const NODE_MAX_LINES = 3; // beyond this, last visible line gets an ellipsis

export const EDGE_LABEL_PADDING_X = 4;
export const EDGE_LABEL_PADDING_Y = 2;