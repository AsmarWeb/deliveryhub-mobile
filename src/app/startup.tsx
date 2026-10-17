import axios from "axios";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApplicationStatus } from "../services/application";
import { getCurrentUser } from "../services/auth";

export default function StartupScreen() {
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      setError(false);

      try {
        const token = await SecureStore.getItemAsync("deliveryhub_token");

        if (!active) return;

        if (!token) {
          router.replace("/login");
          return;
        }

        const user = await getCurrentUser();

        if (!active) return;

        const account = await getApplicationStatus();

        if (!active) return;

        if (account.status !== "active") {
          router.replace("/registration-status");
          return;
        }

        const roles = user.roles?.map((item) => item.name) ?? [];

        if (account.type === "merchant" && roles.includes("merchant")) {
          router.replace("/merchant");
          return;
        }

        if (account.type === "driver" && roles.includes("driver")) {
          router.replace("/driver");
          return;
        }

        router.replace("/login");
      } catch (err) {
        if (!active) return;

        if (axios.isAxiosError(err) && err.response?.status === 401) {
          await SecureStore.deleteItemAsync("deliveryhub_token");

          if (active) router.replace("/login");
          return;
        }

        // Preserve the token when the server is unavailable.
        setError(true);
      }
    }

    void restoreSession();

    return () => {
      active = false;
    };
  }, [retry]);

  return (
    <View style={styles.container}>
      <View style={styles.logo}>
        <Text style={styles.logoText}>D</Text>
      </View>

      <Text style={styles.title}>DeliveryHub</Text>

      {error ? (
        <>
          <Text style={styles.description}>
            تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مجدداً.
          </Text>

          <Pressable
            style={styles.button}
            onPress={() => setRetry((value) => value + 1)}
          >
            <Text style={styles.buttonText}>إعادة المحاولة</Text>
          </Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={styles.loader}
          />

          <Text style={styles.description}>جاري تجهيز حسابك...</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 25,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "900",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0B1730",
  },
  loader: {
    marginTop: 30,
  },
  description: {
    marginTop: 20,
    fontSize: 14,
    lineHeight: 24,
    textAlign: "center",
    color: "#64748B",
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: 14,
    backgroundColor: "#2563EB",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
