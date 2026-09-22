"use client";
import { useEffect, useRef, useState } from "react";
import { startConversationFeed } from "@/lib/realtime/conversation-feed";

export function useConversationRealtime(refresh: () => Promise<unknown> | void) {
  const latest = useRef(refresh);
  latest.current = refresh;
  const [connected, setConnected] = useState(false);
  useEffect(() => startConversationFeed(() => latest.current(), setConnected), []);
  return connected;
}
