"use client";

import { useEffect } from "react";
import { trackPageview } from "../../lib/track";

export default function AnalyticsTracker() {
  useEffect(() => {
    trackPageview();
  }, []);

  return null;
}
