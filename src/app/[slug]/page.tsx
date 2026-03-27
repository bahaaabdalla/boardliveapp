"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Zap, MessageSquare, Radio, Copy, Square, StopCircle, X, Monitor } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateLiveKitToken, checkIsHost } from "./actions";
import { LiveAudioRoom } from "@/components/livekit/audio-room";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiveBoard } from "@/components/board/live-board";
import { PresentationView } from "@/components/presentation/presentation-view";
import { CommentsSidebar } from "@/components/comments/comments-sidebar";
import { useSessionState } from "@/hooks/use-session-state";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SessionPage() {
  const { slug } = useParams() as { slug: string };
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);

  const [lkToken, setLkToken] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [participantId, setParticipantId] = useState<string>("");
  const [userName, setUserName] = useState("");

  const [guestName, setGuestName] = useState("");
  const [needsNamePrompt, setNeedsNamePrompt] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [unreadComments, setUnreadComments] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const commentsOpenRef = useRef(false);
  commentsOpenRef.current = commentsOpen;

  const supabase = createClient();
  const serverUrl =
    process.env.NEXT_PUBLIC_LIVEKIT_URL ||
    "wss://liveboard-app-whf1q79s.livekit.cloud";

  // Shared session state — roomId uses sessionData.id when available
  const roomId = sessionData?.id || slug;
  const {
    state: sessionState,
    setActiveMode,
    setCurrentSlide,
    setPresentationState,
    setMicPermission,
    endSession,
    connected: stateConnected,
  } = useSessionState(roomId, isHost);

  // ── Recording ──────────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: true,
        audio: true,
      });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style.display = "none";
        a.href = url;
        a.download = `LiveBoard_${new Date()
          .toISOString()
          .replace(/[:.]/g, "-")}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);

      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      };
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        ?.getTracks()
        .forEach((t) => t.stop());
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // ── Comments ───────────────────────────────────────────────────────────────
  const handleNewComment = useCallback(() => {
    if (!commentsOpenRef.current) {
      setUnreadComments((prev) => prev + 1);
    }
  }, []);

  // ── Session load ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadSession() {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        if (error?.message?.includes("relation") || error?.code === "42P01") {
          console.warn("Table does not exist, using mock data for demo.");
          setSessionData({
            id: "test",
            slug,
            title: "Mock Session",
            status: "live",
            active_tab: "board",
          });
        } else {
          router.push("/");
          return;
        }
      } else {
        setSessionData(data);
        if (data.status === "ended") {
          setLoading(false);
          return;
        }
      }

      try {
        const { isHost: hostCheck } = await checkIsHost(slug);
        if (hostCheck) {
          setIsHost(true);
          setUserName("Host");
          const result = await generateLiveKitToken(slug, "Host");
          if (result.token) {
            setLkToken(result.token);
            setParticipantId(result.userName || "Host");
          }
        } else {
          setIsHost(false);
          const savedGuest = sessionStorage.getItem(`liveboard_guest_${slug}`);
          if (savedGuest) {
            try {
              const result = await generateLiveKitToken(slug, savedGuest);
              setLkToken(result.token);
              setUserName(result.userName || savedGuest);
              setParticipantId(result.userName || savedGuest);
              setNeedsNamePrompt(false);
            } catch {
              setNeedsNamePrompt(true);
            }
          } else {
            setNeedsNamePrompt(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch host status", err);
      }

      setLoading(false);
    }
    loadSession();
  }, [slug, supabase, router]);

  // ── Loading / gate screens ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (needsNamePrompt) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="max-w-md w-full border rounded-xl p-8 bg-card shadow-lg text-center space-y-6">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Zap className="h-6 w-6" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Join Live Session
          </h1>
          <p className="text-muted-foreground">
            {sessionData?.title
              ? `Join "${sessionData.title}"`
              : "Enter your name to watch the live session"}
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!guestName.trim()) return;
              setLoading(true);
              setNeedsNamePrompt(false);
              try {
                const result = await generateLiveKitToken(
                  slug,
                  guestName.trim()
                );
                setLkToken(result.token);
                setIsHost(result.isHost);
                setUserName(result.userName || guestName.trim());
                setParticipantId(result.userName || guestName.trim());
                sessionStorage.setItem(
                  `liveboard_guest_${slug}`,
                  guestName.trim()
                );
              } catch (err) {
                console.error(err);
                setNeedsNamePrompt(true);
              }
              setLoading(false);
            }}
            className="space-y-4 pt-4"
          >
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your Name (e.g., John Doe)"
              required
              autoFocus
              className="text-center"
              maxLength={30}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={!guestName.trim() || loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Join as Viewer"
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (sessionState.status === "ended") {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="max-w-md w-full border rounded-xl p-8 bg-card shadow-lg text-center space-y-6">
          <div className="flex justify-center mb-2">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <Zap className="h-6 w-6 opacity-50" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Session Ended</h1>
          <p className="text-muted-foreground">
            The host has closed this session.
          </p>
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="w-full"
          >
            Return Home
          </Button>
        </div>
      </div>
    );
  }

  const activeMode = sessionState.activeMode;

  return (
    <div className="h-screen w-full bg-background text-foreground flex flex-col overflow-hidden">
      {/* ── Main header ──────────────────────────────────────────────────── */}
      <header className="border-b bg-card shrink-0">
        {/* Row 1: always visible */}
        <div className="flex items-center justify-between px-3 h-12 gap-2">
          {/* Left: title + copy link */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-sm truncate max-w-[120px] sm:max-w-[200px]">
              {sessionData?.title || slug}
            </span>
            <button
              className={`shrink-0 p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors ${
                linkCopied ? "text-emerald-500" : ""
              }`}
              onClick={copyLink}
              title="Copy session link"
            >
              {linkCopied ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Viewer: LIVE badge */}
            {!isHost && (
              <div className="live-indicator ml-1">
                <Radio className="h-3 w-3" />
                <span>LIVE</span>
              </div>
            )}
          </div>

          {/* Right: audio + comments */}
          <div className="flex items-center gap-1.5 shrink-0">
            {lkToken ? (
              <LiveAudioRoom
                token={lkToken}
                serverUrl={serverUrl}
                isHost={isHost}
                micAllowed={
                  isHost ||
                  sessionState.micPermissions[participantId] === true
                }
                participantId={participantId}
                onGrantMic={
                  isHost
                    ? (pid: string) => setMicPermission(pid, true)
                    : undefined
                }
                onRevokeMic={
                  isHost
                    ? (pid: string) => setMicPermission(pid, false)
                    : undefined
                }
                micPermissions={isHost ? sessionState.micPermissions : undefined}
              />
            ) : (
              <span className="text-xs text-destructive">Audio off</span>
            )}

            {/* Comments toggle */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const newOpen = !commentsOpen;
                  setCommentsOpen(newOpen);
                  if (newOpen) setUnreadComments(0);
                }}
                title="Comments"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              {unreadComments > 0 && (
                <span className="unread-badge">
                  {unreadComments > 99 ? "99+" : unreadComments}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Row 2 (host only): mode tabs + action buttons */}
        {isHost && (
          <div className="flex flex-wrap items-center gap-2 px-3 pb-2 border-t pt-1.5">
            {/* Mode tabs */}
            <Tabs
              value={activeMode}
              onValueChange={(v) =>
                setActiveMode(v as "board" | "presentation")
              }
            >
              <TabsList className="h-8">
                <TabsTrigger value="board" className="text-xs px-3">
                  Whiteboard
                </TabsTrigger>
                <TabsTrigger value="presentation" className="text-xs px-3">
                  Presentation
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Record button */}
            {isRecording ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={stopRecording}
                className="h-8 gap-1.5 text-xs"
                title="Stop recording and download"
              >
                <StopCircle className="h-3.5 w-3.5" />
                <span>Stop & Save</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={startRecording}
                className="h-8 gap-1.5 text-xs"
                title="Record your screen for this session"
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>Record</span>
              </Button>
            )}

            {/* Close session */}
            <Button
              variant="destructive"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              title="End session for all viewers"
              onClick={() => {
                if (
                  confirm(
                    "End this session? All viewers will be disconnected."
                  )
                ) {
                  if (isRecording) stopRecording();
                  endSession();
                }
              }}
            >
              <X className="h-3.5 w-3.5" />
              <span>Close Session</span>
            </Button>
          </div>
        )}
      </header>

      {/* Viewer: mode indicator */}
      {!isHost && (
        <div className="h-7 border-b bg-muted/30 flex items-center justify-center text-xs text-muted-foreground gap-2 shrink-0">
          <span className="font-medium">
            {activeMode === "board" ? "📋 Whiteboard" : "📊 Presentation"}
          </span>
          <span className="text-muted-foreground/60">— Controlled by host</span>
        </div>
      )}

      {/* ── Main workspace ──────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 relative bg-muted/20">
          {/* Whiteboard — always mounted, hidden when not active */}
          <div
            className="absolute inset-0"
            style={{ display: activeMode === "board" ? "block" : "none" }}
          >
            <LiveBoard roomId={roomId} isHost={isHost} />
          </div>

          {/* Presentation — always mounted, hidden when not active */}
          <div
            className="absolute inset-0"
            style={{
              display: activeMode === "presentation" ? "flex" : "none",
            }}
          >
            <PresentationView
              roomId={roomId}
              isHost={isHost}
              presentationState={sessionState.presentation}
              initialPage={sessionState.currentSlide}
              initialPages={sessionState.numPages}
              onPresentationChange={(p, page, pages) => {
                setPresentationState(p, pages);
                setCurrentSlide(page);
              }}
            />
          </div>
        </main>

        {/* Comments sidebar */}
        <CommentsSidebar
          roomId={roomId}
          userName={userName || "Anonymous"}
          isOpen={commentsOpen}
          onClose={() => setCommentsOpen(false)}
          onNewComment={handleNewComment}
        />
      </div>
    </div>
  );
}
