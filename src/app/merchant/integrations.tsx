import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../../contexts/LanguageContext";
import { getCatalogConnections, syncCatalogConnection, type CatalogConnection } from "../../services/catalog";

export default function IntegrationsScreen() {
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const align = { textAlign: language === "ar" ? "right" as const : "left" as const };
  const [connections, setConnections] = useState<CatalogConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [locked, setLocked] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const mounted = useRef(false);
  const busy = useRef(false);
  useFocusEffect(useCallback(() => {
    mounted.current = true;
    const controller = new AbortController();
    setLoading(true); setError(false); setLocked(false);
    getCatalogConnections(controller.signal).then(setConnections).catch((e: { response?: { status?: number } }) => {
      if (controller.signal.aborted) return;
      setLocked(e.response?.status === 403); setError(true);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { mounted.current = false; controller.abort(); };
  }, []));
  const sync = async (connection: CatalogConnection) => {
    if (busy.current) return;
    busy.current = true; setBusyId(connection.id);
    try { await syncCatalogConnection(connection.id); if (mounted.current) Alert.alert(t("تم طلب المزامنة", "Synchronization requested"), t("تتم المعالجة في الخلفية. راجع لوحة الويب لنتائج المزامنة.", "Processing runs in the background. Check the web dashboard for sync results.")); }
    catch { if (mounted.current) Alert.alert(t("تعذر طلب المزامنة", "Unable to request synchronization")); }
    finally { busy.current = false; if (mounted.current) setBusyId(null); }
  };
  return <ScrollView style={{ flex: 1, backgroundColor: "#F6F3EB" }} contentContainerStyle={[s.page, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}><Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={s.link}>{language === "ar" ? "→ " : "← "}{t("رجوع", "Back")}</Text></Pressable><Text style={[s.tag, align]}>RASLO ENTERPRISE</Text><Text style={[s.title, align]}>{t("ربط المتاجر والمنتجات", "Store integrations")}</Text><Text style={[s.copy, align]}>{t("أنشئ ربطًا ومفتاح API من لوحة الويب للتاجر. تحتاج المزامنة التلقائية إلى تغذية متوافقة أو موصل في متجرك.", "Create connections and API keys in the merchant web dashboard. Automatic synchronization requires a compatible feed or a store adapter.")}</Text><Pressable accessibilityRole="button" onPress={() => router.push("/catalog")} style={s.button}><Text style={s.white}>{t("تصفح المنتجات المنشورة", "Browse published products")}</Text></Pressable>
    {loading ? <ActivityIndicator style={{ margin: 30 }} /> : error ? <View style={s.card}><Text style={[s.copy, align]}>{locked ? t("الربط مخصص لاشتراك Enterprise مدفوع وساري.", "A current paid Enterprise subscription is required.") : t("تعذر تحميل المتاجر. أعد فتح الصفحة للمحاولة.", "Unable to load stores. Reopen this page to retry.")}</Text>{locked && <Pressable accessibilityRole="button" onPress={() => router.push("/merchant/subscription")}><Text style={s.link}>{t("إدارة الاشتراك", "Manage subscription")}</Text></Pressable>}</View> : connections.length === 0 ? <View style={s.card}><Ionicons name="storefront-outline" size={35} color="#17634F" /><Text style={[s.heading, align]}>{t("أضف متجرك الأول من لوحة الويب", "Add your first store in the web dashboard")}</Text></View> : connections.map(connection => <View key={connection.id} style={s.card}><Text style={[s.heading, align]}>{connection.name}</Text><Text style={[s.copy, align]}>{connection.mode.toUpperCase()} · {connection.status} · {connection.products_count} {t("منتج", "products")}</Text><Text style={[s.copy, align]}>{connection.approved_at ? t("معتمد للنشر", "Approved for publication") : t("بانتظار مراجعة الإدارة", "Awaiting admin review")}</Text><Text style={[s.small, align]}>{connection.last_synced_at ? new Date(connection.last_synced_at).toLocaleString() : t("لم تتم المزامنة بعد", "Not synchronized yet")}</Text>{connection.last_sync_error && <Text style={[s.small, align]}>{t("فشلت آخر مزامنة. راجع لوحة الويب.", "The last sync failed. Check the web dashboard.")}</Text>}{connection.mode === "feed" && connection.status === "active" && <Pressable disabled={busyId !== null} accessibilityRole="button" onPress={() => void sync(connection)} style={s.button}>{busyId === connection.id ? <ActivityIndicator color="white" /> : <Text style={s.white}>{t("مزامنة الآن", "Sync now")}</Text>}</Pressable>}</View>)}
  </ScrollView>;
}
const s = StyleSheet.create({ page: { width: "100%", maxWidth: 780, alignSelf: "center", padding: 24, paddingTop: 60, paddingBottom: 40, backgroundColor: "#F6F3EB", flexGrow: 1 }, tag: { color: "#17634F", fontWeight: "800", fontSize: 11, marginTop: 25 }, title: { fontSize: 28, fontWeight: "900", color: "#123D35", marginTop: 10 }, copy: { color: "#62726B", lineHeight: 25, marginVertical: 10 }, link: { color: "#17634F", fontWeight: "800", paddingVertical: 12 }, card: { padding: 22, borderRadius: 20, borderWidth: 1, borderColor: "#DDDED2", backgroundColor: "white", marginTop: 20 }, heading: { color: "#123D35", fontSize: 19, fontWeight: "800", marginTop: 10 }, button: { backgroundColor: "#17634F", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 15 }, white: { color: "white", fontWeight: "800" }, small: { color: "#62726B", fontSize: 12, marginTop: 8 } });
