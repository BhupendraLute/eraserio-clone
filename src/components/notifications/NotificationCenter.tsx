'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Mail, CheckCircle2, Shield, Users, FileText, CheckCheck, Trash2, X, ExternalLink } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread');
  const router = useRouter();

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok && !ignore) {
          const data = await res.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch {
        // silent catch
      }
    }

    void load();
    const interval = setInterval(() => void load(), 15000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, []);

  const markAsRead = async (id?: string, all?: boolean) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(all ? { all: true } : { id }),
      });

      if (res.ok) {
        if (all) {
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
          setUnreadCount(0);
          toast.success('All notifications marked as read');
        } else if (id) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
          );
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch {
      toast.error('Failed to update notification');
    }
  };

  const deleteNotification = async (id?: string, all?: boolean) => {
    try {
      const url = all ? '/api/notifications?all=true' : `/api/notifications?id=${id}`;
      const res = await fetch(url, { method: 'DELETE' });

      if (res.ok) {
        if (all) {
          setNotifications([]);
          setUnreadCount(0);
          toast.info('Notifications cleared');
        } else if (id) {
          const item = notifications.find((n) => n.id === id);
          if (item && !item.read) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
          setNotifications((prev) => prev.filter((n) => n.id !== id));
        }
      }
    } catch {
      toast.error('Failed to delete notification');
    }
  };

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.read) {
      void markAsRead(n.id);
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'INVITE_RECEIVED':
        return <Mail className="h-4 w-4 text-blue-400" />;
      case 'INVITE_ACCEPTED':
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case 'ROLE_UPDATED':
        return <Shield className="h-4 w-4 text-amber-400" />;
      case 'MEMBER_JOINED':
      case 'MEMBER_REMOVED':
        return <Users className="h-4 w-4 text-purple-400" />;
      case 'DOCUMENT_SHARED':
        return <FileText className="h-4 w-4 text-cyan-400" />;
      default:
        return <Bell className="h-4 w-4 text-blue-400" />;
    }
  };

  const displayedList = notifications.filter((n) => (activeTab === 'unread' ? !n.read : true));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="Open notifications"
        className="relative p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors outline-none focus:outline-none cursor-pointer"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white shadow-md animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 bg-[#161618] border-zinc-800 text-zinc-100 shadow-2xl rounded-2xl overflow-hidden backdrop-blur-xl"
      >
        {/* Header Bar */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-extrabold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
                {unreadCount} new
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAsRead(undefined, true)}
                className="h-7 px-2 text-[11px] text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1 rounded-lg"
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                <span>Read all</span>
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteNotification(undefined, true)}
                className="h-7 px-1.5 text-[11px] text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg"
                title="Clear all notifications"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-3 pt-2 pb-1 border-b border-zinc-800/60 bg-[#141416]">
          <button
            onClick={() => setActiveTab('unread')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'unread'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Unread ({notifications.filter((n) => !n.read).length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'all'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({notifications.length})
          </button>
        </div>

        {/* Notifications List */}
        <div className="max-h-80 overflow-y-auto custom-scrollbar divide-y divide-zinc-800/40">
          {displayedList.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                !n.read ? 'bg-blue-950/15 hover:bg-blue-950/30' : 'hover:bg-zinc-800/40'
              }`}
            >
              <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 shrink-0 mt-0.5">
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-white truncate">{n.title}</span>
                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                    {formatRelativeTime(n.createdAt)}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-300 line-clamp-2 mt-0.5">{n.message}</p>
                {n.link && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:underline mt-1">
                    <span>View updates</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </span>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0">
                {!n.read && <span className="h-2 w-2 rounded-full bg-blue-500 shadow-sm" />}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    void deleteNotification(n.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-all"
                  title="Delete"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}

          {displayedList.length === 0 && (
            <div className="p-8 text-center space-y-2">
              <Bell className="h-8 w-8 text-zinc-600 mx-auto" />
              <div className="text-xs font-semibold text-zinc-400">
                {activeTab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </div>
              <p className="text-[11px] text-zinc-500">
                You will be notified when team members send invites or make updates.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
