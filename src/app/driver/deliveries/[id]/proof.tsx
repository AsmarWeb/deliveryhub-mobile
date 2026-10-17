import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { submitProofOfDelivery } from "../../../../services/proof";

type Photo = {
  uri: string;
  name: string;
  type: string;
};

export default function ProofOfDeliveryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const deliveryId = Number(id);

  const [recipientName, setRecipientName] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setSelectedPhoto(asset: ImagePicker.ImagePickerAsset) {
    const mimeType = asset.mimeType ?? "image/jpeg";

    if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
      Alert.alert("صيغة غير مدعومة", "اختر صورة JPG أو PNG أو WebP.");
      return;
    }

    if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
      Alert.alert("الصورة كبيرة", "الحد الأقصى لحجم الصورة هو 5 ميجابايت.");
      return;
    }

    const extension =
      mimeType === "image/png"
        ? "png"
        : mimeType === "image/webp"
          ? "webp"
          : "jpg";

    setPhoto({
      uri: asset.uri,
      name: `delivery-proof-${Date.now()}.${extension}`,
      type: mimeType,
    });
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("إذن الكاميرا", "يرجى السماح للتطبيق باستخدام الكاميرا.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedPhoto(result.assets[0]);
    }
  }

  async function choosePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedPhoto(result.assets[0]);
    }
  }

  async function handleSubmit() {
    if (!Number.isInteger(deliveryId) || deliveryId <= 0) {
      Alert.alert("خطأ", "رقم الشحنة غير صالح.");
      return;
    }

    if (!recipientName.trim()) {
      Alert.alert("بيانات ناقصة", "يرجى إدخال اسم الشخص الذي استلم الشحنة.");
      return;
    }

    if (!photo) {
      Alert.alert(
        "صورة التسليم مطلوبة",
        "يرجى التقاط صورة أو اختيار صورة لإثبات التسليم.",
      );
      return;
    }

    if (submitting) return;

    setSubmitting(true);

    try {
      await submitProofOfDelivery({
        deliveryId,
        recipientName,
        notes,
        photo,
      });

      Alert.alert(
        "تم التسليم بنجاح",
        "تم حفظ إثبات التسليم وتحديث حالة الشحنة.",
        [
          {
            text: "العودة إلى المهام",
            onPress: () => router.replace("/driver/assignments"),
          },
        ],
      );
    } catch (error: any) {
      const data = error?.response?.data;
      const validationMessage = data?.errors
        ? Object.values(data.errors).flat().join("\n")
        : null;

      Alert.alert(
        "فشل إرسال الإثبات",
        validationMessage ||
          data?.message ||
          "تعذر الاتصال بالخادم. حاول مرة أخرى.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#2563EB" />
          <Text style={styles.title}>إثبات تسليم الشحنة</Text>
          <Text style={styles.subtitle}>
            تأكد من تسليم الشحنة للمستلم قبل إرسال الإثبات.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>اسم المستلم *</Text>

          <TextInput
            style={styles.input}
            placeholder="الاسم الكامل للمستلم"
            placeholderTextColor="#94A3B8"
            value={recipientName}
            onChangeText={setRecipientName}
          />

          <Text style={styles.label}>ملاحظات التسليم</Text>

          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="ملاحظات إضافية (اختياري)"
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
          />

          <Text style={styles.label}>صورة إثبات التسليم</Text>

          <View style={styles.photoActions}>
            <Pressable
              style={styles.photoButton}
              onPress={takePhoto}
              disabled={submitting}
            >
              <Ionicons name="camera-outline" size={23} color="#2563EB" />
              <Text style={styles.photoButtonText}>التقاط صورة</Text>
            </Pressable>

            <Pressable
              style={styles.photoButton}
              onPress={choosePhoto}
              disabled={submitting}
            >
              <Ionicons name="images-outline" size={23} color="#2563EB" />
              <Text style={styles.photoButtonText}>المعرض</Text>
            </Pressable>
          </View>

          {photo && (
            <View style={styles.preview}>
              <Image source={{ uri: photo.uri }} style={styles.previewImage} />

              <Pressable onPress={() => setPhoto(null)} disabled={submitting}>
                <Text style={styles.remove}>إزالة الصورة</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Pressable
          style={[styles.submitButton, submitting && styles.disabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-done" size={23} color="#FFFFFF" />
              <Text style={styles.submitText}>تأكيد تسليم الشحنة</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  content: {
    padding: 20,
    paddingTop: 45,
    paddingBottom: 60,
    gap: 22,
  },
  header: {
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0B1730",
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 23,
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 22,
    borderRadius: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#0F172A",
  },
  textarea: {
    minHeight: 110,
  },
  photoActions: {
    flexDirection: "row",
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  photoButtonText: {
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 13,
  },
  preview: {
    alignItems: "center",
    gap: 12,
  },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 14,
  },
  remove: {
    color: "#DC2626",
    fontWeight: "700",
  },
  submitButton: {
    backgroundColor: "#16A34A",
    padding: 18,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  submitText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
  disabled: {
    opacity: 0.6,
  },
});
