"use client";

import { useEffect, useState } from "react";
import { WORLD_CUP_MODE } from "./config";

// ─── useWorldCupMode ─────────────────────────────────────────────────────────
// Reads the runtime World Cup toggle from /api/settings/world-cup (set by admins
// via the dashboard). Falls back to the WORLD_CUP_MODE config default for the
// initial render and if the request fails.

export function useWorldCupMode(): boolean {
  const [enabled, setEnabled] = useState<boolean>(WORLD_CUP_MODE);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/settings/world-cup")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.ok && typeof data.enabled === "boolean") {
          setEnabled(data.enabled);
        }
      })
      .catch(() => {
        /* keep config default */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
