export type TrackEventType = "pageview" | "play" | "pause" | "complete" | "next" | "prev";

type TrackEvent = {
  type: TrackEventType;
  trackId?: string;
  progress?: number;
};

const OPT_OUT_KEY = "ti-analytics-opt-out";
const VISITOR_KEY = "ti-visitor-id";
const SESSION_KEY = "ti-session-id";
const PLAYED_KEY = "ti-session-played";

const BOT = /bot\b|crawler|spider|slurp|bingpreview|facebookexternalhit|embedly|quora link preview|whatsapp|telegrambot|slackbot|discordbot|linkedinbot|pinterest|vkshare|w3c_validator|lighthouse|pagespeed|headlesschrome|phantomjs|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|amazonbot/i;

let queue: TrackEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let hooked = false;
let pageviewSent = false;
let memoryPlayed = false;

function uuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function readStorage(store: Storage, key: string) {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(store: Storage, key: string, value: string) {
  try {
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function analyticsDisabled() {
  if (typeof window === "undefined") return true;
  if (process.env.NEXT_PUBLIC_ANALYTICS_DISABLED === "true") return true;
  if (readStorage(localStorage, OPT_OUT_KEY) === "1") return true;
  if (BOT.test(navigator.userAgent || "")) return true;
  return false;
}

function ensureId(store: Storage, key: string) {
  const existing = readStorage(store, key);
  if (existing) return existing;
  const created = uuid();
  writeStorage(store, key, created);
  return created;
}

function cleanProgress(progress: number | undefined) {
  if (progress === undefined || !Number.isFinite(progress)) return undefined;
  return Math.round(Math.min(1, Math.max(0, progress)) * 1000) / 1000;
}

function sendPayload(body: string) {
  const blob = new Blob([body], { type: "application/json" });
  const sent = typeof navigator.sendBeacon === "function" && navigator.sendBeacon("/api/track", blob);
  if (!sent) {
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!queue.length || analyticsDisabled()) {
    queue = [];
    return;
  }

  const visitorId = ensureId(localStorage, VISITOR_KEY);
  const sessionId = ensureId(sessionStorage, SESSION_KEY);
  while (queue.length) {
    sendPayload(JSON.stringify({ visitorId, sessionId, events: queue.splice(0, 20) }));
  }
}

function hookFlush() {
  if (hooked || typeof window === "undefined") return;
  hooked = true;
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

export function track(event: TrackEvent) {
  if (analyticsDisabled()) return;
  hookFlush();
  queue.push({
    type: event.type,
    trackId: event.trackId,
    progress: cleanProgress(event.progress),
  });
  if (timer) clearTimeout(timer);
  timer = setTimeout(flush, 400);
}

export function trackPageview() {
  if (pageviewSent || analyticsDisabled()) return;
  pageviewSent = true;
  ensureId(localStorage, VISITOR_KEY);
  ensureId(sessionStorage, SESSION_KEY);
  track({ type: "pageview" });
}

export function isFirstPlayThisSession() {
  if (readStorage(sessionStorage, PLAYED_KEY) === "1" || memoryPlayed) return false;
  memoryPlayed = true;
  writeStorage(sessionStorage, PLAYED_KEY, "1");
  return true;
}
