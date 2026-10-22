import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../../contexts/LanguageContext";
export default function RegistrationChoice() {
  const { language, setLanguage, t } = useLanguage();
  const insets = useSafeAreaInsets();
  const align = { textAlign: language === "ar" ? "right" as const : "left" as const };
  return <ScrollView style={s.root} contentContainerStyle={[s.body, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
    <View style={s.header}><Text style={s.brand}>{t("رسلو · الإمارات", "Raslo · UAE")}</Text><Pressable accessibilityRole="button" style={s.touch} onPress={() => void setLanguage(language === "ar" ? "en" : "ar")}><Text style={s.link}>{language === "ar" ? "EN" : "عربي"}</Text></Pressable></View>
    <Text style={[s.title, align]}>{t("لنبدأ معًا", "Let’s get started")}</Text><Text style={[s.description, align]}>{t("اختر حسابك. بيانات قليلة الآن، وبقية التفاصيل داخل الحساب.", "Choose your account. A few essentials now, the rest in your profile.")}</Text>
    {(["merchant", "driver"] as const).map(type => <Pressable accessibilityRole="button" key={type} style={s.card} onPress={() => router.push(type === "merchant" ? "/register/merchant" : "/register/driver")}>
      <Ionicons name={type === "merchant" ? "storefront-outline" : "bicycle-outline"} size={32} color="#17634F" />
      <Text style={[s.heading, align]}>{type === "merchant" ? t("متجر أو شركة", "Store or company") : t("شريك توصيل", "Delivery partner")}</Text>
      <Text style={[s.description, align]}>{type === "merchant" ? t("نظّم توصيلات نشاطك وتابع طلباتك من مكان واحد.", "Manage your business deliveries and track orders in one place.") : t("أنشئ حسابك وأكمل بيانات المركبة والرخصة قبل المراجعة.", "Create an account, then add vehicle and licence details for review.")}</Text>
      <Text style={[s.link, align]}>{t("ابدأ التسجيل", "Get started")}</Text>
    </Pressable>)}
    <Pressable accessibilityRole="button" style={s.touch} onPress={() => router.replace("/login")}><Text style={s.link}>{t("لديك حساب؟ تسجيل الدخول", "Already registered? Sign in")}</Text></Pressable>
  </ScrollView>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: "#F6F3EB" }, body: { width: "100%", maxWidth: 560, alignSelf: "center", paddingHorizontal: 24, gap: 20 }, header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, brand: { color: "#123D35", fontWeight: "800", fontSize: 19 }, title: { fontSize: 30, color: "#123D35", fontWeight: "800" }, card: { backgroundColor: "white", padding: 24, borderRadius: 22, borderWidth: 1, borderColor: "#DDDED2", gap: 14 }, heading: { fontSize: 21, color: "#123D35", fontWeight: "800" }, description: { fontSize: 15, color: "#475569", lineHeight: 24 }, link: { color: "#17634F", fontWeight: "800" }, touch: { minHeight: 48, minWidth: 48, justifyContent: "center", alignItems: "center" } });
