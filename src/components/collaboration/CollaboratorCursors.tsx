'use client';

import React from 'react';
import { useCollaborationStore } from '@/lib/collaboration/collaboration-store';
import { getElementBounds } from '@/lib/whiteboard/whiteboard-types';
import type { WhiteboardElement } from '@/lib/whiteboard/whiteboard-types';

interface CollaboratorCursorsProps {
  elements: WhiteboardElement[];
}

export function CollaboratorCursors({ elements }: CollaboratorCursorsProps) {
  const collaboratorsMap = useCollaborationStore((s) => s.collaborators);
  const collaborators = Array.from(collaboratorsMap.values());

  if (collaborators.length === 0) return null;

  return (
    <g key="realtime-collaborator-overlay" className="pointer-events-none select-none">
      {/* 1. Collaborators' Remote Selection Outlines */}
      {collaborators.map((c) => {
        if (!c.selectedElementIds || c.selectedElementIds.length === 0) return null;

        const selectedEls = elements.filter((el) => c.selectedElementIds.includes(el.id));
        if (selectedEls.length === 0) return null;

        return selectedEls.map((el) => {
          const bounds = getElementBounds(el);
          const padding = 6;
          return (
            <rect
              key={`remote-select-${c.id}-${el.id}`}
              x={bounds.x - padding}
              y={bounds.y - padding}
              width={bounds.width + padding * 2}
              height={bounds.height + padding * 2}
              rx={6}
              fill="none"
              stroke={c.color.borderHex}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              className="transition-all duration-100 ease-out"
            >
              <title>{`${c.name}'s selection`}</title>
            </rect>
          );
        });
      })}

      {/* 2. Collaborators' Hardware-Accelerated Smooth Cursors & Badges */}
      {collaborators.map((c) => {
        if (!c.cursor) return null;
        const { x, y } = c.cursor;
        const colorHex = c.color.hex;

        return (
          <g
            key={`remote-cursor-${c.id}`}
            style={{
              transform: `translate3d(${x}px, ${y}px, 0)`,
              willChange: 'transform',
              transition: 'transform 60ms cubic-bezier(0.1, 1, 0.1, 1)',
            }}
          >
            {/* SVG Cursor Pointer Arrow */}
            <path
              d="M 0,0 L 0,18 L 4.5,14 L 8,21 L 11,19.5 L 7.5,12.5 L 14,12.5 Z"
              fill={colorHex}
              stroke="#ffffff"
              strokeWidth={1.5}
              strokeLinejoin="round"
              className="drop-shadow-md"
            />

            {/* Floating User Name Badge */}
            <foreignObject x={14} y={10} width={160} height={32} className="overflow-visible">
              <div
                className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 shadow-md border text-xs font-semibold text-white whitespace-nowrap backdrop-blur-sm transition-all"
                style={{
                  backgroundColor: colorHex,
                  borderColor: c.color.borderHex,
                }}
              >
                {c.image ? (
                  <img
                    src={c.image}
                    alt={c.name}
                    className="h-3.5 w-3.5 rounded-full object-cover border border-white/40"
                  />
                ) : (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/25 text-[9px] font-bold uppercase">
                    {c.name.charAt(0)}
                  </span>
                )}
                <span className="truncate max-w-[100px]">{c.name}</span>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </g>
  );
}
