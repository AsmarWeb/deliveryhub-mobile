import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { getAvailableDrivers, type AvailableDriver } from "../../services/autoDispatch";
import { useLanguage } from "../../contexts/LanguageContext";
export default function AvailableDrivers() {
  const { language, t } = useLanguage();
  const [drivers, setDrivers] = useState<AvailableDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const request = useRef<AbortController | null>(null);
  const align = { textAlign: language === "ar" ? "right" as const : "left" as const };
  const load = useCallback(async () => {
    if (AppState.currentState !== "active") return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true);
    try { const result = await getAvailableDrivers(controller.signal); if (!controller.signal.aborted) { setDrivers(result); setError(false); } }
    catch { if (!controller.signal.aborted) { setDrivers([]); setError(true); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    setDrivers([]); void load();
    const interval = setInterval(() => void load(), 30000);
    const listener = AppState.addEventListener("change", state => { if (state === "active") void load(); else request.current?.abort(); });
    return () => { clearInterval(interval); listener.remove(); request.current?.abort(); };
  }, [load]));
  return <View style={s.card}>
    <Text style={[s.title, align]}>{t("سائقون متاحون للإسناد التلقائي", "Drivers available for automatic offers")}</Text>
    <Text style={[s.text, align]}>{t("يتحدد السائق تلقائيًا بعد اعتماد السعر، حسب قربه من الاستلام وسعته وموقعه الحديث. القائمة تعرض حتى 10 سائقين على المنصة ولا تضمن قربهم من عنوانك.", "A driver is matched after price approval using pickup distance, capacity and fresh location. This list shows up to 10 drivers on the platform; it does not guarantee proximity to your address.")}</Text>
    {loading && <ActivityIndicator color="#2563EB" />}
    {error ? <Text accessibilityRole="alert" style={[s.text, align]}>{t("تعذر تحديث السائقين المتاحين.", "Could not refresh available drivers.")}</Text> : drivers.length ? drivers.map(driver => <View key={driver.id} style={s.driver}><Text style={[s.name, align]}>{driver.display_name}</Text><Text style={[s.text, align]}>{driver.vehicle_type || t("شريك توصيل", "Delivery partner")}</Text></View>) : !loading && <Text style={[s.text, align]}>{t("لا يوجد سائق متاح بموقع حديث حاليًا. سيُعاد البحث تلقائيًا عن طلبك.", "No driver with a fresh location is available right now. Matching will retry automatically.")}</Text>}
    <Pressable accessibilityRole="button" style={s.touch} onPress={() => void load()}><Text style={s.link}>{t("تحديث السائقين", "Refresh drivers")}</Text></Pressable>
  </View>;
}
const s = StyleSheet.create({ card: { borderRadius: 20, padding: 20, gap: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", marginTop: 18 }, title: { fontSize: 19, color: "#0B1730", fontWeight: "800" }, text: { color: "#475569", lineHeight: 23, fontSize: 13 }, driver: { borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 10, gap: 4 }, name: { color: "#0B1730", fontWeight: "700" }, touch: { minHeight: 44, justifyContent: "center", alignItems: "center" }, link: { color: "#2563EB", fontWeight: "700" } });
