"use client";

import { useState } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface FileUploaderProps {
  onUpload: (url: string, name: string) => void;
  accept?: string;
  maxSizeMb?: number;
}

export function FileUploader({ onUpload, accept = "application/pdf,image/*", maxSizeMb = 20 }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { addToast } = useToast();
  const supabase = createClient();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMb * 1024 * 1024) {
      addToast({
        title: "File too large",
        description: `Max file size is ${maxSizeMb}MB.`,
        variant: "error"
      });
      return;
    }

    setIsUploading(true);
    
    // Create random path
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `presentations/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("assets").getPublicUrl(filePath);
      onUpload(data.publicUrl, file.name);
      
    } catch (err: any) {
      console.error("Upload error:", err);
      // Fallback: If bucket is missing or RLS blocked, use a local object URL for demo
      console.warn("Using local object URL fallback due to upload failure (e.g. absent bucket).");
      const localUrl = URL.createObjectURL(file);
      onUpload(localUrl, file.name);
      addToast({
        title: "Database Upload Failed",
        description: "Falling back to local temporal URL for demonstration.",
        variant: "info"
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="relative group cursor-pointer">
      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        accept={accept}
        onChange={handleFileChange}
        disabled={isUploading}
      />
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl border-border bg-card hover:bg-muted/50 transition-colors">
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <span className="text-sm font-medium">Uploading...</span>
          </>
        ) : (
          <>
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Upload className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground">PDF or Images (Max {maxSizeMb}MB)</p>
          </>
        )}
      </div>
    </div>
  );
}
