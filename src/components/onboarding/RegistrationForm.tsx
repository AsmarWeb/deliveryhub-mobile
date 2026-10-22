import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../../contexts/LanguageContext";
import { registerDriver, registerMerchant, registrationError } from "../../services/registration";
import { normalizeContactPhone } from "../../utils/phone";

export default function RegistrationForm({ type }: { type: "merchant" | "driver" }) {
  const { language, setLanguage, t } = useLanguage();
  const ar = language === "ar";
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({ name: "", email: "", phone: "", business_name: "", password: "" });
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const align = { textAlign: ar ? "right" as const : "left" as const };
  const fields: { key: keyof typeof form; label: string; hint?: string }[] = [
    { key: "name", label: t("الاسم الكامل", "Full name") },
    ...(type === "merchant" ? [{ key: "business_name" as const, label: t("اسم المتجر أو الشركة", "Store or company name") }] : []),
    { key: "email", label: t("البريد الإلكتروني", "Email address") },
    { key: "phone", label: t("رقم الهاتف الإماراتي", "UAE phone number"), hint: "0501234567 / +971501234567" },
    { key: "password", label: t("كلمة المرور", "Password"), hint: t("8 أحرف على الأقل", "At least 8 characters") },
  ];
  const submit = async () => {
    if (lock.current) return;
    const phone = normalizeContactPhone(form.phone);
    if (!form.name.trim() || !form.email.trim() || (type === "merchant" && !form.business_name.trim())) {
      setError(t("أكمل الحقول المطلوبة.", "Complete the required fields.")); return;
    }
    if (!phone?.startsWith("+971")) { setError(t("أدخل رقم هاتف إماراتيًا صحيحًا.", "Enter a valid UAE phone number.")); return; }
    if (form.password.length < 8) { setError(t("كلمة المرور يجب أن تكون 8 أحرف على الأقل.", "Use a password of at least 8 characters.")); return; }
    lock.current = true; setBusy(true); setError(null);
    try {
      const common = { name: form.name.trim(), email: form.email.trim().toLowerCase(), password: form.password, password_confirmation: form.password };
      if (type === "merchant") await registerMerchant({ ...common, business_name: form.business_name.trim(), business_phone: phone });
      else await registerDriver({ ...common, phone });
      setForm({ name: "", email: "", phone: "", business_name: "", password: "" });
      setDone(true);
    } catch (error) { setError(registrationError(error, ar)); }
    finally { lock.current = false; setBusy(false); }
  };
  return <ScrollView style={s.root} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.body, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 30 }]}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel={t("رجوع", "Back")} style={s.touch} disabled={busy} onPress={() => router.canGoBack() ? router.back() : router.replace("/register")}><Ionicons name={ar ? "arrow-forward" : "arrow-back"} size={24} color="#123D35" /></Pressable><Text style={s.brand}>{t("رسلو · الإمارات", "Raslo · UAE")}</Text><Pressable accessibilityRole="button" style={s.touch} onPress={() => void setLanguage(ar ? "en" : "ar")}><Text style={s.link}>{ar ? "EN" : "عربي"}</Text></Pressable></View>
    <View style={s.symbol}><Ionicons name={type === "merchant" ? "storefront-outline" : "bicycle-outline"} size={32} color="#17634F" /></View>
    <Text style={[s.title, align]}>{done ? t("تم إنشاء حسابك", "Your account is created") : type === "merchant" ? t("ابدأ كتاجر", "Join as a merchant") : t("انضم كشريك توصيل", "Join as a delivery partner")}</Text>
    <Text style={[s.subtitle, align]}>{done ? t("سجّل الدخول لإكمال بيانات حسابك ومتابعة المراجعة. تشغيل الخدمة يتطلب موافقة الإدارة.", "Sign in to complete your account and follow the review. Service access requires approval.") : t("ابدأ بالأساسيات، وأكمل بقية البيانات من حسابك.", "Start with the essentials. Complete the rest from your account.")}</Text>
    {!done && <View style={s.card}>
      {fields.map(({ key, label, hint }) => <View key={key} style={s.field}>
        <Text style={[s.label, align]}>{label}</Text>
        <View style={s.inputRow}><TextInput accessibilityLabel={label} style={[s.input, key === "phone" || key === "email" ? { textAlign: "left", writingDirection: "ltr" } : align]} value={form[key]} onChangeText={value => setForm(previous => ({ ...previous, [key]: value }))} editable={!busy} secureTextEntry={key === "password" && !visible} autoCapitalize={key === "email" || key === "password" ? "none" : "words"} autoCorrect={key !== "email" && key !== "password"} keyboardType={key === "email" ? "email-address" : key === "phone" ? "phone-pad" : "default"} autoComplete={key === "password" ? "new-password" : key === "email" ? "email" : key === "phone" ? "tel" : key === "name" ? "name" : "off"} maxLength={key === "phone" ? 25 : 255} />
          {key === "password" && <Pressable accessibilityRole="button" accessibilityLabel={visible ? t("إخفاء كلمة المرور", "Hide password") : t("إظهار كلمة المرور", "Show password")} onPress={() => setVisible(!visible)} style={s.touch}><Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={22} color="#62726B" /></Pressable>}
        </View>{hint && <Text style={[s.hint, align]}>{hint}</Text>}
      </View>)}
      {error && <Text accessibilityRole="alert" style={[s.error, align]}>{error}</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} disabled={busy} onPress={() => void submit()} style={[s.button, busy && s.disabled]}>{busy ? <ActivityIndicator color="white" /> : <Text style={s.buttonText}>{t("إنشاء الحساب", "Create account")}</Text>}</Pressable>
      <Text style={[s.hint, align]}>{type === "driver" ? t("بيانات المركبة والرخصة تُستكمل داخل الحساب قبل الموافقة.", "Complete vehicle and licence details in your account before approval.") : t("يمكنك إضافة البريد التجاري والرخصة والرقم الضريبي داخل الحساب.", "Add business email, trade licence and tax number in your account.")}</Text>
    </View>}
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => router.replace("/login")} style={s.touch}><Text style={s.signin}>{done ? t("تسجيل الدخول وإكمال الحساب", "Sign in & complete account") : t("لديك حساب؟ تسجيل الدخول", "Already registered? Sign in")}</Text></Pressable>
  </ScrollView>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F3EB" }, body: { width: "100%", maxWidth: 540, alignSelf: "center", paddingHorizontal: 22, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, touch: { minHeight: 44, minWidth: 44, justifyContent: "center", alignItems: "center" },
  brand: { color: "#123D35", fontWeight: "800", fontSize: 17 }, link: { color: "#17634F", fontWeight: "700" }, symbol: { width: 64, height: 64, borderRadius: 20, backgroundColor: "#D9E5D6", justifyContent: "center", alignItems: "center" },
  title: { fontSize: 29, fontWeight: "800", color: "#123D35" }, subtitle: { color: "#475569", lineHeight: 24, fontSize: 15 },
  card: { backgroundColor: "white", borderRadius: 22, padding: 20, borderWidth: 1, borderColor: "#DDDED2", gap: 18 }, field: { gap: 8 }, label: { color: "#334155", fontWeight: "700", fontSize: 14 },
  inputRow: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, flexDirection: "row", alignItems: "center" }, input: { flex: 1, minWidth: 0, minHeight: 50, padding: 12, fontSize: 16, color: "#123D35" },
  hint: { color: "#62726B", fontSize: 12, lineHeight: 20 }, error: { color: "#B91C1C", lineHeight: 22 }, button: { backgroundColor: "#17634F", borderRadius: 14, minHeight: 52, alignItems: "center", justifyContent: "center" }, buttonText: { color: "white", fontWeight: "800", fontSize: 16 }, disabled: { opacity: 0.6 }, signin: { color: "#17634F", fontWeight: "700", textAlign: "center" },
});
