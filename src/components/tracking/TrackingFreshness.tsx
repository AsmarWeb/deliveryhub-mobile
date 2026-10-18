import { useLanguage } from "../../contexts/LanguageContext";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  lastUpdatedAt?: string | null;
};

const STALE_AFTER_MS = 60_000;

export default function TrackingFreshness({
  lastUpdatedAt,
}: Props) {
  const { t } = useLanguage();
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
          ? t(
              "موقع السائق محدث مؤخراً",
              "Driver location was updated recently"
            )
          : t(
              "لا تتوفر تحديثات حديثة لموقع السائق",
              "No recent driver location updates"
            )}
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
