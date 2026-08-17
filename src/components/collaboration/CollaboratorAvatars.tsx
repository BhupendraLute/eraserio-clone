'use client';

import React from 'react';
import { useCollaborationStore } from '@/lib/collaboration/collaboration-store';
import { Users, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CollaboratorAvatars() {
  const status = useCollaborationStore((s) => s.status);
  const collaboratorsMap = useCollaborationStore((s) => s.collaborators);
  const localUser = useCollaborationStore((s) => s.localUser);
  const followingUserId = useCollaborationStore((s) => s.followingUserId);
  const setFollowingUserId = useCollaborationStore((s) => s.setFollowingUserId);

  const collaborators = Array.from(collaboratorsMap.values());
  const totalUsers = collaborators.length + (localUser ? 1 : 0);

  const maxVisibleAvatars = 3;
  const visibleCollaborators = collaborators.slice(0, maxVisibleAvatars);
  const overflowCount = Math.max(0, collaborators.length - maxVisibleAvatars);

  return (
    <div className="flex items-center gap-2 select-none">
      {/* Live Status Badge */}
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border shadow-xs transition-colors',
          status === 'connected' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
          status === 'connecting' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
          (status === 'disconnected' || status === 'error') && 'bg-muted text-muted-foreground border-transparent'
        )}
        title={`Status: ${status}`}
      >
        {status === 'connected' ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="hidden sm:inline font-semibold">Live</span>
          </>
        ) : status === 'connecting' || status === 'reconnecting' ? (
          <>
            <Wifi className="h-3 w-3 animate-pulse text-amber-500" />
            <span className="hidden sm:inline">Connecting...</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 text-muted-foreground" />
            <span className="hidden sm:inline">Offline</span>
          </>
        )}
      </div>

      {/* Collaborator Avatars */}
      {totalUsers > 0 && (
        <div className="flex items-center -space-x-1.5 overflow-hidden p-0.5">
          {/* Local User Avatar */}
          {localUser && (
            <div
              key="local-user-avatar"
              className="relative group flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-background text-[10px] font-bold text-white shadow-xs"
              style={{ backgroundColor: localUser.color.hex }}
              title={`You (${localUser.name})`}
            >
              {localUser.image ? (
                <img
                  src={localUser.image}
                  alt={localUser.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                localUser.name.charAt(0).toUpperCase()
              )}
              {/* Tooltip */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center rounded-md bg-popover px-2 py-1 text-[10px] text-popover-foreground shadow-md border z-50 whitespace-nowrap">
                <span className="font-semibold">{localUser.name} (You)</span>
              </div>
            </div>
          )}

          {/* Remote Collaborators */}
          {visibleCollaborators.map((c) => {
            const isFollowing = followingUserId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setFollowingUserId(isFollowing ? null : c.id)}
                className={cn(
                  'relative group flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 text-[10px] font-bold text-white shadow-xs transition-all hover:z-10 hover:scale-115',
                  isFollowing ? 'border-amber-400 ring-2 ring-amber-400/50 scale-110 z-10' : 'border-background'
                )}
                style={{ backgroundColor: c.color.hex }}
                title={isFollowing ? `Stop following ${c.name}` : `Follow ${c.name}'s view`}
              >
                {c.image ? (
                  <img src={c.image} alt={c.name} className="h-full w-full rounded-full object-cover" />
                ) : (
                  c.name.charAt(0).toUpperCase()
                )}
                {/* Tooltip */}
                <div className="absolute top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center rounded-md bg-popover px-2.5 py-1 text-[10px] text-popover-foreground shadow-md border z-50 whitespace-nowrap">
                  <span className="font-semibold">{c.name} {isFollowing ? '(Following)' : ''}</span>
                  <span className="text-[9px] text-blue-400">{isFollowing ? 'Click to stop following' : 'Click to follow viewport'}</span>
                </div>
              </div>
            );
          })}

          {/* Overflow Avatar Pill */}
          {overflowCount > 0 && (
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-semibold text-muted-foreground shadow-xs">
              +{overflowCount}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
