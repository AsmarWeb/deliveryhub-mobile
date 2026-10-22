import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import api from "../../services/api";
import { disableDispatch, syncDispatchPresence } from "../../services/autoDispatch";
import { useLanguage } from "../../contexts/LanguageContext";
export default function DispatchControl() {
  const { language, t } = useLanguage();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const request = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const align = { textAlign: language === "ar" ? "right" as const : "left" as const };
  useFocusEffect(useCallback(() => {
    const controller = new AbortController(); request.current = controller; setBusy(false);
    api.get<{ data: { dispatch_enabled: boolean } }>("/driver/profile", { signal: controller.signal })
      .then(response => { if (!controller.signal.aborted) { setEnabled(response.data.data.dispatch_enabled); setError(false); } })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => { controller.abort(); request.current?.abort(); };
  }, []));
  const toggle = async () => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(false);
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    try {
      if (enabled) await disableDispatch(controller.signal); else await syncDispatchPresence(controller.signal, true);
      if (!controller.signal.aborted) {
        const response = await api.get<{ data: { dispatch_enabled: boolean } }>("/driver/profile", { signal: controller.signal });
        setEnabled(response.data.data.dispatch_enabled);
      }
    } catch { if (!controller.signal.aborted) setError(true); }
    finally { lock.current = false; if (!controller.signal.aborted) setBusy(false); }
  };
  return <View style={s.card}>
    <Text style={[s.title, align]}>{t("الإسناد التلقائي", "Automatic driver offers")}</Text>
    <Text style={[s.text, align]}>{t("بعد التفعيل وأثناء التوفر، يُحدّث موقعك عند فتح التطبيق لترشيحك لطلبات قريبة. لا يظهر موقعك الدقيق في قائمة التاجر. يمكنك إيقافه هنا؛ الإيقاف لا يلغي مهمة قائمة.", "When enabled and available, your location updates while the app is open to match nearby requests. Your precise location is not shown in the merchant list. Disable it here; this does not cancel an existing assignment.")}</Text>
    <Text style={[s.text, align]}>{enabled ? t("مفعّل — يتطلب موقعًا حديثًا وتوفرًا", "Enabled — requires fresh location and availability") : t("غير مفعّل", "Not enabled")}</Text>
    {error && <Text accessibilityRole="alert" style={[s.error, align]}>{t("فعّل التوفر واسمح بالموقع، ثم حاول مجددًا. تحقق من الاتصال إذا استمر الخطأ.", "Become available and allow location, then retry. Check your connection if this continues.")}</Text>}
    <Pressable accessibilityRole="button" disabled={busy} style={s.button} onPress={() => void toggle()}>{busy ? <ActivityIndicator color="white" /> : <Text style={s.white}>{enabled ? t("إيقاف الإسناد التلقائي", "Disable automatic offers") : t("تفعيل ومشاركة موقع التوفر", "Enable & share availability location")}</Text>}</Pressable>
  </View>;
}
const s = StyleSheet.create({ card: { backgroundColor: "white", borderRadius: 18, padding: 18, gap: 12, marginVertical: 12 }, title: { color: "#123D35", fontSize: 18, fontWeight: "800" }, text: { color: "#475569", lineHeight: 23 }, error: { color: "#B91C1C", lineHeight: 23 }, button: { backgroundColor: "#17634F", minHeight: 48, padding: 12, borderRadius: 12, alignItems: "center", justifyContent: "center" }, white: { color: "white", fontWeight: "700" } });
