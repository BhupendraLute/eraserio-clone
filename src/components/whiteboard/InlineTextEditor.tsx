'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import type { WhiteboardElement } from '@/lib/whiteboard/whiteboard-types';
import { WHITEBOARD_COLORS } from '@/lib/whiteboard/whiteboard-types';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { getArrowMidpoint } from '@/lib/whiteboard/orthogonal-routing';

interface InlineTextEditorProps {
  element: WhiteboardElement;
  onFinish: () => void;
}

export function InlineTextEditor({ element, onFinish }: InlineTextEditorProps) {
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  const isText = element.type === 'text';
  const isSticky = element.type === 'sticky';
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

  if (isText) {
    textValue = (element as any).text ?? '';
    fontSize = (element as any).fontSize ?? 16;
    fontFamily = (element as any).fontFamily ?? 'inherit';
    fontWeight = (element as any).fontWeight ?? 'bold';
    fontStyle = (element as any).fontStyle ?? 'normal';
    textAlign = (element as any).textAlign ?? 'left';
    textColor = element.strokeColor;
    isMultiline = false;
    placeholder = 'Type text...';
  } else if (isSticky) {
    textValue = (element as any).text ?? '';
    fontSize = (element as any).fontSize ?? 12;
    fontFamily = (element as any).fontFamily ?? 'inherit';
    fontWeight = (element as any).fontWeight ?? 'normal';
    fontStyle = (element as any).fontStyle ?? 'normal';
    textAlign = (element as any).textAlign ?? 'center';
    const colorKey = (element as any).color ?? 'blue';
    textColor = WHITEBOARD_COLORS[colorKey as keyof typeof WHITEBOARD_COLORS]?.text ?? 'var(--foreground)';
    placeholder = 'Type your note...';
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
    fontSize = 13;
    fontWeight = '500' as any;
    placeholder = 'Type label...';
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
    if (isText) updateElement(element.id, { text: value } as any);
    else if (isSticky) updateElement(element.id, { text: value } as any);
    else if (isComment) updateElement(element.id, { text: value } as any);
    else if (isShape || isConnector) updateElement(element.id, { label: value } as any);
    else if (isFrame) updateElement(element.id, { title: value } as any);
  }, [element.id, updateElement, isText, isSticky, isComment, isShape, isConnector, isFrame]);

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
    // If focus moves to another element within the whiteboard, don't immediately finish
    // Small delay to allow click events on other elements to fire first
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setTimeout(onFinish, 80);
    }
  }, [onFinish]);

  // Compute foreignObject position and dimensions
  let foX = element.x;
  let foY = element.y;
  let foW = Math.max(60, element.width);
  let foH = Math.max(30, element.height);

  if (isConnector) {
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
    // For shapes, position the label editor centered
    foX = element.x;
    foY = element.y + element.height / 2 - 14;
    foW = element.width;
    foH = 28;
  } else if (isFrame) {
    foX = element.x + 8;
    foY = element.y + 4;
    foW = element.width - 16;
    foH = 24;
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    border: isConnector ? '1px solid var(--border)' : 'none',
    borderRadius: isConnector ? '4px' : '0',
    background: isConnector ? 'var(--background)' : 'transparent',
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
    padding: isConnector ? '0 4px' : isText ? '4px' : isSticky ? '0' : isShape ? '0' : '2px',
    whiteSpace: isMultiline ? 'pre-wrap' : 'nowrap',
    boxShadow: isConnector ? '0 2px 8px rgba(0,0,0,0.15)' : undefined,
  };

  const commonProps = {
    ref: inputRef as any,
    style: inputStyle,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => handleChange(e.target.value),
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
    placeholder,
  };

  return (
    <foreignObject x={foX} y={foY} width={foW} height={foH} className="z-20">
      {isMultiline ? (
        <textarea
          {...commonProps}
          value={textValue}
        />
      ) : (
        <input
          {...commonProps}
          type="text"
          value={textValue}
        />
      )}
    </foreignObject>
  );
}
