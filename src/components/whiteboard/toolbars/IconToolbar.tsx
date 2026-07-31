'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { useOnClickOutside } from '@/lib/hooks/useOnClickOutside';
import { ICON_MAP } from '@/lib/icons/icon-catalog';
import { CloudIconPicker } from '../CloudIconPicker';
import {
  ToolbarPanel,
  ToolbarButton,
  ToolbarDivider,
  ToolbarColorPicker,
  ToolbarMoreMenu,
} from './ToolbarPanel';
import { ChevronDown, MessageSquare, Server } from 'lucide-react';
import type { CloudIconKind, WhiteboardColor, CloudIconElement } from '@/lib/whiteboard/whiteboard-types';
import { WHITEBOARD_COLORS } from '@/lib/whiteboard/whiteboard-types';

export function IconToolbar() {
  const activeTool = useWhiteboardStore((s) => s.activeTool);
  const setActiveTool = useWhiteboardStore((s) => s.setActiveTool);
  const selectedIds = useWhiteboardStore((s) => s.selectedIds);
  const elements = useWhiteboardStore((s) => s.elements);
  const updateElement = useWhiteboardStore((s) => s.updateElement);
  const deleteElements = useWhiteboardStore((s) => s.deleteElements);
  const duplicateSelected = useWhiteboardStore((s) => s.duplicateSelected);
  const copyToClipboard = useWhiteboardStore((s) => s.copyToClipboard);
  const bringToFront = useWhiteboardStore((s) => s.bringToFront);
  const sendToBack = useWhiteboardStore((s) => s.sendToBack);

  const activeCloudIcon = useWhiteboardStore((s) => s.activeCloudIcon);
  const setActiveCloudIcon = useWhiteboardStore((s) => s.setActiveCloudIcon);
  const activeColor = useWhiteboardStore((s) => s.activeColor);
  const setActiveColor = useWhiteboardStore((s) => s.setActiveColor);

  const [iconPickerOpen, setIconPickerOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to dismiss popups immediately via reusable hook
  useOnClickOutside(
    containerRef,
    useCallback(() => {
      setIconPickerOpen(false);
      setColorPickerOpen(false);
      setMoreMenuOpen(false);
    }, []),
    iconPickerOpen || colorPickerOpen || moreMenuOpen
  );

  const selectedCloudElements = elements.filter(
    (el): el is CloudIconElement => selectedIds.includes(el.id) && el.type === 'cloud'
  );
  const hasSelectedCloud = selectedCloudElements.length > 0;
  const firstSelectedCloud = selectedCloudElements[0] ?? null;
  const isDrawingCloud = activeTool === 'cloud';

  // Only render when an Icon is selected or the Cloud Icon Tool is active
  if (!hasSelectedCloud && !isDrawingCloud) return null;

  const currentIconKind: CloudIconKind = firstSelectedCloud
    ? (firstSelectedCloud.iconKind || activeCloudIcon)
    : activeCloudIcon;

  const currentColorKey: string = firstSelectedCloud
    ? ((firstSelectedCloud as any).color || activeColor)
    : activeColor;

  const currentStrokeHex: string = firstSelectedCloud
    ? (firstSelectedCloud.strokeColor || WHITEBOARD_COLORS[activeColor]?.border || '#3b82f6')
    : WHITEBOARD_COLORS[activeColor]?.border || '#3b82f6';

  const matched = ICON_MAP.get(currentIconKind);
  const IconComponent = matched?.icon || Server;

  const handleSelectIcon = (kind: CloudIconKind | string) => {
    setActiveCloudIcon(kind as CloudIconKind);
    if (hasSelectedCloud) {
      selectedCloudElements.forEach((el) => {
        updateElement(el.id, { iconKind: kind as CloudIconKind });
      });
    }
    setIconPickerOpen(false);
  };

  const handleSelectColor = (colorKey: WhiteboardColor) => {
    setActiveColor(colorKey);
    const colorPreset = WHITEBOARD_COLORS[colorKey];
    if (hasSelectedCloud) {
      selectedCloudElements.forEach((el) => {
        updateElement(el.id, {
          color: colorKey,
          strokeColor: colorPreset.border,
          fillColor: colorPreset.bg,
        });
      });
    }
    setColorPickerOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <ToolbarPanel>
        {/* Icon Switcher Dropdown Button */}
        <div className="relative">
          <ToolbarButton
            onClick={() => {
              setIconPickerOpen(!iconPickerOpen);
              setColorPickerOpen(false);
              setMoreMenuOpen(false);
            }}
            active={iconPickerOpen}
            title="Swap Icon (Catalog)"
            className="gap-1.5"
          >
            <div className="flex h-5 w-5 items-center justify-center text-foreground">
              <IconComponent className="h-4 w-4" style={{ color: currentStrokeHex }} />
            </div>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </ToolbarButton>

          {/* Floating Icon Catalog Popup attached to Icon Switcher Button */}
          <CloudIconPicker
            open={iconPickerOpen}
            onOpenChange={setIconPickerOpen}
            onSelect={handleSelectIcon}
            positionClass="absolute bottom-12 left-0 z-50"
          />
        </div>

        <ToolbarDivider />

        {/* Color Palette Picker */}
        <ToolbarColorPicker
          isOpen={colorPickerOpen}
          onToggle={() => {
            setColorPickerOpen(!colorPickerOpen);
            setIconPickerOpen(false);
            setMoreMenuOpen(false);
          }}
          currentColor={currentColorKey}
          onSelectColor={handleSelectColor}
        />

        <ToolbarDivider />

        {/* Comment Action */}
        <ToolbarButton
          onClick={() => setActiveTool('comment')}
          title="Add Comment"
        >
          <MessageSquare className="h-4 w-4" />
        </ToolbarButton>

        {/* More Actions Menu (...) */}
        {hasSelectedCloud && (
          <>
            <ToolbarDivider />
            <ToolbarMoreMenu
              isOpen={moreMenuOpen}
              onToggle={() => {
                setMoreMenuOpen(!moreMenuOpen);
                setIconPickerOpen(false);
                setColorPickerOpen(false);
              }}
              onDuplicate={duplicateSelected}
              onCopy={copyToClipboard}
              onBringToFront={bringToFront}
              onSendToBack={sendToBack}
              onDelete={() => deleteElements(selectedIds)}
            />
          </>
        )}
      </ToolbarPanel>
    </div>
  );
}
