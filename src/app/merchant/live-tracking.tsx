import { useLanguage } from "../../contexts/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getDeliveries,
  type Delivery,
} from "../../services/deliveries";

import {
  getDeliveryStatusLabel,
} from "../../utils/deliveryStatus";

const ACTIVE_STATUSES = new Set([
  "assigned",
  "accepted",
  "pickup",
  "in_transit",
]);

export default function LiveTrackingScreen() {
  const { language, t } = useLanguage();
  const requestCounter = useRef(0);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (refresh = false) => {
    const requestId = ++requestCounter.current;
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const activeDeliveries = new Map<number | string, Delivery>();
      let currentPage = 1;
      let lastPage = 1;

      do {
        const result = await getDeliveries(currentPage);

        if (requestId !== requestCounter.current) return;

        for (const delivery of result.data) {
          if (ACTIVE_STATUSES.has(delivery.status)) {
            activeDeliveries.set(delivery.id, delivery);
          }
        }

        const reportedLastPage = Number(result.last_page);

        lastPage = Number.isSafeInteger(reportedLastPage)
          && reportedLastPage >= currentPage
          ? reportedLastPage
          : currentPage;

        currentPage += 1;
      } while (currentPage <= lastPage);

      if (requestId === requestCounter.current) {
        setDeliveries(Array.from(activeDeliveries.values()));
        setError(false);
      }
    } catch {
      if (requestId === requestCounter.current) setError(true);
    } finally {
      if (requestId === requestCounter.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestCounter.current += 1;
      };
    }, [load])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={24}
            color="#FFFFFF"
          />
        </Pressable>

        <Text style={styles.headerTitle}>
          {t("تتبع التوصيلات", "Live Tracking")}
        </Text>

        <Pressable onPress={() => void load(true)}>
          <Ionicons
            name="refresh"
            size={24}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      {loading && deliveries.length === 0 ? (
        <ActivityIndicator
          size="large"
          color="#2563EB"
          style={{ marginTop: 45 }}
        />
      ) : (
        <FlatList
          data={deliveries}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
            />
          }
          ListHeaderComponent={
            <View style={styles.info}>
              <Ionicons
                name="navigate-circle-outline"
                size={24}
                color="#2563EB"
              />
              <Text style={styles.infoText}>
                {t("الطلبات النشطة التي يمكن متابعة تقدمها", "Active deliveries you can track")}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/merchant/deliveries/[id]",
                  params: { id: String(item.id) },
                })
              }
            >
              <View style={styles.cardTop}>
                <Ionicons
                  name="cube-outline"
                  size={25}
                  color="#2563EB"
                />

                <View style={{ flex: 1 }}>
                  <Text style={styles.tracking}>
                    {item.tracking_number}
                  </Text>

                  <Text style={styles.status}>
                    {getDeliveryStatusLabel(item.status, language)}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color="#94A3B8"
                />
              </View>

              <Text style={styles.recipient}>
                {t("المستلم:", "Recipient:")} {item.recipient_name}
              </Text>

              <View style={styles.trackButton}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color="#2563EB"
                />
                <Text style={styles.trackText}>
                  {t("عرض تفاصيل التوصيل", "View Delivery Details")}
                </Text>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name={error ? "cloud-offline-outline" : "map-outline"}
                size={50}
                color="#94A3B8"
              />
              <Text style={styles.emptyText}>
                {error
                  ? t("تعذر تحميل التوصيلات", "Unable to load deliveries")
                  : t("لا توجد توصيلات نشطة في الصفحة الحالية", "No active deliveries on this page")}
              </Text>

              {error && (
                <Pressable onPress={() => void load()}>
                  <Text style={styles.retry}>
                    {t("إعادة المحاولة", "Try Again")}
                  </Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  header: {
    backgroundColor: "#0B1730",
    paddingTop: 60,
    paddingBottom: 22,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  list: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  info: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#EFF6FF",
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    color: "#1D4ED8",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tracking: {
    color: "#0B1730",
    fontWeight: "800",
    fontSize: 15,
  },
  status: {
    color: "#059669",
    marginTop: 6,
    fontWeight: "700",
  },
  recipient: {
    color: "#475569",
    marginTop: 15,
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
  },
  trackText: {
    color: "#2563EB",
    fontWeight: "800",
  },
  empty: {
    alignItems: "center",
    padding: 35,
    gap: 15,
  },
  emptyText: {
    color: "#64748B",
    textAlign: "center",
  },
  retry: {
    color: "#2563EB",
    fontWeight: "800",
  },
});
