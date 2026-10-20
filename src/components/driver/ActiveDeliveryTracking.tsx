import { useCallback, useRef } from "react";
import { Text, View, StyleSheet } from "react-native";

import DriverTrackingControl from "./DriverTrackingControl";
import { syncDriverLocation } from "../../services/driverLocationSync";
import type { DriverCoordinates } from "../../services/driverGps";

type DeliveryTrackingStatus =
  | "draft"
  | "pending_pricing"
  | "priced"
  | "matching"
  | "assigned"
  | "accepted"
  | "pickup"
  | "in_transit"
  | "delivered"
  | "completed"
  | "cancelled"
  | "delivery_failed"
  | "pickup_failed"
  | "rescheduled"
  | "expired";

type Props = {
  deliveryId: number;
  status: DeliveryTrackingStatus;
  locationEndpoint: string;
};

const TRACKABLE_STATUSES = new Set<DeliveryTrackingStatus>([
  "accepted",
  "pickup",
  "in_transit",
]);

export default function ActiveDeliveryTracking({
  deliveryId,
  status,
  locationEndpoint,
}: Props) {
  const busy = useRef(false);
  const active = TRACKABLE_STATUSES.has(status);

  const handleLocation = useCallback(
    async (coordinates: DriverCoordinates) => {
      if (!active || busy.current) return;

      if (!Number.isInteger(deliveryId) || deliveryId <= 0) {
        return;
      }

      busy.current = true;

      try {
        await syncDriverLocation(
          coordinates,
          locationEndpoint,
          deliveryId
        );
      } catch (error) {
        console.warn(
          "Delivery location synchronization failed:",
          error
        );
      } finally {
        busy.current = false;
      }
    },
    [active, deliveryId, locationEndpoint]
  );

  if (!active) {
    return (
      <View style={styles.inactive}>
        <Text style={styles.inactiveText}>
          تتبع الموقع غير متاح في حالة المهمة الحالية.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        التتبع المباشر للمهمة #{deliveryId}
      </Text>

      <DriverTrackingControl
        key={deliveryId}
        onLocationUpdate={handleLocation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginVertical: 16,
  },
  title: {
    color: "#0B1730",
    fontSize: 16,
    fontWeight: "800",
  },
  inactive: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
  },
  inactiveText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
  },
});
