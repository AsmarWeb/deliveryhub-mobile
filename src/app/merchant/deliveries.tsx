import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { Delivery, formatDeliveryFee, getDeliveries } from "../../services/deliveries";

const statusLabels: Record<string, string> = {
  draft: "مسودة", pending_pricing: "بانتظار التسعير",
  priced: "بانتظار موافقتك", matching: "البحث عن سائق",
  assigned: "تم تعيين سائق", accepted: "تم قبول الطلب",
  pickup: "جاري الاستلام", in_transit: "قيد التوصيل",
  delivered: "تم التسليم", completed: "مكتمل", cancelled: "ملغي",
  pickup_failed: "فشل الاستلام", delivery_failed: "فشل التسليم",
  rescheduled: "أعيدت الجدولة", expired: "منتهي الصلاحية",
};

export default function DeliveriesScreen() {
  const [items, setItems] = useState<Delivery[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const requestCounter = useRef(0);
  const busy = useRef(false);

  const load = useCallback(async (nextPage = 1, append = false) => {
    if (busy.current && append) return;
    busy.current = true;
    const requestId = ++requestCounter.current;
    try {
      setError(false);
      const result = await getDeliveries(nextPage);
      if (requestId !== requestCounter.current) return;
      setItems(current => append
        ? [...current, ...result.data.filter(item => !current.some(existing => existing.id === item.id))]
        : result.data);
      setPage(result.current_page);
      setLastPage(result.last_page);
    } catch (err) {
      console.error("Delivery list error:", err);
      if (requestId === requestCounter.current) setError(true);
    } finally {
      if (requestId === requestCounter.current) {
        setLoading(false); setLoadingMore(false); setRefreshing(false);
      }
      busy.current = false;
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void load(1);
    return () => { requestCounter.current += 1; };
  }, [load]));

  function refresh() { setRefreshing(true); void load(1); }
  function loadMore() {
    if (busy.current || loading || loadingMore || refreshing || page >= lastPage) return;
    setLoadingMore(true);
    void load(page + 1, true);
  }

  const renderItem = ({ item }: { item: Delivery }) => {
    const needsApproval = item.status === "priced";
    return <Pressable style={[styles.card, needsApproval && styles.attentionCard]}
      onPress={() => router.push({ pathname: "/merchant/deliveries/[id]", params: { id: String(item.id) } })}>
      <View style={styles.cardHeader}>
        <Ionicons name="cube-outline" size={24} color="#2563EB" />
        <Text style={styles.tracking} numberOfLines={1}>{item.tracking_number}</Text>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </View>
      <Text style={styles.recipient}>{item.recipient_name}</Text>
      <View style={styles.cardFooter}>
        <Text style={[styles.status, needsApproval && styles.attentionText]}>
          {statusLabels[item.status] || item.status}
        </Text>
        <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString("en-AE")}</Text>
      </View>
      {needsApproval && <View style={styles.priceRow}>
        <Ionicons name="alert-circle-outline" size={18} color="#B45309" />
        <Text style={styles.priceLabel}>موافقتك مطلوبة — {formatDeliveryFee(item)}</Text>
      </View>}
    </Pressable>;
  };

  return <View style={styles.container}>
    <View style={styles.header}>
      <Pressable onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#FFFFFF" /></Pressable>
      <Text style={styles.title}>شحناتي</Text>
      <Pressable onPress={refresh} accessibilityLabel="تحديث القائمة">
        <Ionicons name="refresh-outline" size={24} color="#FFFFFF" />
      </Pressable>
    </View>
    {loading && items.length === 0 ? <ActivityIndicator size="large" color="#2563EB" style={styles.center} /> :
      <FlatList data={items} keyExtractor={item => String(item.id)} renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        onEndReached={loadMore} onEndReachedThreshold={0.4}
        ListHeaderComponent={error && items.length > 0 ?
          <Pressable style={styles.errorBanner} onPress={refresh}>
            <Text style={styles.errorText}>تعذر تحديث القائمة. اضغط للمحاولة مجدداً.</Text>
          </Pressable> : null}
        ListEmptyComponent={<View style={styles.empty}>
          <Ionicons name="cube-outline" size={54} color="#94A3B8" />
          <Text style={styles.emptyTitle}>{error ? "تعذر تحميل التوصيلات" : "لا توجد توصيلات حتى الآن"}</Text>
          {error && <Pressable style={styles.retry} onPress={() => { setLoading(true); void load(); }}>
            <Text style={styles.retryText}>إعادة المحاولة</Text>
          </Pressable>}
        </View>}
        ListFooterComponent={loadingMore ? <ActivityIndicator color="#2563EB" style={{ margin: 20 }} /> : null}
      />}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },
  header: { backgroundColor: "#0B1730", paddingTop: 58, paddingHorizontal: 22,
    paddingBottom: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "800" },
  center: { flex: 1 },
  list: { padding: 18, flexGrow: 1 },
  card: { backgroundColor: "#FFFFFF", padding: 18, borderRadius: 18,
    marginBottom: 12, borderWidth: 1, borderColor: "#E7ECF4" },
  attentionCard: { borderColor: "#F59E0B", borderWidth: 1.5 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  tracking: { flex: 1, fontWeight: "800", color: "#0B1730", fontSize: 12 },
  recipient: { fontSize: 16, fontWeight: "700", color: "#334155", marginTop: 16 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 15, alignItems: "center" },
  status: { color: "#2563EB", fontWeight: "700", fontSize: 12 },
  attentionText: { color: "#B45309" },
  date: { color: "#64748B", fontSize: 12 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: "#FDE68A" },
  priceLabel: { color: "#92400E", fontWeight: "700", fontSize: 13 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 100, gap: 16 },
  emptyTitle: { color: "#64748B", fontSize: 15, textAlign: "center" },
  retry: { backgroundColor: "#2563EB", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: "#FFFFFF", fontWeight: "700" },
  errorBanner: { padding: 12, backgroundColor: "#FEF2F2", borderRadius: 12, marginBottom: 12 },
  errorText: { color: "#B91C1C", textAlign: "center" },
});
