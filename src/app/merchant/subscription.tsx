import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  createBillingCheckout,
  openBillingPortal,
  getBillingPlans,
  getCurrentSubscription,
  hasPaidAccess,
  shouldManageSubscription,
  billingErrorMessage,
  type BillingPlan,
  type CurrentSubscription,
} from "../../services/billing";

const C = {
  bg: "#F5F7FB",
  surface: "#FFFFFF",
  text: "#0B1730",
  muted: "#718096",
  blue: "#2563EB",
  border: "#E7ECF4",
  green: "#059669",
};

export default function MerchantSubscriptionScreen() {
  const { language } = useLanguage();
  const { billing } = useLocalSearchParams<{ billing?: string }>();
  const isAr = language === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const request = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [notice, setNotice] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const load = useCallback(async (refresh = false) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [availablePlans, subscription] = await Promise.all([
        getBillingPlans(controller.signal), getCurrentSubscription(controller.signal),
      ]);
      if (controller.signal.aborted) return;
      setPlans(availablePlans); setCurrent(subscription); setError(false);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  const refreshAfterReturn = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setNotice(true);
    void load(true);
    // Stripe confirmation can arrive after the browser returns. Retry briefly,
    // without assuming that a successful redirect proves a paid subscription.
    [3000, 6000, 10000, 15000].forEach(delay => {
      timers.current.push(setTimeout(() => { void load(true); }, delay));
    });
  }, [load]);

  useFocusEffect(useCallback(() => {
    if (billing === "return") refreshAfterReturn();
    else void load();
    let previous = AppState.currentState;
    const listener = AppState.addEventListener("change", next => {
      if (next === "active" && previous !== "active") refreshAfterReturn();
      previous = next;
    });
    return () => {
      listener.remove(); request.current?.abort();
      timers.current.forEach(clearTimeout); timers.current = [];
    };
  }, [load, refreshAfterReturn, billing]));

  useEffect(() => () => { request.current?.abort(); }, []);

  const date = (value: string | null) =>
    value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(isAr ? "ar-AE" : "en-AE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value)) : "—";

  const money = (value: string | number, currency: string) =>
    `${Number(value).toLocaleString(isAr ? "ar-AE" : "en-AE")} ${currency}`;


  async function manageSubscription() {
    if (busy.current) return;
    busy.current = true;
    setPortalBusy(true);
    setActionError(null);
    try {
      const url = await openBillingPortal();
      await Linking.openURL(url);
    } catch (error) {
      setActionError(billingErrorMessage(error, isAr));
    } finally { busy.current = false; setPortalBusy(false); }
  }

  async function subscribe(slug: string) {
    if (slug !== "growth" && slug !== "business") return;
    if (shouldManageSubscription(current)) { await manageSubscription(); return; }
    if (busy.current) return;
    busy.current = true;

    setCheckoutPlan(slug);
    setActionError(null);
    try {
      const url = await createBillingCheckout(slug);
      await Linking.openURL(url);
    } catch (error) {
      setActionError(billingErrorMessage(error, isAr));
    } finally {
      busy.current = false;
      setCheckoutPlan(null);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
        />
      }
    >
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Ionicons
          name={isAr ? "arrow-forward" : "arrow-back"}
          size={22}
          color={C.text}
        />
        <Text style={styles.backText}>{t("رجوع", "Back")}</Text>
      </Pressable>

      <Text style={[styles.heading, { textAlign: isAr ? "right" : "left" }]}>
        {t("الاشتراكات والباقات", "Subscriptions & Plans")}
      </Text>
      <Text style={[styles.subtitle, { textAlign: isAr ? "right" : "left" }]}>
        {t(
          "اختر الباقة المناسبة لإدارة عمليات التوصيل.",
          "Choose the right plan for your delivery business."
        )}
      </Text>

      {notice && <Text style={styles.detail}>{t("جارٍ التحقق من تحديث الاشتراك. لا يتم التفعيل إلا بعد تأكيد Stripe. يمكنك سحب الصفحة للتحديث.", "Checking subscription updates. Access requires Stripe confirmation. Pull to refresh if needed.")}</Text>}
      {actionError && <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text>}
      {loading && <ActivityIndicator size="large" color={C.blue} />}

      {error && (
        <Pressable style={styles.card} onPress={() => void load()}>
          <Text style={styles.error}>
            {t(
              "تعذر تحميل الاشتراكات. اضغط لإعادة المحاولة.",
              "Unable to load subscriptions. Tap to retry."
            )}
          </Text>
        </Pressable>
      )}

      {!loading && !error && (
        <>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              {t("اشتراكك الحالي", "Your current subscription")}
            </Text>

            {current ? (
              <>
                <Text style={styles.planName}>{current.plan?.name}</Text>
                <Text style={styles.active}>
                  {hasPaidAccess(current) ? t("نشط", "Active") : t("غير نشط أو بانتظار تأكيد الدفع", "Inactive or awaiting payment confirmation")}
                </Text>
                <Text style={styles.detail}>
                  {t("تاريخ الانتهاء", "Expires")}: {date(current.ends_at)}
                </Text>

                {current.provider === "stripe" && (
                  <Pressable
                    disabled={portalBusy || checkoutPlan !== null}
                    style={styles.button}
                    onPress={() => void manageSubscription()}
                  >
                    <Text style={styles.buttonText}>
                      {portalBusy ? t("جارٍ الفتح…", "Opening…") : t("إدارة اشتراكي", "Manage Subscription")}
                    </Text>
                  </Pressable>
                )}
                <Text style={styles.detail}>{t("الأتمتة النشطة", "Active automations")}: {current.automation_usage ?? 0} / {current.plan.max_active_automations ?? 0}</Text>
                {current.stripe_status && <Text style={styles.detail}>Stripe: {current.stripe_status}</Text>}
                <Text style={styles.detail}>
                  {t("طريقة الاشتراك", "Subscription source")}:{" "}
                  {current.provider === "stripe"
                    ? "Stripe"
                    : t("إداري", "Manual")}
                </Text>
              </>
            ) : (
              <Text style={styles.detail}>
                {t("لا يوجد اشتراك نشط حالياً.", "No active subscription.")}
              </Text>
            )}
          </View>

          <Text style={styles.sectionTitle}>
            {t("الباقات المتاحة", "Available plans")}
          </Text>

          {plans.map((plan) => {
            const eligible =
              plan.slug === "growth" || plan.slug === "business";

            return (
              <View key={plan.id} style={styles.card}>
                <Text style={styles.planName}>{plan.name}</Text>

                <Text style={styles.price}>
                  {money(plan.monthly_price, plan.currency)}
                  <Text style={styles.period}>
                    {" "}{t("/ شهرياً", "/ month")}
                  </Text>
                </Text>

                <Text style={styles.detail}>
                  {t("العمولة", "Commission")}: {plan.commission_rate}%
                </Text>

                <Text style={styles.detail}>
                  {t("التوصيلات الشهرية", "Monthly deliveries")}:{" "}
                  {plan.monthly_delivery_limit === null
                    ? t("غير محدود", "Unlimited")
                    : plan.monthly_delivery_limit}
                </Text>

                <Text style={styles.detail}>{t("حد الأتمتة", "Automation allowance")}: {plan.max_active_automations ?? 0}</Text>
                {eligible && (
                  <Pressable
                    style={[
                      styles.button,
                      (checkoutPlan !== null || portalBusy) && styles.disabled,
                    ]}
                    disabled={checkoutPlan !== null || portalBusy}
                    onPress={() => void subscribe(plan.slug)}
                  >
                    {checkoutPlan === plan.slug ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonText}>
                        {shouldManageSubscription(current) ? t("إدارة أو تغيير الخطة", "Manage or change plan") : t("اشترك الآن", "Subscribe now")}
                      </Text>
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  content: { padding: 20, paddingBottom: 45 },
  back: { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 8 },
  backText: { color: C.text, fontWeight: "600" },
  heading: { color: C.text, fontSize: 27, fontWeight: "800" },
  subtitle: { color: C.muted, marginTop: 8, marginBottom: 24, lineHeight: 22 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    marginBottom: 18,
  },
  sectionTitle: {
    color: C.text,
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 16,
  },
  planName: { color: C.blue, fontSize: 21, fontWeight: "800" },
  price: { color: C.text, fontSize: 27, fontWeight: "800", marginVertical: 14 },
  period: { color: C.muted, fontSize: 14 },
  detail: { color: C.muted, fontSize: 14, marginTop: 9 },
  active: { color: C.green, fontWeight: "700", marginTop: 10 },
  button: {
    backgroundColor: C.blue,
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "700" },
  error: { color: "#DC2626" },
});
