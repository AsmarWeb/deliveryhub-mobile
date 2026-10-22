import { useLanguage } from "../../contexts/LanguageContext";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { logout } from "../../services/auth";
import { getMyProfile, type UserProfile } from "../../services/profile";

const C = {
  bg: "#F6F3EB",
  navy: "#123D35",
  blue: "#17634F",
  muted: "#62726B",
  border: "#E1E1D5",
  danger: "#DC2626",
};

export default function MerchantProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { language, setLanguage } = useLanguage();
  const align = { textAlign: language === "ar" ? "right" as const : "left" as const };
  const row = { flexDirection: language === "ar" ? "row-reverse" as const : "row" as const };
  const t = (ar: string, en: string) => language === "ar" ? ar : en;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(false);
      getMyProfile()
        .then((user) => {
          if (active) setProfile(user);
        })
        .catch(() => {
          if (active) setError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => { active = false; };
    }, []),
  );

  const refresh = async () => {
    if (refreshing || signingOut) return;
    setRefreshing(true);
    try {
      setProfile(await getMyProfile());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  };

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      // auth.logout removes the local SecureStore token in finally.
      await logout();
    } catch {
      // The local token is still removed by auth.logout.
    } finally {
      setSigningOut(false);
      router.replace("/login");
    }
  };

  const confirmSignOut = () => {
    if (signingOut) return;
    if (Platform.OS === "web") {
      if (window.confirm(t("هل تريد تسجيل الخروج؟", "Sign out of your account?"))) void signOut();
      return;
    }
    Alert.alert(
      t("تسجيل الخروج", "Sign out"),
      t("هل تريد تسجيل الخروج من حسابك؟", "Do you want to sign out of your account?"),
      [
        { text: t("إلغاء", "Cancel"), style: "cancel" },
        { text: t("تسجيل الخروج", "Sign out"), style: "destructive", onPress: () => void signOut() },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" onPress={() => router.push("/merchant/integrations")} style={{ padding: 18, backgroundColor: "#EAF0E7", borderRadius: 14, margin: 15 }}><Text style={{ color: "#17634F", fontWeight: "800" }}>{t("تكاملات المتجر · Enterprise", "Store integrations · Enterprise")}</Text></Pressable>
        <LinearGradient colors={[C.navy, "#205545", C.blue]} style={styles.hero}>
          <View style={styles.topRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={t("رجوع", "Back")} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.heroTitle}>{t("حسابي", "My account")}</Text>
            <Pressable accessibilityRole="button" onPress={() => void setLanguage(language === "ar" ? "en" : "ar")}>
              <Text style={styles.language}>{language === "ar" ? "EN" : "عربي"}</Text>
            </Pressable>
          </View>
          <View style={styles.avatar}>
            <Ionicons name="person-outline" size={38} color="#FFFFFF" />
          </View>
          <Text style={styles.name}>{profile?.name || t("حساب التاجر", "Merchant account")}</Text>
          <Text style={styles.email}>{profile?.email || t("رسلو", "Raslo")}</Text>
        </LinearGradient>

        <View style={styles.body}>
          {loading ? <ActivityIndicator size="large" color={C.blue} style={styles.loader} /> : null}
          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={22} color={C.danger} />
              <Text style={styles.errorText}>{t("تعذر تحميل بيانات الحساب.", "Could not load account details.")}</Text>
              <Pressable onPress={() => void refresh()} disabled={refreshing} accessibilityRole="button">
                <Text style={styles.retry}>{t("إعادة المحاولة", "Retry")}</Text>
              </Pressable>
            </View>
          ) : null}

          <Pressable style={[styles.actionRow, row]} accessibilityRole="button" onPress={() => router.push("/account")}>
            <Ionicons name="create-outline" size={22} color={C.blue} />
            <Text style={[styles.actionText, align]}>{t("تعديل واستكمال بيانات الحساب", "Edit & complete account details")}</Text>
          </Pressable>
          <Text style={[styles.sectionTitle, align]}>{t("المعلومات الشخصية", "Personal information")}</Text>
          <View style={styles.card}>
            <InfoRow icon="person-outline" label={t("الاسم", "Name")} value={profile?.name || "—"} />
            <InfoRow icon="mail-outline" label={t("البريد الإلكتروني", "Email")} value={profile?.email || "—"} />
            <InfoRow icon="shield-checkmark-outline" label={t("نوع الحساب", "Account type")} value={profile?.roles?.map((role) => role.name).join(", ") || "—"} last />
          </View>

          <Text style={[styles.sectionTitle, align]}>{t("المحفظة والفوترة", "Wallet & billing")}</Text>
          <View style={styles.card}>
            <Pressable style={[styles.actionRow, row]} accessibilityRole="button" onPress={() => router.push("/merchant/wallet")}>
              <Ionicons name="wallet-outline" size={24} color={C.blue} />
              <View style={styles.infoBody}>
                <Text style={[styles.actionText, align]}>{t("المحفظة والفوترة", "Wallet & billing")}</Text>
                <Text style={[styles.infoLabel, align]}>{t("الاشتراك والفواتير ووسائل الدفع عبر Stripe", "Subscription, invoices and payment methods via Stripe")}</Text>
              </View>
              <Ionicons name={language === "ar" ? "chevron-back" : "chevron-forward"} size={18} color={C.muted} />
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, align]}>{t("إدارة الحساب", "Account settings")}</Text>
          <View style={styles.card}>
            <Pressable style={[styles.actionRow, row]} accessibilityRole="button" onPress={() => void refresh()} disabled={refreshing || loading}>
              <Ionicons name="refresh-outline" size={22} color={C.blue} />
              <Text style={[styles.actionText, align]}>{t("تحديث بيانات الحساب", "Refresh account details")}</Text>
              {refreshing ? <ActivityIndicator color={C.blue} /> : <Ionicons name="chevron-forward" size={18} color={C.muted} />}
            </Pressable>
            <View style={styles.separator} />
            <Pressable style={[styles.actionRow, row]} accessibilityRole="button" onPress={() => router.push("/merchant/deliveries")}>
              <Ionicons name="cube-outline" size={22} color={C.blue} />
              <Text style={[styles.actionText, align]}>{t("توصيلاتي", "My deliveries")}</Text>
              <Ionicons name="chevron-forward" size={18} color={C.muted} />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("تسجيل الخروج", "Sign out")}
            style={[styles.signOut, signingOut && styles.disabled]}
            disabled={signingOut}
            onPress={confirmSignOut}
          >
            {signingOut ? <ActivityIndicator color={C.danger} /> : <Ionicons name="log-out-outline" size={22} color={C.danger} />}
            <Text style={styles.signOutText}>{t("تسجيل الخروج", "Sign out")}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ icon, label, value, last = false }: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  last?: boolean;
}) {
  const { language } = useLanguage();
  const align = { textAlign: language === "ar" ? "right" as const : "left" as const };
  return (
    <View style={[styles.infoRow, !last && styles.infoBorder, { flexDirection: language === "ar" ? "row-reverse" : "row" }]}>
      <Ionicons name={icon} size={21} color={C.blue} />
      <View style={styles.infoBody}>
        <Text style={[styles.infoLabel, align]}>{label}</Text>
        <Text style={[styles.infoValue, align]} selectable>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { paddingBottom: 45, maxWidth: 760, width: "100%", alignSelf: "center" },
  hero: { paddingTop: 58, paddingHorizontal: 22, paddingBottom: 34, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, alignItems: "center" },
  topRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  language: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  avatar: { width: 78, height: 78, borderRadius: 25, backgroundColor: "#FFFFFF25", alignItems: "center", justifyContent: "center", marginTop: 28 },
  name: { color: "#FFFFFF", fontSize: 23, fontWeight: "900", marginTop: 14, textAlign: "center" },
  email: { color: "#D9E5D6", fontSize: 13, marginTop: 5, textAlign: "center" },
  body: { padding: 18 },
  loader: { marginVertical: 18 },
  sectionTitle: { fontSize: 17, fontWeight: "800", color: C.navy, marginTop: 19, marginBottom: 12, textAlign: "right" },
  card: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: C.border, borderRadius: 18, paddingHorizontal: 17 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16 },
  infoBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  infoBody: { flex: 1 },
  infoLabel: { color: C.muted, fontSize: 12, textAlign: "right" },
  infoValue: { color: C.navy, fontSize: 15, fontWeight: "700", marginTop: 5, textAlign: "right" },
  actionRow: { flexDirection: "row", alignItems: "center", gap: 13, minHeight: 61 },
  actionText: { flex: 1, fontSize: 14, color: C.navy, fontWeight: "700", textAlign: "right" },
  separator: { height: 1, backgroundColor: "#F1F5F9" },
  signOut: { backgroundColor: "#FEF2F2", borderColor: "#FECACA", borderWidth: 1, borderRadius: 15, marginTop: 28, minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  signOutText: { color: C.danger, fontWeight: "800", fontSize: 16 },
  disabled: { opacity: 0.55 },
  errorBox: { padding: 15, borderRadius: 14, backgroundColor: "#FEF2F2", alignItems: "center", gap: 9 },
  errorText: { color: C.danger, textAlign: "center" },
  retry: { color: C.blue, fontWeight: "800" },
});
