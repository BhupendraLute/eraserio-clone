'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import type { WhiteboardElement } from '@/lib/whiteboard/whiteboard-types';
import { WHITEBOARD_COLORS } from '@/lib/whiteboard/whiteboard-types';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';

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
    else if (isShape) updateElement(element.id, { label: value } as any);
    else if (isFrame) updateElement(element.id, { title: value } as any);
  }, [element.id, updateElement, isText, isSticky, isComment, isShape, isFrame]);

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

  if (isShape) {
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
    border: 'none',
    background: 'transparent',
    outline: 'none',
    resize: 'none',
    overflow: 'hidden',
    color: textColor,
    fontSize: `${fontSize}px`,
    fontFamily,
    fontWeight: fontWeight as any,
    fontStyle,
    textAlign,
    lineHeight: '1.4',
    padding: isText ? '4px' : isSticky ? '0' : isShape ? '0' : '2px',
    whiteSpace: isMultiline ? 'pre-wrap' : 'nowrap',
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
