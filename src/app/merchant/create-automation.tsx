import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { AutomationButton, AutomationHeader, s } from "../../components/automations/AutomationUI";
import { useLanguage } from "../../contexts/LanguageContext";
import { automationError, createAutomation } from "../../services/automations";
import { getMerchantAddresses, type MerchantAddress } from "../../services/deliveries";

export default function CreateAutomationScreen() {
  const { t, isArabic } = useLanguage();
  const [addresses, setAddresses] = useState<MerchantAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [addressError, setAddressError] = useState(false);
  const [pickup, setPickup] = useState<number | null>(null);
  const [dropoff, setDropoff] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [day, setDay] = useState(0);
  const [time, setTime] = useState("13:00");
  const [timezone, setTimezone] = useState("Asia/Dubai");
  const [packageType, setPackageType] = useState("");
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [validation, setValidation] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const sending = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void getMerchantAddresses().then(data => {
      if (active) { setAddresses(data); setAddressError(false); }
    }).catch(() => { if (active) setAddressError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [retry]);

  const days = isArabic ? ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"] : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const numericWeight = weight.trim() ? Number(weight) : undefined;

  function valid() {
    if (!pickup || !dropoff || !name.trim() || !phone.trim()) return false;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time.trim())) return false;
    if (numericWeight !== undefined && (!Number.isFinite(numericWeight) || numericWeight < 0)) return false;
    try { new Intl.DateTimeFormat("en", { timeZone: timezone.trim() }).format(); }
    catch { return false; }
    return true;
  }

  async function save() {
    if (sending.current || saved) return;
    setValidation(true);
    if (!valid()) return;
    sending.current = true;
    setSaving(true);
    setError(null);
    try {
      await createAutomation({
        pickup_address_id: pickup!, dropoff_address_id: dropoff!,
        recipient_name: name.trim(), recipient_phone: phone.trim(),
        frequency, timezone: timezone.trim(), execution_time: time.trim(),
        ...(frequency === "weekly" ? { day_of_week: day } : {}),
        ...(packageType.trim() ? { package_type: packageType.trim() } : {}),
        ...(numericWeight !== undefined ? { weight: numericWeight } : {}),
        ...(notes.trim() ? { special_instructions: notes.trim() } : {}),
      });
      if (mounted.current) setSaved(true);
    } catch (cause) {
      if (mounted.current) setError(cause);
    } finally {
      sending.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  function addressChoices(title: string, selected: number | null, onSelect: (id: number) => void) {
    return <View style={s.card}>
      <Text style={s.label}>{title}</Text>
      {addresses.map(address => <Pressable key={address.id} accessibilityRole="radio"
        accessibilityState={{ checked: selected === address.id, disabled: saving }} disabled={saving}
        onPress={() => onSelect(address.id)} style={[s.choice, selected === address.id && s.selected]}>
        <Text style={s.label}>{selected === address.id ? "✓ " : ""}{address.label || address.city}</Text>
        <Text style={s.body}>{address.address_line}</Text>
      </Pressable>)}
    </View>;
  }

  if (saved) return <ScrollView style={s.root} contentContainerStyle={[s.content, { direction: isArabic ? "rtl" : "ltr" }]}>
    <AutomationHeader title={t("تم إنشاء الجدول", "Schedule created")} />
    <Text style={s.body}>{t("سيُنشئ الجدول مسودة في الموعد المحدد ما دام اشتراكك فعّالاً. راجع المسودة قبل متابعة التوصيل.", "Your schedule will create a draft at the scheduled time while your subscription remains valid. Review the draft before proceeding.")}</Text>
    <AutomationButton onPress={() => router.replace("/merchant/automations")}>{t("عرض الجداول", "View schedules")}</AutomationButton>
  </ScrollView>;

  return <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { direction: isArabic ? "rtl" : "ltr" }]}>
      <AutomationHeader title={t("جدول توصيل جديد", "New delivery schedule")} />
      <Text style={s.body}>{t("ستُنشأ مسودة في كل موعد. لا يتم اعتماد السعر أو إسناد السائق تلقائياً.", "A draft is created at each occurrence. Price approval and driver assignment remain manual.")}</Text>
      {loading ? <ActivityIndicator color="#17634F" /> : addressError ? <View style={s.card}>
        <Text style={s.error}>{t("تعذر تحميل العناوين.", "Unable to load addresses.")}</Text>
        <AutomationButton secondary onPress={() => { setLoading(true); setRetry(value => value + 1); }}>{t("إعادة المحاولة", "Retry")}</AutomationButton>
      </View> : addresses.length === 0 ? <View style={s.card}>
        <Text style={s.body}>{t("أضف عناوينك أولاً من شاشة إنشاء طلب توصيل، ثم عد لإنشاء الجدول.", "Add saved addresses from the delivery creation screen, then return here.")}</Text>
        <AutomationButton secondary onPress={() => router.push("/merchant/create-delivery")}>{t("إضافة العناوين", "Add addresses")}</AutomationButton>
      </View> : <>
        {addressChoices(t("عنوان الاستلام", "Pickup address"), pickup, setPickup)}
        {addressChoices(t("عنوان التسليم", "Drop-off address"), dropoff, setDropoff)}
        <View style={s.card}>
          <Text style={s.label}>{t("اسم المستلم", "Recipient name")}</Text>
          <TextInput accessibilityLabel={t("اسم المستلم", "Recipient name")} style={[s.input, { textAlign: isArabic ? "right" : "left" }]} value={name} onChangeText={setName} maxLength={255} editable={!saving} />
          <Text style={s.label}>{t("هاتف المستلم", "Recipient phone")}</Text>
          <TextInput accessibilityLabel={t("هاتف المستلم", "Recipient phone")} style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={30} editable={!saving} />
          <Text style={s.label}>{t("التكرار", "Frequency")}</Text>
          <View style={s.row}>{(["daily", "weekly"] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: frequency === value }} disabled={saving}
            onPress={() => setFrequency(value)} style={[s.choice, frequency === value && s.selected]}>
            <Text style={s.label}>{value === "daily" ? t("يومي", "Daily") : t("أسبوعي", "Weekly")}</Text>
          </Pressable>)}</View>
          {frequency === "weekly" && <View style={s.row}>{days.map((label, index) => <Pressable key={index} accessibilityRole="radio" accessibilityState={{ checked: day === index }} disabled={saving}
            onPress={() => setDay(index)} style={[s.choice, day === index && s.selected]}><Text style={s.label}>{label}</Text></Pressable>)}</View>}
          <Text style={s.label}>{t("وقت التنفيذ (24 ساعة)", "Execution time (24 hour)")}</Text>
          <TextInput accessibilityLabel={t("وقت التنفيذ", "Execution time")} style={s.input} placeholder="13:00" value={time} onChangeText={setTime} autoCapitalize="none" maxLength={5} editable={!saving} />
          <Text style={s.label}>{t("المنطقة الزمنية", "Time zone")}</Text>
          <TextInput accessibilityLabel={t("المنطقة الزمنية", "Time zone")} style={s.input} value={timezone} onChangeText={setTimezone} autoCapitalize="none" autoCorrect={false} editable={!saving} />
          <Text style={s.body}>{t("الوقت حسب المنطقة أعلاه، وليس حسب منطقة الهاتف.", "The execution time uses the zone above, not your phone's time zone.")}</Text>
          <Text style={s.label}>{t("نوع الطرد (اختياري)", "Package type (optional)")}</Text>
          <TextInput accessibilityLabel={t("نوع الطرد", "Package type")} style={s.input} value={packageType} onChangeText={setPackageType} maxLength={255} editable={!saving} />
          <Text style={s.label}>{t("الوزن بالكيلوغرام (اختياري)", "Weight in kg (optional)")}</Text>
          <TextInput accessibilityLabel={t("الوزن", "Weight")} style={s.input} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" editable={!saving} />
          <Text style={s.label}>{t("تعليمات (اختياري)", "Instructions (optional)")}</Text>
          <TextInput accessibilityLabel={t("تعليمات", "Instructions")} style={s.input} value={notes} onChangeText={setNotes} multiline editable={!saving} />
        </View>
        {validation && !valid() && <Text accessibilityRole="alert" style={s.error}>{t("اختر عنواني الاستلام والتسليم، وأكمل اسم المستلم وهاتفه. استخدم وقتاً مثل 13:00 ومنطقة مثل Asia/Dubai ووزناً غير سالب.", "Choose pickup and drop-off addresses and enter the recipient name and phone. Use a time such as 13:00, a zone such as Asia/Dubai, and a nonnegative weight.")}</Text>}
        {error !== null && <View style={s.card}>
          <Text accessibilityRole="alert" style={s.error}>{automationError(error, isArabic)}</Text>
          <AutomationButton secondary onPress={() => router.replace("/merchant/automations")}>{t("التحقق من الجداول", "Check schedules")}</AutomationButton>
          <AutomationButton secondary onPress={() => router.push("/merchant/subscription")}>{t("مراجعة الاشتراك", "Review subscription")}</AutomationButton>
        </View>}
        <AutomationButton disabled={saving} onPress={() => void save()}>{saving ? t("جارٍ الحفظ…", "Saving…") : t("إنشاء الجدول", "Create schedule")}</AutomationButton>
      </>}
    </ScrollView>
  </KeyboardAvoidingView>;
}
