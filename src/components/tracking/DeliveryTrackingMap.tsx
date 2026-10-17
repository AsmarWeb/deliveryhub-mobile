import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import WebView from "react-native-webview";

export type TrackingPoint = {
  latitude: number;
  longitude: number;
};

type Props = {
  driverLocation?: TrackingPoint | null;
  pickupLocation?: TrackingPoint | null;
  dropoffLocation?: TrackingPoint | null;
  lastUpdatedAt?: string | null;
};

function validPoint(
  point?: TrackingPoint | null
): point is TrackingPoint {
  return (
    !!point &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

const HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport"
        content="width=device-width, initial-scale=1, maximum-scale=1">

  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <style>
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
  </style>
</head>

<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <script>
    const map = L.map("map", {
      zoomControl: true
    }).setView([25.2048, 55.2708], 11);

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19
      }
    ).addTo(map);

    const markers = {};

    function updateMarker(key, point, label, color) {
      if (!point) {
        if (markers[key]) {
          map.removeLayer(markers[key]);
          delete markers[key];
        }
        return;
      }

      const position = [point.latitude, point.longitude];

      if (markers[key]) {
        markers[key].setLatLng(position);
        return;
      }

      markers[key] = L.circleMarker(position, {
        radius: 10,
        color: "#ffffff",
        weight: 3,
        fillColor: color,
        fillOpacity: 1
      }).addTo(map).bindPopup(label);
    }

    function updateTracking(data) {
      updateMarker(
        "driver",
        data.driverLocation,
        "Driver",
        "#2563EB"
      );

      updateMarker(
        "pickup",
        data.pickupLocation,
        "Pickup",
        "#059669"
      );

      updateMarker(
        "dropoff",
        data.dropoffLocation,
        "Drop-off",
        "#DC2626"
      );

      const points = [
        data.driverLocation,
        data.pickupLocation,
        data.dropoffLocation
      ].filter(Boolean);

      if (points.length > 1 && !window.hasFitted) {
        map.fitBounds(
          L.latLngBounds(
            points.map(p => [p.latitude, p.longitude])
          ),
          { padding: [35, 35] }
        );
        window.hasFitted = true;
      } else if (points.length === 1 && !window.hasFitted) {
        map.setView(
          [points[0].latitude, points[0].longitude],
          14
        );
        window.hasFitted = true;
      }
    }

    function receiveMessage(event) {
      try {
        const data = JSON.parse(event.data);
        updateTracking(data);
      } catch (error) {
        console.error("Tracking update failed", error);
      }
    }

    document.addEventListener("message", receiveMessage);
    window.addEventListener("message", receiveMessage);

    window.ReactNativeWebView?.postMessage("MAP_READY");
  </script>
</body>
</html>
`;

export default function DeliveryTrackingMap({
  driverLocation,
  pickupLocation,
  dropoffLocation,
  lastUpdatedAt,
}: Props) {
  const webViewRef = useRef<WebView>(null);
  const ready = useRef(false);

  const payload = useMemo(
    () => ({
      driverLocation: validPoint(driverLocation)
        ? driverLocation
        : null,
      pickupLocation: validPoint(pickupLocation)
        ? pickupLocation
        : null,
      dropoffLocation: validPoint(dropoffLocation)
        ? dropoffLocation
        : null,
    }),
    [driverLocation, pickupLocation, dropoffLocation]
  );

  const payloadRef = useRef(payload);
  payloadRef.current = payload;

  const sendUpdate = (data: typeof payload) => {
    if (!ready.current) return;

    webViewRef.current?.postMessage(JSON.stringify(data));
  };

  useEffect(() => {
    sendUpdate(payload);
  }, [payload]);

  const date = lastUpdatedAt
    ? new Date(lastUpdatedAt)
    : null;

  const validDate =
    date !== null && !Number.isNaN(date.getTime());

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: HTML, baseUrl: "https://localhost" }}
        javaScriptEnabled
        domStorageEnabled
        onLoadStart={() => {
          ready.current = false;
        }}
        onMessage={(event) => {
          if (event.nativeEvent.data === "MAP_READY") {
            ready.current = true;
            sendUpdate(payloadRef.current);
          }
        }}
        style={styles.map}
      />

      <View style={styles.footer}>
        <Text style={styles.text}>
          {validDate
            ? `آخر تحديث: ${date!.toLocaleString()}`
            : "بانتظار تحديث موقع السائق"}
        </Text>

        <Text style={styles.attribution}>
          © OpenStreetMap contributors
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  map: {
    width: "100%",
    height: 340,
  },
  footer: {
    padding: 12,
    gap: 5,
  },
  text: {
    color: "#475569",
    fontSize: 12,
    textAlign: "center",
  },
  attribution: {
    color: "#94A3B8",
    fontSize: 10,
    textAlign: "center",
  },
});
