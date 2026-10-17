import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ApplicationInfo,
  getApplicationStatus,
  operationalRoute,
} from "../services/application";
import { logout } from "../services/auth";

export default function RegistrationStatusScreen() {
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [application, setApplication] = useState<ApplicationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ar = language === "ar";
  const t = (arabic: string, english: string) => ar ? arabic : english;

  const load = useCallback(async (initial: boolean) => {
    initial ? setLoading(true) : setRefreshing(true);
    setError(null);
    try {
      const result = await getApplicationStatus();
      setApplication(result);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        router.replace("/login");
        return;
      }
      setError(ar ? "تعذر تحميل حالة الطلب. حاول مجدداً." : "Could not load your application. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ar]);

  useEffect(() => { void load(true); }, [load]);

  async function signOut() {
    try {
      await logout();
      router.replace("/login");
    } catch {
      Alert.alert(t("خطأ", "Error"), t("تعذر تسجيل الخروج. حاول مرة أخرى.", "Could not sign out. Try again."));
    }
  }

  const state = application?.status;
  const active = state === "active" && application?.can_operate === true;
  const icon = active ? "checkmark-circle-outline" : state === "inactive" ? "close-circle-outline" : "time-outline";
  const color = active ? "#059669" : state === "inactive" ? "#DC2626" : "#D97706";

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.brand}>DeliveryHub</Text>
          <Pressable onPress={() => setLanguage(ar ? "en" : "ar")} style={styles.langButton} accessibilityRole="button">
            <Ionicons name="language-outline" size={17} color="#2563EB" />
            <Text style={styles.langText}>{ar ? "EN" : "عربي"}</Text>
          </Pressable>
        </View>
        <Text style={styles.title}>{t("حالة طلب الانضمام", "Application status")}</Text>
        <Text style={styles.subtitle}>{t("تابع مراجعة طلبك من هنا", "Track your application review here")}</Text>
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator size="large" color="#2563EB" />
          ) : error ? (
            <>
              <Ionicons name="alert-circle-outline" size={62} color="#DC2626" />
              <Text style={styles.message}>{error}</Text>
            </>
          ) : application ? (
            <>
              <Ionicons name={icon} size={72} color={color} />
              <Text style={[styles.status, { color }]}>
                {active ? t("تمت الموافقة", "Approved") : state === "inactive" ? t("الحساب غير نشط", "Account inactive") : t("طلبك قيد المراجعة", "Under review")}
              </Text>
              <Text style={styles.message}>
                {active
                  ? t("تم اعتماد حسابك ويمكنك الدخول إلى لوحة التشغيل.", "Your account is approved. You can open your dashboard.")
                  : state === "inactive"
                    ? t("حسابك غير نشط حالياً. يرجى التواصل مع الإدارة.", "Your account is inactive. Please contact support.")
                    : t("استلمنا طلبك. سنقوم بمراجعته قبل تفعيل صلاحيات التشغيل.", "We received your application. Operational access will be enabled after review.")}
              </Text>
              <View style={styles.detail}>
                <Text style={styles.detailLabel}>{t("نوع الحساب", "Account type")}</Text>
                <Text style={styles.detailValue}>{application.type === "merchant" ? t("تاجر", "Merchant") : t("سائق", "Driver")}</Text>
              </View>
              {application.business_name ? (
                <View style={styles.detail}>
                  <Text style={styles.detailLabel}>{t("النشاط التجاري", "Business")}</Text>
                  <Text style={styles.detailValue}>{application.business_name}</Text>
                </View>
              ) : null}
              {active ? (
                <Pressable style={styles.primaryButton} onPress={() => router.replace(operationalRoute(application))} accessibilityRole="button">
                  <Text style={styles.primaryText}>{t("الانتقال إلى لوحة التحكم", "Open dashboard")}</Text>
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>
        <Pressable style={[styles.secondaryButton, refreshing && styles.disabled]} onPress={() => void load(false)} disabled={loading || refreshing} accessibilityRole="button">
          {refreshing ? <ActivityIndicator color="#2563EB" /> : <Ionicons name="refresh-outline" size={19} color="#2563EB" />}
          <Text style={styles.secondaryText}>{t("تحديث حالة الطلب", "Refresh status")}</Text>
        </Pressable>
        <Pressable style={styles.signoutButton} onPress={() => void signOut()} accessibilityRole="button">
          <Ionicons name="log-out-outline" size={18} color="#64748B" />
          <Text style={styles.signoutText}>{t("تسجيل الخروج", "Sign out")}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },
  container: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 28, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 45 },
  brand: { color: "#0B1730", fontSize: 22, fontWeight: "800" },
  langButton: { flexDirection: "row", gap: 7, alignItems: "center", borderRadius: 20, backgroundColor: "#DBEAFE", paddingHorizontal: 14, paddingVertical: 9 },
  langText: { color: "#2563EB", fontWeight: "700" },
  title: { fontSize: 26, fontWeight: "800", color: "#0B1730", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#64748B", textAlign: "center", marginTop: 9, marginBottom: 28 },
  card: { borderRadius: 25, backgroundColor: "white", borderWidth: 1, borderColor: "#E7ECF4", padding: 25, alignItems: "center", minHeight: 280, justifyContent: "center" },
  status: { fontSize: 23, fontWeight: "800", marginTop: 15, textAlign: "center" },
  message: { fontSize: 14, color: "#64748B", textAlign: "center", lineHeight: 24, marginTop: 12, marginBottom: 15 },
  detail: { width: "100%", flexDirection: "row", justifyContent: "space-between", gap: 12, borderTopWidth: 1, borderColor: "#F1F5F9", paddingVertical: 15 },
  detailLabel: { color: "#64748B", fontSize: 13 },
  detailValue: { color: "#0B1730", fontWeight: "700", flexShrink: 1 },
  primaryButton: { width: "100%", backgroundColor: "#2563EB", paddingVertical: 17, borderRadius: 15, alignItems: "center", marginTop: 16 },
  primaryText: { color: "white", fontWeight: "800", fontSize: 15 },
  secondaryButton: { flexDirection: "row", gap: 9, alignItems: "center", justifyContent: "center", borderRadius: 15, backgroundColor: "#DBEAFE", paddingVertical: 16, marginTop: 20 },
  secondaryText: { color: "#2563EB", fontWeight: "700" },
  disabled: { opacity: 0.6 },
  signoutButton: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", marginTop: 24, padding: 12 },
  signoutText: { color: "#64748B", fontWeight: "600" },
});
