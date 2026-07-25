'use client';

import React from 'react';
import { isConnectorElement } from '@/lib/whiteboard/whiteboard-types';

interface MiniMapProps {
  elements: any[];
  transform: { x: number; y: number; scale: number };
  svgRef: React.RefObject<SVGSVGElement | null>;
}

export function MiniMap({ elements, transform, svgRef }: MiniMapProps) {
  const padding = 8;
  const width = 160;
  const height = 100;
  const originVisibleArea = 800; // show 800px of canvas around origin when empty

  // Compute content bounds (use elements or fall back to a fixed area around origin)
  const hasElements = elements.length > 0;
  const minX = hasElements ? Math.min(...elements.map((el) => el.x)) : -originVisibleArea / 2;
  const minY = hasElements ? Math.min(...elements.map((el) => el.y)) : -originVisibleArea / 2;
  const maxX = hasElements ? Math.max(...elements.map((el) => el.x + el.width)) : originVisibleArea / 2;
  const maxY = hasElements ? Math.max(...elements.map((el) => el.y + el.height)) : originVisibleArea / 2;

  const contentW = Math.max(1, maxX - minX);
  const contentH = Math.max(1, maxY - minY);
  const scale = Math.min((width - padding * 2) / contentW, (height - padding * 2) / contentH);

  // Viewport rectangle
  const svg = svgRef?.current;
  let vpRect = null;
  if (svg) {
    const rect = svg.getBoundingClientRect();
    const vpX = (-transform.x / transform.scale - minX) * scale + padding;
    const vpY = (-transform.y / transform.scale - minY) * scale + padding;
    const vpW = (rect.width / transform.scale) * scale;
    const vpH = (rect.height / transform.scale) * scale;
    vpRect = { x: vpX, y: vpY, width: vpW, height: vpH };
  }

  // Origin dot position in minimap space
  const originX = (0 - minX) * scale + padding;
  const originY = (0 - minY) * scale + padding;

  return (
    <div className="absolute bottom-4 left-20 z-40 rounded-lg border bg-background/95 shadow-md backdrop-blur overflow-hidden"
      style={{ width, height }}>
      <svg width={width} height={height} className="block">
        {/* Origin crosshair */}
        <line x1={0} y1={originY} x2={width} y2={originY} stroke="currentColor" strokeWidth={0.5} className="text-foreground/5" />
        <line x1={originX} y1={0} x2={originX} y2={height} stroke="currentColor" strokeWidth={0.5} className="text-foreground/5" />
        <circle cx={originX} cy={originY} r={2} fill="currentColor" className="text-foreground/15" />

        {/* Element shapes */}
        {elements.map((el) => {
          const x = (el.x - minX) * scale + padding;
          const y = (el.y - minY) * scale + padding;
          const w = Math.max(2, el.width * scale);
          const h = Math.max(2, el.height * scale);
          const color = el.strokeColor || '#3b82f6';
          if (isConnectorElement(el)) {
            return <line key={el.id} x1={x} y1={y} x2={x + w} y2={y + h} stroke={color} strokeWidth={1} />;
          }
          return <rect key={el.id} x={x} y={y} width={w} height={h} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={0.5} rx={1} />;
        })}

        {/* Viewport rectangle */}
        {vpRect && (
          <rect x={vpRect.x} y={vpRect.y} width={vpRect.width} height={vpRect.height}
            fill="none" stroke="#3b82f6" strokeWidth={1.5} rx={2} />
        )}
      </svg>
    </div>
  );
}
