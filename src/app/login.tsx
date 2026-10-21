import { Ionicons } from "@expo/vector-icons";
import { isAxiosError } from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { login } from "../services/auth";
import { getApplicationStatus, operationalRoute } from "../services/application";

export default function LoginScreen() {
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  function showError(title: string, message: string) {
    setFormError(message);
    if (Platform.OS !== "web") Alert.alert(title, message);
  }

  const ar = language === "ar";
  const t = (arText: string, enText: string) => (ar ? arText : enText);

  async function handleLogin() {
    if (loading) return;
    setFormError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showError(
        t("البريد الإلكتروني", "Email address"),
        t("أدخل بريداً إلكترونياً صحيحاً.", "Enter a valid email."),
      );
      return;
    }

    if (!password) {
      showError(
        t("كلمة المرور", "Password"),
        t("أدخل كلمة المرور.", "Enter your password."),
      );
      return;
    }

    setLoading(true);

    try {
      await login(email.trim().toLowerCase(), password);
      const application = await getApplicationStatus();
      router.replace(operationalRoute(application));
    } catch (error) {
      let message = t(
        "تعذر تسجيل الدخول. تحقق من اتصالك بالخادم.",
        "Unable to sign in. Check your server connection.",
      );

      if (error instanceof Error && error.message === "AUTH_STORAGE_UNAVAILABLE") {
        message = t("اسمح للمتصفح بتخزين بيانات الموقع حتى يمكن حفظ جلسة الدخول.", "Allow browser site storage so your sign-in session can be saved.");
      }
      if (isAxiosError(error)) {
        if (error.response?.status === 422) {
          message = t(
            "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
            "Incorrect email or password.",
          );
        } else if (error.response?.status === 429) {
          message = t(
            "محاولات كثيرة. يرجى المحاولة لاحقاً.",
            "Too many attempts. Please try again later.",
          );
        } else if (error.response?.status === 403) {
          message = t(
            "ليس لديك صلاحية الوصول.",
            "You do not have permission to access this service.",
          );
        }
      }

      showError(t("تعذر تسجيل الدخول", "Sign-in failed"), message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#0B1730", "#183A72", "#2563EB"]}
          style={styles.hero}
        >
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Ionicons name="cube-outline" size={23} color="#FFFFFF" />
              </View>
              <Text style={styles.brand}>Raslo</Text>
            </View>

            <Pressable
              style={styles.languageButton}
              onPress={() => setLanguage(ar ? "en" : "ar")}
              accessibilityRole="button"
              accessibilityLabel={t("Switch to English", "التبديل إلى العربية")}
            >
              <Ionicons name="language-outline" size={17} color="#FFFFFF" />
              <Text style={styles.languageText}>{ar ? "EN" : "عربي"}</Text>
            </Pressable>
          </View>

          <View style={styles.heroContent}>
            <View style={styles.heroSymbol}>
              <Ionicons name="car-sport-outline" size={42} color="#FFFFFF" />
            </View>

            <Text style={styles.heroTitle}>
              {t("التوصيل أصبح أسهل", "Delivery, simplified.")}
            </Text>

            <Text style={styles.heroSubtitle}>
              {t(
                "إدارة ذكية للتوصيل، من الطلب حتى التسليم.",
                "Smarter delivery management, from order to doorstep.",
              )}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.formCard}>
          <View style={styles.headingRow}>
            <Text style={styles.heading}>
              {t("مرحباً بعودتك", "Welcome back")}
            </Text>
            <Text style={styles.description}>
              {t(
                "سجّل الدخول للمتابعة إلى حسابك",
                "Sign in to continue to your account",
              )}
            </Text>
          </View>

          <Text style={[styles.label, { textAlign: ar ? "right" : "left" }]}>
            {t("البريد الإلكتروني", "Email address")}
          </Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#718096" />
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
              editable={!loading}
            />
          </View>

          <Text style={[styles.label, { textAlign: ar ? "right" : "left" }]}>
            {t("كلمة المرور", "Password")}
          </Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#718096" />

            <TextInput
              style={styles.input}
              placeholder={t("أدخل كلمة المرور", "Enter your password")}
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              value={password}
              onChangeText={setPassword}
              editable={!loading}
            />

            <Pressable
              onPress={() => setShowPassword(!showPassword)}
              accessibilityRole="button"
              accessibilityLabel={t(
                "إظهار أو إخفاء كلمة المرور",
                "Show or hide password",
              )}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={21}
                color="#718096"
              />
            </Pressable>
          </View>

        {formError && <Text accessibilityRole="alert" style={{ color: "#B91C1C", backgroundColor: "#FEF2F2", padding: 16, margin: 16, borderRadius: 12, textAlign: ar ? "right" : "left" }}>{formError}</Text>}
          <Pressable
            style={[styles.submitButton, loading && styles.disabled]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.submitText}>
                  {t("تسجيل الدخول", "Sign in")}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </>
            )}
          </Pressable>

          <View style={styles.securityRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color="#059669"
            />
            <Text style={styles.securityText}>
              {t("تسجيل دخول آمن لحسابك", "Secure access to your account")}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t(
              "صُمم لتسهيل خدمات التوصيل في الإمارات",
              "Designed for delivery operations in the UAE",
            )}
          </Text>
          <Text style={styles.copyright}>© 2026 Raslo</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  hero: {
    paddingTop: Platform.OS === "ios" ? 64 : 48,
    paddingHorizontal: 24,
    paddingBottom: 100,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFFFFF24",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
  },
  languageButton: {
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
    backgroundColor: "#FFFFFF22",
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  languageText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  heroContent: {
    alignItems: "center",
    marginTop: 46,
  },
  heroSymbol: {
    width: 86,
    height: 86,
    borderRadius: 26,
    backgroundColor: "#FFFFFF20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "800",
    textAlign: "center",
  },
  heroSubtitle: {
    color: "#DBEAFE",
    fontSize: 14,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 12,
    maxWidth: 300,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 24,
    marginHorizontal: 18,
    marginTop: -60,
    borderWidth: 1,
    borderColor: "#E7ECF4",
    shadowColor: "#0B1730",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  headingRow: {
    marginBottom: 28,
  },
  heading: {
    color: "#0B1730",
    fontSize: 25,
    fontWeight: "800",
    textAlign: "center",
  },
  description: {
    color: "#718096",
    fontSize: 13,
    textAlign: "center",
    marginTop: 9,
  },
  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 15,
    paddingHorizontal: 14,
    minHeight: 56,
    marginBottom: 21,
    gap: 12,
  },
  input: {
    flex: 1,
    color: "#0B1730",
    fontSize: 15,
    paddingVertical: 13,
    textAlign: "left",
  },
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
  },
  disabled: {
    opacity: 0.65,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  securityRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
  },
  securityText: {
    color: "#64748B",
    fontSize: 12,
  },
  footer: {
    alignItems: "center",
    marginTop: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "center",
  },
  copyright: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 10,
  },
});
