import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import {
  createDelivery,
  createMerchantAddress,
  getMerchantAddresses,
  type MerchantAddress,
} from "../../services/deliveries";

type Language = "ar" | "en";
type AddressKind = "pickup" | "dropoff";
type Coordinate = { latitude: number; longitude: number };
const C = {
  navy: "#0B1730",
  blue: "#2563EB",
  bg: "#F5F7FB",
  white: "#FFFFFF",
  muted: "#64748B",
  border: "#E2E8F0",
  pale: "#EFF6FF",
  red: "#DC2626",
  green: "#059669",
};
const DEFAULT_COORDS: Coordinate = { latitude: 25.2048, longitude: 55.2708 };
const steps = ["addresses", "recipient", "package", "review"] as const;

// Leaflet runs in a WebView and does not require a MapLibre native module.
// The public OSM tile server is suitable for light development use only.
// Use a tile provider with appropriate usage terms for production traffic.
function mapHtml(point: Coordinate): string {
  const initial = JSON.stringify([point.latitude, point.longitude]);
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #eef3f9; }
.leaflet-container { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
.pin { width: 18px; height: 18px; border: 4px solid white; border-radius: 50%; background: #2563eb; box-shadow: 0 2px 12px #0004; }
#message { position: absolute; z-index: 1000; top: 12px; left: 12px; right: 12px; padding: 10px; background: white; border-radius: 10px; color: #334155; font-size: 12px; display: none; }
</style></head><body>
<div id="map"></div><div id="message">Map could not load. Check your internet connection.</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  function send(value) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(value));
    }
  }
  if (!window.L) { document.getElementById('message').style.display = 'block'; send({ type: 'error' }); return; }
  var initial = ${initial};
  var map = L.map('map', { zoomControl: true }).setView(initial, 13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  var icon = L.divIcon({ className: '', html: '<div class="pin"></div>', iconSize: [26, 26], iconAnchor: [13, 13] });
  var marker = L.marker(initial, { icon: icon }).addTo(map);
  map.on('click', function (event) {
    var lat = event.latlng.lat, lng = event.latlng.lng;
    marker.setLatLng([lat, lng]);
    send({ type: 'select', latitude: lat, longitude: lng });
  });
  setTimeout(function () { map.invalidateSize(); }, 250);
})();
</script></body></html>`;
}

function LocationMap({
  point,
  onSelect,
  mapKey,
  onError,
}: {
  point: Coordinate;
  onSelect: (p: Coordinate) => void;
  mapKey: string;
  onError: () => void;
}) {
  const html = useRef(mapHtml(point)).current;
  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message: unknown = JSON.parse(event.nativeEvent.data);
      if (!message || typeof message !== "object") return;
      const data = message as Record<string, unknown>;
      if (data.type === "error") {
        onError();
        return;
      }
      if (data.type !== "select") return;
      const latitude = data.latitude;
      const longitude = data.longitude;
      if (
        typeof latitude === "number" &&
        typeof longitude === "number" &&
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      ) {
        onSelect({ latitude, longitude });
      }
    } catch {
      /* Ignore malformed messages from the WebView. */
    }
  }
  return (
    <WebView
      key={mapKey}
      originWhitelist={["*"]}
      source={{ html, baseUrl: "https://localhost/" }}
      style={{ flex: 1, backgroundColor: "#EEF3F9" }}
      javaScriptEnabled
      domStorageEnabled
      onMessage={handleMessage}
      onError={onError}
      onHttpError={onError}
      startInLoadingState
      renderLoading={() => (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={C.blue} />
        </View>
      )}
    />
  );
}

function addressDescription(a: MerchantAddress, ar: boolean) {
  return [a.address_line, a.street, a.area, a.city]
    .filter(Boolean)
    .join(ar ? "، " : ", ");
}

function getValidationMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const data = error.response?.data as
    | {
        message?: string;
        errors?: Record<string, string[]>;
      }
    | undefined;

  if (error.response?.status === 422) {
    const firstError = Object.values(data?.errors ?? {}).flat()[0];

    return firstError || data?.message || fallback;
  }

  return fallback;
}

export default function CreateDeliveryScreen() {
  const [language, setLanguage] = useState<Language>("ar");
  const ar = language === "ar";
  const t = (a: string, e: string) => (ar ? a : e);
  const [step, setStep] = useState(0);
  const [addresses, setAddresses] = useState<MerchantAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [pickupId, setPickupId] = useState<number | null>(null);
  const [dropoffId, setDropoffId] = useState<number | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [packageType, setPackageType] = useState("");
  const [weight, setWeight] = useState("");
  const [instructions, setInstructions] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [mapFor, setMapFor] = useState<AddressKind | null>(null);
  const [mapPoint, setMapPoint] = useState<Coordinate>(DEFAULT_COORDS);
  const [mapError, setMapError] = useState(false);
  const [addressLabel, setAddressLabel] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressArea, setAddressArea] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [addressPhone, setAddressPhone] = useState("");
  const [addressSaving, setAddressSaving] = useState(false);
  const [success, setSuccess] = useState<{
    id: number;
    tracking: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      setAddresses(await getMerchantAddresses());
    } catch {
      setAddresses([]);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const selectedPickup = addresses.find((a) => a.id === pickupId);
  const selectedDropoff = addresses.find((a) => a.id === dropoffId);
  function choose(kind: AddressKind, id: number) {
    if (kind === "pickup") setPickupId(id);
    else setDropoffId(id);
    setErrors((e) => ({ ...e, [kind]: "" }));
  }
  async function saveMapAddress() {
    if (!mapFor || addressSaving) return;
    if (!addressCity.trim() || !addressLine.trim()) {
      Alert.alert(
        t("بيانات ناقصة", "Missing details"),
        t(
          "المدينة وتفاصيل العنوان مطلوبتان",
          "City and address details are required",
        ),
      );
      return;
    }
    const kind = mapFor;
    setAddressSaving(true);
    try {
      const created = await createMerchantAddress({
        label:
          addressLabel.trim() ||
          (kind === "pickup"
            ? t("موقع الاستلام", "Pickup location")
            : t("موقع التسليم", "Drop-off location")),
        city: addressCity.trim(),
        area: addressArea.trim() || undefined,
        address_line: addressLine.trim(),
        contact_phone: addressPhone.trim() || undefined,
        latitude: mapPoint.latitude,
        longitude: mapPoint.longitude,
      });
      setAddresses((previous) => [
        ...previous.filter((a) => a.id !== created.id),
        created,
      ]);
      choose(kind, created.id);
      setMapFor(null);
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;

      Alert.alert(
        t("تعذر حفظ العنوان", "Unable to save address"),
        status === 422
          ? getValidationMessage(
              err,
              t("تحقق من بيانات العنوان", "Check address details"),
            )
          : status === 401
            ? t("انتهت جلسة تسجيل الدخول", "Your session has expired")
            : status === 403
              ? t("ليس لديك صلاحية إنشاء الطلب", "You cannot create deliveries")
              : t(
                  "تحقق من الاتصال وحاول مجدداً",
                  "Check your connection and try again",
                ),
      );
    }
  }
  function next() {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (pickupId == null) {
        e.pickup = t("اختر عنوان الاستلام", "Select pickup address");
      }

      if (dropoffId == null) {
        e.dropoff = t("اختر عنوان التسليم", "Select drop-off address");
      }

      if (pickupId != null && dropoffId != null && pickupId === dropoffId) {
        e.dropoff = t(
          "يجب أن يختلف عنوان التسليم عن عنوان الاستلام",
          "Drop-off address must differ from pickup address",
        );
      }
    }
    if (step === 1) {
      if (!recipientName.trim())
        e.name = t("اسم المستلم مطلوب", "Recipient name is required");
      if (!recipientPhone.trim())
        e.phone = t("رقم الهاتف مطلوب", "Phone number is required");
      else if (recipientPhone.replace(/\D/g, "").length < 7)
        e.phone = t("أدخل رقم هاتف صحيحاً", "Enter a valid phone number");
    }
    if (step === 2 && weight.trim()) {
      const n = Number(weight.trim().replace(",", "."));
      if (!Number.isFinite(n) || n <= 0)
        e.weight = t("الوزن غير صحيح", "Invalid weight");
    }
    setErrors(e);
    if (Object.keys(e).length) return;
    setStep((s) => Math.min(s + 1, 3));
  }
  async function submit() {
    if (busy.current || saving) return;

    const validationErrors: Record<string, string> = {};

    if (pickupId == null) {
      validationErrors.pickup = t(
        "اختر عنوان الاستلام",
        "Select pickup address",
      );
    }

    if (dropoffId == null) {
      validationErrors.dropoff = t(
        "اختر عنوان التسليم",
        "Select drop-off address",
      );
    } else if (pickupId === dropoffId) {
      validationErrors.dropoff = t(
        "يجب أن يختلف عنوان التسليم عن الاستلام",
        "Drop-off address must differ from pickup address",
      );
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStep(0);
      return;
    }

    if (!recipientName.trim()) {
      validationErrors.name = t(
        "اسم المستلم مطلوب",
        "Recipient name is required",
      );
    }

    const phone = recipientPhone.trim();
    if (!phone) {
      validationErrors.phone = t(
        "رقم هاتف المستلم مطلوب",
        "Recipient phone is required",
      );
    } else if (phone.replace(/\\D/g, "").length < 7) {
      validationErrors.phone = t(
        "أدخل رقم هاتف صحيحاً",
        "Enter a valid phone number",
      );
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setStep(1);
      return;
    }

    const weightText = weight.trim().replace(",", ".");
    const parsedWeight = weightText ? Number(weightText) : undefined;

    if (
      parsedWeight !== undefined &&
      (!Number.isFinite(parsedWeight) || parsedWeight <= 0)
    ) {
      setErrors({
        weight: t("الوزن غير صحيح", "Invalid weight"),
      });
      setStep(2);
      return;
    }

    if (pickupId == null || dropoffId == null) return;

    busy.current = true;
    setSaving(true);
    setErrors({});

    try {
      const delivery = await createDelivery({
        pickup_address_id: pickupId,
        dropoff_address_id: dropoffId,
        recipient_name: recipientName.trim(),
        recipient_phone: phone,
        ...(packageType.trim()
          ? { package_type: packageType.trim() }
          : {}),
        ...(parsedWeight !== undefined
          ? { weight: parsedWeight }
          : {}),
        ...(instructions.trim()
          ? { special_instructions: instructions.trim() }
          : {}),
      });

      setSuccess({
        id: delivery.id,
        tracking: delivery.tracking_number || String(delivery.id),
      });
    } catch (error) {
      const status = axios.isAxiosError(error)
        ? error.response?.status
        : undefined;

      let message = getValidationMessage(
        error,
        t(
          "تعذر إنشاء الطلب. تحقق من الاتصال وحاول مجدداً.",
          "Unable to create delivery. Check your connection and try again.",
        ),
      );

      if (status === 401) {
        message = t(
          "انتهت جلسة تسجيل الدخول. سجل الدخول مجدداً.",
          "Your session has expired. Please sign in again.",
        );
      } else if (status === 403) {
        message = t(
          "ليس لديك صلاحية إنشاء طلب توصيل.",
          "You do not have permission to create deliveries.",
        );
      } else if (status === 429) {
        message = t(
          "طلبات كثيرة. انتظر قليلاً ثم حاول مجدداً.",
          "Too many requests. Please try again later.",
        );
      }

      Alert.alert(
        t("تعذر إنشاء طلب التوصيل", "Unable to create delivery"),
        message,
      );
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  const stepTitles = [
    t("عناوين التوصيل", "Delivery addresses"),
    t("بيانات المستلم", "Recipient details"),
    t("تفاصيل الطرد", "Package details"),
    t("مراجعة الطلب", "Review order"),
  ];

  function input(
    label: string,
    value: string,
    change: (v: string) => void,
    placeholder: string,
    key: string,
    keyboard: "default" | "phone-pad" | "decimal-pad" = "default",
    multiline = false,
  ) {
    return (
      <View style={styles.field} key={key}>
        <Text style={[styles.label, { textAlign: ar ? "right" : "left" }]}>
          {label}
        </Text>
        <TextInput
          value={value}
          onChangeText={(v) => {
            change(v);
            setErrors((e) => ({ ...e, [key]: "" }));
          }}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboard}
          multiline={multiline}
          style={[
            styles.input,
            multiline && styles.multiline,
            errors[key] && styles.invalid,
            { textAlign: ar ? "right" : "left" },
          ]}
        />
        {!!errors[key] && <Text style={styles.error}>{errors[key]}</Text>}
      </View>
    );
  }
  function addressCard(kind: AddressKind) {
    const pickup = kind === "pickup";
    const id = pickup ? pickupId : dropoffId;
    return (
      <View style={styles.card} key={kind}>
        <View style={styles.sectionHeading}>
          <View
            style={[
              styles.circle,
              { backgroundColor: pickup ? C.blue : "#F43F5E" },
            ]}
          >
            <Ionicons
              name={pickup ? "home" : "location"}
              size={18}
              color="white"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.sectionTitle,
                { textAlign: ar ? "right" : "left" },
              ]}
            >
              {pickup
                ? t("عنوان الاستلام", "Pickup address")
                : t("عنوان التسليم", "Drop-off address")}
            </Text>
            <Text style={[styles.hint, { textAlign: ar ? "right" : "left" }]}>
              {t(
                "اختر من عناوينك أو استكشف الخريطة",
                "Choose a saved address or explore the map",
              )}
            </Text>
          </View>
        </View>
        <View style={styles.modeRow}>
          <Pressable style={[styles.modeButton, styles.modeActive]}>
            <Ionicons name="home-outline" color={C.blue} size={17} />
            <Text style={styles.modeText}>{t("عناويني", "My addresses")}</Text>
          </Pressable>
          <Pressable
            style={styles.modeButton}
            onPress={() => {
              setMapPoint(DEFAULT_COORDS);
              setMapError(false);
              setAddressLabel("");
              setAddressCity("");
              setAddressArea("");
              setAddressLine("");
              setAddressPhone("");
              setMapFor(kind);
            }}
          >
            <Ionicons name="map-outline" color={C.blue} size={17} />
            <Text style={styles.modeText}>{t("من الخريطة", "From map")}</Text>
          </Pressable>
        </View>
        {addresses.length === 0 ? (
          <Text style={styles.hint}>
            {t(
              "لا توجد عناوين محفوظة لهذا الحساب.",
              "No saved addresses for this account.",
            )}
          </Text>
        ) : (
          addresses.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => choose(kind, a.id)}
              style={[styles.address, id === a.id && styles.addressActive]}
            >
              <Ionicons
                name={id === a.id ? "radio-button-on" : "radio-button-off"}
                size={22}
                color={id === a.id ? C.blue : "#94A3B8"}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.addressTitle,
                    { textAlign: ar ? "right" : "left" },
                  ]}
                >
                  {a.label || `#${a.id}`}
                </Text>
                <Text
                  style={[styles.hint, { textAlign: ar ? "right" : "left" }]}
                >
                  {addressDescription(a, ar) ||
                    t("عنوان محفوظ", "Saved address")}
                </Text>
              </View>
              <Ionicons name="business-outline" size={20} color="#94A3B8" />
            </Pressable>
          ))
        )}

        {!!errors[kind] && <Text style={styles.error}>{errors[kind]}</Text>}
      </View>
    );
  }
  function summary(
    label: string,
    value: string,
    icon: React.ComponentProps<typeof Ionicons>["name"],
    edit: number,
  ) {
    return (
      <View style={styles.card}>
        <View style={styles.summaryTop}>
          <Ionicons name={icon} size={22} color={C.blue} />
          <Text
            style={[
              styles.sectionTitle,
              { flex: 1, textAlign: ar ? "right" : "left" },
            ]}
          >
            {label}
          </Text>
          <Pressable onPress={() => setStep(edit)}>
            <Text style={styles.edit}>{t("تعديل", "Edit")} ✎</Text>
          </Pressable>
        </View>
        <Text
          style={[styles.summaryText, { textAlign: ar ? "right" : "left" }]}
        >
          {value}
        </Text>
      </View>
    );
  }
  if (success)
    return (
      <View style={styles.successPage}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={55} color="white" />
        </View>
        <Text style={styles.successTitle}>
          {t("تم إنشاء طلب التوصيل بنجاح", "Delivery created successfully")}
        </Text>
        <Text style={styles.hint}>
          {t(
            "تم تسجيل الطلب في DeliveryHub",
            "Your delivery has been registered",
          )}
        </Text>
        <View style={styles.trackingCard}>
          <Text style={styles.hint}>{t("رقم التتبع", "Tracking number")}</Text>
          <Text selectable style={styles.tracking}>
            {success.tracking}
          </Text>
        </View>
        <Pressable
          style={styles.primary}
          onPress={() =>
            router.replace({
              pathname: "/merchant/deliveries/[id]",
              params: { id: String(success.id) },
            })
          }
        >
          <Text style={styles.primaryText}>
            {t("عرض تفاصيل الطلب", "View delivery")}
          </Text>
        </Pressable>
        <Pressable
          style={styles.secondary}
          onPress={() => {
            setSuccess(null);
            setStep(0);
            setRecipientName("");
            setRecipientPhone("");
            setPackageType("");
            setWeight("");
            setInstructions("");
            setPickupId(null);
            setDropoffId(null);
          }}
        >
          <Text style={styles.secondaryText}>
            {t("إنشاء طلب آخر", "Create another delivery")}
          </Text>
        </Pressable>
      </View>
    );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[C.navy, "#12346D", C.blue]}
        style={styles.header}
      >
        <View style={styles.top}>
          <Pressable
            onPress={() => (step > 0 ? setStep((s) => s - 1) : router.back())}
            style={styles.back}
          >
            <Ionicons
              name={ar ? "arrow-forward" : "arrow-back"}
              color="white"
              size={23}
            />
          </Pressable>
          <Text style={styles.brand}>
            Delivery<Text style={{ color: "#93C5FD" }}>Hub</Text>
          </Text>
          <Pressable
            onPress={() => setLanguage(ar ? "en" : "ar")}
            style={styles.back}
          >
            <Text style={{ color: "white", fontWeight: "800" }}>
              {ar ? "EN" : "عربي"}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.heroTitle}>
          {t("طلب توصيل جديد", "New delivery")}
        </Text>
        <Text style={styles.heroSubtitle}>
          {t(
            "أكمل الخطوات لإرسال طلب التوصيل",
            "Complete the steps to create your delivery",
          )}
        </Text>
        <View style={styles.progress}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[styles.progressSegment, i <= step && styles.progressOn]}
            />
          ))}
        </View>
      </LinearGradient>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.stepTitleRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{step + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.stepTitle, { textAlign: ar ? "right" : "left" }]}
              >
                {stepTitles[step]}
              </Text>
              <Text style={[styles.hint, { textAlign: ar ? "right" : "left" }]}>
                {t(`الخطوة ${step + 1} من 4`, `Step ${step + 1} of 4`)}
              </Text>
            </View>
          </View>
          {loading ? (
            <View style={styles.card}>
              <ActivityIndicator color={C.blue} />
              <Text style={styles.hint}>
                {t("جاري تحميل العناوين...", "Loading addresses...")}
              </Text>
            </View>
          ) : loadError ? (
            <View style={styles.card}>
              <Text style={styles.error}>
                {t("تعذر تحميل العناوين", "Could not load addresses")}
              </Text>
              <Pressable onPress={() => void load()} style={styles.secondary}>
                <Text style={styles.secondaryText}>
                  {t("إعادة المحاولة", "Retry")}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {step === 0 && (
                <>
                  {addressCard("pickup")}
                  {addressCard("dropoff")}
                </>
              )}
              {step === 1 && (
                <View style={styles.card}>
                  {input(
                    t("اسم المستلم *", "Recipient name *"),
                    recipientName,
                    setRecipientName,
                    t("الاسم الكامل", "Full name"),
                    "name",
                  )}
                  {input(
                    t("رقم الهاتف *", "Phone number *"),
                    recipientPhone,
                    setRecipientPhone,
                    "+971 5X XXX XXXX",
                    "phone",
                    "phone-pad",
                  )}
                  <View style={styles.notice}>
                    <Ionicons
                      name="information-circle-outline"
                      color={C.blue}
                      size={18}
                    />
                    <Text style={styles.noticeText}>
                      {t(
                        "تأكد من رقم الهاتف لتسهيل التواصل مع المستلم.",
                        "Check the phone number so the driver can contact the recipient.",
                      )}
                    </Text>
                  </View>
                </View>
              )}
              {step === 2 && (
                <View style={styles.card}>
                  {input(
                    t("نوع الطرد", "Package type"),
                    packageType,
                    setPackageType,
                    t("مثال: مستندات، ملابس", "e.g. documents, clothing"),
                    "package",
                  )}
                  {input(
                    t("الوزن بالكيلوغرام", "Weight in kg"),
                    weight,
                    setWeight,
                    "2.5",
                    "weight",
                    "decimal-pad",
                  )}
                  {input(
                    t("تعليمات إضافية", "Delivery instructions"),
                    instructions,
                    setInstructions,
                    t("ملاحظات للسائق", "Notes for the driver"),
                    "instructions",
                    "default",
                    true,
                  )}
                </View>
              )}
              {step === 3 && (
                <>
                  {summary(
                    t("عنوان الاستلام", "Pickup address"),
                    `${selectedPickup?.label || ""}\n${selectedPickup ? addressDescription(selectedPickup, ar) : ""}`,
                    "home-outline",
                    0,
                  )}
                  {summary(
                    t("عنوان التسليم", "Drop-off address"),
                    `${selectedDropoff?.label || ""}\n${selectedDropoff ? addressDescription(selectedDropoff, ar) : ""}`,
                    "location-outline",
                    0,
                  )}
                  {summary(
                    t("بيانات المستلم", "Recipient details"),
                    `${recipientName}\n${recipientPhone}`,
                    "person-outline",
                    1,
                  )}
                  {summary(
                    t("تفاصيل الطرد", "Package details"),
                    `${packageType || t("غير محدد", "Not specified")} · ${weight || "—"} kg\n${instructions || ""}`,
                    "cube-outline",
                    2,
                  )}
                  <View style={styles.notice}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={19}
                      color={C.blue}
                    />
                    <Text style={styles.noticeText}>
                      {t(
                        "سيتم إنشاء الطلب باستخدام العناوين المحفوظة المحددة أعلاه.",
                        "The delivery will use the saved addresses selected above.",
                      )}
                    </Text>
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
        {!loading && !loadError && (
          <View style={styles.footer}>
            {step > 0 && (
              <Pressable
                style={styles.secondarySmall}
                onPress={() => setStep((s) => s - 1)}
              >
                <Text style={styles.secondaryText}>{t("رجوع", "Back")}</Text>
              </Pressable>
            )}
            <Pressable
              disabled={saving}
              style={[styles.primary, { flex: 1 }, saving && { opacity: 0.6 }]}
              onPress={() => (step === 3 ? void submit() : next())}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.primaryText}>
                    {step === 3
                      ? t("إنشاء طلب التوصيل", "Create delivery")
                      : t("التالي", "Continue")}
                  </Text>
                  <Ionicons
                    name={step === 3 ? "paper-plane-outline" : "arrow-forward"}
                    size={18}
                    color="white"
                  />
                </>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
      <Modal
        visible={mapFor !== null}
        animationType="slide"
        onRequestClose={() => setMapFor(null)}
      >
        <View style={styles.mapPage}>
          <View style={styles.mapTop}>
            <Pressable onPress={() => setMapFor(null)}>
              <Ionicons name="close" color={C.navy} size={28} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.mapTitle}>
                {mapFor === "pickup"
                  ? t("تحديد موقع الاستلام", "Select pickup location")
                  : t("تحديد موقع التسليم", "Select drop-off location")}
              </Text>
              <Text style={styles.hint}>
                {t(
                  "اضغط على الخريطة لتحديد الموقع",
                  "Tap the map to select a location",
                )}
              </Text>
            </View>
          </View>
          {mapFor !== null && (
            <LocationMap
              mapKey={mapFor}
              point={mapPoint}
              onSelect={setMapPoint}
              onError={() => setMapError(true)}
            />
          )}
          {mapError && (
            <View style={styles.notice}>
              <Ionicons name="warning-outline" size={18} color={C.red} />
              <Text style={styles.noticeText}>
                {t(
                  "تعذر تحميل الخريطة. تحقق من اتصال الإنترنت.",
                  "Could not load the map. Check your internet connection.",
                )}
              </Text>
            </View>
          )}
          <View style={styles.mapSheet}>
            <Text style={styles.coords}>
              {mapPoint.latitude.toFixed(6)}, {mapPoint.longitude.toFixed(6)}
            </Text>
            <ScrollView
              style={{ maxHeight: 230 }}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                style={styles.input}
                value={addressLabel}
                onChangeText={setAddressLabel}
                placeholder={t(
                  "اسم العنوان (اختياري)",
                  "Address label (optional)",
                )}
                placeholderTextColor="#94A3B8"
              />
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={addressCity}
                onChangeText={setAddressCity}
                placeholder={t("المدينة *", "City *")}
                placeholderTextColor="#94A3B8"
              />
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={addressArea}
                onChangeText={setAddressArea}
                placeholder={t("المنطقة", "Area")}
                placeholderTextColor="#94A3B8"
              />
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={addressLine}
                onChangeText={setAddressLine}
                placeholder={t("تفاصيل العنوان *", "Address details *")}
                placeholderTextColor="#94A3B8"
              />
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={addressPhone}
                onChangeText={setAddressPhone}
                placeholder={t(
                  "رقم التواصل (اختياري)",
                  "Contact phone (optional)",
                )}
                keyboardType="phone-pad"
                placeholderTextColor="#94A3B8"
              />
            </ScrollView>
            <Pressable
              disabled={addressSaving}
              style={[styles.primary, addressSaving && { opacity: 0.6 }]}
              onPress={() => void saveMapAddress()}
            >
              {addressSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.primaryText}>
                    {t("حفظ واستخدام هذا العنوان", "Save and use this address")}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FFFFFF24",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontSize: 21, color: "white", fontWeight: "800" },
  heroTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "white",
    textAlign: "center",
  },
  heroSubtitle: {
    color: "#DBEAFE",
    textAlign: "center",
    marginTop: 8,
    fontSize: 12,
  },
  progress: { flexDirection: "row", gap: 7, marginTop: 24 },
  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 4,
    backgroundColor: "#FFFFFF44",
  },
  progressOn: { backgroundColor: "white" },
  content: { padding: 16, paddingBottom: 32, gap: 15 },
  stepTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  stepNumber: {
    width: 37,
    height: 37,
    borderRadius: 19,
    backgroundColor: C.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: { color: "white", fontWeight: "800", fontSize: 17 },
  stepTitle: { fontSize: 19, fontWeight: "800", color: C.navy },
  hint: { color: C.muted, fontSize: 12, lineHeight: 19, marginTop: 3 },
  card: {
    backgroundColor: "white",
    padding: 17,
    borderRadius: 20,
    borderColor: "#E7ECF4",
    borderWidth: 1,
    gap: 13,
  },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 12 },
  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: { color: C.navy, fontSize: 16, fontWeight: "800" },
  modeRow: { flexDirection: "row", gap: 9 },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    backgroundColor: "#F0F5FF",
    borderRadius: 12,
  },
  modeActive: { borderColor: "#C6D8FF", borderWidth: 1 },
  modeText: { fontSize: 12, fontWeight: "700", color: C.blue },
  address: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 12,
  },
  addressActive: { borderColor: C.blue, backgroundColor: C.pale },
  addressTitle: { fontSize: 14, fontWeight: "800", color: C.navy },
  field: { gap: 7 },
  label: { fontSize: 13, fontWeight: "700", color: C.navy },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    padding: 14,
    color: C.navy,
    fontSize: 15,
    backgroundColor: "white",
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  invalid: { borderColor: C.red },
  error: { color: C.red, fontSize: 12 },
  notice: {
    backgroundColor: "#F0F6FF",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  noticeText: { flex: 1, fontSize: 12, color: "#34527C", lineHeight: 20 },
  footer: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 14,
    flexDirection: "row",
    gap: 10,
  },
  primary: {
    backgroundColor: C.blue,
    borderRadius: 13,
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontWeight: "800", fontSize: 15, color: "white" },
  secondarySmall: {
    paddingHorizontal: 20,
    backgroundColor: "#EEF4FF",
    borderRadius: 13,
    justifyContent: "center",
  },
  secondary: {
    padding: 15,
    backgroundColor: "#EEF4FF",
    borderRadius: 13,
    alignItems: "center",
  },
  secondaryText: { color: C.blue, fontWeight: "800" },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  summaryText: { color: "#334155", fontSize: 13, lineHeight: 23 },
  edit: { color: C.blue, fontWeight: "700", fontSize: 12 },
  successPage: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 25,
    justifyContent: "center",
    alignItems: "center",
    gap: 19,
  },
  successIcon: {
    backgroundColor: "#10B981",
    width: 105,
    height: 105,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    color: C.navy,
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
  },
  trackingCard: {
    width: "100%",
    padding: 22,
    borderRadius: 18,
    backgroundColor: "white",
    alignItems: "center",
    gap: 12,
  },
  tracking: { fontSize: 22, fontWeight: "800", color: C.navy },
  mapPage: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: Platform.OS === "ios" ? 55 : 35,
  },
  mapTop: {
    paddingHorizontal: 17,
    paddingBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  mapTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: C.navy,
    textAlign: "center",
  },
  mapSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 19,
    gap: 13,
  },
  coords: {
    textAlign: "center",
    fontSize: 15,
    color: C.navy,
    fontWeight: "700",
  },
  mapWarning: {
    color: C.muted,
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
  },
});
