import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { LanguageProvider } from "../contexts/LanguageContext";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {

  return (
    <LanguageProvider>
      <ThemeProvider value={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: "#17634F", background: "#F6F3EB", card: "#FFFFFF", text: "#123D35", border: "#DDDED2" } }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            contentStyle: {
              backgroundColor: "#F6F3EB",
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
