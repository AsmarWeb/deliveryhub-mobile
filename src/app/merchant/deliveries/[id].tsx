import CodPanel from "../../../components/finance/CodPanel";
import { useLanguage } from "../../../contexts/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import ConnectedDeliveryTracking from "../../../components/tracking/ConnectedDeliveryTracking";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator, Alert, Pressable, RefreshControl,
  ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import {
  approveDeliveryPrice, canApproveDeliveryPrice, canCancelDelivery, cancelDelivery, Delivery,
  formatDeliveryFee, getDelivery, submitDelivery,
} from "../../../services/deliveries";

const statusLabels: Record<"ar" | "en", Record<string, string>> = {
  ar: {
  draft: "مسودة",
  pending_pricing: "بانتظار التسعير",
  priced: "بانتظار موافقتك على السعر",
  matching: "البحث عن سائق",
  assigned: "تم تعيين سائق",
  accepted: "تم قبول الطلب",
  pickup: "جاري الاستلام",
  in_transit: "قيد التوصيل",
  delivered: "تم التسليم",
  completed: "مكتمل",
  cancelled: "ملغي",
  pickup_failed: "فشل الاستلام",
  delivery_failed: "فشل التسليم",
  rescheduled: "أعيدت الجدولة",
  expired: "منتهي الصلاحية"
  },
  en: {
  draft: "Draft",
  pending_pricing: "Awaiting pricing",
  priced: "Awaiting price approval",
  matching: "Finding a driver",
  assigned: "Driver assigned",
  accepted: "Order accepted",
  pickup: "Picking up",
  in_transit: "In transit",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  pickup_failed: "Pickup failed",
  delivery_failed: "Delivery failed",
  rescheduled: "Rescheduled",
  expired: "Expired"
  },
};

function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return fallback;
}

function addressText(address: Delivery["pickup_address"], language: "ar" | "en"): string {
  if (!address) return language === "ar" ? "العنوان غير متاح" : "Address unavailable";
  return [address.label, address.address_line || address.address_line_1,
    address.area, address.city, address.emirate]
    .filter((value, index, arr) => !!value && arr.indexOf(value) === index)
    .join(language === "ar" ? "، " : ", ") || (language === "ar" ? "العنوان غير متاح" : "Address unavailable");
}

export default function DeliveryDetailsScreen() {
  const { language, t } = useLanguage();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const cancelLock = useRef(false);
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
    if (!delivery || cancelLock.current || cancelling || submitting || approving || delivery.status !== "draft") return;
    try {
      setSubmitting(true);
      const updated = await submitDelivery(delivery.id);
      setDelivery(updated);
      Alert.alert(t("تم إرسال الطلب", "Delivery submitted"), t("أصبح الطلب الآن بانتظار التسعير.", "Your delivery is now awaiting pricing."));
    } catch (err) {
      Alert.alert(t("تعذر إرسال الطلب", "Unable to submit delivery"), errorMessage(err, t("تحقق من الاتصال وحالة الطلب ثم حاول مجدداً.", "Check your connection and delivery status, then try again.")));
      void loadDelivery(true);
    } finally { setSubmitting(false); }
  }

  function confirmSubmit() {
    if (!delivery || cancelLock.current || cancelling || submitting || approving) return;
    Alert.alert(t("تأكيد إرسال الطلب", "Confirm submission"), t("هل تريد إرسال هذا الطلب للمراجعة والتسعير؟", "Submit this delivery for review and pricing?"), [
      { text: t("إلغاء", "Cancel"), style: "cancel" },
      { text: t("إرسال الطلب", "Submit delivery"), onPress: () => void handleSubmitDelivery() },
    ]);
  }

  async function handleApprovePrice() {
    if (!delivery || cancelLock.current || cancelling || approving || submitting || !canApproveDeliveryPrice(delivery)) return;
    try {
      setApproving(true);
      const updated = await approveDeliveryPrice(delivery.id);
      setDelivery(updated);
      Alert.alert(t("تمت الموافقة", "Price approved"), t("تم اعتماد السعر، وأصبح الطلب جاهزاً للبحث عن سائق.", "The price was approved. Your delivery is ready for driver matching."));
    } catch (err) {
      Alert.alert(t("تعذر اعتماد السعر", "Unable to approve price"), errorMessage(err, t("حدّث الطلب ثم حاول مرة أخرى.", "Refresh the delivery and try again.")));
      void loadDelivery(true);
    } finally { setApproving(false); }
  }

  function confirmApproval() {
    if (!delivery || cancelLock.current || cancelling || approving || submitting || !canApproveDeliveryPrice(delivery)) return;
    Alert.alert(t("تأكيد الموافقة على السعر", "Confirm price approval"),
      `${t("هل توافق على رسوم توصيل بقيمة", "Do you approve the delivery fee of")} ${formatDeliveryFee(delivery)}${language === "ar" ? "؟" : "?"}`, [
        { text: t("إلغاء", "Cancel"), style: "cancel" },
        { text: t("أوافق على السعر", "Approve price"), onPress: () => void handleApprovePrice() },
      ]);
  }

  async function handleCancellation() {
    if (!delivery || cancelLock.current || submitting || approving) return;
    if (cancelReason.trim().length < 3) { setCancelError(t("اكتب سببًا من 3 أحرف على الأقل.", "Enter a reason of at least 3 characters.")); return; }
    cancelLock.current = true; setCancelling(true); setCancelError(null);
    // Invalidate a refresh started before this mutation.
    requestCounter.current += 1;
    try {
      const updated = await cancelDelivery(delivery.id, cancelReason);
      requestCounter.current += 1;
      setLoading(false); setRefreshing(false);
      setDelivery(updated); setCancelOpen(false); setCancelReason("");
    } catch (error) {
      setCancelError(errorMessage(error, t("تعذر الإلغاء. حدّث الطلب وتحقق من حالته ثم حاول مجددًا.", "Cancellation failed. Refresh the delivery and check its status before retrying.")));
    } finally { cancelLock.current = false; setCancelling(false); setLoading(false); setRefreshing(false); }
  }

  if (loading && !delivery) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#17634F" />
      <Text style={styles.loadingText}>{t("جاري تحميل تفاصيل التوصيل...", "Loading delivery details...")}</Text>
    </View>
  );
  if (!delivery) return (
    <View style={styles.center}>
      <Ionicons name="alert-circle-outline" size={50} color="#EF4444" />
      <Text style={styles.errorText}>{t("تعذر تحميل تفاصيل التوصيل", "Unable to load delivery details")}</Text>
      <Pressable style={styles.backButton} onPress={() => void loadDelivery()}>
        <Text style={styles.backButtonText}>{t("إعادة المحاولة", "Try again")}</Text>
      </Pressable>
      <Pressable onPress={() => router.back()}><Text>{t("العودة", "Back")}</Text></Pressable>
    </View>
  );

  const isDraft = delivery.status === "draft";
  const isPriced = delivery.status === "priced";
  const statusLabel = statusLabels[language][delivery.status] || delivery.status;
  const hasPrice = delivery.delivery_fee != null && Number.isFinite(Number(delivery.delivery_fee));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityLabel={t("العودة", "Back")}>
          <Ionicons name="arrow-back" size={25} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>{t("تفاصيل التوصيل", "Delivery Details")}</Text>
        <Pressable onPress={() => void loadDelivery(true)} accessibilityLabel={t("تحديث الطلب", "Refresh delivery")}>
          <Ionicons name="refresh-outline" size={25} color="#FFFFFF" />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadDelivery(true)} />}>
        <View style={styles.trackingCard}>
          <Ionicons name="cube" size={35} color="#60A5FA" />
          <Text style={styles.trackingLabel}>{t("رقم التتبع", "Tracking Number")}</Text>
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
          <Text style={styles.noticeText}>{t("تعذر تحديث البيانات. اسحب للأسفل للمحاولة مجدداً.", "Unable to refresh data. Pull down to retry.")}</Text>
        </View>}

        {(isPriced || hasPrice || delivery.status === "pending_pricing") && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t("رسوم التوصيل", "Delivery Fee")}</Text>
            <Text style={styles.feeText}>{hasPrice ? formatDeliveryFee(delivery) : t("لم يتم تحديد السعر بعد", "Price not available yet")}</Text>
            {delivery.status === "pending_pricing" &&
              <Text style={styles.hint}>{t("سيظهر السعر هنا بعد مراجعته من الإدارة. اسحب للأسفل لتحديث الطلب.", "The price will appear here after admin review. Pull down to refresh.")}</Text>}
            {isPriced && (
              <>
                <Text style={styles.hint}>{t("راجع الرسوم المعتمدة من الإدارة ثم وافق للبدء بالبحث عن سائق.", "Review the approved delivery fee, then confirm to start finding a driver.")}</Text>
                <Pressable style={[styles.approveButton, (approving || !canApproveDeliveryPrice(delivery)) && styles.disabledButton]}
                  disabled={cancelling || approving || !canApproveDeliveryPrice(delivery)} onPress={confirmApproval}>
                  {approving ? <ActivityIndicator color="#FFFFFF" /> : <>
                    <Ionicons name="checkmark-circle-outline" size={22} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>{t("الموافقة على السعر", "Approve Price")}</Text>
                  </>}
                </Pressable>
              </>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("عناوين التوصيل", "Delivery Addresses")}</Text>
          <InfoRow icon="location-outline" label={t("عنوان الاستلام", "Pickup Address")} value={addressText(delivery.pickup_address, language)} />
          <InfoRow icon="navigate-outline" label={t("عنوان التسليم", "Drop-off Address")} value={addressText(delivery.dropoff_address, language)} />
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("معلومات المستلم", "Recipient Information")}</Text>
          <InfoRow icon="person-outline" label={t("اسم المستلم", "Recipient Name")} value={delivery.recipient_name} />
          <InfoRow icon="call-outline" label={t("رقم الهاتف", "Phone Number")} value={delivery.recipient_phone} />
        </View>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("معلومات الشحنة", "Package Information")}</Text>
          <InfoRow icon="cube-outline" label={t("نوع الطرد", "Package Type")} value={delivery.package_type || t("غير محدد", "Not specified")} />
          <InfoRow icon="scale-outline" label={t("الوزن", "Weight")} value={delivery.weight != null ? `${delivery.weight} kg` : t("غير محدد", "Not specified")} />
          <InfoRow icon="calendar-outline" label={t("تاريخ الإنشاء", "Created At")} value={new Date(delivery.created_at).toLocaleDateString(language === "ar" ? "ar-AE" : "en-AE")} />
          <InfoRow icon="document-text-outline" label={t("تعليمات إضافية", "Additional Instructions")} value={delivery.special_instructions || t("لا توجد", "None")} />
        </View>
        {isDraft && <Pressable style={[styles.submitButton, submitting && styles.disabledButton]}
          disabled={cancelling || submitting} onPress={confirmSubmit}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <>
            <Ionicons name="send-outline" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>{t("إرسال الطلب للتسعير", "Submit for Pricing")}</Text>
          </>}
        </Pressable>}
        <CodPanel deliveryId={delivery.id} deliveryStatus={delivery.status} role="merchant" />
        {canCancelDelivery(delivery) && <View style={styles.card}>
          <Text style={styles.sectionTitle}>{t("إلغاء الطلب", "Cancel delivery")}</Text>
          <Text style={styles.hint}>{t("الإلغاء متاح قبل إسناد الطلب لسائق. بعد التأكيد لن يمكن استعادة الطلب نفسه.", "Cancellation is available before driver assignment. Once confirmed, this delivery cannot be restored.")}</Text>
          {!cancelOpen ? <Pressable accessibilityRole="button" disabled={submitting || approving || cancelling} style={[styles.cancelButton, (submitting || approving || cancelling) && styles.disabledButton]} onPress={() => { setCancelError(null); setCancelOpen(true); }}><Text style={styles.cancelText}>{t("إلغاء الطلب", "Cancel delivery")}</Text></Pressable> : <>
            <TextInput accessibilityLabel={t("سبب الإلغاء", "Cancellation reason")} placeholder={t("سبب الإلغاء (مطلوب)", "Cancellation reason (required)")} value={cancelReason} onChangeText={setCancelReason} editable={!cancelling} maxLength={500} multiline style={[styles.cancelInput, { textAlign: language === "ar" ? "right" : "left" }]} />
            {cancelError && <Text accessibilityRole="alert" style={styles.cancelText}>{cancelError}</Text>}
            <Pressable accessibilityRole="button" disabled={cancelling || submitting || approving} onPress={() => void handleCancellation()} style={[styles.cancelButton, cancelling && styles.disabledButton]}>{cancelling ? <ActivityIndicator color="#B91C1C" /> : <Text style={styles.cancelText}>{t("تأكيد إلغاء الطلب نهائيًا", "Confirm delivery cancellation")}</Text>}</Pressable>
            <Pressable accessibilityRole="button" disabled={cancelling} style={styles.cancelButton} onPress={() => setCancelOpen(false)}><Text>{t("الاحتفاظ بالطلب", "Keep delivery")}</Text></Pressable>
          </>}
        </View>}
        {!isDraft && <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={22} color="#17634F" />
          <Text style={styles.noticeText}>{t("حالة الطلب الحالية: ", "Current status: ")}{statusLabel}</Text>
        </View>}
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; value: string;
}) {
  return <View style={styles.infoRow}>
    <Ionicons name={icon} size={22} color="#17634F" />
    <View style={styles.infoText}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} selectable>{value}</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  cancelButton: { minHeight: 48, padding: 12, borderRadius: 12, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center", marginTop: 12 },
  cancelText: { color: "#B91C1C", fontWeight: "700", lineHeight: 23 },
  cancelInput: { minHeight: 85, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, padding: 12, fontSize: 16, marginTop: 12, color: "#123D35" },
  container: { flex: 1, backgroundColor: "#F6F3EB" },
  header: { backgroundColor: "#123D35", paddingTop: 60, paddingHorizontal: 22,
    paddingBottom: 24, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  content: { padding: 18, paddingBottom: 40, gap: 16 },
  trackingCard: { backgroundColor: "#123D35", borderRadius: 22, padding: 25, alignItems: "center", gap: 12 },
  trackingLabel: { color: "#94A3B8", fontSize: 13 },
  trackingNumber: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", textAlign: "center" },
  statusBadge: { backgroundColor: "#145340", paddingHorizontal: 20, paddingVertical: 8, borderRadius: 30 },
  statusBadgeAttention: { backgroundColor: "#B45309" },
  statusText: { color: "#FFFFFF", fontWeight: "700" },
  card: { backgroundColor: "#FFFFFF", padding: 22, borderRadius: 20, borderWidth: 1, borderColor: "#E1E1D5" },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: "#123D35", marginBottom: 15, textAlign: "right" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 12, color: "#62726B", marginBottom: 5, textAlign: "right" },
  infoValue: { fontSize: 15, fontWeight: "700", color: "#123D35", textAlign: "right" },
  feeText: { fontSize: 30, fontWeight: "800", color: "#047857", textAlign: "center", marginVertical: 12 },
  hint: { fontSize: 13, lineHeight: 21, color: "#62726B", textAlign: "right", marginBottom: 12 },
  submitButton: { backgroundColor: "#17634F", borderRadius: 16, paddingVertical: 18,
    paddingHorizontal: 20, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 8 },
  approveButton: { backgroundColor: "#047857", borderRadius: 16, paddingVertical: 18,
    paddingHorizontal: 20, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 },
  submitButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  disabledButton: { opacity: 0.6 },
  noticeCard: { backgroundColor: "#EAF0E7", borderRadius: 15, padding: 18,
    flexDirection: "row", alignItems: "center", gap: 12 },
  noticeText: { flex: 1, color: "#145340", fontWeight: "700", textAlign: "right" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 15, padding: 24 },
  loadingText: { color: "#62726B" },
  errorText: { color: "#EF4444", fontSize: 16, fontWeight: "700" },
  backButton: { backgroundColor: "#17634F", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
  backButtonText: { color: "#FFFFFF", fontWeight: "700" },
});
