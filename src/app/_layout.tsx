import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";

import * as SplashScreen from "expo-splash-screen";
import { useColorScheme } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { LanguageProvider } from "../contexts/LanguageContext";

// Keep native splash visible until the application is ready.
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
          {/* Application home */}
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />

          {/* Authentication */}
          <Stack.Screen
            name="login"
            options={{
              headerShown: false,
              animation: "fade",
            }}
          />

          {/* Merchant dashboard */}
          <Stack.Screen
            name="merchant"
            options={{
              headerShown: false,
            }}
          />

          {/* Driver dashboard */}
          <Stack.Screen
            name="driver"
            options={{
              headerShown: false,
            }}
          />
        </Stack>

        <AnimatedSplashOverlay />
      </ThemeProvider>
    </LanguageProvider>
  );
}
