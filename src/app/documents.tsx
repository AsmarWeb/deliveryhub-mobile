import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { isAxiosError } from "axios";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../contexts/LanguageContext";
import { getDriverDocuments, uploadDriverDocument, type DocumentAsset, type DriverDocument } from "../services/driverDocuments";
import { openDriverDocument } from "../services/openDriverDocument";
import { documentFileError, documentStatus, validDocumentExpiry } from "../utils/driverDocuments";
const icons: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  portrait: "person-outline", emirates_id_front: "id-card-outline", emirates_id_back: "id-card-outline", driving_license: "car-sport-outline", vehicle_registration: "document-text-outline", vehicle_insurance: "shield-checkmark-outline",
};
export default function DriverDocumentsScreen() {
  const { t, language } = useLanguage(); const ar = language === "ar"; const insets = useSafeAreaInsets();
  const [documents, setDocuments] = useState<DriverDocument[]>([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); const [success, setSuccess] = useState(false);
  const [selected, setSelected] = useState<string | null>(null); const [asset, setAsset] = useState<DocumentAsset | null>(null);
  const [expires, setExpires] = useState(""); const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0);
  const mounted = useRef(false); const lock = useRef(false);
  const align = { textAlign: ar ? "right" as const : "left" as const };
  const row = { flexDirection: ar ? "row-reverse" as const : "row" as const };
  const load = useCallback(async (signal?: AbortSignal) => {
    try { const data = await getDriverDocuments(signal); if (mounted.current && !signal?.aborted) { setDocuments(data); setError(""); } }
    catch (e) {
      if (!mounted.current || signal?.aborted) return;
      if (isAxiosError(e) && e.response?.status === 401) { router.replace("/login"); return; }
      setError(isAxiosError(e) && e.response?.status === 404 ? "driver" : "load");
    } finally { if (mounted.current && !signal?.aborted) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { mounted.current = true; const controller = new AbortController(); void load(controller.signal); return () => { mounted.current = false; controller.abort(); }; }, [load]));
  const choose = (document: DriverDocument) => { if (busy) return; setSelected(document.type); setAsset(null); setExpires(""); setError(""); setSuccess(false); };
  const accept = (value: DocumentAsset, portrait: boolean) => {
    const invalid = documentFileError(value.mime, value.size, portrait);
    if (invalid) { setError(invalid); return; } setAsset(value); setError("");
  };
  const pick = async (portrait: boolean) => {
    if (lock.current) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: portrait ? ["image/jpeg", "image/png", "image/webp"] : ["image/jpeg", "image/png", "image/webp", "application/pdf"], multiple: false, copyToCacheDirectory: true, base64: false });
      if (!result.canceled && mounted.current) { const file = result.assets[0]; accept({ uri: file.uri, name: file.name, mime: file.mimeType ?? "", size: file.size, file: file.file }, portrait); }
    } catch { if (mounted.current) setError("picker"); }
  };
  const camera = async (portrait: boolean) => {
    if (lock.current) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) { setError("permission"); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.85, allowsEditing: false, exif: false });
      if (!result.canceled && mounted.current) { const file = result.assets[0]; accept({ uri: file.uri, name: file.fileName ?? "document.jpg", mime: file.mimeType ?? "image/jpeg", size: file.fileSize, file: file.file }, portrait); }
    } catch { if (mounted.current) setError("picker"); }
  };
  const submit = async (document: DriverDocument) => {
    if (lock.current) return;
    if (!asset) { setError("file"); return; }
    if (document.expiry_required && !validDocumentExpiry(expires.trim())) { setError("expiry"); return; }
    lock.current = true; setBusy(true); setError(""); setProgress(0);
    try {
      const data = await uploadDriverDocument(document.type, asset, document.expiry_required ? expires.trim() : "", value => { if (mounted.current) setProgress(value); });
      if (mounted.current) { setDocuments(data); setSelected(null); setAsset(null); setSuccess(true); }
    } catch (e) {
      if (mounted.current) {
        if (isAxiosError(e) && e.response?.status === 401) { router.replace("/login"); return; }
        setError(isAxiosError(e) && e.response?.status === 413 ? "size" : "upload");
      }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  const open = async (document: DriverDocument) => {
    if (lock.current) return; lock.current = true; setBusy(true); setError("");
    try { await openDriverDocument(document); } catch { if (mounted.current) setError("preview"); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  };
  const messages: Record<string, string> = {
    load: t("تعذر تحميل المستندات. تحقق من اتصالك وأعد المحاولة.", "Could not load documents. Check your connection and retry."),
    driver: t("هذه الصفحة مخصصة لحسابات السائقين.", "This page is for driver accounts."),
    file: t("اختر ملفًا أولًا.", "Choose a file first."),
    type: t("اختر JPG أو PNG أو WebP أو PDF. الصورة الشخصية يجب أن تكون صورة.", "Choose JPG, PNG, WebP or PDF. Profile photos must be images."),
    size: t("الحد الأقصى لكل ملف 5MB.", "Each file must be 5MB or smaller."),
    expiry: t("أدخل تاريخ انتهاء صحيحًا اليوم أو بعده بصيغة YYYY-MM-DD.", "Enter an expiry date today or later in YYYY-MM-DD format."),
    permission: t("يلزم السماح بالكاميرا، أو يمكنك اختيار ملف.", "Allow camera access, or choose a file instead."),
    picker: t("تعذر فتح الملف أو الكاميرا. حاول اختيار ملف آخر.", "Could not open the file picker or camera. Try again."),
    upload: t("تعذر تأكيد الرفع. حدّث القائمة قبل المحاولة مجددًا، وتحقق من الملف وتاريخ الانتهاء.", "Could not confirm upload. Refresh before retrying, and check the file and expiry date."),
    preview: t("تعذر فتح المستند. تحقق من اتصالك ووجود تطبيق مناسب لفتحه.", "Could not open the document. Check your connection and an app that can open it."),
  };
  const approved = documents.filter(document => document.status === "approved").length;
  return <ScrollView style={s.root} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.body, { paddingBottom: insets.bottom + 35 }]} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { if (!busy) { setLoading(true); void load(); } }} tintColor="#17634F" />}>
    <LinearGradient colors={["#123D35", "#205A48"]} style={[s.hero, { paddingTop: insets.top + 14 }]}>
      <View style={[s.top, row]}><Pressable accessibilityRole="button" accessibilityLabel={t("رجوع", "Back")} disabled={busy} style={s.back} onPress={() => router.canGoBack() ? router.back() : router.replace("/registration-status")}><Ionicons name={ar ? "arrow-forward" : "arrow-back"} size={22} color="white" /></Pressable><Text style={s.wordmark}>{t("رسلو", "Raslo")}</Text></View>
      <View style={[s.top, row]}><View style={s.heroIcon}><Ionicons name="shield-checkmark-outline" size={29} color="#D9B875" /></View><Text style={s.private}>{t("ملفك الخاص", "YOUR PRIVATE FILE")}</Text></View>
      <Text style={[s.title, align]}>{t("مستنداتي", "My documents")}</Text><Text style={[s.heroCopy, align]}>{t("خطوة بخطوة، ملفك جاهز للطريق.", "One step closer to the road.")}</Text>
      <View style={[s.progressHeading, row]}><Text style={s.progressText}>{t("مستندات معتمدة", "Documents approved")}</Text><Text style={s.progressText}>{approved} / {documents.length || 6}</Text></View><View style={s.track}><View style={[s.fill, { width: `${approved / (documents.length || 6) * 100}%`, alignSelf: ar ? "flex-end" : "flex-start" }]} /></View>
    </LinearGradient>
    <View style={s.content}>
      <View style={[s.notice, row]}><Ionicons name="lock-closed-outline" size={20} color="#17634F" /><Text style={[s.noticeCopy, align]}>{t("تظهر مستنداتك لك وللإدارة المخولة فقط. قبول المستندات منفصل عن تفعيل حساب السائق.", "Your documents are visible to you and authorized admins. Document approval is separate from driver activation.")}</Text></View>
      {!!error && <View accessibilityRole="alert" style={s.error}><Text style={[s.errorText, align]}>{messages[error]}</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => void load()}><Text style={s.link}>{t("تحديث القائمة", "Refresh list")}</Text></Pressable></View>}
      {success && <Text accessibilityRole="alert" style={[s.success, align]}>{t("تم رفع المستند. ستظهر نتيجة المراجعة هنا.", "Document submitted. Review updates will appear here.")}</Text>}
      {loading && documents.length === 0 && <ActivityIndicator style={s.loading} color="#17634F" />}
      <View style={[s.sectionRow, row]}><Text style={s.section}>{t("ملف السائق والمركبة", "Driver & vehicle file")}</Text><Text style={s.fileHint}>JPG · PNG · WebP · PDF</Text></View>
      {documents.map((document, index) => {
        const [statusAr, statusEn, color, background] = documentStatus(document.status); const editing = selected === document.type;
        return <View key={document.type} style={[s.card, editing && s.activeCard]}>
          <View style={[s.cardTop, row]}><View style={s.docIcon}><Ionicons name={icons[document.type] ?? "document-outline"} size={24} color="#17634F" /></View><View style={s.flex}><Text style={[s.number, align]}>{String(index + 1).padStart(2, "0")} / RASLO</Text><Text style={[s.docTitle, align]}>{document[ar ? "label_ar" : "label_en"]}</Text></View></View>
          <View style={[s.cardMeta, row]}><View style={[s.status, { backgroundColor: background }]}><Text style={[s.statusText, { color }]}>{ar ? statusAr : statusEn}</Text></View>{document.expires_on && <Text style={[s.expiry, align]}>{t("ينتهي: ", "Expires: ")}{document.expires_on}</Text>}</View>
          {!!document.rejection_reason && <Text style={[s.reason, align]}>{document.rejection_reason}</Text>}
          {!editing ? <View style={[s.actions, row]}><Pressable accessibilityRole="button" accessibilityLabel={document.id ? t("تحديث المستند", "Replace document") : t("رفع المستند", "Upload document")} disabled={busy} onPress={() => choose(document)} style={s.uploadButton}><Ionicons name={document.id ? "refresh-outline" : "add-outline"} size={18} color="#17634F" /><Text style={s.uploadText}>{document.id ? t("تحديث المستند", "Replace document") : t("رفع المستند", "Upload document")}</Text></Pressable>{document.id && <Pressable accessibilityRole="button" disabled={busy} onPress={() => void open(document)} style={s.viewButton}><Text style={s.link}>{t("فتح / حفظ", "Open / save")}</Text></Pressable>}</View> : <View style={s.form}>
            {!!error && <Text accessibilityRole="alert" style={[s.errorText, align]}>{messages[error]}</Text>}
            <Text style={[s.formCopy, align]}>{t("صورة واضحة كاملة الحواف، بحد أقصى 5MB. رفع البديل يعيد المستند للمراجعة.", "Use a clear, complete image, up to 5MB. Replacements return to review.")}</Text>
            <View style={[s.actions, row]}><Pressable accessibilityRole="button" accessibilityLabel={t("اختيار ملف", "Choose file")} disabled={busy} onPress={() => void pick(document.type === "portrait")} style={s.picker}><Ionicons name="folder-open-outline" size={20} color="#17634F" /><Text style={s.uploadText}>{t("اختيار ملف", "Choose file")}</Text></Pressable>{Platform.OS !== "web" && <Pressable accessibilityRole="button" accessibilityLabel={t("الكاميرا", "Camera")} disabled={busy} onPress={() => void camera(document.type === "portrait")} style={s.picker}><Ionicons name="camera-outline" size={20} color="#17634F" /><Text style={s.uploadText}>{t("الكاميرا", "Camera")}</Text></Pressable>}</View>
            {asset && <View style={s.selection}>{asset.mime.startsWith("image/") && <Image source={{ uri: asset.uri }} style={s.preview} resizeMode="contain" accessibilityLabel={t("معاينة الملف المحدد", "Selected file preview")} />}<Text numberOfLines={2} style={[s.selectedName, align]}>{asset.name}</Text></View>}
            {document.expiry_required && <><Text style={[s.fieldLabel, align]}>{t("تاريخ الانتهاء", "Expiry date")}</Text><TextInput accessibilityLabel={t("تاريخ الانتهاء بصيغة سنة-شهر-يوم", "Expiry date YYYY-MM-DD")} value={expires} onChangeText={setExpires} editable={!busy} placeholder="YYYY-MM-DD" placeholderTextColor="#7C897E" autoCapitalize="none" keyboardType="numbers-and-punctuation" maxLength={10} style={s.input} /><Text style={[s.formCopy, align]}>{t("مثال: 2028-12-31", "Example: 2028-12-31")}</Text></>}
            <Pressable accessibilityRole="button" disabled={busy || !asset} onPress={() => void submit(document)} style={[s.submit, (busy || !asset) && s.disabled]}>{busy ? <><ActivityIndicator color="white" /><Text style={s.submitText}>{progress < 100 ? `${progress}%` : t("جارٍ الحفظ…", "Saving…")}</Text></> : <Text style={s.submitText}>{t("إرسال للمراجعة", "Submit for review")}</Text>}</Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setSelected(null); setAsset(null); setError(""); }} style={s.cancel}><Text style={s.link}>{t("إلغاء", "Cancel")}</Text></Pressable>
          </View>}
        </View>;
      })}
      <View style={s.footer}><Ionicons name="shield-outline" size={24} color="#86621D" /><Text style={s.footerText}>{t("تنبيه قبل انتهاء المستندات بـ30 يومًا داخل حسابك.", "An in-account reminder 30 days before expiry.")}</Text></View>
    </View>
  </ScrollView>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F3EB" }, body: { width: "100%", maxWidth: 780, alignSelf: "center" }, flex: { flex: 1, minWidth: 0 },
  hero: { padding: 24, paddingBottom: 29, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }, top: { alignItems: "center", justifyContent: "space-between", marginBottom: 19, gap: 12 },
  back: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF12" }, wordmark: { color: "white", fontSize: 22, fontWeight: "900" },
  heroIcon: { width: 54, height: 54, borderRadius: 18, borderWidth: 1, borderColor: "#D9B87555", backgroundColor: "#FFFFFF09", alignItems: "center", justifyContent: "center" }, private: { color: "#D9B875", fontSize: 10, fontWeight: "800" },
  title: { color: "white", fontSize: 32, fontWeight: "900" }, heroCopy: { color: "#D7E4D9", lineHeight: 24, fontSize: 14, marginTop: 7 },
  progressHeading: { justifyContent: "space-between", marginTop: 25 }, progressText: { color: "#E8EDE2", fontSize: 11, fontWeight: "700" }, track: { height: 5, borderRadius: 5, backgroundColor: "#FFFFFF20", marginTop: 11, overflow: "hidden" }, fill: { height: 5, backgroundColor: "#D9B875", borderRadius: 5 },
  content: { padding: 18 }, notice: { gap: 10, padding: 15, borderRadius: 17, backgroundColor: "#E9EEE3", alignItems: "flex-start" }, noticeCopy: { flex: 1, color: "#456253", fontSize: 11, lineHeight: 21 },
  sectionRow: { alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 28, marginBottom: 5, flexWrap: "wrap" }, section: { color: "#123D35", fontSize: 17, fontWeight: "800" }, fileHint: { color: "#748379", fontSize: 9 },
  card: { backgroundColor: "white", borderWidth: 1, borderColor: "#E2E3D7", borderRadius: 23, padding: 19, marginTop: 14 }, activeCard: { borderColor: "#17634F" }, cardTop: { alignItems: "center", gap: 13 },
  docIcon: { width: 49, height: 53, borderRadius: 16, backgroundColor: "#EFF2E8", alignItems: "center", justifyContent: "center" }, number: { color: "#8B997F", fontSize: 9, fontWeight: "800", letterSpacing: 1 }, docTitle: { color: "#123D35", fontWeight: "800", fontSize: 15, marginTop: 5, lineHeight: 24 },
  cardMeta: { alignItems: "center", gap: 10, justifyContent: "space-between", marginTop: 15, flexWrap: "wrap" }, status: { borderRadius: 8, paddingVertical: 5, paddingHorizontal: 9 }, statusText: { fontSize: 10, fontWeight: "800" }, expiry: { fontSize: 10, color: "#65756D" },
  actions: { gap: 10, marginTop: 15, alignItems: "center", flexWrap: "wrap" }, uploadButton: { flexDirection: "row", gap: 6, alignItems: "center", backgroundColor: "#EDF2E9", paddingHorizontal: 13, minHeight: 44, borderRadius: 12 }, uploadText: { color: "#17634F", fontWeight: "800", fontSize: 12 }, viewButton: { paddingHorizontal: 6, minHeight: 44, justifyContent: "center" },
  link: { color: "#17634F", fontSize: 12, fontWeight: "800", paddingVertical: 8 }, reason: { color: "#AD403B", backgroundColor: "#FCEFEB", padding: 12, borderRadius: 10, marginTop: 13, lineHeight: 22, fontSize: 12 },
  form: { borderTopWidth: 1, borderTopColor: "#E8EBE0", marginTop: 16, paddingTop: 16 }, formCopy: { color: "#65756D", fontSize: 11, lineHeight: 21 }, picker: { flexDirection: "row", gap: 7, alignItems: "center", padding: 12, backgroundColor: "#EDF2E9", borderRadius: 12 }, selection: { backgroundColor: "#F5F5ED", borderRadius: 12, padding: 12, marginTop: 16 }, selectedName: { color: "#123D35", fontSize: 12 }, preview: { width: "100%", height: 180, marginBottom: 10, borderRadius: 8 },
  fieldLabel: { color: "#123D35", fontWeight: "700", marginTop: 18, marginBottom: 8, fontSize: 13 }, input: { borderWidth: 1, borderColor: "#CDD6C8", borderRadius: 12, padding: 14, fontSize: 15, color: "#123D35", textAlign: "left", writingDirection: "ltr", backgroundColor: "#FAFBF7" },
  submit: { minHeight: 50, padding: 12, borderRadius: 14, backgroundColor: "#17634F", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, marginTop: 20 }, submitText: { color: "white", fontWeight: "800", fontSize: 14 }, disabled: { opacity: 0.5 }, cancel: { alignItems: "center", marginTop: 8, minHeight: 44, justifyContent: "center" },
  error: { backgroundColor: "#FCEFEB", borderRadius: 15, padding: 14, marginTop: 14 }, errorText: { color: "#AD403B", lineHeight: 23, fontSize: 12 }, success: { color: "#17634F", backgroundColor: "#E7F1EA", padding: 15, borderRadius: 13, marginTop: 14, lineHeight: 23 }, loading: { margin: 25 },
  footer: { alignItems: "center", padding: 24, gap: 9 }, footerText: { color: "#748379", textAlign: "center", fontSize: 11, lineHeight: 21 },
});
