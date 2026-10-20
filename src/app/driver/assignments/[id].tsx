import CodPanel from "../../../components/finance/CodPanel";
import { addressDestination, formatAddress } from "../../../utils/address";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useLanguage } from "../../../contexts/LanguageContext";
import {
  getDriverAssignments,
  pickupDelivery,
  startDeliveryTransit,
  type DriverAddress,
  type DriverAssignment,
} from "../../../services/driver";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type DeliveryAction = "pickup" | "transit";

function addressText(address?: DriverAddress | null, ar = false): string {
  return address ? formatAddress(address, ar) : "";
}

async function navigateTo(address: string): Promise<void> {
  const destination = encodeURIComponent(address);
  const url = Platform.select({
    ios: `https://maps.apple.com/?daddr=${destination}`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
  });
  if (!url) return;
  await Linking.openURL(url);
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Ionicons name={icon} size={19} color="#2563EB" />
      </View>
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue} selectable>
          {value}
        </Text>
      </View>
    </View>
  );
}

  function AddressCard({
    title,
    icon,
    address,
    location,
    onNavigate,
  }: {
    title: string;
    icon: IconName;
    address?: DriverAddress | null;
    location: string;
    onNavigate: (address: string) => Promise<void>;
  }) {
    const { t } = useLanguage();
    return (
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name={icon} size={22} color="#2563EB" />
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <Text style={styles.addressText}>
          {location || t("العنوان غير متوفر", "Address unavailable")}
        </Text>
        {address?.delivery_instructions ? <DetailRow icon="information-circle-outline" label={t("تعليمات الوصول", "Access instructions")} value={address.delivery_instructions} /> : null}
        {address?.contact_name ? (
          <DetailRow
            icon="person-outline"
            label={t("جهة الاتصال", "Contact")}
            value={address.contact_name}
          />
        ) : null}
        {address?.contact_phone ? (
          <DetailRow
            icon="call-outline"
            label={t("الهاتف", "Phone")}
            value={address.contact_phone}
          />
        ) : null}
        {location ? (
          <Pressable
            style={styles.navigationButton}
            onPress={() => void onNavigate(address ? addressDestination(address) : location)}
          >
            <Ionicons name="navigate-outline" size={19} color="#FFFFFF" />
            <Text style={styles.navigationButtonText}>
              {t("فتح الاتجاهات", "Open directions")}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.missingHint}>
            {t(
              "أضف عنواناً كاملاً قبل استخدام الملاحة.",
              "A complete address is needed for navigation.",
            )}
          </Text>
        )}
      </View>
    );
  }

export default function DriverAssignmentDetails() {
  const params = useLocalSearchParams<{ id: string }>();
  const assignmentId = Number(params.id);
  const { language, t } = useLanguage();
  const [assignment, setAssignment] = useState<DriverAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
          throw new Error("Invalid assignment ID");
        }
        let found: DriverAssignment | undefined;
        let page = 1;
        while (true) {
          const result = await getDriverAssignments(page);
          found = result.data.find((entry) => entry.id === assignmentId);
          if (found || page >= result.last_page) break;
          page += 1;
        }
        setAssignment(found ?? null);
        setError(found ? null : "not_found");
      } catch {
        setError("load_failed");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [assignmentId],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function execute(action: DeliveryAction) {
    const deliveryId = assignment?.delivery?.id;
    if (!deliveryId || busy) return;
    setBusy(true);
    try {
      if (action === "pickup") await pickupDelivery(deliveryId);
      else await startDeliveryTransit(deliveryId);
      Alert.alert(
        t("تم بنجاح", "Success"),
        action === "pickup"
          ? t("تم تأكيد استلام الشحنة.", "Pickup confirmed.")
          : t("تم بدء رحلة التوصيل.", "Delivery transit started."),
      );
      await load(true);
    } catch (err: any) {
      Alert.alert(
        t("تعذر تحديث الشحنة", "Update failed"),
        err?.response?.data?.message ??
          t("يرجى المحاولة مرة أخرى.", "Please try again."),
      );
    } finally {
      setBusy(false);
    }
  }

  function confirmAction(action: DeliveryAction) {
    Alert.alert(
      t("تأكيد العملية", "Confirm action"),
      action === "pickup"
        ? t("هل استلمت الشحنة بالفعل؟", "Have you picked up the parcel?")
        : t("هل تريد بدء توصيل الشحنة؟", "Start the delivery journey?"),
      [
        { text: t("إلغاء", "Cancel"), style: "cancel" },
        { text: t("تأكيد", "Confirm"), onPress: () => void execute(action) },
      ],
    );
  }

  async function openAddress(address: string) {
    try {
      await navigateTo(address);
    } catch {
      Alert.alert(
        t("تعذر فتح الخرائط", "Unable to open maps"),
        t(
          "تحقق من توفر تطبيق الخرائط أو المتصفح.",
          "Check your maps app or browser.",
        ),
      );
    }
  }

  const delivery = assignment?.delivery;
  const status = assignment?.status === "expired" ? "offer_expired" : delivery?.status ?? "";
  const pickup = delivery?.pickup_address ?? delivery?.pickupAddress;
  const dropoff = delivery?.dropoff_address ?? delivery?.dropoffAddress;
  const pickupText = addressText(pickup, language === "ar");
  const dropoffText = addressText(dropoff, language === "ar");
  const statusNames: Record<string, string> = {
    offer_expired: t("انتهت مهلة عرض المهمة", "Assignment offer expired"),
    assigned: t("تم إسناد الطلب", "Assigned"),
    accepted: t("تم قبول المهمة", "Accepted"),
    pickup: t("تم استلام الشحنة", "Picked up"),
    in_transit: t("جاري التوصيل", "In transit"),
    delivered: t("تم تسليم الشحنة", "Delivered"),
    completed: t("مكتملة", "Completed"),
    cancelled: t("ملغاة", "Cancelled"),
  };


  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={t("رجوع", "Back")}
          onPress={() => router.back()}
        >
          <Ionicons
            name={language === "ar" ? "arrow-forward" : "arrow-back"}
            size={24}
            color="#FFFFFF"
          />
        </Pressable>
        <Text style={styles.headerTitle}>
          {t("تفاصيل المهمة", "Assignment details")}
        </Text>
        <Pressable
          accessibilityLabel={t("تحديث", "Refresh")}
          onPress={() => void load(true)}
        >
          <Ionicons name="refresh" size={23} color="#FFFFFF" />
        </Pressable>
      </View>

      {loading && !assignment ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error && !assignment ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={36} color="#94A3B8" />
          <Text style={styles.error}>
            {error === "not_found"
              ? t("المهمة غير موجودة.", "Assignment not found.")
              : t(
                  "تعذر تحميل تفاصيل المهمة.",
                  "Unable to load assignment details.",
                )}
          </Text>
          <Pressable onPress={() => void load()}>
            <Text style={styles.retry}>{t("إعادة المحاولة", "Try again")}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
            />
          }
        >
          {assignment ? (
            <>
              <View style={styles.summaryCard}>
                <View style={styles.parcelIcon}>
                  <Ionicons name="cube-outline" size={31} color="#2563EB" />
                </View>
                <Text style={styles.tracking}>
                  {delivery?.tracking_number ?? `#${assignment.id}`}
                </Text>
                <Text style={styles.status}>
                  {statusNames[status] ?? status}
                </Text>
                <Text style={styles.assignmentNumber}>
                  {t("رقم المهمة", "Assignment")} #{assignment.id}
                </Text>
              </View>

              {delivery && ["pending", "accepted"].includes(assignment.status) && <CodPanel deliveryId={delivery.id} deliveryStatus={delivery.status} role="driver" />}
              <AddressCard
                onNavigate={openAddress}
                title={t("موقع الاستلام", "Pickup location")}
                icon="location-outline"
                address={pickup}
                location={pickupText}
              />
              <AddressCard
                onNavigate={openAddress}
                title={t("موقع التسليم", "Drop-off location")}
                icon="flag-outline"
                address={dropoff}
                location={dropoffText}
              />

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t("معلومات المستلم", "Recipient details")}
                </Text>
                <DetailRow
                  icon="person-outline"
                  label={t("الاسم", "Name")}
                  value={delivery?.recipient_name || "—"}
                />
                <DetailRow
                  icon="call-outline"
                  label={t("الهاتف", "Phone")}
                  value={delivery?.recipient_phone || "—"}
                />
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>
                  {t("بيانات المهمة", "Assignment information")}
                </Text>
                <DetailRow
                  icon="receipt-outline"
                  label={t("رقم المهمة", "Assignment ID")}
                  value={String(assignment.id)}
                />
                <DetailRow
                  icon="information-circle-outline"
                  label={t("حالة الإسناد", "Assignment status")}
                  value={assignment.status}
                />
              </View>

              {assignment.status === "accepted" && status === "accepted" ? (
                <Pressable
                  disabled={busy}
                  style={[styles.primaryButton, busy && styles.disabled]}
                  onPress={() => confirmAction("pickup")}
                >
                  <Ionicons name="cube-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>
                    {t("تأكيد استلام الشحنة", "Confirm pickup")}
                  </Text>
                </Pressable>
              ) : null}
              {assignment.status === "accepted" && status === "pickup" ? (
                <Pressable
                  disabled={busy}
                  style={[styles.primaryButton, busy && styles.disabled]}
                  onPress={() => confirmAction("transit")}
                >
                  <Ionicons name="navigate-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>
                    {t("بدء التوصيل", "Start delivery")}
                  </Text>
                </Pressable>
              ) : null}
              {assignment.status === "accepted" &&
              status === "in_transit" &&
              delivery ? (
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
                    size={21}
                    color="#FFFFFF"
                  />
                  <Text style={styles.buttonText}>
                    {t("تسجيل إثبات التسليم", "Submit delivery proof")}
                  </Text>
                </Pressable>
              ) : null}
              {["delivered", "completed"].includes(status) ? (
                <View style={styles.finishedBox}>
                  <Ionicons name="checkmark-circle" size={21} color="#15803D" />
                  <Text style={styles.finishedText}>
                    {t("تم تسليم الشحنة", "Delivery completed")}
                  </Text>
                </View>
              ) : null}
              {busy ? <ActivityIndicator color="#2563EB" /> : null}
              {error ? (
                <Text style={styles.error}>
                  {t(
                    "تعذر تحديث البيانات. اسحب لإعادة المحاولة.",
                    "Could not refresh. Pull down to retry.",
                  )}
                </Text>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },
  header: {
    backgroundColor: "#0B1730",
    paddingTop: 60,
    paddingBottom: 23,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 14,
  },
  error: { color: "#DC2626", textAlign: "center" },
  retry: { color: "#2563EB", fontWeight: "800" },
  content: { padding: 18, paddingBottom: 50, gap: 15 },
  summaryCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 24,
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  parcelIcon: { backgroundColor: "#EFF6FF", borderRadius: 16, padding: 15 },
  tracking: {
    fontSize: 21,
    fontWeight: "800",
    color: "#0B1730",
    textAlign: "center",
  },
  status: { color: "#2563EB", fontWeight: "800" },
  assignmentNumber: { color: "#64748B", fontSize: 12 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 19,
    gap: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  sectionTitle: { color: "#0B1730", fontSize: 17, fontWeight: "800" },
  addressText: { color: "#334155", fontSize: 14, lineHeight: 23 },
  missingHint: { color: "#94A3B8", fontSize: 12 },
  detailRow: { flexDirection: "row", gap: 11, alignItems: "flex-start" },
  detailIcon: {
    width: 37,
    height: 37,
    backgroundColor: "#EFF6FF",
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  detailContent: { flex: 1 },
  detailLabel: { color: "#94A3B8", fontSize: 12 },
  detailValue: {
    color: "#334155",
    fontWeight: "700",
    marginTop: 4,
    fontSize: 14,
  },
  navigationButton: {
    backgroundColor: "#2563EB",
    minHeight: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  navigationButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  primaryButton: {
    backgroundColor: "#2563EB",
    padding: 17,
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  successButton: {
    backgroundColor: "#16A34A",
    padding: 17,
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  finishedBox: {
    backgroundColor: "#F0FDF4",
    padding: 17,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  finishedText: { color: "#15803D", fontWeight: "800" },
});
