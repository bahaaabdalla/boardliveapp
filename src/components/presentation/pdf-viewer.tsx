"use client";

import { Document, Page, pdfjs } from "react-pdf";
import { Loader2 } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useEffect } from "react";

// Safely set the worker URL only in the browser to avoid Next.js SSR errors
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PdfViewerProps {
  url: string;
  pageNumber: number;
  onLoadSuccess: (numPages: number) => void;
}

export default function PdfViewer({ url, pageNumber, onLoadSuccess }: PdfViewerProps) {
  return (
    <Document
      file={url}
      onLoadSuccess={({ numPages }: { numPages: number }) => onLoadSuccess(numPages)}
      loading={
        <div className="p-12 text-muted-foreground flex items-center gap-2">
          <Loader2 className="animate-spin h-4 w-4" /> Loading PDF...
        </div>
      }
    >
      <Page
        pageNumber={pageNumber}
        renderAnnotationLayer={false}
        renderTextLayer={false}
        width={typeof window !== "undefined" ? Math.min(window.innerWidth - 64, 1000) : 800}
      />
    </Document>
  );
}
