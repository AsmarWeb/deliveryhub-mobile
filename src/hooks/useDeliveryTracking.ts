import { useCallback, useEffect, useRef, useState } from "react";

import type {
  TrackingPoint,
} from "../components/tracking/DeliveryTrackingMap";

export type DeliveryTrackingData = {
  deliveryId: number | string;
  status: string;
  driverLocation: TrackingPoint | null;
  pickupLocation: TrackingPoint | null;
  dropoffLocation: TrackingPoint | null;
  lastUpdatedAt: string | null;
};

type Options = {
  enabled?: boolean;
  intervalMs?: number;
  fetchTracking: () => Promise<DeliveryTrackingData>;
};

export function useDeliveryTracking({
  enabled = true,
  intervalMs = 15000,
  fetchTracking,
}: Options) {
  const [data, setData] = useState<DeliveryTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generation = useRef(0);
  const inFlight = useRef(false);
  const mounted = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled || !mounted.current || inFlight.current) return;
    const current = generation.current;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const result = await fetchTracking();
      if (mounted.current && current === generation.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (mounted.current && current === generation.current) {
        setError(err instanceof Error ? err.message : "تعذر تحديث بيانات التتبع");
      }
    } finally {
      if (mounted.current && current === generation.current) {
        inFlight.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [enabled, fetchTracking]);

  useEffect(() => {
    mounted.current = true;
    // Start after this effect commits; cleanup cancels the first refresh too.
    const initial = enabled ? setTimeout(() => { void refresh(); }, 0) : null;
    const timer = enabled ? setInterval(() => { void refresh(); }, Math.max(intervalMs, 5000)) : null;
    return () => {
      mounted.current = false;
      generation.current += 1;
      inFlight.current = false;
      if (initial !== null) clearTimeout(initial);
      if (timer !== null) clearInterval(timer);
    };
  }, [enabled, intervalMs, refresh]);

  return {
    data,
    loading: enabled && loading,
    refreshing: enabled && refreshing,
    error,
    refresh,
  };
}
