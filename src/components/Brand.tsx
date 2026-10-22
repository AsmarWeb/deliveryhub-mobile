import { Image, StyleSheet, Text, View } from "react-native";
import { Brand as C } from "../constants/brand";

export default function Brand({ arabic = false, inverse = false, compact = false }: { arabic?: boolean; inverse?: boolean; compact?: boolean }) {
  return <View accessible accessibilityLabel={arabic ? "رسلو" : "Raslo"} style={[s.row, { flexDirection: arabic ? "row-reverse" : "row" }]}>
    <Image source={require("../../assets/brand/raslo-icon.png")} style={{ width: compact ? 34 : 44, height: compact ? 34 : 44, borderRadius: compact ? 9 : 12 }} accessibilityIgnoresInvertColors />
    <View><Text style={[s.name, { color: inverse ? C.paper : C.ink, textAlign: arabic ? "right" : "left" }]}>{arabic ? "رسلو" : "Raslo"}</Text>{!compact && <Text style={[s.tag, { color: inverse ? "#D3DDD0" : C.muted, textAlign: arabic ? "right" : "left" }]}>{arabic ? "أقرب لأعمالك" : "Closer to your business"}</Text>}</View>
  </View>;
}
const s = StyleSheet.create({ row: { alignItems: "center", gap: 10 }, name: { fontSize: 27, fontWeight: "800", lineHeight: 37 }, tag: { fontSize: 9, lineHeight: 16 } });
