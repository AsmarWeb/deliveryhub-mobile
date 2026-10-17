import { usePathname, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";

export default function SessionBootstrap() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;

    let active = true;

    async function restore() {
      try {
        const token = await SecureStore.getItemAsync("deliveryhub_token");

        if (active && token) {
          router.replace("/startup");
        }
      } catch (error) {
        console.warn("Session restoration failed:", error);
      }
    }

    void restore();

    return () => {
      active = false;
    };
  }, [pathname, router]);

  return null;
}
