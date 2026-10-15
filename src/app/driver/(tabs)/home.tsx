import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import {
  requestDriverLocationPermission,
  updateCurrentDriverLocation,
} from "../../../services/location";

import { useLanguage } from "../../../contexts/LanguageContext";
import { getCurrentUser, type User } from "../../../services/auth";
import {
  getDashboard,
  type DriverDashboardData,
} from "../../../services/dashboard";

import {
  getDriverProfile,
  updateDriverAvailability,
  type DriverProfile,
} from "../../../services/driverProfile";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export default function DriverHomeScreen() {
  const { language, setLanguage, t } = useLanguage();

  const [user, setUser] = useState<User | null>(null);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [stats, setStats] = useState<DriverDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [currentUser, dashboard, driverProfile] = await Promise.all([
          getCurrentUser(),
          getDashboard(),
          getDriverProfile(),
        ]);

        if (dashboard.role !== "driver") {
          throw new Error("Unexpected dashboard role");
        }

        setUser(currentUser);
        setDriver(driverProfile);
        setStats(dashboard.data);
        setError(null);
      } catch {
        setError(
          t(
            "تعذر تحديث لوحة التحكم. تحقق من الاتصال.",
            "Unable to update the dashboard. Check your connection.",
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function toggleAvailability(next: boolean) {
    if (!driver || availabilityBusy) return;
    setAvailabilityBusy(true);
    try {
      const updated = await updateDriverAvailability(next);
      setDriver(updated);
      setStats((previous) =>
        previous
          ? { ...previous, is_available: updated.is_available }
          : previous,
      );
    } catch (err: unknown) {
      const message =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      Alert.alert(
        t("تعذر تغيير حالة التوفر", "Availability update failed"),
        message ??
          t(
            "تحقق من الاتصال وحالة حساب السائق.",
            "Check your connection and driver account status.",
          ),
      );
    } finally {
      setAvailabilityBusy(false);
    }
  }

  async function testLocationUpdate() {
    if (locationBusy) return;
    setLocationBusy(true);

    try {
      const granted = await requestDriverLocationPermission();
      if (!granted) {
        Alert.alert(
          t("إذن الموقع مطلوب", "Location permission required"),
          t(
            "اسمح بالوصول إلى الموقع أثناء استخدام التطبيق لإرسال موقعك.",
            "Allow location access while using the app to send your position.",
          ),
        );
        return;
      }

      await updateCurrentDriverLocation();
      Alert.alert(
        t("تم تحديث الموقع", "Location updated"),
        t(
          "تم إرسال موقعك إلى DeliveryHub بنجاح.",
          "Your location was sent to DeliveryHub.",
        ),
      );
    } catch (err: unknown) {
      const serverMessage =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      Alert.alert(
        t("تعذر تحديث الموقع", "Location update failed"),
        serverMessage ??
          t(
            "تأكد من تفعيل خدمات الموقع والاتصال بالإنترنت ووجود مهمة نشطة.",
            "Check location services, your connection, and whether you have an active assignment.",
          ),
      );
    } finally {
      setLocationBusy(false);
    }
  }

  const firstName = user?.name?.trim().split(/\s+/)[0];

  const quickActions: {
    label: string;
    icon: IconName;
    color: string;
    route:
      | "/driver/orders"
      | "/driver/deliveries"
      | "/driver/notifications"
      | "/driver/profile";
  }[] = [
    {
      label: t("الطلبات", "Orders"),
      icon: "cube-outline",
      color: "#2563EB",
      route: "/driver/orders",
    },
    {
      label: t("التوصيل", "Deliveries"),
      icon: "car-outline",
      color: "#059669",
      route: "/driver/deliveries",
    },
    {
      label: t("الإشعارات", "Notifications"),
      icon: "notifications-outline",
      color: "#EA580C",
      route: "/driver/notifications",
    },
    {
      label: t("حسابي", "My profile"),
      icon: "person-outline",
      color: "#7C3AED",
      route: "/driver/profile",
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void load(true)}
        />
      }
      contentContainerStyle={styles.content}
    >
      <LinearGradient
        colors={["#0B1730", "#183A72", "#2563EB"]}
        style={styles.hero}
      >
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <Ionicons name="cube" size={24} color="#FFFFFF" />
            <Text style={styles.brand}>DeliveryHub</Text>
          </View>

          <Pressable
            style={styles.languageButton}
            onPress={() => void setLanguage(language === "ar" ? "en" : "ar")}
          >
            <Ionicons name="language-outline" size={18} color="#FFFFFF" />
            <Text style={styles.languageText}>
              {language === "ar" ? "EN" : "عربي"}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.welcome}>
          {t("مرحباً", "Welcome")}
          {firstName ? `، ${firstName}` : ""}
        </Text>

        <Text style={styles.heroTitle}>
          {t("جاهز ليوم توصيل جديد؟", "Ready for your next delivery?")}
        </Text>

        <Text style={styles.heroSubtitle}>
          {t(
            "تابع مهامك وطلبات الاستلام والتوصيل من مكان واحد.",
            "Manage your assignments, pickups and deliveries in one place.",
          )}
        </Text>

        <View style={styles.availability}>
          <View
            style={[
              styles.availabilityDot,
              {
                backgroundColor: driver?.is_available ? "#4ADE80" : "#FBBF24",
              },
            ]}
          />

          <Text style={styles.availabilityText}>
            {driver
              ? driver.is_available
                ? t("متاح لاستقبال المهام", "Available for assignments")
                : t("غير متاح حالياً", "Currently unavailable")
              : t("حالة التوفر غير متاحة", "Availability unknown")}
          </Text>
          <View style={{ flex: 1 }} />
          <Switch
            accessibilityLabel={t("تغيير حالة التوفر", "Change availability")}
            value={driver?.is_available ?? false}
            disabled={
              !driver ||
              availabilityBusy ||
              (driver.status !== "active" && !driver.is_available)
            }
            onValueChange={(value) => void toggleAvailability(value)}
            trackColor={{ false: "#64748B", true: "#34D399" }}
            thumbColor="#FFFFFF"
          />
        </View>
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{t("نظرة عامة", "Overview")}</Text>

          <Pressable onPress={() => void load(true)}>
            <Ionicons name="refresh-outline" size={22} color="#2563EB" />
          </Pressable>
        </View>

        {loading && !stats ? (
          <ActivityIndicator size="large" color="#2563EB" />
        ) : (
          <View style={styles.statsGrid}>
            <StatCard
              label={t("مهام جديدة", "New tasks")}
              value={stats?.pending_assignments}
              icon="time-outline"
              color="#EA580C"
            />
            <StatCard
              label={t("مهام مقبولة", "Accepted tasks")}
              value={stats?.accepted_assignments}
              icon="bicycle-outline"
              color="#2563EB"
            />
            <StatCard
              label={t("توصيلات مكتملة", "Completed")}
              value={stats?.completed_deliveries}
              icon="checkmark-circle-outline"
              color="#059669"
            />
            <StatCard
              label={t("إشعارات جديدة", "Unread alerts")}
              value={stats?.unread_notifications}
              icon="notifications-outline"
              color="#7C3AED"
            />
          </View>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        {(stats?.pending_assignments ?? 0) > 0 && (
          <Pressable
            style={styles.pendingBanner}
            onPress={() => router.push("/driver/orders")}
          >
            <Ionicons name="alert-circle-outline" size={25} color="#B45309" />
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingTitle}>
                {t("لديك مهام تنتظر القبول", "Assignments awaiting acceptance")}
              </Text>
              <Text style={styles.pendingDescription}>
                {t(
                  "راجع الطلبات الجديدة وابدأ العمل.",
                  "Review new assignments and get started.",
                )}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#B45309" />
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>
          {t("الوصول السريع", "Quick access")}
        </Text>

        <View style={styles.actionsGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.route}
              style={styles.actionCard}
              onPress={() => router.push(action.route)}
            >
              <View
                style={[
                  styles.actionIcon,
                  { backgroundColor: `${action.color}14` },
                ]}
              >
                <Ionicons name={action.icon} size={25} color={action.color} />
              </View>

              <Text style={styles.actionLabel}>{action.label}</Text>

              <Ionicons
                name="arrow-forward-outline"
                size={17}
                color="#94A3B8"
              />
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[
            styles.locationTestButton,
            locationBusy && styles.locationTestDisabled,
          ]}
          disabled={locationBusy}
          onPress={() => void testLocationUpdate()}
          accessibilityRole="button"
          accessibilityLabel={t("اختبار تحديث الموقع", "Test location update")}
        >
          {locationBusy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Ionicons name="location-outline" size={21} color="#FFFFFF" />
          )}
          <Text style={styles.locationTestText}>
            {locationBusy
              ? t("جارٍ إرسال الموقع...", "Sending location...")
              : t("اختبار تحديث الموقع", "Test location update")}
          </Text>
        </Pressable>

        <View style={styles.notice}>
          <Ionicons
            name="information-circle-outline"
            size={22}
            color="#2563EB"
          />

          <Text style={styles.noticeText}>
            {t(
              "اسحب الصفحة للأسفل لتحديث بيانات مهامك. يتم جلب الإحصاءات مباشرة من DeliveryHub.",
              "Pull down to refresh your assignments. Statistics are loaded directly from DeliveryHub.",
            )}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | undefined;
  icon: IconName;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}14` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>

      <Text style={styles.statValue}>{value ?? "—"}</Text>

      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  content: {
    paddingBottom: 36,
  },
  hero: {
    paddingTop: 65,
    paddingHorizontal: 22,
    paddingBottom: 42,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },
  languageButton: {
    flexDirection: "row",
    gap: 7,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF25",
    alignItems: "center",
  },
  languageText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  welcome: {
    color: "#BFDBFE",
    fontSize: 16,
    marginTop: 34,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 9,
  },
  heroSubtitle: {
    color: "#DBEAFE",
    fontSize: 14,
    lineHeight: 23,
    marginTop: 10,
  },
  availability: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 22,
    backgroundColor: "#FFFFFF1A",
    padding: 13,
    borderRadius: 12,
  },
  availabilityDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  availabilityText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 25,
    gap: 20,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: "#0B1730",
    fontSize: 18,
    fontWeight: "800",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: "#0B1730",
    fontSize: 27,
    fontWeight: "800",
    marginTop: 14,
  },
  statLabel: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 5,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  actionCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 17,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 14,
  },
  actionIcon: {
    width: 49,
    height: 49,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800",
  },
  locationTestButton: {
    backgroundColor: "#2563EB",
    padding: 17,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  locationTestDisabled: {
    opacity: 0.65,
  },
  locationTestText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 17,
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
  },
  noticeText: {
    flex: 1,
    color: "#475569",
    fontSize: 12,
    lineHeight: 21,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  pendingTitle: { color: "#92400E", fontSize: 14, fontWeight: "800" },
  pendingDescription: { color: "#A16207", fontSize: 12, marginTop: 4 },
  error: {
    color: "#DC2626",
    fontSize: 13,
  },
});
