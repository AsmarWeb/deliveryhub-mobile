import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useLanguage } from "../../../contexts/LanguageContext";
import {
  getDriverAssignments,
  pickupDelivery,
  startDeliveryTransit,
  type DriverAssignment,
} from "../../../services/driver";
import {
  driverLocationTracking,
  type TrackingSnapshot,
} from "../../../services/locationTracking";

type Filter = "active" | "finished";
type Action = "pickup" | "transit";

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } })
      .response;
    if (typeof response?.data?.message === "string")
      return response.data.message;
  }
  return fallback;
}

export default function DriverDeliveriesScreen() {
  const { t, isArabic } = useLanguage();
  const [assignments, setAssignments] = useState<DriverAssignment[]>([]);
  const [filter, setFilter] = useState<Filter>("active");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const [tracking, setTracking] = useState<TrackingSnapshot>(
    driverLocationTracking.getSnapshot(),
  );
  const [trackingBusy, setTrackingBusy] = useState(false);

  useEffect(() => driverLocationTracking.subscribe(setTracking), []);

  // Tracking is intentionally foreground-only and scoped to this screen.
  useFocusEffect(
    useCallback(
      () => () => {
        driverLocationTracking.stop();
      },
      [],
    ),
  );

  async function toggleTracking(deliveryId: number) {
    if (trackingBusy) return;
    if (tracking.status === "tracking" && tracking.deliveryId === deliveryId) {
      driverLocationTracking.stop();
      return;
    }
    setTrackingBusy(true);
    try {
      await driverLocationTracking.start(deliveryId);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : t("تعذر بدء التتبع", "Could not start tracking");
      Alert.alert(t("خطأ في التتبع", "Tracking error"), message);
    } finally {
      setTrackingBusy(false);
    }
  }

  const load = useCallback(
    async (refresh = false) => {
      const current = ++requestId.current;
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const first = await getDriverAssignments(1);
        const all = [...first.data];
        const lastPage = Math.max(1, first.last_page);
        for (let page = 2; page <= lastPage; page++) {
          const next = await getDriverAssignments(page);
          all.push(...next.data);
        }
        if (current !== requestId.current) return;
        const currentTracking = driverLocationTracking.getSnapshot();
        if (
          currentTracking.deliveryId !== null &&
          !all.some(
            (item) =>
              item.status === "accepted" &&
              item.delivery?.id === currentTracking.deliveryId &&
              ["pickup", "in_transit"].includes(item.delivery.status),
          )
        )
          driverLocationTracking.stop();
        setAssignments(all);
        setError(null);
      } catch (err: unknown) {
        if (current !== requestId.current) return;
        setError(
          getErrorMessage(
            err,
            isArabic
              ? "تعذر تحميل مهام التوصيل."
              : "Unable to load deliveries.",
          ),
        );
      } finally {
        if (current === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [isArabic],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestId.current += 1;
      };
    }, [load]),
  );

  const eligible = useMemo(
    () =>
      assignments.filter(
        (item) => item.status === "accepted" && item.delivery != null,
      ),
    [assignments],
  );

  const counts = useMemo(
    () => ({
      active: eligible.filter((item) =>
        ["accepted", "pickup", "in_transit"].includes(
          item.delivery?.status ?? "",
        ),
      ).length,
      finished: eligible.filter((item) =>
        ["delivered", "completed"].includes(item.delivery?.status ?? ""),
      ).length,
    }),
    [eligible],
  );

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return eligible.filter((item) => {
      const status = item.delivery?.status ?? "";
      const matchesStatus =
        filter === "active"
          ? ["accepted", "pickup", "in_transit"].includes(status)
          : ["delivered", "completed"].includes(status);
      if (!matchesStatus) return false;
      if (!normalized) return true;
      const delivery = item.delivery;
      return [
        delivery?.tracking_number,
        delivery?.recipient_name,
        delivery?.recipient_phone,
        String(delivery?.id ?? ""),
        String(item.id),
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(normalized),
      );
    });
  }, [eligible, filter, query]);

  const statusLabel = (status: string): string => {
    switch (status) {
      case "accepted":
        return t("بانتظار الاستلام", "Awaiting pickup");
      case "pickup":
        return t("تم الاستلام", "Picked up");
      case "in_transit":
        return t("قيد التوصيل", "In transit");
      case "delivered":
        return t("تم التسليم", "Delivered");
      case "completed":
        return t("مكتملة", "Completed");
      default:
        return status;
    }
  };

  const updateDelivery = async (deliveryId: number, action: Action) => {
    if (busyId !== null) return;
    setBusyId(deliveryId);
    try {
      if (action === "pickup") await pickupDelivery(deliveryId);
      else await startDeliveryTransit(deliveryId);
    } catch (err: unknown) {
      Alert.alert(
        t("تعذر تحديث الشحنة", "Could not update delivery"),
        getErrorMessage(
          err,
          t(
            "حدث خطأ أثناء تحديث الحالة.",
            "An error occurred while updating the status.",
          ),
        ),
      );
      setBusyId(null);
      return;
    }

    Alert.alert(
      t("تم بنجاح", "Success"),
      action === "pickup"
        ? t("تم تأكيد استلام الشحنة.", "Pickup confirmed.")
        : t("تم بدء رحلة التوصيل.", "Delivery journey started."),
    );
    // Refresh is separate: a network failure here must not misreport the successful action.
    await load(true);
    setBusyId(null);
  };

  const confirmAction = (deliveryId: number, action: Action) => {
    Alert.alert(
      t("تأكيد العملية", "Confirm action"),
      action === "pickup"
        ? t("هل استلمت الشحنة بالفعل؟", "Have you collected the package?")
        : t("هل تريد بدء توصيل الشحنة؟", "Start delivering this package?"),
      [
        { text: t("إلغاء", "Cancel"), style: "cancel" },
        {
          text: t("تأكيد", "Confirm"),
          onPress: () => void updateDelivery(deliveryId, action),
        },
      ],
    );
  };

  const renderDelivery = ({ item }: { item: DriverAssignment }) => {
    const delivery = item.delivery;
    if (!delivery) return null;
    const status = delivery.status;
    const finished = status === "delivered" || status === "completed";
    const busy = busyId !== null;
    const canTrack =
      item.status === "accepted" && ["pickup", "in_transit"].includes(status);
    const trackingThis =
      tracking.deliveryId === delivery.id && tracking.status === "tracking";
    const startingThis =
      tracking.deliveryId === delivery.id && tracking.status === "starting";
    const trackingAnother =
      tracking.deliveryId !== null &&
      tracking.deliveryId !== delivery.id &&
      ["starting", "tracking"].includes(tracking.status);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <Ionicons name="cube-outline" size={23} color="#2563EB" />
          </View>
          <View style={styles.heading}>
            <Text style={styles.tracking} numberOfLines={1}>
              {delivery.tracking_number ??
                `${t("شحنة", "Delivery")} #${delivery.id}`}
            </Text>
            <Text style={styles.muted}>
              {t("مهمة", "Assignment")} #{item.id}
            </Text>
          </View>
        </View>
        <View style={[styles.statusBox, finished && styles.finishedStatus]}>
          <Ionicons
            name={finished ? "checkmark-circle" : "ellipse"}
            size={finished ? 17 : 10}
            color={finished ? "#15803D" : "#2563EB"}
          />
          <Text style={[styles.statusText, finished && styles.finishedText]}>
            {statusLabel(status)}
          </Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={18} color="#64748B" />
          <View style={styles.infoContent}>
            <Text style={styles.label}>{t("المستلم", "Recipient")}</Text>
            <Text style={styles.value}>
              {delivery.recipient_name ?? t("غير متوفر", "Not available")}
            </Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="call-outline" size={18} color="#64748B" />
          <View style={styles.infoContent}>
            <Text style={styles.label}>{t("رقم الهاتف", "Phone number")}</Text>
            <Text style={styles.value}>
              {delivery.recipient_phone ?? t("غير متوفر", "Not available")}
            </Text>
          </View>
        </View>
        {status === "accepted" && (
          <Pressable
            style={[styles.primaryButton, busy && styles.disabled]}
            disabled={busy}
            onPress={() => confirmAction(delivery.id, "pickup")}
          >
            {busyId === delivery.id ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="cube-outline" size={19} color="#FFFFFF" />
            )}
            <Text style={styles.buttonText}>
              {t("تأكيد استلام الشحنة", "Confirm pickup")}
            </Text>
          </Pressable>
        )}
        {status === "pickup" && (
          <Pressable
            style={[styles.primaryButton, busy && styles.disabled]}
            disabled={busy}
            onPress={() => confirmAction(delivery.id, "transit")}
          >
            {busyId === delivery.id ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Ionicons name="navigate-outline" size={19} color="#FFFFFF" />
            )}
            <Text style={styles.buttonText}>
              {t("بدء التوصيل", "Start delivery")}
            </Text>
          </Pressable>
        )}
        {canTrack && (
          <View style={styles.trackingPanel}>
            <View style={styles.trackingHeading}>
              <Ionicons name="location-outline" size={21} color="#2563EB" />
              <Text style={styles.trackingTitle}>
                {t(
                  "مشاركة الموقع أثناء التوصيل",
                  "Share location during delivery",
                )}
              </Text>
            </View>
            <Text style={styles.trackingHint}>
              {t(
                "يعمل أثناء فتح هذه الصفحة فقط. يتوقف عند مغادرتها أو وضع التطبيق بالخلفية.",
                "Works only while this screen is open. Stops when leaving or backgrounding the app.",
              )}
            </Text>
            <Pressable
              disabled={trackingBusy || startingThis || trackingAnother}
              onPress={() => void toggleTracking(delivery.id)}
              style={[
                styles.trackingButton,
                trackingThis && styles.trackingStop,
                (trackingBusy || startingThis || trackingAnother) &&
                  styles.disabled,
              ]}
            >
              {startingThis ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons
                  name={
                    trackingThis ? "stop-circle-outline" : "navigate-outline"
                  }
                  size={19}
                  color="#FFFFFF"
                />
              )}
              <Text style={styles.buttonText}>
                {startingThis
                  ? t("جارٍ بدء التتبع...", "Starting tracking...")
                  : trackingThis
                    ? t("إيقاف التتبع", "Stop tracking")
                    : trackingAnother
                      ? t(
                          "تتبع مهمة أخرى نشط",
                          "Another delivery is being tracked",
                        )
                      : t("بدء تتبع الموقع", "Start location tracking")}
              </Text>
            </Pressable>
            {trackingThis && tracking.lastSentAt && (
              <Text style={styles.trackingHint}>
                {t("آخر إرسال:", "Last update:")}{" "}
                {new Date(tracking.lastSentAt).toLocaleTimeString()}
              </Text>
            )}
            {tracking.status === "error" && (
              <Text style={styles.trackingError}>
                {tracking.message ??
                  t("تعذر إرسال الموقع", "Location update failed")}
              </Text>
            )}
          </View>
        )}
        {status === "in_transit" && (
          <Pressable
            style={styles.successButton}
            onPress={() =>
              router.push({
                pathname: "/driver/deliveries/[id]/proof",
                params: { id: String(delivery.id) },
              })
            }
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.buttonText}>
              {t("تسجيل إثبات التسليم", "Submit delivery proof")}
            </Text>
          </Pressable>
        )}
        {finished && (
          <View style={styles.finishedBox}>
            <Ionicons name="checkmark-circle" size={21} color="#15803D" />
            <Text style={styles.finishedText}>
              {t("اكتملت عملية التوصيل", "Delivery completed")}
            </Text>
          </View>
        )}
        <Pressable
          style={styles.detailsButton}
          onPress={() =>
            router.push({
              pathname: "/driver/assignments/[id]",
              params: { id: String(item.id) },
            })
          }
        >
          <Text style={styles.detailsText}>
            {t("عرض تفاصيل المهمة", "View assignment details")}
          </Text>
          <Ionicons
            name={isArabic ? "arrow-back" : "arrow-forward"}
            size={18}
            color="#2563EB"
          />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.caption}>DELIVERYHUB DRIVER</Text>
        <Text style={styles.title}>{t("التوصيل", "Deliveries")}</Text>
        <Text style={styles.subtitle}>
          {t(
            "تابع استلام الشحنات وتسليمها خطوة بخطوة",
            "Manage pickups and deliveries step by step",
          )}
        </Text>
      </View>
      <View style={styles.toolbar}>
        <View style={styles.tabs}>
          {(["active", "finished"] as const).map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setFilter(tab)}
              style={[styles.tab, filter === tab && styles.selectedTab]}
            >
              <Text
                style={[styles.tabText, filter === tab && styles.selectedText]}
              >
                {tab === "active"
                  ? t("النشطة", "Active")
                  : t("المكتملة", "Completed")}{" "}
                ({counts[tab]})
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder={t(
              "ابحث برقم الشحنة أو اسم المستلم",
              "Search tracking or recipient",
            )}
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            textAlign={isArabic ? "right" : "left"}
            autoCorrect={false}
          />
          {query.length > 0 && (
            <Pressable
              accessibilityLabel={t("مسح البحث", "Clear search")}
              onPress={() => setQuery("")}
            >
              <Ionicons name="close-circle" size={19} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={42} color="#DC2626" />
          <Text style={styles.error}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => void load()}>
            <Text style={styles.retry}>{t("إعادة المحاولة", "Try again")}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderDelivery}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor="#2563EB"
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="car-sport-outline" size={50} color="#94A3B8" />
              <Text style={styles.emptyTitle}>
                {t("لا توجد توصيلات مطابقة", "No matching deliveries")}
              </Text>
              <Text style={styles.muted}>
                {t(
                  "اسحب للأسفل للتحديث أو غيّر البحث.",
                  "Pull to refresh or adjust your search.",
                )}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },
  header: {
    backgroundColor: "#0B1730",
    paddingTop: 62,
    paddingHorizontal: 22,
    paddingBottom: 24,
  },
  caption: {
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  title: { color: "#FFFFFF", fontSize: 28, fontWeight: "800", marginTop: 8 },
  subtitle: { color: "#CBD5E1", marginTop: 6, fontSize: 13 },
  toolbar: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tabs: { flexDirection: "row", gap: 8 },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 11,
    borderRadius: 11,
    backgroundColor: "#F8FAFC",
  },
  selectedTab: { backgroundColor: "#EFF6FF" },
  tabText: { color: "#64748B", fontWeight: "700", fontSize: 12 },
  selectedText: { color: "#2563EB" },
  searchBox: {
    height: 45,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 13,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: { flex: 1, fontSize: 13, color: "#0B1730", paddingVertical: 8 },
  list: { padding: 16, gap: 14, paddingBottom: 35, flexGrow: 1 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  iconBox: { backgroundColor: "#EFF6FF", padding: 12, borderRadius: 13 },
  heading: { flex: 1 },
  tracking: { color: "#0B1730", fontSize: 16, fontWeight: "800" },
  muted: { color: "#64748B", fontSize: 12, marginTop: 4, textAlign: "center" },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    padding: 11,
    borderRadius: 11,
  },
  finishedStatus: { backgroundColor: "#F0FDF4" },
  statusText: { color: "#1D4ED8", fontWeight: "700", fontSize: 12 },
  divider: { height: 1, backgroundColor: "#E2E8F0" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoContent: { flex: 1, gap: 3 },
  label: { color: "#94A3B8", fontSize: 11 },
  value: { color: "#334155", fontSize: 14, fontWeight: "600" },
  primaryButton: {
    backgroundColor: "#2563EB",
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  successButton: {
    backgroundColor: "#16A34A",
    padding: 15,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  disabled: { opacity: 0.55 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  finishedBox: {
    backgroundColor: "#F0FDF4",
    padding: 13,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
  },
  finishedText: { color: "#15803D", fontWeight: "800", fontSize: 12 },
  detailsButton: {
    backgroundColor: "#EFF6FF",
    padding: 13,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  detailsText: { color: "#2563EB", fontWeight: "800", fontSize: 13 },
  trackingPanel: {
    backgroundColor: "#EFF6FF",
    borderRadius: 13,
    padding: 14,
    gap: 10,
  },
  trackingHeading: { flexDirection: "row", alignItems: "center", gap: 8 },
  trackingTitle: { color: "#1D4ED8", fontSize: 13, fontWeight: "800", flex: 1 },
  trackingHint: { color: "#475569", fontSize: 12, lineHeight: 19 },
  trackingButton: {
    backgroundColor: "#2563EB",
    borderRadius: 11,
    padding: 13,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  trackingStop: { backgroundColor: "#DC2626" },
  trackingError: { color: "#B91C1C", fontSize: 12 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    padding: 24,
  },
  error: { color: "#DC2626", textAlign: "center" },
  retryButton: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retry: { color: "#2563EB", fontWeight: "800" },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 30,
  },
  emptyTitle: {
    color: "#334155",
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
});
