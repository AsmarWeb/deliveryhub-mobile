import { Ionicons } from "@expo/vector-icons";
import ConnectedDeliveryTracking from "../../../components/tracking/ConnectedDeliveryTracking";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, View,
} from "react-native";
import {
  approveDeliveryPrice, canApproveDeliveryPrice, Delivery,
  formatDeliveryFee, getDelivery, submitDelivery,
} from "../../../services/deliveries";

const statusLabels: Record<string, string> = {
  draft: "مسودة", pending_pricing: "بانتظار التسعير",
  priced: "بانتظار موافقتك على السعر", matching: "البحث عن سائق",
  assigned: "تم تعيين سائق", accepted: "تم قبول الطلب",
  pickup: "جاري الاستلام", in_transit: "قيد التوصيل",
  delivered: "تم التسليم", completed: "مكتمل", cancelled: "ملغي",
  pickup_failed: "فشل الاستلام", delivery_failed: "فشل التسليم",
  rescheduled: "أعيدت الجدولة", expired: "منتهي الصلاحية",
};

function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return fallback;
}

function addressText(address: Delivery["pickup_address"]): string {
  if (!address) return "العنوان غير متاح";
  return [address.label, address.address_line || address.address_line_1,
    address.area, address.city, address.emirate]
    .filter((value, index, arr) => !!value && arr.indexOf(value) === index)
    .join("، ") || "العنوان غير متاح";
}

export default function DeliveryDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);
  const requestCounter = useRef(0);

  const loadDelivery = useCallback(async (refresh = false) => {
    const requestId = ++requestCounter.current;
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError(false);
      const deliveryId = Number(id);
      if (!Number.isSafeInteger(deliveryId) || deliveryId <= 0) {
        throw new Error("Invalid delivery ID");
      }
      const result = await getDelivery(deliveryId);
      if (requestId === requestCounter.current) setDelivery(result);
    } catch (err) {
      console.error("Delivery details error:", err);
      if (requestId === requestCounter.current) setError(true);
    } finally {
      if (requestId === requestCounter.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [id]);

  useFocusEffect(useCallback(() => {
    void loadDelivery();
    return () => { requestCounter.current += 1; };
  }, [loadDelivery]));

  async function handleSubmitDelivery() {
    if (!delivery || submitting || approving || delivery.status !== "draft") return;
    try {
      setSubmitting(true);
      const updated = await submitDelivery(delivery.id);
      setDelivery(updated);
      Alert.alert("تم إرسال الطلب", "أصبح الطلب الآن بانتظار التسعير.");
    } catch (err) {
      Alert.alert("تعذر إرسال الطلب", errorMessage(err, "تحقق من الاتصال وحالة الطلب ثم حاول مجدداً."));
      void loadDelivery(true);
    } finally { setSubmitting(false); }
  }

  function confirmSubmit() {
    if (!delivery || submitting || approving) return;
    Alert.alert("تأكيد إرسال الطلب", "هل تريد إرسال هذا الطلب للمراجعة والتسعير؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "إرسال الطلب", onPress: () => void handleSubmitDelivery() },
    ]);
  }

  async function handleApprovePrice() {
    if (!delivery || approving || submitting || !canApproveDeliveryPrice(delivery)) return;
    try {
      setApproving(true);
      const updated = await approveDeliveryPrice(delivery.id);
      setDelivery(updated);
      Alert.alert("تمت الموافقة", "تم اعتماد السعر، وأصبح الطلب جاهزاً للبحث عن سائق.");
    } catch (err) {
      Alert.alert("تعذر اعتماد السعر", errorMessage(err, "حدّث الطلب ثم حاول مرة أخرى."));
      void loadDelivery(true);
    } finally { setApproving(false); }
  }

  function confirmApproval() {
    if (!delivery || approving || submitting || !canApproveDeliveryPrice(delivery)) return;
    Alert.alert("تأكيد الموافقة على السعر",
      `هل توافق على رسوم توصيل بقيمة ${formatDeliveryFee(delivery)}؟`, [
        { text: "إلغاء", style: "cancel" },
        { text: "أوافق على السعر", onPress: () => void handleApprovePrice() },
      ]);
  }

  if (loading && !delivery) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.loadingText}>جاري تحميل تفاصيل التوصيل...</Text>
    </View>
  );
  if (!delivery) return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={50} color="#EF4444" />
      <Text style={styles.errorText}>تعذر تحميل تفاصيل التوصيل</Text>
      <Pressable style={styles.backButton} onPress={() => void loadDelivery()}>
        <Text style={styles.backButtonText}>إعادة المحاولة</Text>
      </Pressable>
      <Pressable onPress={() => router.back()}><Text>العودة</Text></Pressable>
    </View>
  );

  const isDraft = delivery.status === "draft";
  const isPriced = delivery.status === "priced";
  const statusLabel = statusLabels[delivery.status] || delivery.status;
  const hasPrice = delivery.delivery_fee != null && Number.isFinite(Number(delivery.delivery_fee));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel="العودة">
          <Ionicons name="arrow-back" size={25} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>تفاصيل التوصيل</Text>
        <Pressable onPress={() => void loadDelivery(true)} accessibilityLabel="تحديث الطلب">
          <Ionicons name="refresh-outline" size={25} color="#FFFFFF" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDelivery(true)} />}>
        <View style={styles.trackingCard}>
          <Ionicons name="cube" size={35} color="#60A5FA" />
          <Text style={styles.trackingLabel}>رقم التتبع</Text>
          <Text style={styles.trackingNumber} selectable>{delivery.tracking_number}</Text>
          <View style={[styles.statusBadge, isPriced && styles.statusBadgeAttention]}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        {["accepted", "pickup", "in_transit"].includes(delivery.status) && (
          <View style={styles.card}>
            <ConnectedDeliveryTracking
              key={delivery.id}
              deliveryId={delivery.id}
            />
          </View>
        )}

        {error && <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>تعذر تحديث البيانات. اسحب للأسفل للمحاولة مجدداً.</Text>
        </View>}

        {(isPriced || hasPrice || delivery.status === "pending_pricing") && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>رسوم التوصيل</Text>
            <Text style={styles.feeText}>{hasPrice ? formatDeliveryFee(delivery) : "لم يتم تحديد السعر بعد"}</Text>
            {delivery.status === "pending_pricing" &&
              <Text style={styles.hint}>سيظهر السعر هنا بعد مراجعته من الإدارة. اسحب للأسفل لتحديث الطلب.</Text>}
            {isPriced && (
              <>
                <Text style={styles.hint}>راجع الرسوم المعتمدة من الإدارة ثم وافق للبدء بالبحث عن سائق.</Text>
                <Pressable style={[styles.approveButton, (approving || !canApproveDeliveryPrice(delivery)) && styles.disabledButton]}
                  disabled={approving || !canApproveDeliveryPrice(delivery)} onPress={confirmApproval}>
                  {approving ? <ActivityIndicator color="#FFFFFF" /> : <>
                    <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>الموافقة على السعر</Text>
                  </>}
                </Pressable>
              </>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>عناوين التوصيل</Text>
          <InfoRow icon="location-outline" label="عنوان الاستلام" value={addressText(delivery.pickup_address)} />
          <InfoRow icon="navigate-outline" label="عنوان التسليم" value={addressText(delivery.dropoff_address)} />
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>معلومات المستلم</Text>
          <InfoRow icon="person-outline" label="اسم المستلم" value={delivery.recipient_name} />
          <InfoRow icon="call-outline" label="رقم الهاتف" value={delivery.recipient_phone} />
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>معلومات الشحنة</Text>
          <InfoRow icon="cube-outline" label="نوع الطرد" value={delivery.package_type || "غير محدد"} />
          <InfoRow icon="scale-outline" label="الوزن" value={delivery.weight != null ? `${delivery.weight} kg` : "غير محدد"} />
          <InfoRow icon="calendar-outline" label="تاريخ الإنشاء" value={new Date(delivery.created_at).toLocaleDateString("en-AE")} />
          <InfoRow icon="document-text-outline" label="تعليمات إضافية" value={delivery.special_instructions || "لا توجد"} />
        </View>
        {isDraft && <Pressable style={[styles.submitButton, submitting && styles.disabledButton]}
          disabled={submitting} onPress={confirmSubmit}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <>
            <Ionicons name="send-outline" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>إرسال الطلب للتسعير</Text>
          </>}
        </Pressable>}
        {!isDraft && <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={22} color="#2563EB" />
          <Text style={styles.noticeText}>حالة الطلب الحالية: {statusLabel}</Text>
        </View>}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string;
}) {
  return <View style={styles.infoRow}>
    <Ionicons name={icon} size={22} color="#2563EB" />
    <View style={styles.infoText}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} selectable>{value}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },
  header: { backgroundColor: "#0B1730", paddingTop: 60, paddingHorizontal: 22,
    paddingBottom: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  content: { padding: 18, paddingBottom: 40, gap: 16 },
  trackingCard: { backgroundColor: "#0B1730", borderRadius: 22, padding: 25, alignItems: "center", gap: 12 },
  trackingLabel: { color: "#94A3B8", fontSize: 13 },
  trackingNumber: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", textAlign: "center" },
  statusBadge: { backgroundColor: "#1D4ED8", paddingHorizontal: 20, paddingVertical: 8, borderRadius: 30 },
  statusBadgeAttention: { backgroundColor: "#B45309" },
  statusText: { color: "#FFFFFF", fontWeight: "700" },
  card: { backgroundColor: "#FFFFFF", padding: 22, borderRadius: 20, borderWidth: 1, borderColor: "#E7ECF4" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#0B1730", marginBottom: 15, textAlign: "right" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 12, color: "#64748B", marginBottom: 5, textAlign: "right" },
  infoValue: { fontSize: 15, fontWeight: "700", color: "#0B1730", textAlign: "right" },
  feeText: { fontSize: 30, fontWeight: "800", color: "#047857", textAlign: "center", marginVertical: 12 },
  hint: { fontSize: 13, lineHeight: 21, color: "#64748B", textAlign: "right", marginBottom: 12 },
  submitButton: { backgroundColor: "#2563EB", borderRadius: 16, paddingVertical: 18,
    paddingHorizontal: 20, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 8 },
  approveButton: { backgroundColor: "#047857", borderRadius: 16, paddingVertical: 18,
    paddingHorizontal: 20, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  disabledButton: { opacity: 0.6 },
  noticeCard: { backgroundColor: "#EFF6FF", borderRadius: 15, padding: 18,
    flexDirection: "row", alignItems: "center", gap: 12 },
  noticeText: { flex: 1, color: "#1D4ED8", fontWeight: "700", textAlign: "right" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 15, padding: 24 },
  loadingText: { color: "#64748B" },
  errorText: { color: "#EF4444", fontSize: 16, fontWeight: "700" },
  backButton: { backgroundColor: "#2563EB", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  backButtonText: { color: "#FFFFFF", fontWeight: "700" },
});
