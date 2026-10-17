import { useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import DeliveryTrackingPanel from "./DeliveryTrackingPanel";

import { useDeliveryTracking } from "../../hooks/useDeliveryTracking";
import { getDeliveryTracking } from "../../services/deliveryTracking";

type Props = {
  deliveryId: number | string;
};

export default function ConnectedDeliveryTracking({
  deliveryId,
}: Props) {
  const fetchTracking = useCallback(async () => {
    const result = await getDeliveryTracking(deliveryId);

    return {
      deliveryId,
      status: result.status,
      driverLocation: result.driver_location
        ? {
            latitude: result.driver_location.latitude,
            longitude: result.driver_location.longitude,
          }
        : null,
      pickupLocation: null,
      dropoffLocation: null,
      lastUpdatedAt:
        result.driver_location?.last_updated_at ?? null,
    };
  }, [deliveryId]);

  const {
    data,
    loading,
    refreshing,
    error,
    refresh,
  } = useDeliveryTracking({
    fetchTracking,
    enabled: true,
    intervalMs: 15000,
  });

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.message}>
          جارٍ تحميل بيانات التتبع...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>

          <Pressable onPress={() => void refresh()}>
            <Text style={styles.retry}>إعادة المحاولة</Text>
          </Pressable>
        </View>
      )}

      {data ? (
        <DeliveryTrackingPanel
          deliveryId={data.deliveryId}
          status={data.status}
          driverLocation={data.driverLocation}
          pickupLocation={data.pickupLocation}
          dropoffLocation={data.dropoffLocation}
          lastUpdatedAt={data.lastUpdatedAt}
        />
      ) : (
        <Text style={styles.message}>
          لا تتوفر بيانات تتبع لهذه التوصيلة.
        </Text>
      )}

      {refreshing && (
        <Text style={styles.updating}>
          جارٍ تحديث بيانات الموقع...
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  center: {
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  message: {
    color: "#64748B",
    textAlign: "center",
  },
  errorBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#FEF2F2",
    gap: 8,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 12,
  },
  retry: {
    color: "#2563EB",
    fontWeight: "700",
  },
  updating: {
    color: "#64748B",
    fontSize: 11,
    textAlign: "center",
  },
});
