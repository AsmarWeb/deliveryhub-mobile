import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../../contexts/LanguageContext";
import { getFinance, type FinancePage } from "../../services/finance";

export default function MerchantFinanceScreen() {
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [result, setResult] = useState<FinancePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const request = useRef<AbortController | null>(null);
  const align = { textAlign: ar ? "right" as const : "left" as const };
  const row = { flexDirection: ar ? "row-reverse" as const : "row" as const };
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setError(false); setResult(null);
    try {
      const data = await getFinance(page, filter, controller.signal);
      if (!controller.signal.aborted) setResult(data);
    } catch { if (!controller.signal.aborted) setError(true); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [page, filter]);
  useFocusEffect(useCallback(() => { void load(); return () => request.current?.abort(); }, [load]));
  const money = (amount: string, currency: string) => {
    const value = Number(amount);
    if (!Number.isFinite(value)) return "—";
    try { return new Intl.NumberFormat(ar ? "ar-AE" : "en-AE", { style: "currency", currency }).format(value); }
    catch { return `${value.toFixed(2)} ${currency}`; }
  };
  const date = (value: string | null) => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(ar ? "ar-AE" : "en-AE", { dateStyle: "medium", timeZone: "Asia/Dubai" }).format(new Date(value)) : "—";
  const statusLabel = (value: string) => ({ completed: t("مكتمل", "Completed"), cancelled: t("ملغي", "Cancelled"), priced: t("تم التسعير", "Priced"), matching: t("جارٍ البحث عن سائق", "Matching"), delivered: t("تم التسليم", "Delivered"), pickup_failed: t("تعذر الاستلام", "Pickup failed"), delivery_failed: t("تعذر التوصيل", "Delivery failed"), rescheduled: t("أُعيدت الجدولة", "Rescheduled"), expired: t("انتهت المهلة", "Expired"), draft: t("مسودة", "Draft"), assigned: t("تم الإسناد", "Assigned"), accepted: t("مقبول", "Accepted"), pickup: t("تم الاستلام", "Picked up"), in_transit: t("قيد التوصيل", "In transit"), pending_pricing: t("بانتظار التسعير", "Awaiting pricing") }[value] ?? value);
  return <ScrollView style={s.root} contentContainerStyle={[s.body, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}>
    <View style={[s.header, row]}><Pressable accessibilityRole="button" accessibilityLabel={t("رجوع", "Back")} style={s.touch} onPress={() => router.canGoBack() ? router.back() : router.replace("/merchant/wallet")}><Ionicons name={ar ? "arrow-forward" : "arrow-back"} size={24} color="#123D35" /></Pressable><Text style={s.title}>{t("رسوم التوصيل والعمولات", "Delivery fees & commissions")}</Text></View>
    <Text style={[s.note, align]}>{t("يعرض السجل الطلبات التي تم تسعيرها، بما فيها الملغاة. الرسوم المعروضة لا تؤكد تحصيل الأموال أو تسويتها. فواتير اشتراك Stripe منفصلة عنها.", "This ledger lists priced deliveries, including cancellations. Listed fees do not confirm payment collection or settlement. Stripe subscription invoices are separate.")}</Text>
    <View style={[s.filters, row]}>{[["", t("الكل", "All")], ["completed", t("مكتملة", "Completed")], ["cancelled", t("ملغاة", "Cancelled")]].map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} style={[s.chip, filter === value && s.selected]} onPress={() => { setPage(1); setFilter(value); }}><Text style={{ color: filter === value ? "#FFFFFF" : "#334155" }}>{label}</Text></Pressable>)}</View>
    {loading && <ActivityIndicator color="#17634F" />}
    {error && <View style={s.card}><Text accessibilityRole="alert" style={[s.error, align]}>{t("تعذر تحميل السجل.", "Could not load the ledger.")}</Text><Pressable accessibilityRole="button" style={s.touch} onPress={() => void load()}><Text style={s.link}>{t("إعادة المحاولة", "Retry")}</Text></Pressable></View>}
    {result && <>
      <Text style={[s.note, align]}>{t("عدد الطلبات المطابقة", "Matching deliveries")}: {result.meta.total}</Text>
      {result.data.length === 0 && <View style={s.card}><Text style={[s.note, align]}>{t("لا توجد طلبات مسعّرة تطابق هذا الاختيار بعد.", "No priced deliveries match this selection yet.")}</Text></View>}
      {result.data.map(item => <View key={item.id} style={s.card}>
        <View style={[s.header, row]}><Text selectable style={s.tracking}>{item.tracking_number}</Text><Text style={s.note}>{statusLabel(item.status)}</Text></View>
        <Text style={[s.note, align]}>{t("تاريخ الإنشاء", "Created")}: {date(item.created_at)}</Text>
        <Text style={[s.amount, align]}>{t("رسوم التوصيل المسجّلة", "Recorded delivery fee")}: {money(item.delivery_fee, item.currency)}</Text>
        {item.cod_record && <Text style={[s.note, align]}>{t("قيمة البضاعة عند الاستلام", "Goods cash on delivery")}: {money(item.cod_record.expected_amount, item.cod_record.currency)} — {item.cod_record.status === "expected" ? t("بانتظار التحصيل", "Awaiting collection") : item.cod_record.status === "collected" ? t("أكد السائق التحصيل", "Driver confirmed collection") : item.cod_record.status === "received" ? t("أكد التاجر الاستلام", "Merchant confirmed receipt") : t("ملغي", "Cancelled")}</Text>}
        {item.commission ? <>
          <Text style={[s.note, align]}>{t("حصة المنصة", "Platform share")}: {money(item.commission.platform_amount, item.commission.currency)} ({item.commission.commission_rate}%)</Text>
          <Text style={[s.note, align]}>{t("حصة شريك التوصيل", "Delivery partner share")}: {money(item.commission.partner_amount, item.commission.currency)}</Text>
          <Text style={[s.note, align]}>{t("حالة سجل العمولة", "Commission record status")}: {item.commission.status === "pending" ? t("معلّقة", "Pending") : item.commission.status === "earned" ? t("مكتسبة — لا تؤكد الدفع", "Earned — payment not confirmed") : item.commission.status === "cancelled" ? t("ملغاة", "Cancelled") : item.commission.status}</Text>
        </> : <Text style={[s.note, align]}>{t("لم تُسجّل عمولة لهذا الطلب بعد.", "No commission has been recorded for this delivery yet.")}</Text>}
        <Pressable accessibilityRole="button" style={s.touch} onPress={() => router.push({ pathname: "/merchant/deliveries/[id]", params: { id: String(item.id) } })}><Text style={s.link}>{t("تفاصيل الطلب", "Delivery details")}</Text></Pressable>
      </View>)}
      <View style={[s.header, row]}><Pressable accessibilityRole="button" disabled={page <= 1} style={[s.touch, page <= 1 && s.disabled]} onPress={() => setPage(value => value - 1)}><Text style={s.link}>{t("السابق", "Previous")}</Text></Pressable><Text style={s.note}>{result.meta.current_page} / {result.meta.last_page}</Text><Pressable accessibilityRole="button" disabled={page >= result.meta.last_page} style={[s.touch, page >= result.meta.last_page && s.disabled]} onPress={() => setPage(value => value + 1)}><Text style={s.link}>{t("التالي", "Next")}</Text></Pressable></View>
    </>}
  </ScrollView>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: "#F6F3EB" }, body: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 20, gap: 16 }, header: { alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }, title: { color: "#123D35", fontSize: 23, fontWeight: "800", flexShrink: 1 }, touch: { minHeight: 44, minWidth: 44, padding: 10, justifyContent: "center", alignItems: "center" }, note: { color: "#475569", lineHeight: 23, fontSize: 14 }, filters: { flexWrap: "wrap", gap: 8 }, chip: { paddingHorizontal: 18, minHeight: 44, justifyContent: "center", borderRadius: 14, backgroundColor: "#DDDED2" }, selected: { backgroundColor: "#17634F" }, card: { padding: 20, backgroundColor: "white", borderRadius: 20, borderWidth: 1, borderColor: "#DDDED2", gap: 12 }, tracking: { color: "#123D35", fontWeight: "800", fontSize: 16 }, amount: { color: "#123D35", fontWeight: "700", fontSize: 17 }, link: { color: "#17634F", fontWeight: "700" }, error: { color: "#B91C1C" }, disabled: { opacity: 0.4 } });
