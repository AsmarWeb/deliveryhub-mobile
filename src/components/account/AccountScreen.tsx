import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../../contexts/LanguageContext";
import { getMyProfile, logoutUser, type UserProfile } from "../../services/profile";
import { getDriverProfile, updateDriverAvailability, type DriverProfile } from "../../services/driverProfile";
import DispatchControl from "../dispatch/DispatchControl";

type Icon = React.ComponentProps<typeof Ionicons>["name"];
export default function AccountScreen({ role }: { role: "driver" | "merchant" }) {
  const { t, language, setLanguage } = useLanguage(); const ar = language === "ar";
  const insets = useSafeAreaInsets(); const mounted = useRef(false); const lock = useRef(false);
  const [profile, setProfile] = useState<UserProfile | null>(null); const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [languageBusy, setLanguageBusy] = useState(false);
  const row = { flexDirection: ar ? "row-reverse" as const : "row" as const };
  const align = { textAlign: ar ? "right" as const : "left" as const };
  const load = useCallback(async () => {
    try {
      const user = await getMyProfile(); if (!mounted.current) return; setProfile(user);
      if (role === "driver") { const data = await getDriverProfile(); if (mounted.current) setDriver(data); }
      if (mounted.current) setError("");
    } catch { if (mounted.current) setError("load"); }
    finally { if (mounted.current) setLoading(false); }
  }, [role]);
  useFocusEffect(useCallback(() => { mounted.current = true; void load(); return () => { mounted.current = false; }; }, [load]));
  const toggle = async (available: boolean) => {
    if (lock.current) return; lock.current = true; setBusy(true);
    try { const data = await updateDriverAvailability(available); if (mounted.current) setDriver(data); }
    catch { if (mounted.current) setError("availability"); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  const signOut = async () => {
    if (lock.current) return; lock.current = true; setBusy(true);
    try { await logoutUser(); } catch { /* Local token is always removed. */ }
    finally { lock.current = false; router.replace("/login"); }
  };
  const confirm = () => {
    if (Platform.OS === "web") { if (window.confirm(t("هل تريد تسجيل الخروج؟", "Sign out?"))) void signOut(); return; }
    Alert.alert(t("تسجيل الخروج", "Sign out"), t("هل تريد تسجيل الخروج؟", "Sign out of your account?"), [
      { text: t("إلغاء", "Cancel"), style: "cancel" }, { text: t("خروج", "Sign out"), style: "destructive", onPress: () => void signOut() },
    ]);
  };
  const changeLanguage = async () => {
    if (languageBusy) return; setLanguageBusy(true);
    try { await setLanguage(ar ? "en" : "ar"); } catch { setError("language"); } finally { setLanguageBusy(false); }
  };
  const menu = (icon: Icon, title: string, subtitle: string, href: Href, badge?: string) => <Pressable key={String(href)} accessibilityRole="button" accessibilityLabel={title} onPress={() => router.push(href)} style={[s.menu, row]}>
    <View style={s.icon}><Ionicons name={icon} size={23} color="#17634F" /></View>
    <View style={s.flex}><Text style={[s.menuTitle, align]}>{title}</Text><Text style={[s.caption, align]}>{subtitle}</Text>{badge && <Text style={[s.badge, { alignSelf: ar ? "flex-end" : "flex-start", marginTop: 6 }]}>{badge}</Text>}</View>
    <Ionicons name={ar ? "chevron-back" : "chevron-forward"} size={18} color="#748379" />
  </Pressable>;
  return <ScrollView style={s.root} contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 30 }]} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { setLoading(true); void load(); }} tintColor="#17634F" />}>
    <LinearGradient colors={["#123D35", "#205A48"]} style={[s.hero, { paddingTop: insets.top + 20 }]}>
      <View style={[s.top, row]}><Text style={s.wordmark}>{t("رسلو", "Raslo")}</Text><Text style={s.accountTag}>{role === "driver" ? t("شريك التوصيل", "DELIVERY PARTNER") : t("شريك التجارة", "MERCHANT PARTNER")}</Text></View>
      <Text style={[s.title, align]}>{t("حسابي", "My account")}</Text>
      <View style={[s.identity, row]}><View style={s.avatar}><Ionicons name={role === "driver" ? "car-sport-outline" : "storefront-outline"} size={30} color="#D9B875" /></View><View style={s.flex}><Text style={[s.name, align]}>{profile?.name || t("مرحبًا بك", "Welcome")}</Text><Text style={[s.email, align]}>{profile?.email || t("كل تفاصيل حسابك في مكان واحد", "Your account, all in one place")}</Text></View></View>
    </LinearGradient>
    <View style={s.content}>
      {!!error && <View accessibilityRole="alert" style={s.error}><Text style={[s.errorText, align]}>{error === "availability" ? t("تعذر تحديث التوفر. تحقق من حالة حسابك واتصالك.", "Could not update availability. Check your account and connection.") : error === "language" ? t("تعذر حفظ اللغة.", "Could not save language.") : t("تعذر تحديث بعض البيانات.", "Some details could not be refreshed.")}</Text><Pressable accessibilityRole="button" onPress={() => void load()}><Text style={s.link}>{t("إعادة المحاولة", "Try again")}</Text></Pressable></View>}
      {loading && !profile && <ActivityIndicator color="#17634F" />}
      <Text style={[s.section, align]}>{t("ملفي الشخصي", "My profile")}</Text>
      <View style={s.card}>
        {menu("person-outline", t("بيانات الحساب", "Account details"), t("الاسم والتواصل وبيانات النشاط", "Personal and contact information"), "/account")}
        {role === "driver" && menu("documents-outline", t("مستنداتي", "My documents"), t("الهوية والرخصة والمركبة وحالة المراجعة", "Identity, licence, vehicle and review status"), "/documents", t("خاص", "PRIVATE"))}
      </View>
      {role === "merchant" && <><Text style={[s.section, align]}>{t("إدارة متجري", "Manage my business")}</Text><View style={s.card}>
        {menu("extension-puzzle-outline", t("تكاملات المتجر", "Store integrations"), t("WooCommerce وAPI ومزامنة المنتجات", "WooCommerce, API and catalog sync"), "/merchant/integrations", "Enterprise")}
        {menu("cube-outline", t("توصيلاتي", "My deliveries"), t("تابع الطلبات وحالات التوصيل", "Manage orders and delivery progress"), "/merchant/deliveries")}
        {menu("repeat-outline", t("الأتمتة", "Automations"), t("إدارة جداول التوصيل المتكررة", "Manage recurring delivery schedules"), "/merchant/automations")}
      </View><Text style={[s.section, align]}>{t("المحفظة والفوترة", "Wallet & billing")}</Text><View style={s.card}>{menu("wallet-outline", t("الاشتراك والفواتير", "Subscription & invoices"), t("إدارة خطتك وبيانات الفوترة", "Manage your plan and billing details"), "/merchant/wallet")}{menu("stats-chart-outline", t("التقارير المالية", "Financial reports"), t("رسوم التوصيل والعمولات", "Delivery fees and commissions"), "/merchant/finance")}</View></>}
      {role === "driver" && <><Text style={[s.section, align]}>{t("جاهزية العمل", "Work availability")}</Text><View style={s.card}>
        <View style={[s.menu, row]}><View style={s.icon}><Ionicons name="radio-outline" size={23} color="#17634F" /></View><View style={s.flex}><Text style={[s.menuTitle, align]}>{t("متاح لاستقبال المهام", "Available for assignments")}</Text><Text style={[s.caption, align]}>{driver?.status === "active" ? t("تحكم بوقت ظهورك للتجار", "Control when you are available") : t("يلزم اعتماد حسابك أولًا", "Account approval is required")}</Text></View><Switch accessibilityLabel={t("توفر السائق", "Driver availability")} value={driver?.is_available ?? false} disabled={busy || !driver || driver.status !== "active"} onValueChange={value => void toggle(value)} trackColor={{ true: "#17634F" }} /></View>
        <View style={s.details}><Text style={[s.caption, align]}>{[driver?.vehicle_type, driver?.vehicle_plate].filter(Boolean).join(" · ") || t("أكمل بيانات المركبة من بيانات الحساب", "Complete your vehicle details in Account details")}</Text></View>
      </View><View style={s.dispatch}><DispatchControl /></View></>}
      <Text style={[s.section, align]}>{t("تفضيلات التطبيق", "App preferences")}</Text><View style={s.card}>
        <Pressable accessibilityRole="button" disabled={languageBusy} onPress={() => void changeLanguage()} style={[s.menu, row]}><View style={s.icon}><Ionicons name="language-outline" size={23} color="#17634F" /></View><View style={s.flex}><Text style={[s.menuTitle, align]}>{t("اللغة", "Language")}</Text><Text style={[s.caption, align]}>{t("العربية", "English")}</Text></View>{languageBusy ? <ActivityIndicator color="#17634F" /> : <Text style={s.link}>{ar ? "English" : "العربية"}</Text>}</Pressable>
        {menu("notifications-outline", t("الإشعارات", "Notifications"), t("التنبيهات وتحديثات الحساب", "Alerts and account updates"), role === "driver" ? "/driver/notifications" : "/merchant/notifications")}
      </View>
      <Pressable accessibilityRole="button" disabled={busy} onPress={confirm} style={[s.signOut, row]}><Ionicons name="log-out-outline" size={21} color="#AD403B" /><Text style={s.signOutText}>{t("تسجيل الخروج", "Sign out")}</Text></Pressable>
      <Text style={s.footer}>{t("رسلو · خدمات توصيل للأعمال في الإمارات", "Raslo · Delivery for UAE businesses")}</Text>
    </View>
  </ScrollView>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F3EB" }, body: { width: "100%", maxWidth: 780, alignSelf: "center" }, flex: { flex: 1, minWidth: 0 },
  hero: { paddingHorizontal: 24, paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }, top: { alignItems: "center", justifyContent: "space-between", gap: 12 },
  wordmark: { color: "#F8F5EB", fontSize: 24, fontWeight: "900" }, accountTag: { color: "#D9B875", fontSize: 10, fontWeight: "800", flexShrink: 1 },
  title: { color: "white", fontSize: 32, fontWeight: "900", marginTop: 25 }, identity: { alignItems: "center", gap: 14, marginTop: 22 },
  avatar: { width: 64, height: 64, borderRadius: 21, backgroundColor: "#FFFFFF12", borderWidth: 1, borderColor: "#D9B87555", alignItems: "center", justifyContent: "center" },
  name: { color: "white", fontSize: 19, fontWeight: "800" }, email: { color: "#D7E4D9", fontSize: 12, marginTop: 5, lineHeight: 20 },
  content: { padding: 18 }, section: { color: "#123D35", fontSize: 16, fontWeight: "800", marginTop: 22, marginBottom: 12 },
  card: { backgroundColor: "white", borderRadius: 22, borderWidth: 1, borderColor: "#E3E4D8", overflow: "hidden" },
  menu: { alignItems: "center", gap: 12, padding: 16, minHeight: 82, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#EAECE2" },
  icon: { width: 43, height: 43, borderRadius: 14, backgroundColor: "#EDF2E9", alignItems: "center", justifyContent: "center" },
  menuTitle: { color: "#123D35", fontWeight: "800", fontSize: 14, lineHeight: 23 }, caption: { color: "#65756D", fontSize: 11, lineHeight: 19, marginTop: 3 },
  badge: { color: "#86621D", backgroundColor: "#FBF3DF", borderRadius: 7, padding: 5, fontSize: 9, fontWeight: "800", maxWidth: 70 },
  details: { paddingHorizontal: 18, paddingBottom: 15 }, dispatch: { marginTop: 16 }, link: { color: "#17634F", fontWeight: "800", paddingVertical: 8 },
  error: { backgroundColor: "#FCEFEB", borderRadius: 15, padding: 15 }, errorText: { color: "#AD403B", fontSize: 13, lineHeight: 22 },
  signOut: { marginTop: 25, minHeight: 56, alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 17, borderWidth: 1, borderColor: "#EDD4CA" }, signOutText: { color: "#AD403B", fontWeight: "800" },
  footer: { textAlign: "center", fontSize: 11, color: "#748379", marginTop: 24, lineHeight: 20 },
});
