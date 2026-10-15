import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { IS_SUPABASE_CONFIGURED } from "@/lib/config";
import { CITIZEN_VISIBLE_SERVICES } from "@/constants/services";

// Cache to avoid re-fetching on every component mount
let _appCountCache: { value: number | null; fetchedAt: number } = { value: null, fetchedAt: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let onlineChannel: ReturnType<typeof supabase.channel> | null = null;
let onlineCount: number | null = null;
const onlineListeners = new Set<(count: number | null) => void>();
const presenceKey = `web-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`}`;

function emitOnlineCount(count: number | null) {
  onlineCount = count;
  onlineListeners.forEach((listener) => listener(count));
}

function subscribeOnlineCount(listener: (count: number | null) => void) {
  onlineListeners.add(listener);
  listener(onlineCount);

  if (IS_SUPABASE_CONFIGURED && !onlineChannel) {
    const channel = supabase.channel("site-online-users", {
      config: { presence: { key: presenceKey } },
    });
    onlineChannel = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const presence = channel.presenceState();
        emitOnlineCount(
          Object.values(presence).reduce((count, clients) => count + clients.length, 0),
        );
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ online_at: new Date().toISOString() });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          emitOnlineCount(null);
        }
      });
  }

  return () => {
    onlineListeners.delete(listener);
    if (onlineListeners.size === 0 && onlineChannel) {
      const channel = onlineChannel;
      onlineChannel = null;
      emitOnlineCount(null);
      void supabase.removeChannel(channel);
    }
  };
}

/** Counts active browser sessions through Realtime Presence; no user identifiers are shared. */
export function useOnlineCount(): number | null {
  const [count, setCount] = useState<number | null>(onlineCount);

  useEffect(() => subscribeOnlineCount(setCount), []);

  return count;
}

/**
 * useLiveAppCount — returns total application count from DB.
 * Uses a 5-minute in-memory cache to avoid hammering the DB on every mount.
 * COUNT queries on indexed tables are O(1) in Postgres with exact counts disabled.
 */
export function useLiveAppCount(): number | null {
  const [count, setCount] = useState<number | null>(_appCountCache.value);

  useEffect(() => {
    const now = Date.now();
    // Return cached value if fresh
    if (_appCountCache.value !== null && now - _appCountCache.fetchedAt < CACHE_TTL_MS) {
      setCount(_appCountCache.value);
      return;
    }

    // Defer non-critical stat — don't block initial paint
    const timer = setTimeout(() => {
      void Promise.resolve(
        supabase.from("applications").select("*", { count: "exact", head: true }),
      )
        .then(({ count: c }) => {
          if (c !== null) {
            _appCountCache = { value: c, fetchedAt: Date.now() };
            setCount(c);
          }
        })
        .catch(() => {
          /* non-critical */
        });
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  return count;
}

/**
 * useSiteStats — returns cached site-wide stats for the Landing page.
 * All queries are deferred and cached — zero impact on initial load.
 */
export interface SiteStats {
  totalApplications: number;
  totalUsers: number;
  servicesAvailable: number;
}

let _statsCache: { value: SiteStats | null; fetchedAt: number } = { value: null, fetchedAt: 0 };

export function useSiteStats(): SiteStats | null {
  const [stats, setStats] = useState<SiteStats | null>(_statsCache.value);

  useEffect(() => {
    const now = Date.now();
    if (_statsCache.value !== null && now - _statsCache.fetchedAt < CACHE_TTL_MS) {
      setStats(_statsCache.value);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const [{ count: totalApplications }, { count: totalUsers }] = await Promise.all([
          supabase.from("applications").select("*", { count: "exact", head: true }),
          supabase.from("users").select("*", { count: "exact", head: true }),
        ]);

        const result: SiteStats = {
          totalApplications: totalApplications || 0,
          totalUsers: totalUsers || 0,
          servicesAvailable: CITIZEN_VISIBLE_SERVICES.length,
        };

        _statsCache = { value: result, fetchedAt: Date.now() };
        setStats(result);
      } catch {
        /* non-critical */
      }
    }, 5000); // 5s delay — page fully rendered by then

    return () => clearTimeout(timer);
  }, []);

  return stats;
}

/**
 * useSiteVisits — returns null (visits tracking removed for scale/privacy).
 * Was using a WebSocket presence channel per visitor — too expensive at 100K+.
 */
export function useSiteVisits(): number | null {
  return null;
}
