import { useLanguage } from "../../contexts/LanguageContext";
import { getDeliveryStatusLabel } from "../../utils/deliveryStatus";
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
  const { language, t } = useLanguage();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {t("تتبع التوصيلة", "Tracking Delivery")} #{deliveryId}
        </Text>

        <Text style={styles.status}>
          {status
            ? getDeliveryStatusLabel(status, language)
            : t("الحالة غير متاحة", "Status unavailable")}
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
        {t(
          "يتم عرض آخر موقع معروف للسائق عند توفره. لا يعني ظهور الموقع أن السائق متصل حالياً.",
          "The latest known driver location is displayed when available. This does not mean the driver is currently online."
        )}
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
