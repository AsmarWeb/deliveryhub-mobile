import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { LanguageProvider } from "../contexts/LanguageContext";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <LanguageProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            contentStyle: {
              backgroundColor: "#F5F7FB",
            },
          }}
        >
          <Stack.Screen name="index" />

          <Stack.Screen name="startup" options={{ animation: "fade" }} />

          <Stack.Screen name="login" options={{ animation: "fade" }} />

          <Stack.Screen name="merchant" />

          <Stack.Screen name="driver" />

          <Stack.Screen name="registration-status" />
        </Stack>

        <AnimatedSplashOverlay />
      </ThemeProvider>
    </LanguageProvider>
  );
}
