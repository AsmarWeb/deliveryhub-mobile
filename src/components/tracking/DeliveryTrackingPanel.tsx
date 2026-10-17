import { StyleSheet, Text, View } from "react-native";

import DeliveryTrackingMap, {
  type TrackingPoint,
} from "./DeliveryTrackingMap";

import TrackingFreshness from "./TrackingFreshness";

type Props = {
  deliveryId: number | string;
  status?: string | null;
  driverLocation?: TrackingPoint | null;
  pickupLocation?: TrackingPoint | null;
  dropoffLocation?: TrackingPoint | null;
  lastUpdatedAt?: string | null;
};

export default function DeliveryTrackingPanel({
  deliveryId,
  status,
  driverLocation,
  pickupLocation,
  dropoffLocation,
  lastUpdatedAt,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          تتبع التوصيلة #{deliveryId}
        </Text>

        <Text style={styles.status}>
          {status || "الحالة غير متاحة"}
        </Text>
      </View>

      <TrackingFreshness
        lastUpdatedAt={lastUpdatedAt}
      />

      <DeliveryTrackingMap
        driverLocation={driverLocation}
        pickupLocation={pickupLocation}
        dropoffLocation={dropoffLocation}
        lastUpdatedAt={lastUpdatedAt}
      />

      <Text style={styles.note}>
        يتم عرض آخر موقع معروف للسائق عند توفره.
        لا يعني ظهور الموقع أن السائق متصل حالياً.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingVertical: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: "#0B1730",
  },
  status: {
    color: "#2563EB",
    fontSize: 12,
    fontWeight: "700",
  },
  note: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 19,
  },
});
