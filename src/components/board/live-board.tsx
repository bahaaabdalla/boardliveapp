"use client";

import { useEffect, useMemo, useCallback } from "react";
import { Tldraw, useEditor, Editor, AssetRecordType, MediaHelpers } from "tldraw";
import "tldraw/tldraw.css";
import { useSupabaseSync } from "./use-supabase-sync";
import { uploadBoardAsset } from "./board-asset-store";

interface LiveBoardProps {
  roomId: string;
  isHost: boolean;
}

export function LiveBoard({ roomId, isHost }: LiveBoardProps) {
  /**
   * Custom asset handlers to fix image sync for viewers.
   *
   * Problem: by default, tldraw stores images as local blob: URLs which are
   * only meaningful in the browser that created them.
   *
   * Fix: hook into Tldraw's onMount lifecycle and register our own
   * 'file' external asset handler. When the host drops/pastes an image,
   * we upload it to Supabase Storage and issue an asset record containing
   * the public HTTPS URL so viewers can see it too.
   */
  const handleMount = useCallback((editor: Editor) => {
    if (!isHost) return;

    editor.registerExternalAssetHandler('file', async ({ file }) => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        throw new Error('Unsupported file type');
      }
      
      const id = AssetRecordType.createId(crypto.randomUUID());

      try {
        const publicUrl = await uploadBoardAsset(
          file,
          roomId,
          file.type || "image/png"
        );

        let w = 500;
        let h = 500;
        try {
          if (file.type.startsWith('image/')) {
             const size = await MediaHelpers.getImageSize(file) as any;
             if (size) { w = size.w; h = size.h; }
          } else {
             const size = await MediaHelpers.getVideoSize(file) as any;
             if (size) { w = size.w; h = size.h; }
          }
        } catch (e) {
          console.warn("Could not get media size", e);
        }

        return {
          id,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          typeName: 'asset',
          props: {
            name: file.name,
            src: publicUrl,
            w,
            h,
            mimeType: file.type,
            isAnimated: false,
          },
          meta: {}
        } as any;
      } catch (err) {
        console.error("Failed to upload board asset:", err);
        throw err;
      }
    });
  }, [roomId, isHost]);

  const components = useMemo(
    () => ({
      InFrontOfTheCanvas: () => (
        <BoardSyncMonitor roomId={roomId} isHost={isHost} />
      ),
    }),
    [roomId, isHost]
  );

  return (
    <div
      className={`absolute inset-0 w-full h-full min-h-[500px] flex flex-col overflow-hidden tldraw-container ${
        !isHost ? "pointer-events-none" : ""
      }`}
      style={{ touchAction: "none" }}
    >
      <Tldraw
        licenseKey={process.env.NEXT_PUBLIC_TLDRAW_LICENSE}
        persistenceKey={roomId}
        hideUi={!isHost}
        onMount={handleMount}
        components={components}
      />
    </div>
  );
}

// Inner component to access the `editor` hook context provided by <Tldraw/>
function BoardSyncMonitor({
  roomId,
  isHost,
}: {
  roomId: string;
  isHost: boolean;
}) {
  const editor = useEditor();
  const { isSynced } = useSupabaseSync(roomId, isHost);

  useEffect(() => {
    // Force read-only if not host
    editor.updateInstanceState({ isReadonly: !isHost });
  }, [editor, isHost]);

  return (
    <div className="absolute bottom-4 left-4 p-2 bg-background/80 rounded border shadow-sm text-xs text-muted-foreground flex items-center gap-2 pointer-events-none">
      <div
        className={`h-2 w-2 rounded-full ${
          isSynced ? "bg-emerald-500" : "bg-destructive animate-pulse"
        }`}
      />
      {isSynced ? "Board synced" : "Connecting..."}
    </div>
  );
}
