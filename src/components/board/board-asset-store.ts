/**
 * Custom tldraw asset store that uploads images to Supabase Storage
 * so that all participants (host + viewers) can resolve the same URL.
 *
 * Without this, tldraw creates local blob: URLs that only exist in the
 * host's browser memory — viewers receive the record but get a broken image.
 */
import { createClient } from "@/lib/supabase/client";

const BUCKET = "board-assets";

/** Upload a File/Blob to Supabase Storage and return its public URL. */
export async function uploadBoardAsset(
  file: File | Blob,
  roomId: string,
  mimeType: string
): Promise<string> {
  const supabase = createClient();

  // Deterministic path: roomId / timestamp-random so refreshes get a fresh copy
  const ext = mimeType.split("/")[1]?.split(";")[0] || "bin";
  const path = `${roomId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Asset upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
  return urlData.publicUrl;
}
