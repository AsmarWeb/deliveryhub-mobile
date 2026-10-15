import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useLanguage } from "../../../contexts/LanguageContext";
import {
  acceptDriverAssignment,
  getDriverAssignments,
  rejectDriverAssignment,
  type DriverAssignment,
} from "../../../services/driver";

type Filter = "all" | "new" | "active" | "history";
const FILTERS: Filter[] = ["all", "new", "active", "history"];
const BLUE = "#2563EB";

function groupOf(item: DriverAssignment): Filter {
  if (item.status === "pending") return "new";
  if (
    ["rejected", "cancelled"].includes(item.status) ||
    ["delivered", "completed", "cancelled"].includes(
      item.delivery?.status ?? "",
    )
  )
    return "history";
  return "active";
}

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string")
      return response.data.message;
  }
  return fallback;
}

export default function DriverOrdersScreen() {
  const { isArabic, t } = useLanguage();
  const [orders, setOrders] = useState<DriverAssignment[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectItem, setRejectItem] = useState<DriverAssignment | null>(null);
  const [reason, setReason] = useState("");
  const requestId = useRef(0);

  const loadOrders = useCallback(
    async (refresh = false) => {
      const currentRequest = ++requestId.current;
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const first = await getDriverAssignments(1);
        const all = [...first.data];
        const lastPage = Math.max(1, first.last_page);
        for (let page = 2; page <= lastPage; page++) {
          const result = await getDriverAssignments(page);
          all.push(...result.data);
        }
        if (currentRequest !== requestId.current) return;
        setOrders(all);
        setError(null);
      } catch (err: unknown) {
        if (currentRequest !== requestId.current) return;
        setError(
          errorMessage(err, t("تعذر تحميل الطلبات.", "Unable to load orders.")),
        );
      } finally {
        if (currentRequest === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
      return () => {
        requestId.current += 1;
      };
    }, [loadOrders]),
  );

  const counts = useMemo(() => {
    const result: Record<Filter, number> = {
      all: orders.length,
      new: 0,
      active: 0,
      history: 0,
    };
    for (const item of orders) result[groupOf(item)] += 1;
    return result;
  }, [orders]);

  const visibleOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return orders.filter((item) => {
      if (filter !== "all" && groupOf(item) !== filter) return false;
      if (!query) return true;
      const delivery = item.delivery;
      const searchable = [
        item.id,
        delivery?.id,
        delivery?.tracking_number,
        delivery?.recipient_name,
        delivery?.recipient_phone,
      ]
        .filter((value) => value !== null && value !== undefined)
        .join(" ")
        .toLocaleLowerCase();
      return searchable.includes(query);
    });
  }, [orders, filter, search]);

  const filterLabel = (key: Filter) => {
    switch (key) {
      case "all":
        return t("الكل", "All");
      case "new":
        return t("الجديدة", "New");
      case "active":
        return t("النشطة", "Active");
      case "history":
        return t("السابقة", "History");
    }
  };

  const statusLabel = (item: DriverAssignment) => {
    if (item.status === "pending") return t("جديدة", "New");
    if (item.status === "rejected") return t("مرفوضة", "Rejected");
    const status = item.delivery?.status ?? item.status;
    switch (status) {
      case "assigned":
        return t("تم الإسناد", "Assigned");
      case "accepted":
        return t("تم القبول", "Accepted");
      case "pickup":
        return t("مرحلة الاستلام", "Pickup");
      case "in_transit":
        return t("قيد التوصيل", "In transit");
      case "delivered":
        return t("تم التسليم", "Delivered");
      case "completed":
        return t("مكتملة", "Completed");
      case "cancelled":
        return t("ملغاة", "Cancelled");
      default:
        return status.replace(/_/g, " ");
    }
  };

  async function accept(id: number) {
    if (busyId !== null) return;
    setBusyId(id);
    try {
      await acceptDriverAssignment(id);
    } catch (err: unknown) {
      Alert.alert(
        t("تعذر قبول المهمة", "Unable to accept"),
        errorMessage(err, t("حدث خطأ.", "Something went wrong.")),
      );
      setBusyId(null);
      return;
    }
    Alert.alert(
      t("تم بنجاح", "Success"),
      t("تم قبول المهمة.", "Assignment accepted."),
    );
    try {
      await loadOrders(true);
    } finally {
      setBusyId(null);
    }
  }

  function confirmAccept(id: number) {
    Alert.alert(
      t("قبول الطلب", "Accept order"),
      t(
        "هل تريد قبول مهمة التوصيل؟",
        "Do you want to accept this delivery assignment?",
      ),
      [
        { text: t("إلغاء", "Cancel"), style: "cancel" },
        { text: t("قبول", "Accept"), onPress: () => void accept(id) },
      ],
    );
  }

  async function submitReject() {
    if (!rejectItem || busyId !== null) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      Alert.alert(
        t("تنبيه", "Required"),
        t(
          "أدخل سبب رفض المهمة.",
          "Enter a reason for rejecting this assignment.",
        ),
      );
      return;
    }
    const id = rejectItem.id;
    setBusyId(id);
    try {
      await rejectDriverAssignment(id, trimmed);
    } catch (err: unknown) {
      Alert.alert(
        t("تعذر رفض المهمة", "Unable to reject"),
        errorMessage(err, t("حدث خطأ.", "Something went wrong.")),
      );
      setBusyId(null);
      return;
    }
    setRejectItem(null);
    setReason("");
    Alert.alert(t("تم", "Done"), t("تم رفض المهمة.", "Assignment rejected."));
    try {
      await loadOrders(true);
    } finally {
      setBusyId(null);
    }
  }

  function renderOrder({ item }: { item: DriverAssignment }) {
    const delivery = item.delivery;
    const pending = item.status === "pending";
    const group = groupOf(item);
    const badgeStyle =
      group === "new"
        ? styles.newBadge
        : group === "history"
          ? styles.historyBadge
          : styles.activeBadge;
    const badgeTextStyle =
      group === "new"
        ? styles.newBadgeText
        : group === "history"
          ? styles.historyBadgeText
          : styles.activeBadgeText;
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.packageIcon}>
            <Ionicons name="cube-outline" size={23} color={BLUE} />
          </View>
          <View style={styles.cardHeading}>
            <Text style={styles.tracking} numberOfLines={1}>
              {delivery?.tracking_number ??
                `${t("طلب", "Order")} #${delivery?.id ?? item.id}`}
            </Text>
            <Text style={styles.muted}>
              {t("مهمة", "Assignment")} #{item.id}
            </Text>
          </View>
          <View style={[styles.badge, badgeStyle]}>
            <Text style={[styles.badgeText, badgeTextStyle]}>
              {statusLabel(item)}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={18} color="#64748B" />
          <Text
            style={[
              styles.infoText,
              { textAlign: isArabic ? "right" : "left" },
            ]}
            numberOfLines={2}
          >
            {delivery?.recipient_name ||
              t("اسم المستلم غير متوفر", "Recipient not available")}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={18} color="#64748B" />
          <Text
            style={[
              styles.infoText,
              { textAlign: isArabic ? "right" : "left" },
            ]}
          >
            {delivery?.recipient_phone ||
              t("رقم الهاتف غير متوفر", "Phone not available")}
          </Text>
        </View>
        {pending && (
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              style={[styles.acceptButton, busyId !== null && styles.disabled]}
              disabled={busyId !== null}
              onPress={() => confirmAccept(item.id)}
            >
              {busyId === item.id ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color="#FFFFFF"
                />
              )}
              <Text style={styles.whiteText}>{t("قبول", "Accept")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.rejectButton, busyId !== null && styles.disabled]}
              disabled={busyId !== null}
              onPress={() => {
                setRejectItem(item);
                setReason("");
              }}
            >
              <Ionicons name="close-circle-outline" size={19} color="#DC2626" />
              <Text style={styles.rejectText}>{t("رفض", "Reject")}</Text>
            </Pressable>
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          style={styles.detailsButton}
          onPress={() =>
            router.push({
              pathname: "/driver/assignments/[id]",
              params: { id: String(item.id) },
            })
          }
        >
          <Text style={styles.detailsText}>
            {t("عرض تفاصيل الطلب", "View order details")}
          </Text>
          <Ionicons
            name={isArabic ? "chevron-back" : "chevron-forward"}
            size={18}
            color={BLUE}
          />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerCaption}>DELIVERYHUB DRIVER</Text>
        <Text style={styles.title}>{t("الطلبات", "Orders")}</Text>
        <Text style={styles.headerSubtitle}>
          {t("إدارة المهام المسندة إليك", "Manage your assigned deliveries")}
        </Text>
        <View style={styles.summaryRow}>
          <Ionicons name="cube-outline" size={16} color="#BFDBFE" />
          <Text style={styles.summaryText}>
            {t("إجمالي المهام", "Total assignments")}: {counts.all}
          </Text>
        </View>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color="#64748B" />
          <TextInput
            accessibilityLabel={t("البحث عن طلب", "Search orders")}
            style={[
              styles.searchInput,
              { textAlign: isArabic ? "right" : "left" },
            ]}
            placeholder={t(
              "ابحث برقم الطلب أو اسم المستلم...",
              "Search tracking, recipient, phone...",
            )}
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("مسح البحث", "Clear search")}
              onPress={() => setSearch("")}
            >
              <Ionicons name="close-circle" size={19} color="#94A3B8" />
            </Pressable>
          )}
        </View>
        <View style={styles.filters}>
          {FILTERS.map((key) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === key }}
              onPress={() => setFilter(key)}
              style={[
                styles.filterButton,
                filter === key && styles.selectedFilter,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === key && styles.selectedFilterText,
                ]}
                numberOfLines={1}
              >
                {filterLabel(key)} ({counts[key]})
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.muted}>
            {t("جاري تحميل الطلبات...", "Loading orders...")}
          </Text>
        </View>
      ) : error && orders.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={48} color="#DC2626" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            style={styles.retryButton}
            onPress={() => void loadOrders()}
          >
            <Text style={styles.detailsText}>
              {t("إعادة المحاولة", "Try again")}
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visibleOrders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrder}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadOrders(true)}
              tintColor={BLUE}
              colors={[BLUE]}
            />
          }
          ListHeaderComponent={
            error ? <Text style={styles.warningText}>{error}</Text> : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="file-tray-outline" size={50} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {search.trim()
                  ? t("لا توجد نتائج مطابقة", "No matching orders")
                  : t(
                      "لا توجد طلبات في هذا القسم",
                      "No orders in this section",
                    )}
              </Text>
              <Text style={styles.muted}>
                {t("اسحب للأسفل لتحديث القائمة.", "Pull down to refresh.")}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={rejectItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (busyId === null) setRejectItem(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.overlay}
        >
          <View style={styles.modal}>
            <Text
              style={[
                styles.modalTitle,
                { textAlign: isArabic ? "right" : "left" },
              ]}
            >
              {t("رفض مهمة التوصيل", "Reject assignment")}
            </Text>
            <Text
              style={[styles.muted, { textAlign: isArabic ? "right" : "left" }]}
            >
              {t(
                "يرجى توضيح سبب الرفض.",
                "Please provide a reason for rejection.",
              )}
            </Text>
            <TextInput
              accessibilityLabel={t("سبب الرفض", "Rejection reason")}
              style={[
                styles.reasonInput,
                { textAlign: isArabic ? "right" : "left" },
              ]}
              multiline
              placeholder={t("سبب الرفض...", "Reason for rejection...")}
              placeholderTextColor="#94A3B8"
              value={reason}
              onChangeText={setReason}
              maxLength={1000}
              textAlignVertical="top"
            />
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.rejectConfirmButton,
                  busyId !== null && styles.disabled,
                ]}
                disabled={busyId !== null}
                onPress={() => void submitReject()}
              >
                {busyId !== null && (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                )}
                <Text style={styles.whiteText}>
                  {t("تأكيد الرفض", "Confirm rejection")}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={styles.cancelButton}
                disabled={busyId !== null}
                onPress={() => setRejectItem(null)}
              >
                <Text style={styles.cancelText}>{t("إلغاء", "Cancel")}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },
  header: {
    backgroundColor: "#0B1730",
    paddingTop: 62,
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  headerCaption: {
    fontSize: 11,
    fontWeight: "700",
    color: "#93C5FD",
    letterSpacing: 1,
  },
  title: { color: "#FFFFFF", fontSize: 29, fontWeight: "800", marginTop: 7 },
  headerSubtitle: { color: "#CBD5E1", marginTop: 6, fontSize: 13 },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 16,
  },
  summaryText: { color: "#DBEAFE", fontSize: 12, fontWeight: "700" },
  toolbar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  searchBox: {
    height: 45,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    fontSize: 13,
    color: "#0F172A",
    paddingVertical: 0,
  },
  filters: { flexDirection: "row", gap: 5, marginTop: 11 },
  filterButton: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 10,
  },
  selectedFilter: { backgroundColor: "#EFF6FF" },
  filterText: { color: "#64748B", fontSize: 11, fontWeight: "700" },
  selectedFilterText: { color: BLUE },
  list: { padding: 16, gap: 13, flexGrow: 1, paddingBottom: 35 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    gap: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  packageIcon: { padding: 11, borderRadius: 12, backgroundColor: "#EFF6FF" },
  cardHeading: { flex: 1, minWidth: 0 },
  tracking: { fontSize: 14, fontWeight: "800", color: "#0B1730" },
  muted: { fontSize: 12, color: "#64748B", marginTop: 4 },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
    maxWidth: 105,
  },
  badgeText: { fontSize: 10, fontWeight: "800", textAlign: "center" },
  newBadge: { backgroundColor: "#EFF6FF" },
  newBadgeText: { color: "#1D4ED8" },
  activeBadge: { backgroundColor: "#ECFDF5" },
  activeBadgeText: { color: "#047857" },
  historyBadge: { backgroundColor: "#F1F5F9" },
  historyBadgeText: { color: "#475569" },
  divider: { height: 1, backgroundColor: "#E2E8F0" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 13, color: "#475569", flex: 1 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 3 },
  acceptButton: {
    flex: 1,
    backgroundColor: "#16A34A",
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
  },
  disabled: { opacity: 0.55 },
  whiteText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  rejectText: { color: "#DC2626", fontWeight: "800", fontSize: 13 },
  detailsButton: {
    backgroundColor: "#EFF6FF",
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  detailsText: { color: BLUE, fontWeight: "800", fontSize: 13 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 13,
    padding: 24,
  },
  errorText: { color: "#DC2626", textAlign: "center", fontSize: 13 },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
  },
  warningText: {
    color: "#B45309",
    backgroundColor: "#FFFBEB",
    padding: 12,
    borderRadius: 10,
    textAlign: "center",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    padding: 25,
    marginTop: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    textAlign: "center",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 22,
  },
  modal: { backgroundColor: "#FFFFFF", padding: 22, borderRadius: 20, gap: 14 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0B1730" },
  reasonInput: {
    minHeight: 105,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#0F172A",
  },
  rejectConfirmButton: {
    flex: 1,
    backgroundColor: "#DC2626",
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    padding: 13,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: "#334155", fontWeight: "800" },
});
