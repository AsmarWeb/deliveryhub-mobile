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

  const fetchRef = useRef(fetchTracking);
  fetchRef.current = fetchTracking;

  const inFlight = useRef(false);
  const mounted = useRef(false);

  const refresh = useCallback(async () => {
    if (!enabled || inFlight.current) return;

    inFlight.current = true;

    if (mounted.current) {
      setRefreshing(true);
    }

    try {
      const result = await fetchRef.current();

      if (mounted.current) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      if (mounted.current) {
        setError(
          err instanceof Error
            ? err.message
            : "تعذر تحديث بيانات التتبع"
        );
      }
    } finally {
      inFlight.current = false;

      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [enabled]);

  useEffect(() => {
    mounted.current = true;

    if (enabled) {
      void refresh();
    } else {
      setLoading(false);
    }

    const timer = enabled
      ? setInterval(() => {
          void refresh();
        }, Math.max(intervalMs, 5000))
      : null;

    return () => {
      mounted.current = false;

      if (timer !== null) {
        clearInterval(timer);
      }
    };
  }, [enabled, intervalMs, refresh]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh,
  };
}
