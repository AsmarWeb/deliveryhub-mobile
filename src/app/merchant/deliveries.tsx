import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Delivery, getDeliveries } from "../../services/deliveries";

export default function DeliveriesScreen() {
  const [items, setItems] = useState<Delivery[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async (nextPage = 1, append = false) => {
    try {
      setError(false);

      const result = await getDeliveries(nextPage);

      setItems((current) =>
        append ? [...current, ...result.data] : result.data,
      );

      setPage(result.current_page);
      setLastPage(result.last_page);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function refresh() {
    setRefreshing(true);
    void load(1);
  }

  function loadMore() {
    if (loading || loadingMore || refreshing || page >= lastPage) {
      return;
    }

    setLoadingMore(true);
    void load(page + 1, true);
  }

  const renderItem = ({ item }: { item: Delivery }) => (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: "/merchant/deliveries/[id]",
          params: { id: String(item.id) },
        })
      }
    >
      <View style={styles.cardHeader}>
        <Ionicons name="cube-outline" size={24} color="#2563EB" />
        <Text style={styles.tracking} numberOfLines={1}>
          {item.tracking_number}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </View>

      <Text style={styles.recipient}>{item.recipient_name}</Text>

      <View style={styles.cardFooter}>
        <Text style={styles.status}>{item.status}</Text>
        <Text style={styles.date}>
          {new Date(item.created_at).toLocaleDateString("en-AE")}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.title}>شحناتي</Text>

        <Ionicons name="cube-outline" size={24} color="#FFFFFF" />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={styles.center} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={54} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {error ? "تعذر تحميل التوصيلات" : "لا توجد توصيلات حتى الآن"}
              </Text>

              {error && (
                <Pressable
                  style={styles.retry}
                  onPress={() => {
                    setLoading(true);
                    void load();
                  }}
                >
                  <Text style={styles.retryText}>إعادة المحاولة</Text>
                </Pressable>
              )}
            </View>
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color="#2563EB" style={{ margin: 20 }} />
            ) : null
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
    paddingTop: 58,
    paddingHorizontal: 22,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },
  center: {
    flex: 1,
  },
  list: {
    padding: 18,
    flexGrow: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E7ECF4",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  tracking: {
    flex: 1,
    fontWeight: "800",
    color: "#0B1730",
    fontSize: 12,
  },
  recipient: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginTop: 16,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    alignItems: "center",
  },
  status: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 12,
  },
  date: {
    color: "#64748B",
    fontSize: 12,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 100,
    gap: 16,
  },
  emptyTitle: {
    color: "#64748B",
    fontSize: 15,
    textAlign: "center",
  },
  retry: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
