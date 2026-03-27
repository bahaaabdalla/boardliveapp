import { useEffect, useState } from "react";
import { useEditor, TLRecord, StoreListener } from "tldraw";
import { createClient } from "@/lib/supabase/client";

export function useSupabaseSync(roomId: string, isHost: boolean) {
  const editor = useEditor();
  const supabase = createClient();
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    if (!editor) return;

    // Supabase channel for this specific board
    const channel = supabase.channel(`board:${roomId}`, {
      config: {
        broadcast: { ack: false }
      }
    });

    // Handle incoming changes from other users
    channel.on(
      "broadcast",
      { event: "board-changes" },
      ({ payload }) => {
        // Only apply if it's not our own change
        try {
          // Merge remote changes into local store
          editor.store.mergeRemoteChanges(() => {
            const { added, updated, removed } = payload;
            
            // Add new records
            if (added) {
              for (const record of Object.values(added) as TLRecord[]) {
                editor.store.put([record]);
              }
            }
            
            // Update existing records
            if (updated) {
               for (const [from, to] of Object.values(updated) as [TLRecord, TLRecord][]) {
                 editor.store.put([to]);
               }
            }
            
            // Remove deleted records
            if (removed) {
              for (const record of Object.values(removed) as TLRecord[]) {
                editor.store.remove([record.id]);
              }
            }
          });
        } catch (err) {
          console.error("Error merging remote changes", err);
        }
      }
    );

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setIsSynced(true);
      }
    });

    // Viewers: Listen for host's camera sync
    channel.on(
      "broadcast",
      { event: "board-camera" },
      ({ payload }) => {
        if (!isHost && payload) {
          try {
            editor.setCamera(payload, { animation: { duration: 0 } });
          } catch(err) {} // Fail gracefully if tldraw unmounts during sync
        }
      }
    );

    // Listen to local changes and broadcast them
    const cleanupListener = editor.store.listen(
      (update) => {
        if (update.source !== "user") return; // Only broadcast user-initiated changes
        
        // If not host and we enforce view-only, we shouldn't broadcast mutations (or even allow them)
        // But tldraw readonly mode handles the UI aspect. We double check here.
        if (!isHost) return;

        channel.send({
          type: "broadcast",
          event: "board-changes",
          payload: {
            added: update.changes.added,
            updated: update.changes.updated,
            removed: update.changes.removed,
          },
        });
      },
      { source: "user", scope: "document" } // Only listen to document changes, not ephemeral state like selection
    );

    // Host: Broadcast camera state at 10fps (to respect Supabase 10 messages/sec limit)
    let cameraInterval: any;
    if (isHost) {
      let lastCameraStr = "";
      cameraInterval = setInterval(() => {
        const cam = editor.getCamera();
        const camStr = `${cam.x},${cam.y},${cam.z}`;
        
        if (camStr !== lastCameraStr) {
          lastCameraStr = camStr;
          channel.send({
            type: "broadcast",
            event: "board-camera",
            payload: cam
          });
        }
      }, 100);
    }

    return () => {
      if (cameraInterval) clearInterval(cameraInterval);
      cleanupListener();
      supabase.removeChannel(channel);
    };
  }, [editor, roomId, isHost, supabase]);

  return { isSynced };
}
