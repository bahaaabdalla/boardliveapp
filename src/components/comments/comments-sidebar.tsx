"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Comment {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

interface CommentsSidebarProps {
  roomId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onNewComment?: () => void; // called when a remote comment arrives
}

export function CommentsSidebar({ roomId, userName, isOpen, onClose, onNewComment }: CommentsSidebarProps) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState("");
  const channelRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  useEffect(() => {
    const channel = supabase.channel(`comments:${roomId}`, {
      config: { broadcast: { ack: false } },
    });

    channel.on("broadcast", { event: "new-comment" }, ({ payload }) => {
      if (payload) {
        setComments((prev) => [...prev, payload as Comment]);
        // Notify parent about new remote comment for unread tracking
        if (onNewComment) onNewComment();
      }
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // intentionally exclude onNewComment to avoid re-subscribing channel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, supabase]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const sendComment = useCallback(() => {
    if (!input.trim() || !channelRef.current) return;

    const comment: Comment = {
      id: Math.random().toString(36).slice(2),
      author: userName,
      text: input.trim(),
      timestamp: Date.now(),
    };

    // Add locally
    setComments((prev) => [...prev, comment]);

    // Broadcast
    channelRef.current.send({
      type: "broadcast",
      event: "new-comment",
      payload: comment,
    });

    setInput("");
  }, [input, userName]);

  if (!isOpen) return null;

  return (
    <div className="comments-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-card">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <MessageSquare className="h-4 w-4 text-primary" />
          Comments
          {comments.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">({comments.length})</span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded-md text-muted-foreground transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {comments.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs py-8">
            No comments yet. Be the first to say something!
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="space-y-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold text-foreground">{c.author}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{c.text}</p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendComment();
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Write a comment..."
            className="text-sm"
            maxLength={500}
          />
          <Button type="submit" size="sm" disabled={!input.trim()} className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
