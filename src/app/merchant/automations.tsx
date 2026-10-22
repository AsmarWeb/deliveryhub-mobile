import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { useLanguage } from "../../contexts/LanguageContext";
import { AutomationButton, AutomationHeader, s } from "../../components/automations/AutomationUI";
import { automationError, getAutomations, setAutomationActive, type AutomationPage, type Automation } from "../../services/automations";

export default function MerchantAutomations() {
  const { t, isArabic } = useLanguage();
  const [result, setResult] = useState<AutomationPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const request = useRef<AbortController | null>(null);
  const changing = useRef(false);
  const focused = useRef(false);

  const load = useCallback(async (page = 1) => {
    if (changing.current) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    try {
      const data = await getAutomations(page, controller.signal);
      if (!controller.signal.aborted) { setResult(data); setError(null); }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    if (!changing.current) setBusy(null);
    void load();
    return () => { focused.current = false; request.current?.abort(); };
  }, [load]));

  async function toggle(item: Automation) {
    if (changing.current || loading) return;
    changing.current = true;
    setBusy(item.id);
    try {
      const updated = await setAutomationActive(item.id, !item.is_active);
      if (focused.current) {
        setResult(previous => previous && ({ ...previous, data: previous.data.map(row => row.id === item.id ? { ...row, ...updated } : row) }));
        setError(null);
      }
    } catch (cause) {
      if (focused.current) setError(cause);
    } finally {
      changing.current = false;
      if (focused.current) setBusy(null);
    }
  }

  function nextDate(item: Automation) {
    if (!item.is_active) return t("متوقف", "Paused");
    const value = new Date(item.next_run_at);
    if (!Number.isFinite(value.getTime())) return "—";
    try {
      return value.toLocaleString(isArabic ? "ar-AE" : "en-AE", { timeZone: item.timezone, dateStyle: "medium", timeStyle: "short" });
    } catch { return value.toISOString(); }
  }
  const days = isArabic ? ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return <ScrollView style={s.root} contentContainerStyle={[s.content, { direction: isArabic ? "rtl" : "ltr" }]}
    refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load(result?.current_page ?? 1)} enabled={busy === null} />}>
    <AutomationHeader title={t("أتمتة التوصيلات", "Delivery automations")} />
    <Text style={s.body}>{t("أنشئ طلبات متكررة كمسودات للمراجعة. لا يتم إسناد سائق أو اعتماد سعر تلقائياً.", "Generate recurring drafts for review. Drivers and prices are not approved automatically.")}</Text>
    <AutomationButton onPress={() => router.push("/merchant/create-automation")} disabled={busy !== null}>
      {t("جدول جديد", "New schedule")}
    </AutomationButton>
    <AutomationButton secondary onPress={() => router.push("/merchant/subscription")}>
      {t("الاشتراكات وحدود الخطة", "Subscriptions and plan access")}
    </AutomationButton>
    {error !== null && <View style={s.card}>
      <Text accessibilityRole="alert" style={s.error}>{automationError(error, isArabic)}</Text>
      <AutomationButton secondary disabled={loading || busy !== null} onPress={() => void load(result?.current_page ?? 1)}>{t("تحديث القائمة", "Refresh list")}</AutomationButton>
    </View>}
    {loading && !result && <ActivityIndicator color="#17634F" />}
    {result && <Text style={s.body}>{t("إجمالي الجداول", "Total schedules")}: {result.total}</Text>}
    {result?.data.length === 0 && <Text style={s.body}>{t("ليس لديك جداول بعد. ابدأ بإنشاء جدول جديد.", "No schedules yet. Create your first schedule.")}</Text>}
    {result?.data.map(item => <View key={item.id} style={s.card}>
      <Text style={s.label}>{item.recipient_name}</Text>
      <Text style={s.body}>{item.recipient_phone}</Text>
      <Text style={s.body}>{item.frequency === "daily" ? t("يومياً", "Daily") : `${t("أسبوعياً", "Weekly")} · ${days[item.day_of_week ?? 0]}`} · {item.execution_time.slice(0, 5)}</Text>
      <Text style={s.body}>{item.timezone}</Text>
      <Text style={s.body}>{t("الاستلام", "Pickup")}: {item.pickup_address?.label || item.pickup_address?.address_line || `#${item.pickup_address_id}`}</Text>
      <Text style={s.body}>{t("التسليم", "Drop-off")}: {item.dropoff_address?.label || item.dropoff_address?.address_line || `#${item.dropoff_address_id}`}</Text>
      <Text style={s.body}>{t("التنفيذ التالي", "Next execution")}: {nextDate(item)}</Text>
      <AutomationButton secondary={item.is_active} disabled={busy !== null || loading} onPress={() => void toggle(item)}>
        {busy === item.id ? t("جارٍ الحفظ…", "Saving…") : item.is_active ? t("إيقاف الجدول", "Pause schedule") : t("تفعيل الجدول", "Activate schedule")}
      </AutomationButton>
    </View>)}
    {result && result.last_page > 1 && <View style={s.row}>
      <AutomationButton secondary disabled={loading || busy !== null || result.current_page <= 1} onPress={() => void load(result.current_page - 1)}>{t("السابق", "Previous")}</AutomationButton>
      <Text style={s.body}>{result.current_page} / {result.last_page}</Text>
      <AutomationButton secondary disabled={loading || busy !== null || result.current_page >= result.last_page} onPress={() => void load(result.current_page + 1)}>{t("التالي", "Next")}</AutomationButton>
    </View>}
  </ScrollView>;
}
