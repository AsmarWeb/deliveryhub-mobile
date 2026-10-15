import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  Delivery,
  getDelivery,
  submitDelivery,
} from "../../../services/deliveries";

export default function DeliveryDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadDelivery() {
      try {
        setLoading(true);
        setError(false);

        const deliveryId = Number(id);

        if (!Number.isSafeInteger(deliveryId) || deliveryId <= 0) {
          throw new Error("Invalid delivery ID");
        }

        const result = await getDelivery(deliveryId);

        if (active) {
          setDelivery(result);
        }
      } catch (err) {
        console.error("Delivery details error:", err);

        if (active) {
          setError(true);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadDelivery();

    return () => {
      active = false;
    };
  }, [id]);

  async function handleSubmitDelivery() {
    if (!delivery || submitting || delivery.status !== "draft") {
      return;
    }

    try {
      setSubmitting(true);

      const updated = await submitDelivery(delivery.id);

      setDelivery(updated);

      Alert.alert("تم إرسال الطلب بنجاح", "أصبح الطلب الآن بانتظار التسعير.");
    } catch (err) {
      console.error("Submit delivery error:", err);

      Alert.alert(
        "تعذر إرسال الطلب",
        "تحقق من حالة الطلب واتصالك بالخادم ثم حاول مجدداً.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function confirmSubmit() {
    if (!delivery || submitting) return;

    Alert.alert(
      "تأكيد إرسال الطلب",
      "هل تريد إرسال هذا الطلب للمراجعة والتسعير؟",
      [
        {
          text: "إلغاء",
          style: "cancel",
        },
        {
          text: "إرسال الطلب",
          onPress: () => void handleSubmitDelivery(),
        },
      ],
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>جاري تحميل تفاصيل التوصيل...</Text>
      </View>
    );
  }

  if (error || !delivery) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={50} color="#EF4444" />

        <Text style={styles.errorText}>تعذر تحميل تفاصيل التوصيل</Text>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>العودة</Text>
        </Pressable>
      </View>
    );
  }

  const isDraft = delivery.status === "draft";

  const statusLabels: Record<string, string> = {
    draft: "مسودة",
    pending_pricing: "بانتظار التسعير",
    priced: "تم التسعير",
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
    expired: "منتهي الصلاحية",
  };

  const statusLabel = statusLabels[delivery.status] || delivery.status;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={25} color="#FFFFFF" />
        </Pressable>

        <Text style={styles.headerTitle}>تفاصيل التوصيل</Text>

        <Ionicons name="cube-outline" size={25} color="#FFFFFF" />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.trackingCard}>
          <Ionicons name="cube" size={35} color="#60A5FA" />

          <Text style={styles.trackingLabel}>رقم التتبع</Text>

          <Text style={styles.trackingNumber} selectable>
            {delivery.tracking_number}
          </Text>

          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>معلومات المستلم</Text>

          <InfoRow
            icon="person-outline"
            label="اسم المستلم"
            value={delivery.recipient_name}
          />

          <InfoRow
            icon="call-outline"
            label="رقم الهاتف"
            value={delivery.recipient_phone}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>معلومات الشحنة</Text>

          <InfoRow
            icon="cube-outline"
            label="نوع الطرد"
            value={delivery.package_type || "غير محدد"}
          />

          <InfoRow
            icon="scale-outline"
            label="الوزن"
            value={
              delivery.weight != null ? `${delivery.weight} kg` : "غير محدد"
            }
          />

          <InfoRow
            icon="calendar-outline"
            label="تاريخ الإنشاء"
            value={new Date(delivery.created_at).toLocaleDateString("en-AE")}
          />

          <InfoRow
            icon="document-text-outline"
            label="تعليمات إضافية"
            value={delivery.special_instructions || "لا توجد"}
          />
        </View>

        {isDraft && (
          <Pressable
            style={[styles.submitButton, submitting && styles.disabledButton]}
            disabled={submitting}
            onPress={confirmSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="send-outline" size={20} color="#FFFFFF" />

                <Text style={styles.submitButtonText}>إرسال الطلب للتسعير</Text>
              </>
            )}
          </Pressable>
        )}

        {!isDraft && (
          <View style={styles.noticeCard}>
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color="#2563EB"
            />

            <Text style={styles.noticeText}>
              حالة الطلب الحالية: {statusLabel}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={22} color="#2563EB" />

      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>

        <Text style={styles.infoValue} selectable>
          {value}
        </Text>
      </View>
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
    paddingHorizontal: 22,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  content: {
    padding: 18,
    paddingBottom: 40,
    gap: 16,
  },
  trackingCard: {
    backgroundColor: "#0B1730",
    borderRadius: 22,
    padding: 25,
    alignItems: "center",
    gap: 12,
  },
  trackingLabel: {
    color: "#94A3B8",
    fontSize: 13,
  },
  trackingNumber: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  statusBadge: {
    backgroundColor: "#1D4ED8",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 30,
  },
  statusText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E7ECF4",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0B1730",
    marginBottom: 15,
    textAlign: "right",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 5,
    textAlign: "right",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0B1730",
    textAlign: "right",
  },
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  disabledButton: {
    opacity: 0.6,
  },
  noticeCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 15,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  noticeText: {
    flex: 1,
    color: "#1D4ED8",
    fontWeight: "700",
    textAlign: "right",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 15,
    padding: 24,
  },
  loadingText: {
    color: "#64748B",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "700",
  },
  backButton: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
