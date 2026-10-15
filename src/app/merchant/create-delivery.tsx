import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  createDelivery,
  getMerchantAddresses,
  MerchantAddress,
} from "../../services/deliveries";

export default function CreateDeliveryScreen() {
  const [addresses, setAddresses] = useState<MerchantAddress[]>([]);
  const [pickupId, setPickupId] = useState<number | null>(null);
  const [dropoffId, setDropoffId] = useState<number | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [packageType, setPackageType] = useState("");
  const [weight, setWeight] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(false);

  async function loadAddresses() {
    try {
      setLoading(true);
      setLoadError(false);
      const result = await getMerchantAddresses();
      setAddresses(result);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAddresses();
  }, []);

  async function submit() {
    if (saving) return;

    if (!pickupId || !dropoffId) {
      Alert.alert("تنبيه", "اختر عنوان الاستلام والتسليم");
      return;
    }

    if (!recipientName.trim() || !recipientPhone.trim()) {
      Alert.alert("تنبيه", "أدخل اسم المستلم ورقم هاتفه");
      return;
    }

    const parsedWeight = weight.trim() ? Number(weight) : undefined;

    if (
      parsedWeight !== undefined &&
      (!Number.isFinite(parsedWeight) || parsedWeight < 0)
    ) {
      Alert.alert("تنبيه", "أدخل وزناً صحيحاً");
      return;
    }

    try {
      setSaving(true);

      const delivery = await createDelivery({
        pickup_address_id: pickupId,
        dropoff_address_id: dropoffId,
        recipient_name: recipientName.trim(),
        recipient_phone: recipientPhone.trim(),
        package_type: packageType.trim() || undefined,
        weight: parsedWeight,
        special_instructions: instructions.trim() || undefined,
      });

      Alert.alert(
        "تم إنشاء الطلب",
        `رقم التتبع:\n${delivery.tracking_number}`,
        [
          {
            text: "عرض الطلب",
            onPress: () =>
              router.replace({
                pathname: "/merchant/deliveries/[id]",
                params: { id: String(delivery.id) },
              }),
          },
        ],
      );
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? error.response?.status === 422
          ? "تحقق من البيانات المدخلة والعناوين المختارة."
          : error.response?.status === 403
            ? "ليس لديك صلاحية إنشاء طلب."
            : "تعذر حفظ الطلب. حاول مرة أخرى."
        : "حدث خطأ غير متوقع.";

      Alert.alert("خطأ", message);
    } finally {
      setSaving(false);
    }
  }

  function AddressPicker({
    title,
    selected,
    onSelect,
  }: {
    title: string;
    selected: number | null;
    onSelect: (id: number) => void;
  }) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>

        {addresses.map((address) => (
          <Pressable
            key={address.id}
            style={[styles.address, selected === address.id && styles.selected]}
            onPress={() => onSelect(address.id)}
          >
            <Ionicons
              name={
                selected === address.id ? "radio-button-on" : "radio-button-off"
              }
              size={22}
              color="#2563EB"
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.addressName}>
                {address.label || `عنوان #${address.id}`}
              </Text>
              <Text style={styles.addressDetail}>
                {[
                  address.address_line,
                  address.street,
                  address.area,
                  address.city,
                ]
                  .filter(Boolean)
                  .join("، ") || "لا توجد تفاصيل"}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text>جاري تحميل العناوين...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={styles.center}>
        <Text>تعذر تحميل عناوين التاجر.</Text>
        <Pressable style={styles.button} onPress={loadAddresses}>
          <Text style={styles.buttonText}>إعادة المحاولة</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>طلب توصيل جديد</Text>
        <Ionicons name="cube-outline" size={24} color="white" />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {addresses.length === 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>لا توجد عناوين مسجلة</Text>
            <Text style={styles.hint}>
              يجب إضافة عنوانين على الأقل أو عنوان صالح للاستلام والتسليم في
              حساب التاجر قبل إنشاء الطلب.
            </Text>
          </View>
        ) : (
          <>
            <AddressPicker
              title="عنوان الاستلام"
              selected={pickupId}
              onSelect={setPickupId}
            />

            <AddressPicker
              title="عنوان التسليم"
              selected={dropoffId}
              onSelect={setDropoffId}
            />
          </>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>بيانات المستلم</Text>

          <TextInput
            style={styles.input}
            placeholder="اسم المستلم *"
            value={recipientName}
            onChangeText={setRecipientName}
          />

          <TextInput
            style={styles.input}
            placeholder="رقم الهاتف *"
            keyboardType="phone-pad"
            value={recipientPhone}
            onChangeText={setRecipientPhone}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>معلومات الطرد</Text>

          <TextInput
            style={styles.input}
            placeholder="نوع الطرد"
            value={packageType}
            onChangeText={setPackageType}
          />

          <TextInput
            style={styles.input}
            placeholder="الوزن بالكيلوغرام"
            keyboardType="decimal-pad"
            value={weight}
            onChangeText={setWeight}
          />

          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="تعليمات إضافية"
            multiline
            value={instructions}
            onChangeText={setInstructions}
          />
        </View>

        <Pressable
          style={[
            styles.button,
            (saving || addresses.length === 0) && styles.disabled,
          ]}
          disabled={saving || addresses.length === 0}
          onPress={submit}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>إنشاء طلب التوصيل</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F7FB" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 24,
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
    color: "white",
    fontSize: 20,
    fontWeight: "800",
  },
  content: { padding: 18, gap: 16, paddingBottom: 45 },
  section: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0B1730",
    textAlign: "right",
  },
  hint: { color: "#64748B", lineHeight: 23 },
  address: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
  },
  selected: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  addressName: {
    color: "#0B1730",
    fontWeight: "700",
    textAlign: "right",
  },
  addressDetail: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 5,
    textAlign: "right",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 15,
    color: "#0B1730",
    textAlign: "right",
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  button: {
    backgroundColor: "#2563EB",
    padding: 17,
    borderRadius: 15,
    alignItems: "center",
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: "white", fontWeight: "800", fontSize: 16 },
});
