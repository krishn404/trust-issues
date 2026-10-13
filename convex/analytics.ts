import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const eventType = v.union(
  v.literal("pageview"),
  v.literal("play"),
  v.literal("pause"),
  v.literal("complete"),
  v.literal("next"),
  v.literal("prev"),
);

const range = v.union(v.literal("24h"), v.literal("7d"), v.literal("30d"), v.literal("all"));

function authorized(secret: string) {
  const expected = process.env.ANALYTICS_SECRET;
  if (!expected) return false;
  const length = Math.max(secret.length, expected.length);
  let mismatch = secret.length === expected.length ? 0 : 1;
  for (let i = 0; i < length; i++) {
    mismatch |= (secret.charCodeAt(i) || 0) ^ (expected.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}

function rangeStart(value: "24h" | "7d" | "30d" | "all", now: number) {
  if (value === "24h") return now - 24 * 60 * 60 * 1000;
  if (value === "7d") return now - 7 * 24 * 60 * 60 * 1000;
  if (value === "30d") return now - 30 * 24 * 60 * 60 * 1000;
  return null;
}

function bucketStart(timestamp: number, offsetMinutes: number, hourly: boolean) {
  const shifted = new Date(timestamp - offsetMinutes * 60 * 1000);
  if (hourly) shifted.setUTCMinutes(0, 0, 0);
  else shifted.setUTCHours(0, 0, 0, 0);
  return shifted.getTime() + offsetMinutes * 60 * 1000;
}

export const recordEvents = mutation({
  args: {
    secret: v.string(),
    visitorId: v.string(),
    sessionId: v.string(),
    ipHash: v.string(),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    events: v.array(
      v.object({
        type: eventType,
        trackId: v.optional(v.string()),
        progress: v.optional(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    if (!authorized(args.secret)) throw new Error("Unauthorized");
    if (args.events.length === 0 || args.events.length > 20) return null;

    const now = Date.now();
    let visitor = await ctx.db
      .query("visitors")
      .withIndex("by_visitorId", (q) => q.eq("visitorId", args.visitorId))
      .first();

    if (!visitor && args.ipHash) {
      visitor = await ctx.db
        .query("visitors")
        .withIndex("by_ipHash", (q) => q.eq("ipHash", args.ipHash))
        .first();
    }

    const pageviews = args.events.filter((event) => event.type === "pageview").length;
    const played = args.events.some((event) => event.type === "play");
    let canonicalId = args.visitorId;

    if (!visitor) {
      await ctx.db.insert("visitors", {
        visitorId: args.visitorId,
        ipHash: args.ipHash,
        ...(args.country ? { country: args.country } : {}),
        ...(args.city ? { city: args.city } : {}),
        ...(args.region ? { region: args.region } : {}),
        firstSeen: now,
        lastSeen: now,
        visitCount: pageviews,
        hasPlayed: played,
      });
    } else {
      canonicalId = visitor.visitorId;
      const patch: {
        ipHash?: string;
        country?: string;
        city?: string;
        region?: string;
        lastSeen: number;
        visitCount: number;
        hasPlayed: boolean;
      } = {
        lastSeen: now,
        visitCount: visitor.visitCount + pageviews,
        hasPlayed: visitor.hasPlayed || played,
      };
      if (args.ipHash) patch.ipHash = args.ipHash;
      if (args.country) patch.country = args.country;
      if (args.city) patch.city = args.city;
      if (args.region) patch.region = args.region;
      await ctx.db.patch(visitor._id, patch);
    }

    for (let i = 0; i < args.events.length; i++) {
      const event = args.events[i];
      await ctx.db.insert("events", {
        visitorId: canonicalId,
        sessionId: args.sessionId,
        type: event.type,
        ...(event.trackId !== undefined ? { trackId: event.trackId } : {}),
        ...(event.progress !== undefined ? { progress: event.progress } : {}),
        timestamp: now + i,
      });
    }

    return null;
  },
});

export const dashboard = query({
  args: {
    secret: v.string(),
    range,
    playedOnly: v.boolean(),
    tzOffset: v.number(),
  },
  handler: async (ctx, args) => {
    if (!authorized(args.secret)) throw new Error("Unauthorized");

    const now = Date.now();
    const since = rangeStart(args.range, now);
    const offset = Math.max(-14 * 60, Math.min(14 * 60, args.tzOffset));
    const hourly = args.range === "24h";

    const events = since === null
      ? await ctx.db.query("events").withIndex("by_timestamp").collect()
      : await ctx.db
          .query("events")
          .withIndex("by_timestamp", (q) => q.gte("timestamp", since))
          .collect();

    const playedIds = new Set(
      events.filter((event) => event.type === "play").map((event) => event.visitorId),
    );
    const cohort = args.playedOnly
      ? events.filter((event) => playedIds.has(event.visitorId))
      : events;

    const visitorIds = [...new Set(cohort.map((event) => event.visitorId))];
    const listeners = new Set(cohort.filter((event) => event.type === "play").map((event) => event.visitorId));
    const plays = cohort.filter((event) => event.type === "play").length;

    const progressByVisitor = new Map<string, number>();
    for (const event of cohort) {
      if (event.progress === undefined) continue;
      const previous = progressByVisitor.get(event.visitorId);
      if (previous === undefined || event.progress > previous) {
        progressByVisitor.set(event.visitorId, event.progress);
      }
    }
    const progressValues = [...progressByVisitor.values()];
    const averageProgress = progressValues.length
      ? progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length
      : null;

    const visitsByVisitor = new Map<string, number>();
    const lastSeenByVisitor = new Map<string, number>();
    const buckets = new Map<number, { visits: number; plays: number }>();

    for (const event of cohort) {
      const last = lastSeenByVisitor.get(event.visitorId) ?? 0;
      if (event.timestamp > last) lastSeenByVisitor.set(event.visitorId, event.timestamp);
      if (event.type === "pageview") {
        visitsByVisitor.set(event.visitorId, (visitsByVisitor.get(event.visitorId) ?? 0) + 1);
      }
      const bucket = bucketStart(event.timestamp, offset, hourly);
      const point = buckets.get(bucket) ?? { visits: 0, plays: 0 };
      if (event.type === "pageview") point.visits += 1;
      if (event.type === "play") point.plays += 1;
      buckets.set(bucket, point);
    }

    const step = hourly ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const earliest = cohort.reduce((min, event) => Math.min(min, event.timestamp), now);
    const seriesStart = args.range === "all"
      ? (cohort.length ? bucketStart(earliest, offset, hourly) : bucketStart(now, offset, hourly))
      : bucketStart(since ?? now, offset, hourly);
    const seriesEnd = bucketStart(now, offset, hourly);
    const series: { t: number; visits: number; plays: number }[] = [];
    const maxPoints = hourly ? 30 : 400;
    let points = 0;
    for (let t = seriesStart; t <= seriesEnd && points < maxPoints; t += step) {
      const point = buckets.get(t) ?? { visits: 0, plays: 0 };
      series.push({ t, visits: point.visits, plays: point.plays });
      points += 1;
    }

    const visitors = await ctx.db.query("visitors").collect();
    const byId = new Map(visitors.map((visitor) => [visitor.visitorId, visitor]));

    const countryCounts = new Map<string, number>();
    const cityCounts = new Map<string, number>();
    for (const visitorId of visitorIds) {
      const visitor = byId.get(visitorId);
      const country = visitor?.country || "Unknown";
      const city = visitor?.city || "Unknown";
      countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
      cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
    }

    const rank = (counts: Map<string, number>) =>
      [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 6)
        .map(([name, count]) => ({ name, count }));

    const rows = visitorIds
      .map((visitorId) => {
        const visitor = byId.get(visitorId);
        const place = [visitor?.city, visitor?.region, visitor?.country].filter(Boolean);
        return {
          visitorId,
          lastSeen: lastSeenByVisitor.get(visitorId) ?? visitor?.lastSeen ?? 0,
          location: place.length ? place.join(", ") : "Unknown",
          visits: visitsByVisitor.get(visitorId) ?? 0,
          played: listeners.has(visitorId),
        };
      })
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, 500);

    return {
      visitors: visitorIds.length,
      plays,
      listeners: listeners.size,
      conversion: visitorIds.length ? listeners.size / visitorIds.length : 0,
      averageProgress,
      grain: hourly ? "hour" : "day",
      series,
      countries: rank(countryCounts),
      cities: rank(cityCounts),
      rows,
    };
  },
});
