import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useLanguage } from "../../contexts/LanguageContext";
import { disablePush, pushIsEnabled, pushSupported, syncPush } from "../../services/push";

export default function PushControl() {
  const { t, language } = useLanguage();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (pushSupported) void pushIsEnabled().then(value => { if (active) setEnabled(value); }).catch(() => { if (active) setError(t("تعذر قراءة الإعداد. أعد فتح الصفحة.", "Unable to read settings. Reopen this page.")); });
    return () => { active = false; };
  }, [t]));
  const toggle = async () => {
    if (lock.current || enabled === null) return;
    lock.current = true; setBusy(true); setError("");
    try {
      if (enabled) await disablePush(); else await syncPush(language, true);
      setEnabled(await pushIsEnabled());
    } catch {
      setError(t("تعذر تحديث إشعارات الهاتف. تحقق من الإذن والاتصال وإعداد مشروع Expo، ثم أعد المحاولة.", "Could not update phone notifications. Check permission, connection and Expo project setup, then retry."));
    } finally { lock.current = false; setBusy(false); }
  };
  return <View style={{padding:16, backgroundColor:"#fff", gap:8}}>
    <Text style={{fontWeight:"700"}}>{t("إشعارات الهاتف", "Phone notifications")}</Text>
    <Text>{pushSupported ? t("تنبيه بعروض التوصيل وتحديثات الطلب حتى عند إغلاق التطبيق.", "Alerts for offers and delivery updates, including when the app is closed.") : t("تحتاج هاتفًا حقيقيًا ونسخة تطوير. إشعارات الويب داخل التطبيق تعمل كالمعتاد.", "Requires a physical phone and a development build. In-app web alerts remain available.")}</Text>
    {pushSupported && <Pressable accessibilityRole="button" disabled={busy || enabled === null} onPress={() => void toggle()} style={{padding:12,backgroundColor:"#EFF6FF",borderRadius:10}}><Text style={{color:"#2563EB"}}>{busy ? t("جارٍ التحديث...", "Updating...") : enabled ? t("إيقاف إشعارات هذا الجهاز", "Disable on this device") : t("تفعيل إشعارات الهاتف", "Enable phone notifications")}</Text></Pressable>}
    {!!error && <Text accessibilityRole="alert" style={{color:"#B91C1C"}}>{error}</Text>}
  </View>;
}
