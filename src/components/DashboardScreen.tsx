import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { logout } from "../services/auth";
import { getDashboard, type DashboardResponse } from "../services/dashboard";

type Role = "merchant" | "driver";
type IconName = React.ComponentProps<typeof Ionicons>["name"];

const colors = {
  navy: "#0B1730",
  blue: "#2563EB",
  background: "#F5F7FB",
  white: "#FFFFFF",
  muted: "#718096",
  border: "#E7ECF4",
};

export default function DashboardScreen({ role }: { role: Role }) {
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [loggingOut, setLoggingOut] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setDashboardLoading(true);
      try {
        const response = await getDashboard();
        if (response.role !== role) {
          setDashboard(null);
          setDashboardError(true);
          return;
        }
        setDashboard(response);
        setDashboardError(false);
      } catch {
        setDashboardError(true);
      } finally {
        setDashboardLoading(false);
        setRefreshing(false);
      }
    },
    [role],
  );

  useFocusEffect(useCallback(() => {
    void loadDashboard();
  }, [loadDashboard]));

  const primaryValue =
    dashboard?.role === "merchant"
      ? dashboard.data.total_deliveries
      : dashboard?.role === "driver"
        ? dashboard.data.pending_assignments
        : null;

  const secondaryValue =
    dashboard?.role === "merchant"
      ? dashboard.data.active_deliveries
      : dashboard?.role === "driver"
        ? dashboard.data.accepted_assignments
        : null;

  const metricText = (value: number | null) =>
    dashboardLoading && !dashboard ? "…" : value === null ? "—" : String(value);

  const ar = language === "ar";
  const merchant = role === "merchant";

  const t = (arabic: string, english: string) => (ar ? arabic : english);

  const shortcuts: {
    title: string;
    icon: IconName;
    color: string;
    action: () => void;
  }[] = merchant
    ? [
        {
          title: t("طلب توصيل", "New delivery"),
          icon: "add-circle-outline",
          color: "#2563EB",
          action: () => router.push("/merchant/create-delivery"),
        },
        {
          title: t("شحناتي", "Deliveries"),
          icon: "cube-outline",
          color: "#7C3AED",
          action: () => router.push("/merchant/deliveries"),
        },
        {
          title: t("التتبع", "Tracking"),
          icon: "navigate-outline",
          color: "#059669",
          action: () => comingSoon(),
        },
        {
          title: t("الإشعارات", "Notifications"),
          icon: "notifications-outline",
          color: "#EA580C",
          action: () => comingSoon(),
        },
      ]
    : [
        {
          title: t("المهام", "Assignments"),
          icon: "clipboard-outline",
          color: "#2563EB",
          action: () => router.push("/driver/assignments"),
        },
        {
          title: t("الاستلام", "Pickup"),
          icon: "cube-outline",
          color: "#059669",
          action: () => comingSoon(),
        },
        {
          title: t("التوصيل", "Deliveries"),
          icon: "bicycle-outline",
          color: "#7C3AED",
          action: () => comingSoon(),
        },
        {
          title: t("الإشعارات", "Notifications"),
          icon: "notifications-outline",
          color: "#EA580C",
          action: () => comingSoon(),
        },
      ];

  function comingSoon() {
    Alert.alert(
      t("قريباً", "Coming soon"),
      t(
        "سنربط هذه الخدمة ببيانات Raslo الحقيقية.",
        "This feature will connect to live Raslo data.",
      ),
    );
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await logout();
      router.replace("/login");
    } catch {
      Alert.alert(
        t("تنبيه", "Notice"),
        t(
          "تعذر الاتصال بالخادم. أُزيلت الجلسة من الهاتف.",
          "Server unavailable. Local session was cleared.",
        ),
      );
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <LinearGradient
          colors={["#0B1730", "#18376D", "#2563EB"]}
          style={styles.hero}
        >
          <View style={styles.topRow}>
            <View style={styles.brand}>
              <Ionicons name="cube" size={22} color="#FFFFFF" />
              <Text style={styles.brandText}>Raslo</Text>
            </View>

            <Pressable
              style={styles.languageButton}
              onPress={() => setLanguage(language === "ar" ? "en" : "ar")}
            >
              <Text style={styles.languageText}>{ar ? "EN" : "عربي"}</Text>
            </Pressable>
          </View>

          <Text style={styles.welcome}>
            {t("مرحباً بك في Raslo", "Welcome to Raslo")}
          </Text>

          <Text style={styles.heroTitle}>
            {merchant
              ? t("إدارة توصيلاتك بسهولة", "Deliveries made simple")
              : t("يوم توصيل أكثر تنظيماً", "A smarter delivery day")}
          </Text>

          <Text style={styles.heroDescription}>
            {merchant
              ? t(
                  "كل ما تحتاجه لإدارة عمليات التوصيل في مكان واحد.",
                  "Everything you need to manage deliveries in one place.",
                )
              : t(
                  "تابع مهامك وعمليات الاستلام والتوصيل.",
                  "Manage assignments, pickups and deliveries.",
                )}
          </Text>

          <View style={styles.roleBadge}>
            <Ionicons
              name={merchant ? "storefront-outline" : "car-outline"}
              size={16}
              color="#FFFFFF"
            />
            <Text style={styles.roleText}>
              {merchant
                ? t("حساب التاجر", "Merchant account")
                : t("حساب السائق", "Driver account")}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>
              {t("نظرة عامة", "Overview")}
            </Text>
            <Text style={styles.sectionHint}>
              {t("ملخص الحساب", "Account summary")}
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="cube-outline" size={21} color={colors.blue} />
              </View>
              <Text style={styles.statValue}>{metricText(primaryValue)}</Text>
              <Text style={styles.statLabel}>
                {merchant
                  ? t("إجمالي الطلبات", "Total orders")
                  : t("المهام", "Assignments")}
              </Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="time-outline" size={21} color="#EA580C" />
              </View>
              <Text style={styles.statValue}>{metricText(secondaryValue)}</Text>
              <Text style={styles.statLabel}>
                {t("قيد التنفيذ", "In progress")}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={[styles.dataNotice, { flex: 1 }]}>
              {dashboardError
                ? t(
                    "تعذر تحديث البيانات. حاول مجدداً.",
                    "Unable to update data. Try again.",
                  )
                : dashboardLoading
                  ? t(
                      "جاري تحميل بيانات حسابك...",
                      "Loading your account data...",
                    )
                  : t(
                      "إحصائيات حسابك من Raslo",
                      "Your Raslo account statistics",
                    )}
            </Text>
            <Pressable
              onPress={() => void loadDashboard(true)}
              disabled={refreshing || dashboardLoading}
              accessibilityRole="button"
              accessibilityLabel={t("تحديث الإحصائيات", "Refresh statistics")}
              style={styles.refreshButton}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.blue} />
              ) : (
                <Ionicons
                  name="refresh-outline"
                  size={20}
                  color={colors.blue}
                />
              )}
            </Pressable>
          </View>

          {dashboard?.role === "merchant" && (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>
                {t("ملخص التوصيلات", "Delivery summary")}
              </Text>
              <Text style={styles.detailText}>
                {t("بانتظار المعالجة", "Pending")}:{" "}
                {dashboard.data.pending_deliveries}
              </Text>
              <Text style={styles.detailText}>
                {t("مكتملة", "Completed")}:{" "}
                {dashboard.data.completed_deliveries}
              </Text>
              <Text style={styles.detailText}>
                {t("إشعارات غير مقروءة", "Unread notifications")}:{" "}
                {dashboard.data.unread_notifications}
              </Text>
              {dashboard.data.recent_deliveries.length > 0 && (
                <>
                  <Text style={[styles.detailTitle, { marginTop: 16 }]}>
                    {t("آخر التوصيلات", "Recent deliveries")}
                  </Text>
                  {dashboard.data.recent_deliveries.map((delivery) => (
                    <View key={delivery.id} style={styles.deliveryRow}>
                      <Text style={styles.deliveryCode}>
                        {delivery.tracking_number}
                      </Text>
                      <Text style={styles.deliveryStatus}>
                        {delivery.status}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {dashboard?.role === "driver" && (
            <View style={styles.detailCard}>
              <Text style={styles.detailTitle}>
                {t("ملخص السائق", "Driver summary")}
              </Text>
              <Text style={styles.detailText}>
                {t("توصيلات مكتملة", "Completed deliveries")}:{" "}
                {dashboard.data.completed_deliveries}
              </Text>
              <Text style={styles.detailText}>
                {t("حالة التوفر", "Availability")}:{" "}
                {dashboard.data.is_available
                  ? t("متاح", "Available")
                  : t("غير متاح", "Unavailable")}
              </Text>
              <Text style={styles.detailText}>
                {t("إشعارات غير مقروءة", "Unread notifications")}:{" "}
                {dashboard.data.unread_notifications}
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>
            {t("الوصول السريع", "Quick access")}
          </Text>

          <View style={styles.shortcuts}>
            {shortcuts.map((item) => (
              <Pressable
                key={item.icon}
                style={styles.shortcutCard}
                onPress={item.action}
              >
                <View
                  style={[
                    styles.shortcutIcon,
                    { backgroundColor: item.color + "14" },
                  ]}
                >
                  <Ionicons name={item.icon} size={26} color={item.color} />
                </View>

                <Text style={styles.shortcutTitle}>{item.title}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.infoCard}>
            <Ionicons
              name="shield-checkmark-outline"
              size={26}
              color="#059669"
            />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>
                {t("جاهز للعمل في الإمارات", "Built for the UAE")}
              </Text>
              <Text style={styles.infoDescription}>
                {t(
                  "تجربة عربية وإنجليزية مصممة لإدارة التوصيل بسهولة.",
                  "A bilingual experience designed for effortless delivery management.",
                )}
              </Text>
            </View>
          </View>

          <Pressable
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={loggingOut}
          >
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={styles.logoutText}>
              {t("تسجيل الخروج", "Sign out")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable style={styles.navItem}>
          <Ionicons name="home" size={23} color={colors.blue} />
          <Text style={styles.navActive}>{t("الرئيسية", "Home")}</Text>
        </Pressable>

        <Pressable style={styles.navItem} onPress={comingSoon}>
          <Ionicons name="cube-outline" size={23} color={colors.muted} />
          <Text style={styles.navLabel}>{t("الطلبات", "Orders")}</Text>
        </Pressable>

        <Pressable style={styles.navItem} onPress={comingSoon}>
          <Ionicons
            name="notifications-outline"
            size={23}
            color={colors.muted}
          />
          <Text style={styles.navLabel}>{t("التنبيهات", "Alerts")}</Text>
        </Pressable>

        <Pressable style={styles.navItem} onPress={comingSoon}>
          <Ionicons name="person-outline" size={23} color={colors.muted} />
          <Text style={styles.navLabel}>{t("حسابي", "Profile")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 24,
  },
  hero: {
    paddingTop: 58,
    paddingHorizontal: 24,
    paddingBottom: 42,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 38,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  brandText: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },
  languageButton: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF22",
    borderRadius: 20,
  },
  languageText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  welcome: {
    color: "#BFDBFE",
    fontSize: 14,
    marginBottom: 10,
    textAlign: "left",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
    lineHeight: 38,
    marginBottom: 12,
  },
  heroDescription: {
    color: "#DBEAFE",
    fontSize: 14,
    lineHeight: 23,
    maxWidth: 320,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    backgroundColor: "#FFFFFF20",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    marginTop: 25,
  },
  roleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  body: {
    padding: 20,
  },
  sectionHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: colors.navy,
    marginBottom: 16,
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 29,
    fontWeight: "800",
    color: colors.navy,
    marginTop: 14,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 5,
  },
  dataNotice: {
    color: colors.muted,
    fontSize: 12,
    textAlign: "left",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 22,
  },
  refreshButton: {
    padding: 10,
    backgroundColor: "#EAF1FF",
    borderRadius: 12,
  },
  detailCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 24,
    gap: 10,
  },
  detailTitle: {
    color: colors.navy,
    fontWeight: "800",
    fontSize: 16,
  },
  detailText: {
    color: "#475569",
    fontSize: 13,
  },
  deliveryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deliveryCode: {
    color: colors.navy,
    fontWeight: "700",
    fontSize: 12,
    flexShrink: 1,
  },
  deliveryStatus: {
    color: colors.blue,
    fontSize: 12,
  },
  shortcuts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  shortcutCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.white,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 125,
  },
  shortcutIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  shortcutTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.navy,
  },
  infoCard: {
    backgroundColor: "#ECFDF5",
    padding: 18,
    borderRadius: 18,
    flexDirection: "row",
    gap: 13,
    alignItems: "center",
    marginTop: 26,
  },
  infoText: {
    flex: 1,
  },
  infoTitle: {
    fontWeight: "700",
    color: "#065F46",
    fontSize: 14,
  },
  infoDescription: {
    color: "#047857",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 5,
  },
  logoutButton: {
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
    padding: 17,
    marginTop: 22,
  },
  logoutText: {
    color: "#DC2626",
    fontWeight: "700",
  },
  bottomBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingTop: 12,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  navActive: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.blue,
  },
  navLabel: {
    fontSize: 11,
    color: colors.muted,
  },
});
