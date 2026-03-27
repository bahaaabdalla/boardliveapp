"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export interface PresentationState {
  url: string | null;
  name: string;
  type: "pdf" | "image";
}

export interface SessionState {
  activeMode: "board" | "presentation";
  currentSlide: number;
  micPermissions: Record<string, boolean>;
  presentation: PresentationState | null;
  numPages: number;
  status: "live" | "ended";
}

const DEFAULT_STATE: SessionState = {
  activeMode: "board",
  currentSlide: 1,
  micPermissions: {},
  presentation: null,
  numPages: 0,
  status: "live",
};

/**
 * Shared session state hook using Supabase Realtime broadcast + DB persistence.
 * Host broadcasts state changes and persists to DB.
 * Viewers subscribe and reflect.
 * On mount, loads persisted state from DB (handles refresh).
 */
export function useSessionState(roomId: string, isHost: boolean) {
  const supabase = createClient();
  const [state, setState] = useState<SessionState>(DEFAULT_STATE);
  const [connected, setConnected] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const channelRef = useRef<any>(null);
  const stateRef = useRef<SessionState>(DEFAULT_STATE);

  // Keep stateRef in sync for use in callbacks
  stateRef.current = state;

  // Load persisted state from DB on mount
  useEffect(() => {
    async function loadPersistedState() {
      try {
        const { data, error } = await supabase
          .from("sessions")
          .select("active_tab, current_slide_index, status")
          .eq("id", roomId)
          .single();

        if (!error && data) {
          const restored: Partial<SessionState> = {};
          if (data.active_tab === "board" || data.active_tab === "presentation") {
            restored.activeMode = data.active_tab;
          }
          if (typeof data.current_slide_index === "number" && data.current_slide_index > 0) {
            restored.currentSlide = data.current_slide_index;
          }
          if (Object.keys(restored).length > 0) {
            setState((prev) => ({ ...prev, ...restored }));
            stateRef.current = { ...stateRef.current, ...restored };
          }
        }
      } catch (err) {
        console.warn("Could not load persisted session state:", err);
      }
      setLoaded(true);
    }

    // Also try loading by slug (fallback)
    async function loadBySlug() {
      try {
        const { data, error } = await supabase
          .from("sessions")
          .select("active_tab, current_slide_index, status")
          .eq("slug", roomId)
          .single();

        if (!error && data) {
          const restored: Partial<SessionState> = {};
          if (data.active_tab === "board" || data.active_tab === "presentation") {
            restored.activeMode = data.active_tab;
          }
          if (typeof data.current_slide_index === "number" && data.current_slide_index > 0) {
            restored.currentSlide = data.current_slide_index;
          }
          if (data.status === "ended") {
            restored.status = "ended";
          }
          if (Object.keys(restored).length > 0) {
            setState((prev) => ({ ...prev, ...restored }));
            stateRef.current = { ...stateRef.current, ...restored };
          }
        }
      } catch {
        // ignore
      }
      setLoaded(true);
    }

    loadPersistedState().then(() => {
      // If roomId looks like a slug (no hyphens typical of UUID), also try slug lookup
      if (!roomId.includes("-")) {
        loadBySlug();
      }
    });
  }, [roomId, supabase]);

  // Subscribe to broadcast channel
  useEffect(() => {
    const channel = supabase.channel(`session-state:${roomId}`, {
      config: { broadcast: { ack: false } },
    });

    channel.on("broadcast", { event: "session-state" }, ({ payload }) => {
      if (!isHost && payload) {
        setState((prev) => ({ ...prev, ...payload }));
        stateRef.current = { ...stateRef.current, ...payload };
      }
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setConnected(true);
        // If host, broadcast current state immediately so late-joining viewers get it
        if (isHost) {
          setTimeout(() => {
            channel.send({
              type: "broadcast",
              event: "session-state",
              payload: stateRef.current,
            });
          }, 500);
        }
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, isHost, supabase]);

  // Persist to DB helper (fire-and-forget)
  const persistToDB = useCallback(
    (newState: SessionState) => {
      // Try both by id and by slug
      supabase
        .from("sessions")
        .update({
          active_tab: newState.activeMode,
          current_slide_index: newState.currentSlide,
        })
        .eq("id", roomId)
        .then(() => {
          // Also try by slug as fallback
          if (!roomId.includes("-")) {
            supabase
              .from("sessions")
              .update({
                active_tab: newState.activeMode,
                current_slide_index: newState.currentSlide,
              })
              .eq("slug", roomId)
              .then();
          }
        });
    },
    [roomId, supabase]
  );

  const broadcast = useCallback(
    (update: Partial<SessionState>) => {
      if (!isHost) return;
      const newState = { ...stateRef.current, ...update };
      setState(newState);
      stateRef.current = newState;

      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "session-state",
          payload: newState,
        });
      }

      // Persist to DB
      persistToDB(newState);
    },
    [isHost, persistToDB]
  );

  const setActiveMode = useCallback(
    (mode: "board" | "presentation") => broadcast({ activeMode: mode }),
    [broadcast]
  );

  const setCurrentSlide = useCallback(
    (slide: number) => broadcast({ currentSlide: slide }),
    [broadcast]
  );

  const setPresentationState = useCallback(
    (presentation: PresentationState | null, numPages: number = 0) => broadcast({ presentation, numPages }),
    [broadcast]
  );

  const setMicPermission = useCallback(
    (participantId: string, allowed: boolean) =>
      broadcast({
        micPermissions: { ...stateRef.current.micPermissions, [participantId]: allowed },
      }),
    [broadcast]
  );

  const endSession = useCallback(() => {
    broadcast({ status: "ended" });
    supabase
      .from("sessions")
      .update({ status: "ended" })
      .eq("id", roomId)
      .then(() => {
        if (!roomId.includes("-")) {
          supabase.from("sessions").update({ status: "ended" }).eq("slug", roomId).then();
        }
      });
  }, [broadcast, roomId, supabase]);

  return {
    state,
    connected,
    loaded,
    setActiveMode,
    setCurrentSlide,
    setPresentationState,
    setMicPermission,
    broadcast,
    endSession,
  };
}
