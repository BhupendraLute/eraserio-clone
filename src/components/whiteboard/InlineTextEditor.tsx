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

export function InlineTextEditor({ element, onFinish }: InlineTextEditorProps) {
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const isText = element.type === 'text';
  const isComment = element.type === 'comment';
  const isFrame = element.type === 'frame';
  const isShape = ['rectangle', 'circle', 'diamond', 'cylinder'].includes(element.type);
  const isConnector = element.type === 'arrow' || element.type === 'line';

  // Determine the text value and style based on element type
  let textValue = '';
  let fontSize = 14;
  let fontFamily = 'inherit';
  let fontWeight: 'normal' | 'bold' = 'normal';
  let fontStyle: 'normal' | 'italic' = 'normal';
  let textAlign: 'left' | 'center' | 'right' = 'center';
  let textColor = 'currentColor';
  let isMultiline = true;
  let placeholder = '';

  const isCodeMode = isText && (element as any).mode === 'code';

  if (isText) {
    textValue = (element as any).text ?? '';
    fontSize = (element as any).fontSize ?? (isCodeMode ? 16 : 24);
    fontFamily = isCodeMode
      ? 'monospace, ui-monospace, SFMono-Regular, Consolas'
      : (element as any).fontFamily ?? 'inherit';
    fontWeight = (element as any).fontWeight ?? (isCodeMode ? 'normal' : 'bold');
    fontStyle = (element as any).fontStyle ?? 'normal';
    textAlign = (element as any).textAlign ?? 'left';
    textColor = isCodeMode ? '#f8fafc' : element.strokeColor;
    isMultiline = true;
    placeholder = isCodeMode ? 'print("Hello world");' : 'Type text...';
  } else if (isComment) {
    textValue = (element as any).text ?? '';
    fontSize = 11;
    fontFamily = 'inherit';
    fontWeight = 'normal';
    placeholder = 'Type a comment...';
    const colorKey = (element as any).color ?? 'blue';
    textColor = WHITEBOARD_COLORS[colorKey as keyof typeof WHITEBOARD_COLORS]?.text ?? 'var(--foreground)';
  } else if (isShape) {
    textValue = (element as any).label ?? '';
    fontSize = (element as any).labelFontSize ?? (element as any).fontSize ?? 14;
    fontFamily = (element as any).labelFontFamily ?? (element as any).fontFamily ?? 'inherit';
    textAlign = (element as any).textAlign ?? 'center';
    textColor = (element as any).labelColor ?? 'currentColor';
    fontWeight = '500' as any;
    placeholder = 'Type label...';
    isMultiline = true;
  } else if (isConnector) {
    textValue = (element as any).label ?? '';
    fontSize = (element as any).labelFontSize ?? 12;
    fontFamily = (element as any).labelFontFamily ?? 'inherit';
    textColor = (element as any).labelColor ?? element.strokeColor ?? 'var(--foreground)';
    fontWeight = '500' as any;
    placeholder = 'Type label...';
    isMultiline = false;
  } else if (isFrame) {
    textValue = (element as any).title ?? '';
    fontSize = 11;
    fontWeight = 'bold' as any;
    textAlign = 'left';
    isMultiline = false;
    placeholder = 'Frame title...';
  }

  const handleChange = useCallback((value: string) => {
    if (isText) {
      const mode = (element as any).mode || 'text';
      const newSize = computeTextElementSize(value, fontSize, mode);
      updateElement(element.id, {
        text: value,
        width: (element as any).isUserResized ? element.width : newSize.width,
        height: (element as any).isUserResized ? element.height : newSize.height,
      } as any);
    }
    else if (isComment) updateElement(element.id, { text: value } as any);
    else if (isShape) {
      const newHeight = computeShapeAutoHeight(value, element.width, element.height, fontSize);
      updateElement(element.id, { label: value, height: newHeight } as any);
    }
    else if (isConnector) updateElement(element.id, { label: value } as any);
    else if (isFrame) updateElement(element.id, { title: value } as any);
  }, [element.id, element.width, element.height, fontSize, updateElement, isText, isComment, isShape, isConnector, isFrame]);

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
    const el = element as any;
    const isCurved = el.routingStyle === 'curved';
    const mid = getArrowMidpoint(el.startX, el.startY, el.endX, el.endY, isCurved ? el.waypoint : undefined);
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
    fontWeight: fontWeight as any,
    fontStyle,
    textAlign: isConnector ? 'center' : textAlign,
    lineHeight: '1.4',
    padding: isConnector ? '0 4px' : isCodeMode ? '12px 16px' : isText ? '4px' : isShape ? '0' : '2px',
    whiteSpace: isMultiline ? 'pre-wrap' : 'nowrap',
    caretColor: '#38bdf8',
    boxShadow: isConnector ? '0 2px 8px rgba(0,0,0,0.15)' : isCodeMode ? '0 10px 25px rgba(0,0,0,0.5)' : undefined,
  };

  const commonProps = {
    ref: inputRef as any,
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
            language={(element as any).language}
            fontSize={fontSize}
            readOnly={false}
            textWrap={(element as any).textWrap ?? true}
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
          value={textValue}
          className="cursor-text"
        />
      ) : (
        <input
          {...commonProps}
          type="text"
          value={textValue}
          className="cursor-text"
        />
      )}
    </foreignObject>
  );
}
