import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type * as Location from "expo-location";

import {
  requestDriverLocationPermission,
  watchDriverCoordinates,
  type DriverCoordinates,
} from "../../services/driverGps";

type Props = {
  onLocationUpdate: (
    coordinates: DriverCoordinates
  ) => void | Promise<void>;
};

export default function DriverTrackingControl({
  onLocationUpdate,
}: Props) {
  const [tracking, setTracking] = useState(false);
  const [starting, setStarting] = useState(false);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const active = useRef(false);
  const callback = useRef(onLocationUpdate);

  useEffect(() => {
    callback.current = onLocationUpdate;
  }, [onLocationUpdate]);

  useEffect(() => {
    return () => {
      active.current = false;
      subscription.current?.remove();
      subscription.current = null;
    };
  }, []);

  async function startTracking() {
    if (active.current || starting) return;

    setStarting(true);

    try {
      const allowed = await requestDriverLocationPermission();

      if (!allowed) {
        Alert.alert(
          "صلاحية الموقع",
          "يرجى السماح للتطبيق بالوصول إلى موقعك أثناء التوصيل."
        );
        return;
      }

      active.current = true;

      const watcher = await watchDriverCoordinates(
        (coordinates) => {
          if (!active.current) return;

          Promise.resolve(callback.current(coordinates)).catch(
            (error) => {
              console.warn("Location update failed", error);
            }
          );
        }
      );

      if (!active.current) {
        watcher.remove();
        return;
      }

      subscription.current = watcher;
      setTracking(true);
    } catch {
      active.current = false;

      Alert.alert(
        "خطأ",
        "تعذر تشغيل خدمة الموقع."
      );
    } finally {
      setStarting(false);
    }
  }

  function stopTracking() {
    active.current = false;
    subscription.current?.remove();
    subscription.current = null;
    setTracking(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Ionicons
          name={tracking ? "navigate" : "location-outline"}
          size={24}
          color={tracking ? "#059669" : "#64748B"}
        />

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            تتبع موقع السائق
          </Text>

          <Text style={styles.subtitle}>
            {tracking
              ? "التتبع يعمل أثناء فتح التطبيق"
              : "التتبع متوقف"}
          </Text>
        </View>
      </View>

      <Pressable
        disabled={starting}
        onPress={tracking ? stopTracking : startTracking}
        style={[
          styles.button,
          {
            backgroundColor: tracking
              ? "#DC2626"
              : "#2563EB",
          },
        ]}
      >
        <Text style={styles.buttonText}>
          {starting
            ? "جارٍ التشغيل..."
            : tracking
            ? "إيقاف التتبع"
            : "بدء التتبع"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 16,
  },
  info: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0B1730",
  },
  subtitle: {
    color: "#64748B",
    marginTop: 5,
    fontSize: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
});
