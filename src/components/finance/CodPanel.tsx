import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useLanguage } from "../../contexts/LanguageContext";
import { confirmCod, getCod, type CodRecord } from "../../services/cod";
export default function CodPanel({ deliveryId, deliveryStatus, role }: { deliveryId: number; deliveryStatus: string; role: "merchant" | "driver" }) {
  const { language, t } = useLanguage();
  const [record, setRecord] = useState<CodRecord | null>(null);
  const [error, setError] = useState(false);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(false);
  const request = useRef<AbortController | null>(null);
  const align = { textAlign: language === "ar" ? "right" as const : "left" as const };
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    try { const result = await getCod(deliveryId, controller.signal); if (!controller.signal.aborted) { setRecord(result); setError(false); setChecked(false); } }
    catch { if (!controller.signal.aborted) setError(true); }
  }, [deliveryId]);
  useFocusEffect(useCallback(() => {
    mounted.current = true; setBusy(lock.current); void load();
    return () => { mounted.current = false; request.current?.abort(); };
  }, [load]));
  const action = role === "driver" && record?.status === "expected" && ["delivered", "completed"].includes(deliveryStatus) ? "collect" : role === "merchant" && record?.status === "collected" ? "receive" : null;
  const confirm = async () => {
    if (!action || !checked || lock.current) return;
    lock.current = true; setBusy(true); setError(false); request.current?.abort();
    try { const result = await confirmCod(deliveryId, action); if (mounted.current) { request.current?.abort(); setRecord(result); setChecked(false); } }
    catch { if (mounted.current) setError(true); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  if (!record && !error) return null;
  const status = record?.status;
  const statusText = status === "expected" ? t("بانتظار التحصيل", "Awaiting collection") : status === "collected" ? t("أكد السائق التحصيل — بانتظار استلام التاجر", "Driver confirmed collection — awaiting merchant receipt") : status === "received" ? t("أكد التاجر استلام المبلغ", "Merchant confirmed receipt") : t("ملغي", "Cancelled");
  return <View style={s.card}>
    <Text style={[s.title, align]}>{t("الدفع عند الاستلام — قيمة البضاعة", "Cash on delivery — goods value")}</Text>
    {record && <>
      <Text style={[s.amount, align]}>{new Intl.NumberFormat(language === "ar" ? "ar-AE" : "en-AE", { style: "currency", currency: record.currency }).format(Number(record.expected_amount))}</Text>
      <Text style={[s.note, align]}>{statusText}</Text>
      <Text style={[s.note, align]}>{t("هذا المبلغ منفصل عن رسوم التوصيل والعمولة. التأكيد هنا يسجل استلام النقد فقط ولا ينفّذ تحويلًا ماليًا.", "This amount is separate from delivery fees and commission. Confirmation records cash receipt; it does not execute a transfer.")}</Text>
      {[ [record.collected_at, t("وقت تأكيد السائق", "Driver confirmation time")], [record.received_at, t("وقت تأكيد التاجر", "Merchant confirmation time")] ].map(([value, label]) => value && Number.isFinite(Date.parse(value)) ? <Text key={label} style={[s.note, align]}>{label}: {new Intl.DateTimeFormat(language === "ar" ? "ar-AE" : "en-AE", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Dubai" }).format(new Date(value))}</Text> : null)}
      {role === "driver" && status === "expected" && !action && <Text style={[s.note, align]}>{t("يمكن تأكيد التحصيل بعد تسجيل إثبات التسليم.", "Collection can be confirmed after recording delivery proof.")}</Text>}
    </>}
    {error && <Text accessibilityRole="alert" style={[s.error, align]}>{t("تعذر تحديث سجل التحصيل. حدّث البيانات وتحقق من إثبات التسليم وحالة الطلب.", "Could not update cash collection. Refresh and check delivery proof and order status.")}</Text>}
    {action && <>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled: busy }} disabled={busy} style={[s.checkbox, { flexDirection: language === "ar" ? "row-reverse" : "row" }]} onPress={() => setChecked(!checked)}><Ionicons name={checked ? "checkbox" : "square-outline"} size={24} color="#2563EB" /><Text style={[s.confirmText, align]}>{action === "collect" ? t("أؤكد أنني استلمت كامل مبلغ البضاعة نقدًا من المستلم.", "I confirm I received the full goods amount in cash from the recipient.") : t("أؤكد أنني استلمت كامل المبلغ المحصّل من السائق.", "I confirm I received the full collected amount from the driver.")}</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={busy || !checked} style={[s.button, (busy || !checked) && s.disabled]} onPress={() => void confirm()}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.buttonText}>{action === "collect" ? t("تسجيل التحصيل الفعلي", "Record actual cash collection") : t("تأكيد استلام المبلغ", "Confirm money received")}</Text>}</Pressable>
    </>}
    <Pressable accessibilityRole="button" disabled={busy} style={s.refresh} onPress={() => void load()}><Text style={s.link}>{t("تحديث سجل التحصيل", "Refresh cash record")}</Text></Pressable>
  </View>;
}
const s = StyleSheet.create({ card: { padding: 20, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 20, gap: 14 }, title: { color: "#0B1730", fontWeight: "800", fontSize: 18 }, amount: { color: "#0B1730", fontWeight: "800", fontSize: 26 }, note: { color: "#475569", lineHeight: 23 }, error: { color: "#B91C1C", lineHeight: 23 }, checkbox: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12 }, confirmText: { flex: 1, color: "#334155", lineHeight: 23 }, button: { minHeight: 50, padding: 12, borderRadius: 12, backgroundColor: "#2563EB", justifyContent: "center", alignItems: "center" }, buttonText: { color: "#FFFFFF", fontWeight: "800", textAlign: "center" }, disabled: { opacity: 0.5 }, refresh: { minHeight: 44, alignItems: "center", justifyContent: "center" }, link: { color: "#2563EB", fontWeight: "700" } });
