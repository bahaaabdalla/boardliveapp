"use client";

import { useEffect, useState } from "react";
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  useLocalParticipant,
  useParticipants,
  useTrackToggle
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Mic, MicOff, Users, AlertCircle, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { Track } from "livekit-client";
import { Button } from "@/components/ui/button";

interface LiveAudioRoomProps {
  token: string;
  serverUrl: string;
  isHost: boolean;
  micAllowed?: boolean;
  participantId?: string;
  participants?: any;
  onGrantMic?: (pid: string) => void;
  onRevokeMic?: (pid: string) => void;
  micPermissions?: Record<string, boolean>;
}

export function LiveAudioRoom({ 
  token, 
  serverUrl, 
  isHost,
  micAllowed = false,
  participantId,
  onGrantMic,
  onRevokeMic,
  micPermissions,
}: LiveAudioRoomProps) {
  return (
    <LiveKitRoom
      video={false}
      audio={false}
      token={token}
      serverUrl={serverUrl}
      connect={true}
      className="flex items-center justify-between bg-card border rounded-lg p-2 px-4 shadow-sm"
    >
      <AudioControls 
        className="flex-1" 
        isHost={isHost} 
        micAllowed={micAllowed}
        onGrantMic={onGrantMic}
        onRevokeMic={onRevokeMic}
        micPermissions={micPermissions}
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

interface AudioControlsProps {
  className?: string;
  isHost?: boolean;
  micAllowed?: boolean;
  onGrantMic?: (pid: string) => void;
  onRevokeMic?: (pid: string) => void;
  micPermissions?: Record<string, boolean>;
}

function AudioControls({ className, isHost, micAllowed, onGrantMic, onRevokeMic, micPermissions }: AudioControlsProps) {
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const canPublish = isHost || micAllowed;
  
  const { toggle, enabled } = useTrackToggle({ source: Track.Source.Microphone });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showParticipants, setShowParticipants] = useState(false);

  const handleToggle = async () => {
    if (!canPublish) return;
    try {
      setErrorMsg(null);
      const res = toggle();
      if (res instanceof Promise) {
        await res;
      }
    } catch (e: any) {
      console.warn("Audio toggle error:", e);
      setErrorMsg("No microphone detected or access denied.");
      setTimeout(() => setErrorMsg(null), 5000);
    }
  };

  // Non-host viewers who have NOT been granted mic
  const viewerNoMic = !isHost && !micAllowed;

  return (
    <div className={`flex flex-col gap-2 ${className || ""}`}>
      <div className="flex items-center gap-4">
        {viewerNoMic ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto bg-muted/50 px-3 py-1.5 rounded-full border">
            <MicOff className="h-4 w-4" />
            <span>Listen only</span>
          </div>
        ) : canPublish ? (
          <Button
            variant={enabled ? "default" : "secondary"}
            size="sm"
            className="gap-2 min-w-[130px]"
            onClick={handleToggle}
          >
            {enabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            {enabled ? "Mic On" : "Enable Mic"}
          </Button>
        ) : null}

        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border ml-auto relative">
          <Users className="h-4 w-4" />
          <span className="font-medium">{participants.length}</span>
          
          {/* Host: participants dropdown to manage mic permissions */}
          {isHost && onGrantMic && (
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="ml-1 cursor-pointer hover:text-foreground transition-colors"
            >
              {showParticipants ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          )}

          {/* Participants dropdown */}
          {isHost && showParticipants && onGrantMic && onRevokeMic && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-card border rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
                Mic Permissions
              </div>
              {participants
                .filter((p) => p.identity !== localParticipant.identity)
                .map((p) => {
                  const allowed = micPermissions?.[p.identity] === true;
                  return (
                    <div key={p.identity} className="flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors">
                      <span className="text-sm truncate flex-1">{p.name || p.identity}</span>
                      <button
                        onClick={() => {
                          if (allowed) onRevokeMic(p.identity);
                          else onGrantMic(p.identity);
                        }}
                        className={`ml-2 p-1 rounded-md transition-colors cursor-pointer ${
                          allowed 
                            ? "bg-emerald-500/10 text-emerald-600 hover:bg-destructive/10 hover:text-destructive" 
                            : "bg-muted text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600"
                        }`}
                        title={allowed ? "Revoke mic" : "Allow mic"}
                      >
                        {allowed ? <Mic className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })}
              {participants.filter((p) => p.identity !== localParticipant.identity).length === 0 && (
                <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                  No viewers connected
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded border border-destructive/20 w-fit">
          <AlertCircle className="h-3 w-3" />
          {errorMsg}
        </div>
      )}
    </div>
  );
}
