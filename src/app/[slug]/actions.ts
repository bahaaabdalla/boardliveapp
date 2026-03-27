"use server";

import { AccessToken } from "livekit-server-sdk";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function generateLiveKitToken(roomName: string, guestName?: string) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  
  const hostIdFromCookie = cookieStore.get(`host_${roomName}`)?.value;
  let isHost = false;
  
  if (hostIdFromCookie) {
    const { data: session } = await supabase
      .from("sessions")
      .select("host_id")
      .eq("slug", roomName)
      .single();
      
    if (session?.host_id === hostIdFromCookie) {
      isHost = true;
    }
  }

  const userId = isHost ? hostIdFromCookie! : `guest_${Math.random().toString(36).substring(7)}`;
  const userName = isHost ? "Host" : (guestName || `Guest ${userId.substring(6, 10)}`);

  // Ensure env vars are present (fallback for local dev if needed)
  const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "secret";

  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: userName,
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: isHost, // Only host can publish audio
    canSubscribe: true,
  });

  return { token: await at.toJwt(), isHost, userName };
}

export async function checkIsHost(roomName: string) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const hostIdFromCookie = cookieStore.get(`host_${roomName}`)?.value;
  
  if (hostIdFromCookie) {
    const { data: session } = await supabase
      .from("sessions")
      .select("host_id")
      .eq("slug", roomName)
      .single();
      
    if (session?.host_id === hostIdFromCookie) {
      return { isHost: true };
    }
  }
  return { isHost: false };
}
