'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { CommentElement } from '@/lib/whiteboard/whiteboard-types';
import { useWhiteboardStore } from '@/lib/store/whiteboard-store';
import { useOnClickOutside } from '@/lib/hooks/useOnClickOutside';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import {
  MessageSquare,
  Send,
  MoreHorizontal,
  CheckCircle2,
  Trash2,
  Check,
  AtSign,
  X,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CommentThreadProps {
  element: CommentElement;
  isSelected?: boolean;
  onSelect?: () => void;
}

const MENTION_OPTIONS = [
  { id: 'user', label: 'User', description: 'Current User' },
  { id: 'eraser-ai', label: 'Eraser AI', description: 'AI Assistant' },
  { id: 'team', label: 'Team', description: 'All Workspace Members' },
];

function formatTimeAgo(timestamp?: number): string {
  if (!timestamp) return 'Recently';
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

const autoResizeTextarea = (target: HTMLTextAreaElement | null) => {
  if (!target) return;
  target.style.height = 'auto';
  const scrollH = target.scrollHeight;
  const nextHeight = Math.min(scrollH, 210);
  target.style.height = `${Math.max(24, nextHeight)}px`;
  if (scrollH > 210) {
    target.style.overflowY = 'auto';
  } else {
    target.style.overflowY = 'hidden';
  }
};

export function CommentThread({ element }: CommentThreadProps) {
  const {
    updateElement,
    deleteElements,
    toggleResolvedComment,
    addCommentReply,
    editCommentText,
    deleteCommentReply,
  } = useWhiteboardStore();

  const isDraft = element.isDraft || element.text === 'Add a comment...' || element.text.trim() === '';
  const authorName = element.author && element.author !== 'You' ? element.author : 'User';
  const authorInitial = authorName.charAt(0).toUpperCase() || 'U';

  // State
  const [isOpen, setIsOpen] = useState(isDraft);
  const [isHovered, setIsHovered] = useState(false);
  const [draftText, setDraftText] = useState(element.text === 'Add a comment...' ? '' : element.text);
  const [replyText, setReplyText] = useState('');
  const [editingMainText, setEditingMainText] = useState(false);
  const [mainEditText, setMainEditText] = useState(element.text);
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [replyEditText, setReplyEditText] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [showResolvedReplies, setShowResolvedReplies] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [mentionTarget, setMentionTarget] = useState<'draft' | 'reply' | 'editMain' | 'editReply' | null>(null);
  const [prevDraft, setPrevDraft] = useState(isDraft);

  const containerRef = useRef<HTMLDivElement>(null);
  const draftTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Close panel or auto-delete empty comment on outside click (unfocus) via reusable hook
  useOnClickOutside(
    containerRef,
    useCallback(() => {
      const hasNoMessage =
        isDraft ||
        !element.text ||
        element.text.trim() === '' ||
        element.text === 'Add a comment...';

      if (hasNoMessage && !draftText.trim()) {
        deleteElements([element.id]);
        return;
      }

      setIsOpen(false);
      setShowMenu(false);
    }, [isDraft, element.text, element.id, draftText, deleteElements]),
    isOpen
  );

  // Keep a draft comment open whenever it (re)enters draft state (e.g. after undo).
  // Adjusted during render — the React-recommended alternative to setting state in an effect.
  if (prevDraft !== isDraft) {
    setPrevDraft(isDraft);
    if (isDraft) {
      setIsOpen(true);
    }
  }

  // Auto-focus draft textarea on spawn
  useEffect(() => {
    if (isDraft && draftTextareaRef.current) {
      draftTextareaRef.current.focus();
      autoResizeTextarea(draftTextareaRef.current);
    }
  }, [isDraft]);

  // Stop wheel event propagation to prevent canvas zooming/panning while scrolling comment thread
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation();
    };
    node.addEventListener('wheel', handleWheel, { passive: true });
    return () => node.removeEventListener('wheel', handleWheel);
  }, []);

  const isCardVisible = isOpen || isHovered;

  // Submit root comment (from draft state)
  const handleSubmitDraft = () => {
    if (!draftText.trim()) {
      deleteElements([element.id]);
      return;
    }
    updateElement(element.id, {
      text: draftText.trim(),
      author: 'User',
      isDraft: false,
      createdAt: element.createdAt || Date.now(),
    });
  };

  // Submit reply
  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    addCommentReply(element.id, replyText.trim(), 'User');
    setReplyText('');
    if (replyTextareaRef.current) {
      replyTextareaRef.current.style.height = '28px';
    }
  };

  // Save main edit
  const handleSaveMainEdit = () => {
    if (!mainEditText.trim()) return;
    editCommentText(element.id, mainEditText.trim());
    setEditingMainText(false);
  };

  // Save reply edit
  const handleSaveReplyEdit = (replyId: string) => {
    if (!replyEditText.trim()) return;
    editCommentText(element.id, replyEditText.trim(), replyId);
    setEditingReplyId(null);
  };

  // Handle @ mention typing detection
  const handleTextChange = (
    val: string,
    setVal: (v: string) => void,
    target: 'draft' | 'reply' | 'editMain' | 'editReply'
  ) => {
    setVal(val);
    if (val.endsWith('@')) {
      setShowMentionMenu(true);
      setMentionTarget(target);
    } else if (showMentionMenu && !val.includes('@')) {
      setShowMentionMenu(false);
    }
  };

  const handleSelectMention = (mentionName: string) => {
    if (mentionTarget === 'draft') {
      setDraftText((prev) => prev.replace(/@\w*$/, `@${mentionName} `));
    } else if (mentionTarget === 'reply') {
      setReplyText((prev) => prev.replace(/@\w*$/, `@${mentionName} `));
    } else if (mentionTarget === 'editMain') {
      setMainEditText((prev) => prev.replace(/@\w*$/, `@${mentionName} `));
    } else if (mentionTarget === 'editReply') {
      setReplyEditText((prev) => prev.replace(/@\w*$/, `@${mentionName} `));
    }
    setShowMentionMenu(false);
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-start select-none font-sans pointer-events-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Canvas Pin Anchor */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          'relative flex h-7 w-7 items-center justify-center rounded-full border shadow-md transition-all cursor-pointer z-10 shrink-0 pointer-events-auto',
          isDraft
            ? 'bg-[#1c1c1e] border-[#333338] text-white hover:scale-105'
            : 'bg-blue-600 border-white/20 text-white font-semibold text-xs hover:scale-105',
          element.resolved && 'opacity-70 bg-emerald-600/90 border-emerald-400'
        )}
        title={element.resolved ? 'Resolved Thread (Click to expand)' : 'Thread Pin (Click to toggle view)'}
      >
        {isDraft ? (
          <MessageSquare className="h-3.5 w-3.5 fill-current" />
        ) : element.resolved ? (
          <Check className="h-4 w-4 stroke-[3]" />
        ) : (
          <span>{authorInitial}</span>
        )}
      </button>

      {/* Floating Mention Suggestions Popover */}
      {showMentionMenu && (
        <div className="absolute left-10 top-0 z-50 w-48 rounded-lg border border-[#2c2c30] bg-[#1a1a1e] p-1 shadow-2xl backdrop-blur-md pointer-events-auto">
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <AtSign className="h-3 w-3" /> Mention Collaborator
          </div>
          {MENTION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleSelectMention(opt.label)}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs text-foreground hover:bg-blue-600/20 hover:text-blue-300 text-left transition-colors"
            >
              <div className="font-medium">@{opt.label}</div>
              <span className="text-[10px] text-muted-foreground">{opt.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* Expanded Thread Card Popover */}
      {isCardVisible && (
        <div className="ml-2.5 z-20 flex flex-col pointer-events-auto" onClick={(e) => e.stopPropagation()}>
          {isDraft ? (
            /* 1. DRAFT COMMENT CARD MODE */
            <div className="w-[420px] max-h-[450px] overflow-y-auto rounded-xl border border-[#2c2c30] bg-[#141416]/95 p-3 shadow-2xl backdrop-blur-md text-foreground [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-thumb]:bg-blue-500/50 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-button]:w-0 [&::-webkit-scrollbar-button]:h-0">
              <div className="relative flex flex-col gap-2.5 rounded-lg border border-[#2a2a2e] bg-[#1c1c20] p-2.5 focus-within:border-blue-500/60 transition-all">
                <textarea
                  ref={draftTextareaRef}
                  rows={1}
                  value={draftText}
                  onInput={(e) => autoResizeTextarea(e.currentTarget)}
                  onChange={(e) => handleTextChange(e.target.value, setDraftText, 'draft')}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmitDraft();
                    } else if (e.key === 'Escape') {
                      deleteElements([element.id]);
                    }
                  }}
                  placeholder="Add comment. @ to mention and Ctrl+Enter to submit."
                  className="w-full resize-none bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/60 leading-relaxed max-h-[210px] overflow-y-hidden [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-thumb]:bg-blue-500/50 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-button]:w-0 [&::-webkit-scrollbar-button]:h-0"
                />

                <div className="flex items-center justify-between pt-1 border-t border-[#2c2c30]/50">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <AtSign className="h-2.5 w-2.5" /> @ to mention
                  </span>
                  <button
                    onClick={handleSubmitDraft}
                    disabled={!draftText.trim()}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow hover:bg-blue-500 disabled:opacity-40 transition-all cursor-pointer"
                    title="Submit Comment (Ctrl+Enter)"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* 2. SUBMITTED THREAD CARD MODE */
            <div
              className={cn(
                'w-[420px] rounded-xl border border-[#2c2c30] bg-[#141416]/95 p-3 shadow-2xl backdrop-blur-md text-foreground flex flex-col gap-3 transition-all',
                element.resolved && 'border-emerald-500/40 bg-[#121814]/95'
              )}
            >
              {/* Thread Header: Author Avatar + Name + Timestamp + Edit + Options Menu */}
              <div className="flex items-center justify-between border-b border-[#2a2a2e] pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white shadow-sm shrink-0"
                    title="User (Authentication Placeholder)"
                  >
                    {authorInitial}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">{authorName}</span>
                    <span className="text-[11px] text-muted-foreground">{formatTimeAgo(element.createdAt)}</span>
                    {!element.resolved && !editingMainText && (
                      <button
                        onClick={() => {
                          setEditingMainText(true);
                          setMainEditText(element.text);
                        }}
                        className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors ml-1 cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Dropdown Menu Toggle */}
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-[#26262a] hover:text-foreground transition-colors cursor-pointer"
                    title="Thread Options"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>

                  {/* Dropdown Options Popup */}
                  {showMenu && (
                    <div className="absolute right-0 top-7 z-50 w-48 rounded-lg border border-[#2c2c30] bg-[#1a1a1e] p-1 shadow-2xl backdrop-blur-md">
                      <button
                        onClick={() => {
                          toggleResolvedComment(element.id);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-[#28282e] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span>{element.resolved ? 'Reopen Thread' : 'Resolve Thread'}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">Alt R</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowConfirmDelete(true);
                          setShowMenu(false);
                        }}
                        className="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete Thread</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">Alt D</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Main Comment Content */}
              {editingMainText && !element.resolved ? (
                <div className="flex flex-col gap-2 rounded-lg border border-[#2a2a2e] bg-[#1c1c20] p-2">
                  <textarea
                    ref={(node) => autoResizeTextarea(node)}
                    rows={1}
                    value={mainEditText}
                    onInput={(e) => autoResizeTextarea(e.currentTarget)}
                    onChange={(e) => handleTextChange(e.target.value, setMainEditText, 'editMain')}
                    className="w-full resize-none bg-transparent text-xs text-foreground outline-none leading-relaxed max-h-[210px] overflow-y-hidden [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-thumb]:bg-blue-500/50 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-button]:w-0 [&::-webkit-scrollbar-button]:h-0"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => setEditingMainText(false)}
                      className="px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveMainEdit}
                      className="rounded bg-blue-600 px-2.5 py-0.5 text-[11px] font-medium text-white hover:bg-blue-500"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap px-0.5">
                  {element.text}
                </div>
              )}

              {/* Thread Status Banner if Resolved */}
              {element.resolved && (
                <div className="flex items-center justify-between gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 text-xs text-emerald-400">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="font-medium">Thread resolved</span>
                  </div>
                  <button
                    onClick={() => toggleResolvedComment(element.id)}
                    className="text-[11px] font-medium text-emerald-400/80 hover:text-emerald-300 underline underline-offset-2 transition-colors cursor-pointer"
                  >
                    Unresolve
                  </button>
                </div>
              )}

              {/* Resolved Replies Collapsible Header */}
              {element.resolved && element.replies && element.replies.length > 0 && (
                <div className="flex items-center justify-between border-t border-[#2a2a2e] pt-2">
                  <button
                    onClick={() => setShowResolvedReplies((prev) => !prev)}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer transition-colors"
                  >
                    <span>
                      {showResolvedReplies
                        ? 'Hide replies'
                        : `View ${element.replies.length} ${element.replies.length === 1 ? 'reply' : 'replies'} (Read-only)`}
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 transition-transform duration-200',
                        showResolvedReplies && 'rotate-180'
                      )}
                    />
                  </button>
                </div>
              )}

              {/* Replies Stack */}
              {element.replies && element.replies.length > 0 && (!element.resolved || showResolvedReplies) && (
                <div className="flex flex-col gap-2.5 border-t border-[#2a2a2e] pt-2.5 max-h-[250px] overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-thumb]:bg-blue-500/50 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-button]:w-0 [&::-webkit-scrollbar-button]:h-0">
                  {element.replies.map((reply) => {
                    const rAuthor = reply.author || 'User';
                    const rInitial = rAuthor.charAt(0).toUpperCase() || 'U';
                    const isEditingThis = editingReplyId === reply.id;

                    return (
                      <div key={reply.id} className="flex flex-col gap-1 rounded-lg bg-[#18181c] p-2 border border-[#242428]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shrink-0">
                              {rInitial}
                            </div>
                            <span className="text-[11px] font-semibold text-foreground">{rAuthor}</span>
                            <span className="text-[10px] text-muted-foreground">{formatTimeAgo(reply.createdAt)}</span>
                          </div>

                          {!element.resolved && (
                            <div className="flex items-center gap-1">
                              {!isEditingThis && (
                                <button
                                  onClick={() => {
                                    setEditingReplyId(reply.id);
                                    setReplyEditText(reply.text);
                                  }}
                                  className="text-[10px] text-muted-foreground hover:text-blue-400"
                                  title="Edit reply"
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={() => deleteCommentReply(element.id, reply.id)}
                                className="text-[10px] text-muted-foreground hover:text-red-400 ml-1"
                                title="Delete reply"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {!element.resolved && isEditingThis ? (
                          <div className="flex flex-col gap-1.5 mt-1">
                            <textarea
                              ref={(node) => autoResizeTextarea(node)}
                              rows={1}
                              value={replyEditText}
                              onInput={(e) => autoResizeTextarea(e.currentTarget)}
                              onChange={(e) => handleTextChange(e.target.value, setReplyEditText, 'editReply')}
                              className="w-full resize-none rounded bg-[#1f1f24] p-1.5 text-xs text-foreground outline-none border border-[#2c2c32] leading-relaxed max-h-[210px] overflow-y-hidden [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-thumb]:bg-blue-500/50 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-button]:w-0 [&::-webkit-scrollbar-button]:h-0"
                              autoFocus
                            />
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditingReplyId(null)}
                                className="px-2 py-0.5 text-[10px] text-muted-foreground"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveReplyEdit(reply.id)}
                                className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-blue-500"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap pl-6">
                            {reply.text}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reply Input Box (Bottom) - Only when NOT resolved */}
              {!element.resolved && (
                <div className="flex items-start gap-2 border-t border-[#2a2a2e] pt-2">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white shrink-0 mt-0.5"
                    title="User (Authentication Placeholder)"
                  >
                    U
                  </div>

                  <div className="relative flex flex-1 items-start rounded-lg border border-[#2a2a2e] bg-[#1c1c20] p-2 focus-within:border-blue-500/60 transition-all">
                    <textarea
                      ref={(node) => {
                        replyTextareaRef.current = node;
                        autoResizeTextarea(node);
                      }}
                      rows={1}
                      value={replyText}
                      onInput={(e) => autoResizeTextarea(e.currentTarget)}
                      onChange={(e) => handleTextChange(e.target.value, setReplyText, 'reply')}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault();
                          handleSubmitReply();
                        }
                      }}
                      placeholder="Reply. @ to mention and Ctrl+Enter to submit."
                      className="w-full resize-none bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/60 leading-relaxed max-h-[210px] overflow-y-hidden [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[1px] [&::-webkit-scrollbar-thumb]:bg-blue-500/50 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-button]:w-0 [&::-webkit-scrollbar-button]:h-0 pr-8"
                    />

                    <button
                      onClick={handleSubmitReply}
                      disabled={!replyText.trim()}
                      className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow hover:bg-blue-500 disabled:opacity-40 transition-all cursor-pointer"
                      title="Send Reply (Ctrl+Enter)"
                    >
                      <Send className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Reusable DRY Delete Thread Confirmation Modal */}
      <ConfirmationModal
        open={showConfirmDelete}
        onOpenChange={setShowConfirmDelete}
        title="Delete Comment Thread?"
        description="Are you sure you want to delete this comment thread and all its replies? This action cannot be undone."
        variant="destructive"
        confirmLabel="Delete Thread"
        confirmIcon={<Trash2 className="h-3.5 w-3.5" />}
        onConfirm={() => {
          deleteElements([element.id]);
          setShowConfirmDelete(false);
        }}
      />
    </div>
  );
}
