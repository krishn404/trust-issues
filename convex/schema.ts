import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const eventType = v.union(
  v.literal("pageview"),
  v.literal("play"),
  v.literal("pause"),
  v.literal("complete"),
  v.literal("next"),
  v.literal("prev"),
);

export default defineSchema({
  visitors: defineTable({
    visitorId: v.string(),
    ipHash: v.string(),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    firstSeen: v.number(),
    lastSeen: v.number(),
    visitCount: v.number(),
    hasPlayed: v.boolean(),
  })
    .index("by_visitorId", ["visitorId"])
    .index("by_ipHash", ["ipHash"]),

  events: defineTable({
    visitorId: v.string(),
    sessionId: v.string(),
    type: eventType,
    trackId: v.optional(v.string()),
    progress: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index("by_visitorId", ["visitorId"])
    .index("by_timestamp", ["timestamp"]),
});
