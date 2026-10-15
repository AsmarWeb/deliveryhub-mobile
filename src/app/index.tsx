import axios from "axios";
import { Redirect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { getCurrentUser } from "../services/auth";

type Destination = "/login" | "/merchant" | "/driver";

export default function HomeScreen() {
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const token = await SecureStore.getItemAsync("deliveryhub_token");

        if (!token) {
          if (mounted) setDestination("/login");
          return;
        }

        const user = await getCurrentUser();

        const roles = user.roles?.map((role) => role.name) ?? [];

        if (!mounted) return;

        if (roles.includes("driver")) {
          setDestination("/driver");
        } else if (roles.includes("merchant")) {
          setDestination("/merchant");
        } else {
          setDestination("/login");
        }
      } catch (error) {
        // Only remove the session if Laravel confirms
        // the token is no longer authorized.
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          await SecureStore.deleteItemAsync("deliveryhub_token");
        }

        if (mounted) setDestination("/login");
      }
    }

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  if (destination) {
    return <Redirect href={destination} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Text style={styles.logoSymbol}>D</Text>
      </View>

      <Text style={styles.brand}>DeliveryHub</Text>
      <Text style={styles.subtitle}>Smart Delivery Management</Text>

      <ActivityIndicator size="large" color="#60A5FA" style={styles.loader} />

      <Text style={styles.loadingText}>جاري تجهيز حسابك...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1730",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  logoSymbol: {
    fontSize: 46,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  brand: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: "#94A3B8",
    marginTop: 10,
  },
  loader: {
    marginTop: 42,
  },
  loadingText: {
    color: "#CBD5E1",
    fontSize: 13,
    marginTop: 18,
  },
});
