'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { Search, X, Loader2 } from 'lucide-react';
import { useIconSearch } from '@/lib/hooks/useIconSearch';
import { useOnClickOutside } from '@/lib/hooks/useOnClickOutside';
import type { CloudIconKind } from '@/lib/whiteboard/whiteboard-types';

export function CloudIconPicker({
  open,
  onOpenChange,
  onSelect,
  positionClass = 'absolute top-12 left-16 z-50',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (kind: CloudIconKind | string) => void;
  positionClass?: string;
}) {
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(
    containerRef,
    useCallback(() => onOpenChange(false), [onOpenChange]),
    open
  );

  const { data: filteredIcons = [], isLoading, isFetching } = useIconSearch(search, 120);

  const setActiveCloudIcon = useWhiteboardStore((s) => s.setActiveCloudIcon);

  if (!open) return null;

  const handleSelectIconDirect = (kind: string) => {
    setActiveCloudIcon(kind as CloudIconKind);
    if (onSelect) {
      onSelect(kind as CloudIconKind);
    }
    onOpenChange(false);
  };

  return (
    <div
      ref={containerRef}
      className={`${positionClass} flex w-96 flex-col rounded-xl border bg-background/95 p-3 shadow-2xl backdrop-blur select-none animate-in fade-in zoom-in-95`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-foreground">
            System Design Icons Catalog
          </span>
          {isFetching && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Search Field */}
      <div className="relative mb-3 flex items-center">
        <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search icons (e.g. ec2, loadbalancer, s3, rds, redis, kafka)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-full rounded-lg border bg-muted/30 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />
      </div>

      {/* Dynamic Search Grid */}
      <div className="max-h-64 overflow-auto">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
            Loading system icons...
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            {filteredIcons.map((i) => {
              const IconComponent = i.icon;
              if (
                typeof IconComponent !== 'function' &&
                (typeof IconComponent !== 'object' || !IconComponent || !(IconComponent as any).render)
              ) {
                return null;
              }
              return (
                <button
                  key={i.kind}
                  onClick={() => handleSelectIconDirect(i.kind)}
                  className="flex flex-col items-center justify-center rounded-lg border bg-background p-2 text-center transition-all hover:bg-primary/10 hover:border-primary group"
                  title={`${i.name} (${i.source})`}
                >
                  <IconComponent className="h-5 w-5 text-foreground/80 mb-1 group-hover:text-primary transition-colors" />
                  <span className="truncate w-full text-[9px] font-medium text-muted-foreground group-hover:text-foreground">
                    {i.name}
                  </span>
                  <span className="text-[8px] text-muted-foreground/60 uppercase scale-90">
                    {i.source}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {!isLoading && filteredIcons.length === 0 && (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No icons found matching &quot;{search}&quot;.
          </div>
        )}
      </div>
    </div>
  );
}
