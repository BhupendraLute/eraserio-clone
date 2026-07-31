'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import type { WhiteboardElement } from '@/lib/whiteboard/whiteboard-types';
import { WHITEBOARD_COLORS, computeShapeAutoHeight, computeTextElementSize, getElementBounds } from '@/lib/whiteboard/whiteboard-types';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { getArrowMidpoint } from '@/lib/whiteboard/orthogonal-routing';
import { HighlightedCode } from '@/lib/whiteboard/code-highlighter';

interface InlineTextEditorProps {
  element: WhiteboardElement;
  onFinish: () => void;
}

// Some fields only exist on specific element types, which the union type doesn't
// model — widen once here instead of scattering `any` casts.
interface ElementExtras {
  text?: string;
  mode?: 'text' | 'code';
  language?: string;
  textWrap?: boolean;
  isUserResized?: boolean;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold' | number | string;
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  label?: string;
  labelFontSize?: number;
  labelFontFamily?: string;
  labelColor?: string;
  title?: string;
  routingStyle?: 'curved' | 'straight';
  waypoint?: { x: number; y: number };
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}

export function InlineTextEditor({ element, onFinish }: InlineTextEditorProps) {
  const isComment = element.type === 'comment';
  const extras = element as WhiteboardElement & ElementExtras;
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const isText = element.type === 'text';
  const isFrame = element.type === 'frame';
  const isShape = ['rectangle', 'circle', 'diamond', 'cylinder'].includes(element.type);
  const isConnector = element.type === 'arrow' || element.type === 'line';

  // Determine the text value and style based on element type
  let textValue = '';
  let fontSize = 14;
  let fontFamily = 'inherit';
  let fontWeight: React.CSSProperties['fontWeight'] = 'normal';
  let fontStyle: 'normal' | 'italic' = 'normal';
  let textAlign: 'left' | 'center' | 'right' = 'center';
  let textColor = 'currentColor';
  let isMultiline = true;
  let placeholder = '';

  const isCodeMode = isText && extras.mode === 'code';

  if (isText) {
    textValue = extras.text ?? '';
    fontSize = extras.fontSize ?? (isCodeMode ? 16 : 24);
    fontFamily = isCodeMode
      ? 'monospace, ui-monospace, SFMono-Regular, Consolas'
      : extras.fontFamily ?? 'inherit';
    fontWeight = extras.fontWeight ?? (isCodeMode ? 'normal' : 'bold');
    fontStyle = extras.fontStyle ?? 'normal';
    textAlign = extras.textAlign ?? 'left';
    textColor = isCodeMode ? '#f8fafc' : element.strokeColor;
    isMultiline = true;
    placeholder = isCodeMode ? 'print("Hello world");' : 'Type text...';
  } else if (isShape) {
    textValue = extras.label ?? '';
    fontSize = extras.labelFontSize ?? extras.fontSize ?? 14;
    fontFamily = extras.labelFontFamily ?? extras.fontFamily ?? 'inherit';
    textAlign = extras.textAlign ?? 'center';
    textColor = extras.labelColor ?? 'currentColor';
    fontWeight = '500';
    placeholder = 'Type label...';
    isMultiline = true;
  } else if (isConnector) {
    textValue = extras.label ?? '';
    fontSize = extras.labelFontSize ?? 12;
    fontFamily = extras.labelFontFamily ?? 'inherit';
    textColor = extras.labelColor ?? element.strokeColor ?? 'var(--foreground)';
    fontWeight = '500';
    placeholder = 'Type label...';
    isMultiline = false;
  } else if (isFrame) {
    textValue = extras.title ?? '';
    fontSize = 11;
    fontWeight = 'bold';
    textAlign = 'left';
    isMultiline = false;
    placeholder = 'Frame title...';
  }

  const handleChange = useCallback((value: string) => {
    if (isText) {
      const mode = extras.mode || 'text';
      const newSize = computeTextElementSize(value, fontSize, mode);
      updateElement(element.id, {
        text: value,
        width: extras.isUserResized ? element.width : newSize.width,
        height: extras.isUserResized ? element.height : newSize.height,
      });
    }
    else if (isShape) {
      const newHeight = computeShapeAutoHeight(value, element.width, element.height, fontSize);
      updateElement(element.id, { label: value, height: newHeight });
    }
    else if (isConnector) updateElement(element.id, { label: value });
    else if (isFrame) updateElement(element.id, { title: value });
  }, [element.id, element.width, element.height, fontSize, updateElement, isText, isShape, isConnector, isFrame, extras]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isMultiline && e.key === 'Enter') {
      e.preventDefault();
      onFinish();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onFinish();
    }
  }, [isMultiline, onFinish]);

  // Auto-focus on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (!isMultiline) {
        (inputRef.current as HTMLInputElement).select();
      } else {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  }, [isMultiline]);

  // Finish editing on blur
  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setTimeout(onFinish, 80);
    }
  }, [onFinish]);

  // Compute foreignObject position and dimensions
  let foX = element.x;
  let foY = element.y;
  let foW = Math.max(60, element.width);
  let foH = Math.max(30, element.height);

  if (isText) {
    const bounds = getElementBounds(element);
    foX = bounds.x;
    foY = bounds.y;
    foW = bounds.width;
    foH = bounds.height;
  } else if (isConnector) {
    const el = extras;
    const isCurved = el.routingStyle === 'curved';
    const mid = getArrowMidpoint(el.startX ?? 0, el.startY ?? 0, el.endX ?? 0, el.endY ?? 0, isCurved ? el.waypoint : undefined);
    const labelFontSize = el.labelFontSize ?? 12;
    const charWidth = labelFontSize * 0.62;
    const textLen = (textValue || '').length;
    const width = Math.max(80, Math.min(240, textLen * charWidth + 28));
    const height = labelFontSize + 12;
    foX = mid.x - width / 2;
    foY = mid.y - height / 2;
    foW = width;
    foH = height;
  } else if (isShape) {
    // For shapes, span internal shape padding area
    foX = element.x + 12;
    foY = element.y + 8;
    foW = Math.max(10, element.width - 24);
    foH = Math.max(10, element.height - 16);
  } else if (isFrame) {
    foX = element.x + 8;
    foY = element.y + 4;
    foW = element.width - 16;
    foH = 24;
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    border: isConnector ? '1px solid var(--border)' : isCodeMode ? '1px solid #2e3040' : 'none',
    borderRadius: isConnector ? '4px' : isCodeMode ? '12px' : '0',
    background: isConnector ? 'var(--background)' : isCodeMode ? '#181920' : 'transparent',
    outline: 'none',
    resize: 'none',
    overflow: 'hidden',
    color: textColor,
    fontSize: `${fontSize}px`,
    fontFamily,
    fontWeight,
    fontStyle,
    textAlign: isConnector ? 'center' : textAlign,
    lineHeight: '1.4',
    padding: isConnector ? '0 4px' : isCodeMode ? '12px 16px' : isText ? '4px' : isShape ? '0' : '2px',
    whiteSpace: isMultiline ? 'pre-wrap' : 'nowrap',
    caretColor: '#38bdf8',
    boxShadow: isConnector ? '0 2px 8px rgba(0,0,0,0.15)' : isCodeMode ? '0 10px 25px rgba(0,0,0,0.5)' : undefined,
  };

  const commonProps = {
    style: inputStyle,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => handleChange(e.target.value),
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onDoubleClick: (e: React.MouseEvent) => e.stopPropagation(),
    placeholder,
  };

  if (isComment) return null;

  if (isCodeMode) {
    return (
      <foreignObject
        x={foX}
        y={foY}
        width={foW}
        height={foH}
        className="z-20 overflow-visible cursor-text"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className="relative flex h-full w-full flex-col rounded-xl border border-[#2e3040] bg-[#181920] px-4 py-3 shadow-2xl backdrop-blur overflow-hidden">
          <HighlightedCode
            code={textValue}
            language={extras.language}
            fontSize={fontSize}
            readOnly={false}
            textWrap={extras.textWrap ?? true}
            onChange={(val) => handleChange(val)}
          />
        </div>
      </foreignObject>
    );
  }

  return (
    <foreignObject
      x={foX}
      y={foY}
      width={foW}
      height={foH}
      className="z-20 cursor-text"
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {isMultiline ? (
        <textarea
          {...commonProps}
          ref={inputRef as unknown as React.Ref<HTMLTextAreaElement>}
          value={textValue}
          className="cursor-text"
        />
      ) : (
        <input
          {...commonProps}
          ref={inputRef as unknown as React.Ref<HTMLInputElement>}
          type="text"
          value={textValue}
          className="cursor-text"
        />
      )}
    </foreignObject>
  );
}
