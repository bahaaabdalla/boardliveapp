"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-3">Something went wrong</h1>
      <p className="text-muted-foreground max-w-md mb-8">
        We encountered an unexpected error. You can try recovering the page or return to your dashboard.
      </p>
      
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Button onClick={() => reset()} className="w-full sm:w-auto">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        <Link href="/dashboard" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
