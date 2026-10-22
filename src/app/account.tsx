import { Ionicons } from "@expo/vector-icons";
import { isAxiosError } from "axios";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../contexts/LanguageContext";
import { getAccount, saveAccount, type AccountProfile } from "../services/account";
import { registrationError } from "../services/registration";
import { normalizeContactPhone } from "../utils/phone";

export default function AccountScreen() {
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const insets = useSafeAreaInsets();
  const [account, setAccount] = useState<AccountProfile | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(false);
  const align = { textAlign: ar ? "right" as const : "left" as const };
  const apply = (profile: AccountProfile) => {
    setAccount(profile);
    setForm({ name: profile.name, ...Object.fromEntries(Object.entries(profile.details).map(([key, value]) => [key, value ?? ""])) });
  };
  useFocusEffect(useCallback(() => {
    mounted.current = true;
    const controller = new AbortController();
    setLoading(true);
    getAccount(controller.signal).then(profile => { if (!controller.signal.aborted) { apply(profile); setError(null); } })
      .catch(error => {
        if (controller.signal.aborted) return;
        if (isAxiosError(error) && error.response?.status === 401) { router.replace("/login"); return; }
        setError(registrationError(error, language === "ar"));
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { mounted.current = false; controller.abort(); };
  }, [language]));
  const labels: Record<string, [string, string]> = {
    name: ["الاسم الكامل", "Full name"], business_name: ["اسم المتجر أو الشركة", "Store or company name"],
    business_phone: ["هاتف النشاط", "Business phone"], business_email: ["البريد التجاري (اختياري)", "Business email (optional)"],
    trade_license_number: ["رقم الرخصة التجارية (اختياري)", "Trade licence number (optional)"], tax_number: ["الرقم الضريبي (اختياري)", "Tax number (optional)"],
    phone: ["رقم الهاتف", "Phone number"], vehicle_type: ["نوع المركبة", "Vehicle type"], vehicle_plate: ["الإمارة ورمز ورقم اللوحة", "Plate emirate, code and number"], license_number: ["رقم رخصة القيادة", "Driving licence number"],
  };
  const submit = async () => {
    if (lock.current || !account) return;
    const data: Record<string, string | null> = { name: form.name?.trim() ?? "" };
    if (!data.name) { setError(t("الاسم مطلوب.", "Name is required.")); return; }
    if (account.details_editable) {
      for (const key of Object.keys(account.details)) data[key] = form[key]?.trim() || null;
      const key = account.type === "merchant" ? "business_phone" : "phone";
      const phone = normalizeContactPhone(form[key] ?? "");
      if (!phone?.startsWith("+971")) { setError(t("أدخل رقم هاتف إماراتيًا صحيحًا.", "Enter a valid UAE phone number.")); return; }
      data[key] = phone;
    }
    lock.current = true; setBusy(true); setError(null); setSaved(false);
    try { const profile = await saveAccount(data); if (mounted.current) { apply(profile); setSaved(true); } }
    catch (error) { if (mounted.current) setError(registrationError(error, ar)); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  return <ScrollView style={s.root} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.body, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 30 }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={t("رجوع", "Back")} style={s.back} disabled={busy} onPress={() => router.canGoBack() ? router.back() : router.replace("/registration-status")}><Ionicons name={ar ? "arrow-forward" : "arrow-back"} size={24} color="#123D35" /></Pressable>
    <Text style={[s.title, align]}>{t("بيانات حسابك", "Your account details")}</Text>
    <Text style={[s.subtitle, align]}>{t("أكمل بياناتك هنا. اكتمال البيانات لا يعني تفعيل الحساب؛ الطلب يخضع لمراجعة الإدارة.", "Complete your details here. Completing your profile does not activate service access; approval is required.")}</Text>
    {loading && <ActivityIndicator color="#17634F" />}
    {error && <Text accessibilityRole="alert" style={[s.error, align]}>{error}</Text>}
    {saved && <Text accessibilityRole="alert" style={[s.success, align]}>{t("تم حفظ البيانات.", "Details saved.")}</Text>}
    {account && !loading && <>
      <View style={s.notice}><Text style={[s.label, align]}>{account.missing_fields.length ? t("بيانات مطلوبة لاستكمال الطلب", "Details needed to complete your application") : t("البيانات الأساسية مكتملة", "Essential details complete")}</Text>
        {account.missing_fields.map(key => <Text key={key} style={[s.subtitle, align]}>{labels[key]?.[ar ? 0 : 1] ?? key}</Text>)}
        {!account.details_editable && <Text style={[s.subtitle, align]}>{t("لتعديل بيانات النشاط أو المركبة بعد المراجعة، تواصل مع الإدارة.", "Contact the administrator to change reviewed business or vehicle details.")}</Text>}
      </View>
      <View style={s.card}>
        <Text style={[s.subtitle, align]}>{account.email}</Text>
        {Object.keys(form).map(key => <View key={key} style={s.field}>
          <Text style={[s.label, align]}>{labels[key]?.[ar ? 0 : 1] ?? key}</Text>
          <TextInput accessibilityLabel={labels[key]?.[ar ? 0 : 1] ?? key} style={[s.input, align, (busy || (key !== "name" && !account.details_editable)) && s.disabled]} value={form[key]} onChangeText={value => { setForm(previous => ({ ...previous, [key]: value })); setSaved(false); }} editable={!busy && (key === "name" || account.details_editable)} keyboardType={key.includes("phone") ? "phone-pad" : key.includes("email") ? "email-address" : "default"} autoCapitalize={key.includes("email") ? "none" : "words"} maxLength={key.startsWith("vehicle") || key === "license_number" ? 100 : 255} />
        </View>)}
        <Pressable accessibilityRole="button" disabled={busy} style={[s.button, busy && s.disabled]} onPress={() => void submit()}>{busy ? <ActivityIndicator color="white" /> : <Text style={s.buttonText}>{t("حفظ البيانات", "Save details")}</Text>}</Pressable>
      </View>
    </>}
  </ScrollView>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: "#F6F3EB" }, body: { width: "100%", maxWidth: 600, alignSelf: "center", paddingHorizontal: 22, gap: 16 }, back: { minHeight: 44, minWidth: 44, justifyContent: "center" }, title: { color: "#123D35", fontWeight: "800", fontSize: 27 }, subtitle: { color: "#475569", lineHeight: 23 }, card: { backgroundColor: "white", padding: 20, borderRadius: 20, borderWidth: 1, borderColor: "#DDDED2", gap: 18 }, field: { gap: 8 }, label: { color: "#334155", fontWeight: "700" }, input: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, padding: 13, minHeight: 50, fontSize: 16, color: "#123D35" }, disabled: { opacity: 0.55 }, notice: { backgroundColor: "#D9E5D6", padding: 18, borderRadius: 16, gap: 8 }, error: { color: "#B91C1C", lineHeight: 23 }, success: { color: "#047857" }, button: { minHeight: 52, backgroundColor: "#17634F", justifyContent: "center", alignItems: "center", borderRadius: 14 }, buttonText: { color: "white", fontWeight: "800", fontSize: 16 } });
