import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  createBillingCheckout,
  openBillingPortal,
  getBillingPlans,
  getCurrentSubscription,
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
  const isAr = language === "ar";
  const t = (ar: string, en: string) => (isAr ? ar : en);

  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [current, setCurrent] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [availablePlans, subscription] = await Promise.all([
        getBillingPlans(),
        getCurrentSubscription(),
      ]);
      setPlans(availablePlans);
      setCurrent(subscription);
      setError(false);
    } catch (error) {
      console.error(
        "DeliveryHub billing API error:",
        error
      );
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const date = (value: string) =>
    new Intl.DateTimeFormat(isAr ? "ar-AE" : "en-AE", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));

  const money = (value: string | number, currency: string) =>
    `${Number(value).toLocaleString(isAr ? "ar-AE" : "en-AE")} ${currency}`;


  async function manageSubscription() {
    try {
      const url = await openBillingPortal();
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        t("تعذر فتح إدارة الاشتراك", "Unable to manage subscription"),
        t("يرجى المحاولة مرة أخرى.", "Please try again.")
      );
    }
  }

  async function subscribe(slug: string) {
    if (slug !== "growth" && slug !== "business") return;

    setCheckoutPlan(slug);
    try {
      const url = await createBillingCheckout(slug);
      await Linking.openURL(url);
    } catch {
      Alert.alert(
        t("تعذر بدء الدفع", "Unable to start checkout"),
        t("يرجى المحاولة مرة أخرى.", "Please try again.")
      );
    } finally {
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
                  {t("نشط", "Active")}
                </Text>
                <Text style={styles.detail}>
                  {t("تاريخ الانتهاء", "Expires")}: {date(current.ends_at)}
                </Text>

                {current.provider === "stripe" && (
                  <Pressable
                    style={styles.button}
                    onPress={() => void manageSubscription()}
                  >
                    <Text style={styles.buttonText}>
                      {t("إدارة اشتراكي", "Manage Subscription")}
                    </Text>
                  </Pressable>
                )}
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

                {eligible && (
                  <Pressable
                    style={[
                      styles.button,
                      checkoutPlan !== null && styles.disabled,
                    ]}
                    disabled={checkoutPlan !== null}
                    onPress={() => void subscribe(plan.slug)}
                  >
                    {checkoutPlan === plan.slug ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buttonText}>
                        {t("اشترك الآن", "Subscribe now")}
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
