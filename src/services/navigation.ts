import { Alert, Linking, Platform } from "react-native";

export async function openNavigation(
  address: string,
  latitude?: number | null,
  longitude?: number | null,
) {
  const hasCoordinates =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  const destination = hasCoordinates
    ? `${latitude},${longitude}`
    : address.trim();

  if (!destination) {
    Alert.alert("تنبيه", "عنوان الموقع غير متوفر.");
    return;
  }

  const encoded = encodeURIComponent(destination);

  const url =
    Platform.OS === "ios"
      ? `https://maps.apple.com/?daddr=${encoded}`
      : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("خطأ", "تعذر فتح تطبيق الخرائط.");
  }
}
