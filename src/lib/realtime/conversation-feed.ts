// One connection per mounted chat view. Reconnects always reload authorized state
// because Postgres notifications are not replayed while the browser is offline.
export function startConversationFeed(refresh: () => Promise<unknown> | void, status: (connected: boolean) => void) {
  let source: EventSource | null = null;
  let disposed = false;
  let connected = false;
  let delay = 1000;
  let lastSignal = Date.now();
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let refreshTimer: ReturnType<typeof setTimeout> | undefined;
  let refreshing = false;
  let dirty = false;
  const active = () => !disposed && document.visibilityState !== "hidden" && navigator.onLine !== false;
  const setStatus = (value: boolean) => { connected = value; if (!disposed) status(value); };
  const queueRefresh = () => {
    if (!active()) return;
    dirty = true;
    if (refreshing || refreshTimer) return;
    refreshTimer = setTimeout(async () => {
      refreshTimer = undefined;
      if (!active()) return;
      dirty = false;
      refreshing = true;
      try { await refresh(); } catch { /* API hook exposes errors; fallback/reconnect retries. */ }
      finally {
        refreshing = false;
        if (dirty) queueRefresh();
      }
    }, 250);
  };
  const disconnect = () => {
    if (source) { source.onerror = null; source.close(); source = null; }
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
    setStatus(false);
  };
  const retry = () => {
    disconnect();
    if (!active()) return;
    reconnectTimer = setTimeout(connect, delay + Math.floor(Math.random() * 500));
    delay = Math.min(delay * 2, 30000);
  };
  function connect() {
    if (!active() || source) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
    const current = new EventSource("/api/conversations/stream");
    source = current;
    lastSignal = Date.now();
    current.addEventListener("connected", () => {
      if (source !== current) return;
      lastSignal = Date.now();
      delay = 1000;
      setStatus(true);
      queueRefresh();
    });
    current.addEventListener("keepalive", () => { if (source === current) lastSignal = Date.now(); });
    current.addEventListener("conversation-update", () => {
      if (source !== current) return;
      lastSignal = Date.now();
      queueRefresh();
    });
    current.onerror = () => { if (source === current) retry(); };
  }
  function resume() {
    if (!active()) {
      disconnect();
      clearTimeout(refreshTimer);
      refreshTimer = undefined;
      return;
    }
    queueRefresh();
    connect();
  }
  const fallback = setInterval(() => {
    if (!active()) return;
    if (source && Date.now() - lastSignal > 45000) retry();
    if (!connected) queueRefresh();
  }, 15000);
  document.addEventListener("visibilitychange", resume);
  window.addEventListener("online", resume);
  window.addEventListener("offline", resume);
  connect();
  return () => {
    disposed = true;
    disconnect();
    clearTimeout(refreshTimer);
    clearInterval(fallback);
    document.removeEventListener("visibilitychange", resume);
    window.removeEventListener("online", resume);
    window.removeEventListener("offline", resume);
  };
}
