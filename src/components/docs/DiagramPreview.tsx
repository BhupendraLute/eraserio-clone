'use client';

import { useMemo } from 'react';
import { runPipelineSync } from '@/lib/dsl/run-pipeline-sync';

interface DiagramPreviewProps {
  source: string;
}

export function DiagramPreview({ source }: DiagramPreviewProps) {
  const result = useMemo(() => runPipelineSync(source), [source]);

  if (!result.ok) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        Diagram error: {result.message}
      </div>
    );
  }

  if (result.kind === 'flowchart') {
    const minX = Math.min(...result.nodes.map((n) => n.x), 0);
    const minY = Math.min(...result.nodes.map((n) => n.y), 0);
    const maxX = Math.max(...result.nodes.map((n) => n.x + n.width), 200);
    const maxY = Math.max(...result.nodes.map((n) => n.y + n.height), 100);
    const pad = 20;

    return (
      <svg
        viewBox={`${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`}
        className="h-auto w-full max-h-96"
      >
        {result.edges.map((edge, i) => (
          <polyline
            key={i}
            points={edge.points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="text-foreground/60"
          />
        ))}
        {result.nodes.map((node) => (
          <g key={node.id}>
            <rect
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              rx={8}
              fill="var(--background)"
              stroke="currentColor"
              className="text-foreground/50"
            />
            <text
              x={node.x + node.width / 2}
              y={node.y + node.height / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={13}
              fill="currentColor"
            >
              {node.lines.join(' ')}
            </text>
          </g>
        ))}
      </svg>
    );
  }

  // Sequence diagram preview
  return (
    <svg viewBox={`0 0 ${result.width} ${result.height}`} className="h-auto w-full max-h-96">
      {result.actors.map((a) => (
        <line
          key={`line-${a.id}`}
          x1={a.x}
          y1={40}
          x2={a.x}
          y2={result.height}
          stroke="currentColor"
          strokeDasharray="4 4"
          className="text-foreground/40"
        />
      ))}
      {result.actors.map((a) => (
        <g key={a.id}>
          <rect
            x={a.x - a.width / 2}
            y={0}
            width={a.width}
            height={40}
            rx={8}
            fill="var(--background)"
            stroke="currentColor"
            className="text-foreground/50"
          />
          <text x={a.x} y={20} textAnchor="middle" dominantBaseline="central" fontSize={12} fill="currentColor">
            {a.label}
          </text>
        </g>
      ))}
      {result.messages.map((m, i) => {
        const from = result.actors.find((a) => a.id === m.from);
        const to = result.actors.find((a) => a.id === m.to);
        if (!from || !to) return null;
        return (
          <line
            key={i}
            x1={from.x}
            y1={m.y}
            x2={to.x}
            y2={m.y}
            stroke="currentColor"
            strokeDasharray={m.arrowType === 'async' ? '4 3' : undefined}
            className="text-foreground/60"
          />
        );
      })}
    </svg>
  );
}