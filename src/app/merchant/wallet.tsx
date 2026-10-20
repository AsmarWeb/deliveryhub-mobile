import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, AppState, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLanguage } from "../../contexts/LanguageContext";
import { billingErrorMessage, getCurrentSubscription, hasPaidAccess, openBillingPortal, type CurrentSubscription } from "../../services/billing";

export default function MerchantWalletScreen() {
  const { language, t } = useLanguage();
  const ar = language === "ar";
  const insets = useSafeAreaInsets();
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const request = useRef<AbortController | null>(null);
  const opening = useRef(false);
  const mounted = useRef(false);
  const align = { textAlign: ar ? "right" as const : "left" as const };
  const row = { flexDirection: ar ? "row-reverse" as const : "row" as const };

  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      const current = await getCurrentSubscription(controller.signal);
      if (!controller.signal.aborted) setSubscription(current);
    } catch (error) {
      if (!controller.signal.aborted) setError(billingErrorMessage(error, language === "ar"));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [language]);

  useFocusEffect(useCallback(() => {
    mounted.current = true;
    setBusy(opening.current);
    void load();
    const listener = AppState.addEventListener("change", state => {
      if (state === "active") void load();
    });
    return () => { mounted.current = false; request.current?.abort(); listener.remove(); };
  }, [load]));

  const portal = async () => {
    if (opening.current) return;
    opening.current = true;
    setBusy(true);
    setError(null);
    try {
      const url = await openBillingPortal();
      if (mounted.current) await Linking.openURL(url);
    } catch (error) {
      if (mounted.current) setError(billingErrorMessage(error, ar));
    } finally {
      opening.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const stripe = subscription?.provider === "stripe";
  const date = subscription?.ends_at && Number.isFinite(Date.parse(subscription.ends_at))
    ? new Intl.DateTimeFormat(ar ? "ar-AE" : "en-AE", { dateStyle: "medium", timeZone: "Asia/Dubai" }).format(new Date(subscription.ends_at)) : "—";
  const price = subscription ? new Intl.NumberFormat(ar ? "ar-AE" : "en-AE", {
    style: "currency", currency: subscription.plan.currency,
  }).format(Number(subscription.plan.monthly_price)) : "—";

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}>
      <View style={[styles.header, row]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t("رجوع", "Back")} onPress={() => router.canGoBack() ? router.back() : router.replace("/merchant/profile")} style={styles.iconButton}>
          <Ionicons name={ar ? "arrow-forward" : "arrow-back"} size={24} color="#0B1730" />
        </Pressable>
        <Text style={styles.title}>{t("المحفظة والفوترة", "Wallet & billing")}</Text>
      </View>
      <LinearGradient colors={["#0B1730", "#18376D"]} style={styles.hero}>
        <View style={[styles.header, row]}>
          <Ionicons name="wallet-outline" size={30} color="#93C5FD" />
          <Text style={styles.heroLabel}>{t("حساب أعمالك", "Your business account")}</Text>
        </View>
        <Text style={[styles.plan, align]}>{loading ? "…" : subscription?.plan.name ?? t("اختر باقتك", "Choose your plan")}</Text>
        {subscription && <Text style={[styles.white, align]}>{price} {t("شهريًا", "per month")}</Text>}
        <Text style={[styles.badge, align]}>{loading ? t("جارٍ التحديث", "Updating") : hasPaidAccess(subscription) ? t("الوصول نشط", "Access active") : t("لا يوجد وصول نشط مؤكد", "No confirmed active access")}</Text>
        {subscription && <Text style={[styles.white, align]}>{t("الوصول حتى", "Access until")}: {date}</Text>}
      </LinearGradient>
      {error && <View style={styles.errorBox}>
        <Text accessibilityRole="alert" style={[styles.error, align]}>{error}</Text>
        <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.iconButton}><Text style={styles.link}>{t("تحديث البيانات", "Refresh details")}</Text></Pressable>
      </View>}
      <View style={styles.card}>
        <Pressable accessibilityRole="button" style={[styles.action, row]} onPress={() => router.push("/merchant/finance")}>
          <Ionicons name="receipt-outline" size={24} color="#2563EB" />
          <View style={styles.actionBody}><Text style={[styles.actionTitle, align]}>{t("رسوم التوصيل والعمولات", "Delivery fees & commissions")}</Text><Text style={[styles.description, align]}>{t("راجع رسوم طلباتك وسجلات العمولات", "Review your delivery fees and commission records")}</Text></View>
          <Ionicons name={ar ? "chevron-back" : "chevron-forward"} size={18} color="#64748B" />
        </Pressable>
      </View>
      <Text style={[styles.section, align]}>{t("إدارة الفوترة", "Billing management")}</Text>
      <View style={styles.card}>
        <Pressable accessibilityRole="button" style={[styles.action, row]} onPress={() => router.push("/merchant/subscription")}>
          <Ionicons name="layers-outline" size={24} color="#2563EB" />
          <View style={styles.actionBody}><Text style={[styles.actionTitle, align]}>{t("الاشتراك والباقات", "Subscription & plans")}</Text><Text style={[styles.description, align]}>{t("قارن الباقات وحدود التوصيل والأتمتة", "Compare plans, delivery limits and automations")}</Text></View>
          <Ionicons name={ar ? "chevron-back" : "chevron-forward"} size={18} color="#64748B" />
        </Pressable>
        <View style={styles.divider} />
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || loading || !stripe, busy }} disabled={busy || loading || !stripe} style={[styles.action, row, (!stripe || busy || loading) && styles.disabled]} onPress={() => void portal()}>
          <Ionicons name="card-outline" size={24} color="#2563EB" />
          <View style={styles.actionBody}><Text style={[styles.actionTitle, align]}>{t("فتح بوابة Stripe", "Open Stripe portal")}</Text><Text style={[styles.description, align]}>{t("إدارة الاشتراك والبطاقات والفواتير المتاحة", "Manage subscription, cards and available invoices")}</Text></View>
          {busy ? <ActivityIndicator color="#2563EB" /> : <Ionicons name="open-outline" size={19} color="#64748B" />}
        </Pressable>
      </View>
      {!loading && !stripe && <Text style={[styles.note, align]}>{t("تتوفر بوابة الفوترة بعد ربط حسابك باشتراك Stripe. ابدأ من الاشتراك والباقات.", "The billing portal becomes available when your account has a Stripe subscription. Start with Subscription & plans.")}</Text>}
      {subscription && <View style={styles.card}>
        <Text style={[styles.section, align]}>{t("استخدام الأتمتة", "Automation usage")}</Text>
        <Text style={[styles.usage, align]}>{subscription.automation_usage} / {subscription.plan.max_active_automations}</Text>
        <Pressable accessibilityRole="button" style={styles.action} onPress={() => router.push("/merchant/automations")}><Text style={styles.link}>{t("إدارة التوصيلات المتكررة", "Manage recurring deliveries")}</Text></Pressable>
      </View>}
      <View style={[styles.security, row]}><Ionicons name="shield-checkmark-outline" size={22} color="#2563EB" /><Text style={[styles.securityText, align]}>{t("تُدار بيانات البطاقة داخل Stripe. هذا القسم للفوترة والاشتراكات، ولا يحتوي على رصيد قابل للشحن أو السحب.", "Card details are managed in Stripe. This section handles billing and subscriptions; it does not hold a balance for top-ups or withdrawals.")}</Text></View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },
  content: { paddingHorizontal: 20, width: "100%", maxWidth: 680, alignSelf: "center", gap: 16 },
  header: { alignItems: "center", gap: 12 }, iconButton: { padding: 10, minHeight: 44, minWidth: 44, justifyContent: "center" },
  title: { fontSize: 23, fontWeight: "800", color: "#0B1730", flexShrink: 1 },
  hero: { borderRadius: 24, padding: 24, gap: 12 }, heroLabel: { color: "#DBEAFE", fontSize: 15 },
  plan: { fontSize: 32, fontWeight: "800", color: "#FFFFFF" }, white: { color: "#DBEAFE", fontSize: 15 },
  badge: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  section: { fontSize: 18, fontWeight: "800", color: "#0B1730" },
  card: { backgroundColor: "#FFFFFF", borderRadius: 20, padding: 18, borderWidth: 1, borderColor: "#E7ECF4", gap: 10 },
  action: { alignItems: "center", minHeight: 64, gap: 14, paddingVertical: 10 }, actionBody: { flex: 1, gap: 6 },
  actionTitle: { fontSize: 16, fontWeight: "700", color: "#0B1730" }, description: { fontSize: 13, color: "#475569", lineHeight: 21 },
  divider: { height: 1, backgroundColor: "#E7ECF4" }, disabled: { opacity: 0.5 },
  note: { color: "#475569", lineHeight: 23 }, usage: { color: "#2563EB", fontSize: 26, fontWeight: "800" },
  link: { color: "#2563EB", fontWeight: "700" }, security: { gap: 12, alignItems: "flex-start" }, securityText: { flex: 1, color: "#475569", fontSize: 13, lineHeight: 22 },
  errorBox: { borderRadius: 16, padding: 16, backgroundColor: "#FEF2F2" }, error: { color: "#B91C1C", lineHeight: 23 },
});
