import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getDashboard, type DashboardResponse } from "../../services/dashboard";
import { getDeliveryStatusLabel } from "../../utils/deliveryStatus";

type MerchantData = Extract<DashboardResponse, { role: "merchant" }>["data"];
type IconName = React.ComponentProps<typeof Ionicons>["name"];

const C = {
  bg: "#F5F7FB",
  surface: "#FFFFFF",
  border: "#E7ECF4",
  cyan: "#2563EB",
  text: "#0B1730",
  muted: "#718096",
  green: "#059669",
  amber: "#D97706",
};

function Metric({
  icon,
  title,
  value,
  accent,
}: {
  icon: IconName;
  title: string;
  value: number | string;
  accent: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: `${accent}1A` }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{title}</Text>
    </View>
  );
}

function Action({
  icon,
  title,
  onPress,
  primary = false,
}: {
  icon: IconName;
  title: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        primary && styles.primaryAction,
        pressed && { opacity: 0.78 },
      ]}
    >
      <Ionicons name={icon} size={20} color={primary ? "#FFFFFF" : C.cyan} />
      <Text style={[styles.actionText, primary && { color: "#FFFFFF" }]}>
        {title}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={primary ? "#FFFFFF" : C.muted}
      />
    </Pressable>
  );
}

export default function MerchantDashboard() {
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [data, setData] = useState<MerchantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await getDashboard();
      if (result.role !== "merchant")
        throw new Error("Unexpected dashboard role");
      setData(result.data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const number = (value?: number) =>
    value === undefined ? "—" : String(value);
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={C.cyan}
          />
        }
      >
        <LinearGradient
          colors={["#0B1730", "#18376D", "#2563EB"]}
          style={styles.hero}
        >
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("حسابي", "My account")}
              onPress={() => router.push("/merchant/profile")}
              style={styles.language}
            >
              <Ionicons
                name="person-circle-outline"
                size={24}
                color="#FFFFFF"
              />
            </Pressable>
            <View style={styles.brand}>
              <Ionicons name="cube" color="#FFFFFF" size={26} />
              <Text style={styles.brandName}>
                Delivery<Text style={{ color: "#BFDBFE" }}>Hub</Text>
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setLanguage(language === "ar" ? "en" : "ar")}
              style={styles.language}
            >
              <Text style={styles.languageText}>
                {language === "ar" ? "EN" : "عربي"}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.eyebrow}>
            {t("لوحة التاجر · الإمارات", "MERCHANT HUB · UAE")}
          </Text>
          <Text style={styles.heading}>
            {t("توصيلاتك، تحت السيطرة", "Deliveries, under control")}
          </Text>
          <Text style={styles.subtitle}>
            {t(
              "أنشئ الطلبات وتابع عمليات التوصيل من مكان واحد.",
              "Create orders and follow every delivery in one place.",
            )}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/merchant/create-delivery")}
            style={styles.heroButton}
          >
            <Ionicons name="add-circle" size={22} color="#0B1730" />
            <Text style={styles.heroButtonText}>
              {t("إنشاء طلب توصيل", "Create delivery")}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#0B1730" />
          </Pressable>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t("نظرة عامة", "Overview")}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void load(true)}
              disabled={loading || refreshing}
              style={styles.refresh}
            >
              <Ionicons name="refresh" size={19} color={C.cyan} />
              <Text style={styles.refreshText}>{t("تحديث", "Refresh")}</Text>
            </Pressable>
          </View>
          {loading && !data ? (
            <ActivityIndicator color={C.cyan} style={{ marginVertical: 16 }} />
          ) : null}
          {error ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void load()}
              style={styles.error}
            >
              <Ionicons name="alert-circle-outline" size={19} color={C.amber} />
              <Text style={styles.errorText}>
                {t(
                  "تعذر تحديث البيانات. اضغط للمحاولة مجدداً.",
                  "Could not refresh. Tap to retry.",
                )}
              </Text>
            </Pressable>
          ) : null}
          <View style={styles.metricGrid}>
            <Metric
              icon="cube-outline"
              title={t("إجمالي التوصيلات", "Total deliveries")}
              value={number(data?.total_deliveries)}
              accent={C.cyan}
            />
            <Metric
              icon="navigate-outline"
              title={t("قيد التنفيذ", "Active")}
              value={number(data?.active_deliveries)}
              accent="#7C3AED"
            />
            <Metric
              icon="checkmark-circle-outline"
              title={t("مكتملة", "Completed")}
              value={number(data?.completed_deliveries)}
              accent={C.green}
            />
            <Metric
              icon="time-outline"
              title={t("بانتظار المعالجة", "Pending")}
              value={number(data?.pending_deliveries)}
              accent={C.amber}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t("إجراءات سريعة", "Quick actions")}
            </Text>
          </View>
          <Action
            primary
            icon="add-circle-outline"
            title={t("طلب توصيل جديد", "New delivery")}
            onPress={() => router.push("/merchant/create-delivery")}
          />
          <Action
            icon="list-outline"
            title={t("جميع التوصيلات", "All deliveries")}
            onPress={() => router.push("/merchant/deliveries")}
          />

          <Action
            icon="navigate-outline"
            title={t("تتبع التوصيلات", "Track deliveries")}
            onPress={() => router.push("/merchant/live-tracking")}
          />

          <View style={[styles.sectionHeader, { marginTop: 25 }]}>
            <Text style={styles.sectionTitle}>
              {t("آخر التوصيلات", "Recent deliveries")}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/merchant/deliveries")}
            >
              <Text style={styles.link}>{t("عرض الكل", "View all")}</Text>
            </Pressable>
          </View>
          <View style={styles.listCard}>
            {data?.recent_deliveries?.length ? (
              data.recent_deliveries.map((delivery, index) => (
                <Pressable
                  key={delivery.id}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/merchant/deliveries/[id]",
                      params: { id: String(delivery.id) },
                    })
                  }
                  style={[
                    styles.deliveryRow,
                    index > 0 && styles.deliveryDivider,
                  ]}
                >
                  <View style={styles.deliveryIcon}>
                    <Ionicons name="cube-outline" size={20} color={C.cyan} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deliveryCode}>
                      {delivery.tracking_number}
                    </Text>
                    <Text style={styles.deliveryStatus}>
                      {getDeliveryStatusLabel(delivery.status, language)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" color={C.muted} size={18} />
                </Pressable>
              ))
            ) : (
              <View style={styles.empty}>
                <Ionicons name="file-tray-outline" color={C.muted} size={30} />
                <Text style={styles.emptyText}>
                  {t(
                    "لا توجد توصيلات حديثة حتى الآن",
                    "No recent deliveries yet",
                  )}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.notice}>
            <Ionicons name="notifications-outline" size={19} color={C.cyan} />
            <Text style={styles.noticeText}>
              {t("إشعارات غير مقروءة", "Unread notifications")}:{" "}
              {number(data?.unread_notifications)}
            </Text>
          </View>
        </View>
      </ScrollView>
      <View style={styles.bottomNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("الرئيسية", "Home")}
          style={styles.navItem}
          onPress={() => router.replace("/merchant")}
        >
          <Ionicons name="home" size={23} color={C.cyan} />
          <Text style={styles.navActive}>{t("الرئيسية", "Home")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("التوصيلات", "Deliveries")}
          style={styles.navItem}
          onPress={() => router.push("/merchant/deliveries")}
        >
          <Ionicons name="cube-outline" size={23} color={C.muted} />
          <Text style={styles.navLabel}>{t("التوصيلات", "Deliveries")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("طلب جديد", "New delivery")}
          style={styles.navItem}
          onPress={() => router.push("/merchant/create-delivery")}
        >
          <Ionicons name="add-circle-outline" size={23} color={C.muted} />
          <Text style={styles.navLabel}>{t("طلب جديد", "New")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("حسابي", "My account")}
          style={styles.navItem}
          onPress={() => router.push("/merchant/profile")}
        >
          <Ionicons name="person-circle-outline" size={23} color={C.muted} />

          <Text style={styles.navLabel}>{t("حسابي", "Account")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingBottom: 35 },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
    paddingBottom: 18,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    minHeight: 44,
  },
  navActive: { fontSize: 11, fontWeight: "800", color: C.cyan },
  navLabel: { fontSize: 11, fontWeight: "700", color: C.muted },
  hero: {
    paddingTop: 58,
    paddingHorizontal: 22,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 33,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandName: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" },
  language: {
    borderWidth: 1,
    borderColor: "#FFFFFF55",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 11,
  },
  languageText: { color: "#FFFFFF", fontWeight: "800" },
  eyebrow: {
    color: "#BFDBFE",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 11,
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 37,
  },
  subtitle: {
    color: "#DBEAFE",
    fontSize: 14,
    lineHeight: 23,
    marginTop: 8,
    maxWidth: 340,
  },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 25,
  },
  heroButtonText: {
    color: "#0B1730",
    fontWeight: "900",
    fontSize: 15,
    flex: 1,
    textAlign: "center",
  },
  body: { paddingHorizontal: 17, paddingTop: 25 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 13,
  },
  sectionTitle: { color: C.text, fontWeight: "900", fontSize: 18 },
  refresh: { flexDirection: "row", alignItems: "center", gap: 5, padding: 5 },
  refreshText: { color: C.cyan, fontSize: 12, fontWeight: "700" },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 27,
  },
  metric: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    minHeight: 145,
  },
  metricIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: { color: C.text, fontSize: 28, fontWeight: "900", marginTop: 9 },
  metricLabel: { color: C.muted, fontSize: 12, marginTop: 4 },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 17,
    borderRadius: 15,
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    marginBottom: 10,
  },
  primaryAction: { backgroundColor: C.cyan, borderColor: C.cyan },
  actionText: { flex: 1, color: C.text, fontWeight: "800", fontSize: 14 },
  link: { color: C.cyan, fontSize: 12, fontWeight: "700" },
  listCard: {
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 17,
    paddingHorizontal: 15,
  },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  deliveryDivider: { borderTopColor: C.border, borderTopWidth: 1 },
  deliveryIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF6FF",
  },
  deliveryCode: { color: C.text, fontWeight: "800", fontSize: 13 },
  deliveryStatus: {
    color: C.muted,
    fontSize: 12,
    marginTop: 5,
    textTransform: "capitalize",
  },
  empty: { alignItems: "center", padding: 28, gap: 12 },
  emptyText: { color: C.muted, fontSize: 13, textAlign: "center" },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 15,
    marginTop: 19,
    borderRadius: 14,
    backgroundColor: C.surface,
  },
  noticeText: { color: C.muted, fontSize: 13 },
  error: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
    marginBottom: 12,
  },
  errorText: { color: C.amber, flex: 1, fontSize: 12 },
});
