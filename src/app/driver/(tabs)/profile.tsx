import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useLanguage } from "../../../contexts/LanguageContext";
import {
  getDriverProfile,
  updateDriverAvailability,
  type DriverProfile,
} from "../../../services/driverProfile";
import {
  getMyProfile,
  logoutUser,
  type UserProfile,
} from "../../../services/profile";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export default function DriverProfileScreen() {
  const { language, setLanguage, t } = useLanguage();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [driverError, setDriverError] = useState(false);
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [languageBusy, setLanguageBusy] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const user = await getMyProfile();
      setProfile(user);
      try {
        const driverData = await getDriverProfile();
        setDriver(driverData);
        setDriverError(false);
      } catch {
        setDriverError(true);
      }
      setError(null);
    } catch {
      setError("load_failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  async function changeAvailability(value: boolean) {
    if (!driver || availabilityBusy) return;
    if (value && driver.status !== "active") {
      Alert.alert(
        t("غير متاح", "Unavailable"),
        t(
          "يجب أن يكون حساب السائق نشطاً لتفعيل التوفر.",
          "Your driver account must be active to become available.",
        ),
      );
      return;
    }
    setAvailabilityBusy(true);
    try {
      const updated = await updateDriverAvailability(value);
      setDriver(updated);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      Alert.alert(
        t("تعذر تحديث الحالة", "Could not update availability"),
        message ??
          t(
            "تحقق من الاتصال وحاول مجدداً.",
            "Check your connection and try again.",
          ),
      );
    } finally {
      setAvailabilityBusy(false);
    }
  }

  async function changeLanguage(value: "ar" | "en") {
    if (languageBusy || value === language) return;
    setLanguageBusy(true);
    try {
      await setLanguage(value);
    } catch {
      Alert.alert(
        t("خطأ", "Error"),
        t("تعذر حفظ اللغة.", "Could not save language preference."),
      );
    } finally {
      setLanguageBusy(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logoutUser();
      router.replace("/login");
    } catch {
      // logoutUser removes the local token even if the API call fails.
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  function confirmLogout() {
    Alert.alert(
      t("تسجيل الخروج", "Sign out"),
      t("هل تريد تسجيل الخروج من حسابك؟", "Do you want to sign out?"),
      [
        { text: t("إلغاء", "Cancel"), style: "cancel" },
        {
          text: t("خروج", "Sign out"),
          style: "destructive",
          onPress: () => void handleLogout(),
        },
      ],
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={["#0B1730", "#183A72", "#2563EB"]}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.brandRow}>
            <Ionicons name="cube-outline" size={22} color="#FFFFFF" />
            <Text style={styles.brand}>DeliveryHub</Text>
          </View>
          <View style={styles.heroBadge}>
            <Ionicons
              name="shield-checkmark-outline"
              size={15}
              color="#FFFFFF"
            />
            <Text style={styles.heroBadgeText}>
              {t("حساب السائق", "Driver account")}
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.heroTitle,
            { textAlign: language === "ar" ? "right" : "left" },
          ]}
        >
          {t("حسابي", "My profile")}
        </Text>
        <Text
          style={[
            styles.heroSubtitle,
            { textAlign: language === "ar" ? "right" : "left" },
          ]}
        >
          {t(
            "إدارة حسابك وتفضيلات التطبيق",
            "Manage your account and app preferences",
          )}
        </Text>
      </LinearGradient>

      {loading && !profile ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error && !profile ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={36} color="#94A3B8" />
          <Text style={styles.muted}>
            {t("تعذر تحميل بيانات الحساب.", "Could not load your profile.")}
          </Text>
          <Pressable
            onPress={() => void loadProfile()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>
              {t("إعادة المحاولة", "Try again")}
            </Text>
          </Pressable>
        </View>
      ) : profile ? (
        <>
          <View style={styles.identityCard}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={34} color="#2563EB" />
            </View>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.email}>{profile.email}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="checkmark-circle" size={15} color="#047857" />
              <Text style={styles.roleText}>
                {t("حساب سائق", "Driver profile")}
              </Text>
            </View>
          </View>

          <Text
            style={[
              styles.sectionTitle,
              { textAlign: language === "ar" ? "right" : "left" },
            ]}
          >
            {t("المعلومات الشخصية", "Personal information")}
          </Text>
          <View style={styles.card}>
            <InfoRow
              icon="person-outline"
              label={t("الاسم الكامل", "Full name")}
              value={profile.name}
            />
            <View style={styles.divider} />
            <InfoRow
              icon="mail-outline"
              label={t("البريد الإلكتروني", "Email address")}
              value={profile.email}
            />
            <View style={styles.divider} />
            <InfoRow
              icon="id-card-outline"
              label={t("رقم الحساب", "Account ID")}
              value={String(profile.id)}
            />
          </View>

          <Text
            style={[
              styles.sectionTitle,
              { textAlign: language === "ar" ? "right" : "left" },
            ]}
          >
            {t("إعدادات التطبيق", "App settings")}
          </Text>
          <View style={styles.card}>
            <View style={styles.settingHeading}>
              <View style={styles.iconTile}>
                <Ionicons name="language-outline" size={23} color="#2563EB" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>
                  {t("لغة التطبيق", "App language")}
                </Text>
                <Text style={styles.muted}>
                  {t("اختر اللغة المفضلة", "Choose your preferred language")}
                </Text>
              </View>
            </View>
            <View style={styles.languageRow}>
              {(["ar", "en"] as const).map((option) => (
                <Pressable
                  key={option}
                  disabled={languageBusy}
                  accessibilityRole="button"
                  accessibilityState={{ selected: language === option }}
                  onPress={() => void changeLanguage(option)}
                  style={[
                    styles.languageButton,
                    language === option && styles.languageActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.languageText,
                      language === option && styles.languageActiveText,
                    ]}
                  >
                    {option === "ar" ? "العربية" : "English"}
                  </Text>
                  {language === option && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#2563EB"
                    />
                  )}
                </Pressable>
              ))}
            </View>
            <View style={styles.divider} />
            <Pressable
              style={styles.settingHeading}
              onPress={() => router.push("/driver/notifications")}
            >
              <View style={styles.iconTile}>
                <Ionicons
                  name="notifications-outline"
                  size={23}
                  color="#2563EB"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingTitle}>
                  {t("الإشعارات", "Notifications")}
                </Text>
                <Text style={styles.muted}>
                  {t(
                    "عرض التنبيهات وتحديثات المهام",
                    "View alerts and assignment updates",
                  )}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color="#94A3B8" />
            </Pressable>
          </View>

          <Text
            style={[
              styles.sectionTitle,
              { textAlign: language === "ar" ? "right" : "left" },
            ]}
          >
            {t("معلومات السائق", "Driver details")}
          </Text>
          <View style={styles.card}>
            {driver ? (
              <>
                <InfoRow
                  icon="car-outline"
                  label={t("نوع المركبة", "Vehicle type")}
                  value={driver.vehicle_type || t("غير مسجل", "Not provided")}
                />
                <View style={styles.divider} />
                <InfoRow
                  icon="card-outline"
                  label={t("رقم اللوحة", "Plate number")}
                  value={driver.vehicle_plate || t("غير مسجل", "Not provided")}
                />
                <View style={styles.divider} />
                <InfoRow
                  icon="call-outline"
                  label={t("هاتف السائق", "Driver phone")}
                  value={driver.phone || t("غير مسجل", "Not provided")}
                />
                <View style={styles.divider} />
                <InfoRow
                  icon="shield-checkmark-outline"
                  label={t("حالة الحساب", "Account status")}
                  value={driver.status}
                />
                <View style={styles.divider} />
                <View style={styles.availabilityRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingTitle}>
                      {t("متاح لاستقبال المهام", "Available for assignments")}
                    </Text>
                    <Text style={styles.muted}>
                      {driver.is_available
                        ? t("أنت متاح حالياً", "You are currently available")
                        : t(
                            "أنت غير متاح حالياً",
                            "You are currently unavailable",
                          )}
                    </Text>
                  </View>
                  {availabilityBusy && (
                    <ActivityIndicator size="small" color="#2563EB" />
                  )}
                  <Switch
                    value={driver.is_available}
                    onValueChange={(value) => void changeAvailability(value)}
                    disabled={
                      availabilityBusy ||
                      (driver.status !== "active" && !driver.is_available)
                    }
                    trackColor={{ false: "#CBD5E1", true: "#93C5FD" }}
                    thumbColor={driver.is_available ? "#2563EB" : "#F8FAFC"}
                    accessibilityLabel={t(
                      "حالة توفر السائق",
                      "Driver availability",
                    )}
                  />
                </View>
              </>
            ) : (
              <View style={styles.settingHeading}>
                <View style={styles.iconTile}>
                  <Ionicons name="car-outline" size={23} color="#2563EB" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingTitle}>
                    {t("بيانات المركبة والتوفر", "Vehicle and availability")}
                  </Text>
                  <Text style={styles.muted}>
                    {driverError
                      ? t(
                          "تعذر جلب بيانات السائق. تحقق من API وأعد فتح الصفحة.",
                          "Could not load driver details. Check the API and reopen this page.",
                        )
                      : t(
                          "لا توجد بيانات للسائق مرتبطة بهذا الحساب.",
                          "No driver details are linked to this account.",
                        )}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <Pressable
            style={styles.logoutButton}
            disabled={loggingOut}
            onPress={confirmLogout}
          >
            {loggingOut ? (
              <ActivityIndicator color="#DC2626" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={21} color="#DC2626" />
                <Text style={styles.logoutText}>
                  {t("تسجيل الخروج", "Sign out")}
                </Text>
              </>
            )}
          </Pressable>
          <Text style={styles.footer}>DeliveryHub · UAE</Text>
        </>
      ) : null}
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.smallIcon}>
        <Ionicons name={icon} size={20} color="#64748B" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} selectable>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F5F7FB" },
  content: { paddingBottom: 42 },
  hero: {
    paddingTop: 62,
    paddingHorizontal: 22,
    paddingBottom: 49,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brand: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  heroBadge: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    padding: 8,
    backgroundColor: "#FFFFFF22",
    borderRadius: 12,
  },
  heroBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "800",
    marginTop: 30,
  },
  heroSubtitle: { color: "#DBEAFE", fontSize: 14, marginTop: 8 },
  center: { padding: 36, gap: 14, alignItems: "center" },
  identityCard: {
    marginHorizontal: 18,
    marginTop: -22,
    padding: 24,
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0B1730",
    marginTop: 14,
    textAlign: "center",
  },
  email: { color: "#64748B", marginTop: 5, textAlign: "center" },
  roleBadge: {
    marginTop: 13,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#ECFDF5",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roleText: { color: "#047857", fontWeight: "700", fontSize: 12 },
  sectionTitle: {
    marginTop: 25,
    marginBottom: 12,
    marginHorizontal: 22,
    color: "#0B1730",
    fontSize: 17,
    fontWeight: "800",
  },
  card: {
    marginHorizontal: 18,
    padding: 17,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  smallIcon: {
    width: 40,
    height: 40,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { color: "#94A3B8", fontSize: 12 },
  infoValue: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 5 },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 5,
  },
  settingHeading: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconTile: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  settingTitle: { color: "#0B1730", fontSize: 15, fontWeight: "700" },
  muted: { color: "#64748B", fontSize: 12, lineHeight: 19, marginTop: 4 },
  languageRow: { flexDirection: "row", gap: 10, marginTop: 5 },
  languageButton: {
    flex: 1,
    minHeight: 49,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
  },
  languageActive: { backgroundColor: "#EFF6FF", borderColor: "#2563EB" },
  languageText: { color: "#64748B", fontWeight: "700" },
  languageActiveText: { color: "#2563EB" },
  logoutButton: {
    marginHorizontal: 18,
    marginTop: 27,
    minHeight: 56,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  logoutText: { color: "#DC2626", fontWeight: "800", fontSize: 16 },
  retryButton: { padding: 12, borderRadius: 10, backgroundColor: "#EFF6FF" },
  retryText: { color: "#2563EB", fontWeight: "700" },
  footer: {
    marginTop: 25,
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
  },
});
