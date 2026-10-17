import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  lastUpdatedAt?: string | null;
};

const STALE_AFTER_MS = 60_000;

export default function TrackingFreshness({
  lastUpdatedAt,
}: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  const timestamp = lastUpdatedAt
    ? Date.parse(lastUpdatedAt)
    : NaN;

  const age = now - timestamp;

  const fresh =
    Number.isFinite(timestamp) &&
    age >= 0 &&
    age <= STALE_AFTER_MS;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.indicator,
          {
            backgroundColor: fresh
              ? "#059669"
              : "#D97706",
          },
        ]}
      />

      <Text style={styles.text}>
        {fresh
          ? "موقع السائق محدث مؤخراً"
          : "لا تتوفر تحديثات حديثة لموقع السائق"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  indicator: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  text: {
    color: "#475569",
    fontSize: 12,
  },
});
