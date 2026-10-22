import type { ReactNode } from "react";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLanguage } from "../../contexts/LanguageContext";

export function AutomationHeader({ title }: { title: string }) {
  const { t } = useLanguage();
  return <View style={s.header}>
    <Pressable accessibilityRole="button" onPress={() => router.canGoBack() ? router.back() : router.replace("/merchant")} style={s.secondary}>
      <Text style={s.link}>{t("رجوع", "Back")}</Text>
    </Pressable>
    <Text accessibilityRole="header" style={s.title}>{title}</Text>
  </View>;
}

export function AutomationButton({ children, onPress, disabled = false, secondary = false }: {
  children: ReactNode; onPress: () => void; disabled?: boolean; secondary?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[s.button, secondary && s.secondary, disabled && { opacity: 0.5 }]}>
    <Text style={secondary ? s.link : s.buttonText}>{children}</Text>
  </Pressable>;
}

export const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F3EB" },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40, gap: 16, width: "100%", maxWidth: 720, alignSelf: "center" },
  header: { gap: 16, marginBottom: 4 },
  title: { fontSize: 26, fontWeight: "800", color: "#123D35", textAlign: "auto" },
  card: { padding: 18, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E1E1D5", gap: 12 },
  label: { color: "#123D35", fontSize: 15, fontWeight: "700", textAlign: "auto" },
  body: { color: "#62726B", fontSize: 14, lineHeight: 23, textAlign: "auto" },
  error: { color: "#B91C1C", fontSize: 14, lineHeight: 23, textAlign: "auto" },
  button: { minHeight: 48, padding: 14, borderRadius: 12, backgroundColor: "#17634F", alignItems: "center", justifyContent: "center" },
  secondary: { minHeight: 44, padding: 12, borderRadius: 12, backgroundColor: "#EAF0E7", alignSelf: "flex-start" },
  buttonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  link: { color: "#17634F", fontWeight: "700", fontSize: 14 },
  input: { minHeight: 48, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, backgroundColor: "#FFFFFF", padding: 12, fontSize: 16, color: "#123D35" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  choice: { minHeight: 44, padding: 12, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, backgroundColor: "#FFFFFF" },
  selected: { borderColor: "#17634F", backgroundColor: "#EAF0E7" },
});
