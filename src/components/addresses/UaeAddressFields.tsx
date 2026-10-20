import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { UAE_EMIRATES } from "../../utils/address";
export type UaeDetails = { emirate: string; building: string; unit: string; landmark: string; makani_number: string; delivery_instructions: string };
export const EMPTY_UAE_DETAILS: UaeDetails = { emirate: "", building: "", unit: "", landmark: "", makani_number: "", delivery_instructions: "" };
export default function UaeAddressFields({ value, onChange, ar, disabled }: { value: UaeDetails; onChange: (value: UaeDetails) => void; ar: boolean; disabled: boolean }) {
  const align = { textAlign: ar ? "right" as const : "left" as const };
  return <View style={s.root}>
    <Text style={[s.label, align]}>{ar ? "الإمارة *" : "Emirate *"}</Text>
    <View style={[s.choices, { flexDirection: ar ? "row-reverse" : "row" }]}>{UAE_EMIRATES.map(item => <Pressable key={item.value} accessibilityRole="radio" accessibilityState={{ checked: value.emirate === item.value, disabled }} disabled={disabled} onPress={() => onChange({ ...value, emirate: item.value, makani_number: item.value === "dubai" ? value.makani_number : "" })} style={[s.choice, value.emirate === item.value && s.selected]}><Text style={[s.choiceText, value.emirate === item.value && s.selectedText]}>{ar ? item.ar : item.en}</Text></Pressable>)}</View>
    {([
      ["building", ar ? "المبنى أو الفيلا (اختياري)" : "Building or villa (optional)"],
      ["unit", ar ? "الشقة أو المكتب (اختياري)" : "Apartment or office (optional)"],
      ["landmark", ar ? "علامة مميزة (اختياري)" : "Landmark (optional)"],
      ...(value.emirate === "dubai" ? [["makani_number", ar ? "رقم مكاني — 10 أرقام (اختياري)" : "Makani — 10 digits (optional)"]] : []),
      ["delivery_instructions", ar ? "تعليمات الوصول (اختياري)" : "Access instructions (optional)"],
    ] as [keyof UaeDetails, string][]).map(([key, label]) => <View key={key} style={s.field}><Text style={[s.label, align]}>{label}</Text><TextInput accessibilityLabel={label} editable={!disabled} style={[s.input, key === "makani_number" ? { textAlign: "left", writingDirection: "ltr" } : align]} value={value[key]} onChangeText={text => onChange({ ...value, [key]: text })} keyboardType={key === "makani_number" ? "number-pad" : "default"} maxLength={key === "makani_number" ? 20 : key === "delivery_instructions" ? 2000 : 255} multiline={key === "delivery_instructions"} /></View>)}
  </View>;
}
const s = StyleSheet.create({ root: { gap: 12, marginTop: 12 }, label: { color: "#334155", fontWeight: "700", fontSize: 13 }, choices: { flexWrap: "wrap", gap: 8 }, choice: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF" }, selected: { backgroundColor: "#2563EB", borderColor: "#2563EB" }, choiceText: { color: "#334155" }, selectedText: { color: "#FFFFFF", fontWeight: "700" }, field: { gap: 6 }, input: { minHeight: 48, padding: 12, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, color: "#0B1730", backgroundColor: "white", fontSize: 16 } });
