import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Brand from "../components/Brand";
import { Brand as C } from "../constants/brand";
import { useLanguage } from "../contexts/LanguageContext";

type Icon = React.ComponentProps<typeof Ionicons>["name"];
export default function HomeScreen() {
  const { t, isArabic, language, setLanguage } = useLanguage();
  const alignment = { textAlign: isArabic ? "right" as const : "left" as const };
  const row = { flexDirection: isArabic ? "row-reverse" as const : "row" as const };
  return <SafeAreaView style={s.root} edges={["top", "bottom"]}>
    <StatusBar barStyle="dark-content" />
    <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
      <View style={[s.top, row]}><Brand arabic={isArabic} /><Pressable accessibilityRole="button" accessibilityLabel={t("التبديل إلى الإنجليزية", "Switch to Arabic")} style={s.language} onPress={() => void setLanguage(language === "ar" ? "en" : "ar")}><Text style={s.languageText}>{isArabic ? "EN" : "العربية"}</Text></Pressable></View>
      <View style={s.intro}><Text style={[s.eyebrow, alignment]}>{t("من الإمارات، لأعمالك", "FOR BUSINESS IN THE EMIRATES")}</Text><Text style={[s.title, alignment]}>{t("طموح متجرك.\nوجهتنا القادمة.", "Your ambition.\nOur next destination.")}</Text><Text style={[s.copy, alignment]}>{t("اكتشف المتاجر، واعرض منتجاتك، وتابع توصيلاتك. رسلو تقرّب كل خطوة في تجربة واحدة.", "Discover stores, showcase your products and follow deliveries. Raslo brings every step closer.")}</Text></View>
      <View style={s.scene}>
        <View style={[s.sceneTop, row]}><Text style={s.sceneTitle}>{t("كل خطوة، أقرب.", "Every step, closer.")}</Text><Text style={s.sceneTag}>RASLO / UAE</Text></View>
        <View style={[s.route, row]}><View style={s.stop}><Ionicons name="storefront-outline" size={30} color={C.gold} /><Text style={s.stopLabel}>{t("المتجر", "Store")}</Text></View><View style={s.routeLine} /><Ionicons name={isArabic ? "arrow-back-circle" : "arrow-forward-circle"} size={34} color={C.gold} /><View style={s.routeLine} /><View style={s.stop}><Ionicons name="location-outline" size={30} color={C.gold} /><Text style={s.stopLabel}>{t("العميل", "Customer")}</Text></View></View>
        <View style={[s.sceneCard, row]}><View style={s.bag}><Ionicons name="bag-handle-outline" size={25} color={C.ink} /></View><View style={{ flex: 1 }}><Text style={[s.sceneCardTitle, alignment]}>{t("من متجرك إلى باب عميلك", "From your store to their door")}</Text><Text style={[s.sceneCardCopy, alignment]}>{t("رؤية أوضح لرحلة التوصيل", "A clearer view of the delivery journey")}</Text></View></View>
        <Text style={s.illustration}>{t("تصوّر توضيحي للتجربة", "Experience illustration")}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push("/catalog")} style={({ pressed }) => [s.primary, row, pressed && s.pressed]}><Text style={s.primaryText}>{t("اكتشف منتجات المتاجر", "Discover store products")}</Text><Ionicons name="arrow-up-outline" style={{ transform: [{ rotate: "45deg" }] }} size={21} color={C.paper} /></Pressable>
      <View style={[s.accountActions, row]}><Pressable accessibilityRole="button" onPress={() => router.push("/register")} style={s.secondary}><Text style={s.secondaryText}>{t("انضم إلى رسلو", "Join Raslo")}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/login")} style={s.secondary}><Text style={s.secondaryText}>{t("تسجيل الدخول", "Sign in")}</Text></Pressable></View>
      <View style={s.section}><Text style={[s.eyebrow, alignment]}>{t("مساحة لطموحك", "ROOM FOR YOUR NEXT CHAPTER")}</Text><Text style={[s.sectionTitle, alignment]}>{t("تجارتك تتحرك. رسلو معك.", "Your business moves. So do we.")}</Text>
        {([
          ["storefront-outline", t("للتجار", "For merchants"), t("منتجاتك وتوصيلاتك من مساحة واحدة.", "Your products and deliveries, one workspace.")],
          ["bag-handle-outline", t("للمتسوقين", "For shoppers"), t("اكتشف المنتجات وأكمل الشراء لدى المتجر.", "Discover products and purchase with the store.")],
          ["car-outline", t("لشركاء التوصيل", "For delivery partners"), t("مهام واضحة ومتابعة حتى التسليم.", "Clear assignments, through to delivery.")],
        ] as [Icon, string, string][]).map(([icon, title, copy]) => <View key={icon} style={[s.feature, row]}><View style={s.featureIcon}><Ionicons name={icon} size={24} color={C.ink} /></View><View style={{ flex: 1 }}><Text style={[s.featureTitle, alignment]}>{title}</Text><Text style={[s.featureCopy, alignment]}>{copy}</Text></View></View>)}
      </View>
      <View style={s.footer}><Brand arabic={isArabic} compact /><Text style={s.footerText}>{t("الإمارات العربية المتحدة · العربية والإنجليزية", "United Arab Emirates · Arabic & English")}</Text></View>
    </ScrollView>
  </SafeAreaView>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper }, scroll: { padding: 22, maxWidth: 650, width: "100%", alignSelf: "center", paddingBottom: 30 },
  top: { alignItems: "center", justifyContent: "space-between", paddingBottom: 22, borderBottomWidth: 1, borderColor: C.border }, language: { minHeight: 44, minWidth: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.border, borderRadius: 12 }, languageText: { color: C.ink, fontSize: 13, fontWeight: "700" },
  intro: { paddingTop: 28, paddingBottom: 24 }, eyebrow: { color: "#69775C", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 }, title: { fontSize: 38, lineHeight: 53, fontWeight: "800", color: C.ink, marginTop: 13 }, copy: { color: C.muted, fontSize: 14, lineHeight: 26, marginTop: 14 },
  scene: { backgroundColor: C.ink, borderRadius: 26, padding: 22 }, sceneTop: { alignItems: "center", justifyContent: "space-between", gap: 8 }, sceneTitle: { color: C.paper, fontSize: 16, fontWeight: "700" }, sceneTag: { fontSize: 9, letterSpacing: 1.5, color: C.gold }, route: { alignItems: "center", marginVertical: 30 }, stop: { alignItems: "center", gap: 8 }, stopLabel: { color: "#DFE7D8", fontSize: 11 }, routeLine: { flex: 1, borderTopWidth: 1, borderStyle: "dashed", borderColor: C.gold, marginHorizontal: 10, marginBottom: 20 }, sceneCard: { alignItems: "center", gap: 12, borderRadius: 16, padding: 15, backgroundColor: C.paper }, bag: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#E6E8DA", alignItems: "center", justifyContent: "center" }, sceneCardTitle: { fontSize: 13, color: C.ink, fontWeight: "700", lineHeight: 23 }, sceneCardCopy: { fontSize: 10, color: C.muted, lineHeight: 19 }, illustration: { color: "#B8CAB8", fontSize: 9, textAlign: "center", marginTop: 12 },
  primary: { minHeight: 56, borderRadius: 14, backgroundColor: C.ink, marginTop: 22, alignItems: "center", justifyContent: "center", gap: 12, padding: 14 }, primaryText: { color: C.paper, fontWeight: "700", fontSize: 15 }, pressed: { opacity: 0.8 }, accountActions: { gap: 12, marginTop: 12 }, secondary: { flex: 1, minHeight: 50, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#BAC4B5", borderRadius: 13 }, secondaryText: { color: C.ink, fontSize: 13, fontWeight: "700" },
  section: { marginTop: 38 }, sectionTitle: { color: C.ink, fontSize: 23, lineHeight: 35, fontWeight: "800", marginTop: 10, marginBottom: 20 }, feature: { gap: 14, alignItems: "center", backgroundColor: "#FCFAF5", borderWidth: 1, borderColor: C.border, borderRadius: 18, padding: 18, marginBottom: 12 }, featureIcon: { width: 42, height: 42, backgroundColor: "#E8EBDF", borderRadius: 12, alignItems: "center", justifyContent: "center" }, featureTitle: { fontWeight: "700", fontSize: 15, color: C.ink, lineHeight: 25 }, featureCopy: { fontSize: 12, lineHeight: 23, color: C.muted, marginTop: 4 }, footer: { borderTopWidth: 1, borderColor: C.border, marginTop: 22, paddingTop: 25, alignItems: "center", gap: 14 }, footerText: { fontSize: 10, color: C.muted, textAlign: "center" },
});
