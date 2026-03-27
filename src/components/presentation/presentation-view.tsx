"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Presentation, ImageIcon, FileText, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FileUploader } from "./file-uploader";
import dynamic from "next/dynamic";

// Dynamically import the PDF viewer with SSR disabled to prevent DOMMatrix errors
const PdfViewer = dynamic(() => import("./pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="p-12 text-muted-foreground flex items-center gap-2">
      <Loader2 className="animate-spin h-4 w-4" /> Loading PDF engine...
    </div>
  ),
});

export interface PresentationState {
  url: string | null;
  name: string;
  type: "pdf" | "image";
}

interface PresentationProps {
  roomId: string;
  isHost: boolean;
  presentationState?: PresentationState | null;
  initialPage?: number;
  initialPages?: number;
  onPresentationChange?: (p: PresentationState | null, page: number, total: number) => void;
}

export function PresentationView({ 
  roomId, 
  isHost, 
  presentationState, 
  initialPage = 1, 
  initialPages = 0,
  onPresentationChange 
}: PresentationProps) {
  const supabase = createClient();
  const [presentation, setPresentation] = useState<PresentationState | null>(presentationState || null);
  const [numPages, setNumPages] = useState<number>(initialPages);
  const [pageNumber, setPageNumber] = useState<number>(initialPage);
  const channelRef = useRef<any>(null);

  // Sync props -> local state if host refreshes/loads initial data
  useEffect(() => {
    if (presentationState !== undefined) setPresentation(presentationState);
    if (initialPage) setPageNumber(initialPage);
    if (initialPages) setNumPages(initialPages);
  }, [presentationState, initialPage, initialPages]);

  useEffect(() => {
    const channel = supabase.channel(`presentation:${roomId}`, {
      config: { broadcast: { ack: false } }
    });

    channel.on(
      "broadcast",
      { event: "presentation-state" },
      ({ payload }) => {
        if (!isHost) {
          if (payload.presentation) setPresentation(payload.presentation);
          if (payload.pageNumber) setPageNumber(payload.pageNumber);
          if (payload.numPages && payload.presentation?.type === "pdf") setNumPages(payload.numPages);
        }
      }
    );

    channel.subscribe((status) => {
      // If host reconnects, broadcast immediately
      if (status === "SUBSCRIBED" && isHost) {
          setTimeout(() => {
            channel.send({
              type: "broadcast",
              event: "presentation-state",
              payload: { presentation, pageNumber, numPages }
            });
          }, 500);
      }
    });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, isHost, supabase, presentation, pageNumber, numPages]);

  const broadcastState = useCallback((ns: PresentationState | null, page: number, totalPages: number) => {
    if (!isHost) return;
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "presentation-state",
        payload: { presentation: ns, pageNumber: page, numPages: totalPages }
      });
    }
    
    // Notify parent to append info to db persistence
    if (onPresentationChange) {
      onPresentationChange(ns, page, totalPages);
    }
  }, [isHost, onPresentationChange]);

  function handleUpload(url: string, name: string) {
    const isPdf = name.toLowerCase().endsWith(".pdf");
    const pState: PresentationState = { url, name, type: isPdf ? "pdf" : "image" };
    setPresentation(pState);
    setPageNumber(1);
    setNumPages(isPdf ? 0 : 1);
    broadcastState(pState, 1, isPdf ? 0 : 1);
  }

  function changePage(delta: number) {
    const newPage = Math.max(1, Math.min(pageNumber + delta, numPages || 1));
    setPageNumber(newPage);
    broadcastState(presentation, newPage, numPages);
  }

  if (!presentation?.url) {
    if (isHost) {
      return (
        <div className="w-full h-full flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <h3 className="text-xl font-medium mb-4 text-center">Upload Presentation</h3>
            <FileUploader onUpload={handleUpload} />
          </div>
        </div>
      );
    } else {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-muted-foreground">
          <Presentation className="h-16 w-16 mb-4 opacity-20" />
          <p>Waiting for the host to upload a presentation...</p>
        </div>
      );
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-muted/10 relative presentation-container overflow-hidden">
      <div className="flex-1 flex items-center justify-center overflow-auto p-4 md:p-8 min-h-0">
        <div className="bg-white shadow-xl max-w-full w-auto">
          {presentation.type === "pdf" ? (
            <PdfViewer
              url={presentation.url}
              pageNumber={pageNumber}
              onLoadSuccess={(pages: number) => {
                setNumPages(pages);
                broadcastState(presentation, pageNumber, pages);
              }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={presentation.url} 
              alt={presentation.name} 
              className="max-h-[70vh] object-contain"
            />
          )}
        </div>
      </div>

      {/* Host Controls */}
      <div className="h-16 shrink-0 border-t bg-card flex items-center justify-between px-4 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3 w-1/3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            {presentation.type === "pdf" ? <FileText className="h-5 w-5 text-primary" /> : <ImageIcon className="h-5 w-5 text-primary" />}
          </div>
          <div className="truncate text-sm font-medium">
            {presentation.name}
          </div>
        </div>

        <div className="flex items-center justify-center w-1/3">
          {isHost ? (
            <div className="flex items-center gap-4 bg-muted/50 rounded-full border p-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full"
                onClick={() => changePage(-1)}
                disabled={pageNumber <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium w-16 text-center tabular-nums">
                {pageNumber} / {numPages || "?"}
              </span>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 rounded-full" 
                onClick={() => changePage(1)}
                disabled={pageNumber >= numPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="text-sm font-medium bg-muted/50 px-4 py-2 rounded-full border">
               Slide {pageNumber} / {numPages || "?"}
            </div>
          )}
        </div>

        <div className="flex justify-end w-1/3">
          {isHost && (
            <Button variant="outline" size="sm" onClick={() => {
              setPresentation(null);
              broadcastState(null, 1, 0);
            }}>
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
