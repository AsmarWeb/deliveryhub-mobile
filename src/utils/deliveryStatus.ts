import type { DeliveryStatus } from "../services/deliveries";

type Language = "ar" | "en";

const statusLabels: Record<DeliveryStatus, { ar: string; en: string }> = {
  draft: {
    ar: "مسودة",
    en: "Draft",
  },
  pending_pricing: {
    ar: "بانتظار التسعير",
    en: "Pending pricing",
  },
  priced: {
    ar: "تم تحديد السعر",
    en: "Priced",
  },
  matching: {
    ar: "البحث عن سائق",
    en: "Finding driver",
  },
  assigned: {
    ar: "تم تعيين سائق",
    en: "Driver assigned",
  },
  accepted: {
    ar: "قبل السائق الطلب",
    en: "Accepted",
  },
  pickup: {
    ar: "جاري الاستلام",
    en: "Pickup",
  },
  in_transit: {
    ar: "في الطريق",
    en: "In transit",
  },
  delivered: {
    ar: "تم التسليم",
    en: "Delivered",
  },
  completed: {
    ar: "مكتمل",
    en: "Completed",
  },
  cancelled: {
    ar: "ملغي",
    en: "Cancelled",
  },
  pickup_failed: {
    ar: "فشل الاستلام",
    en: "Pickup failed",
  },
  delivery_failed: {
    ar: "فشل التسليم",
    en: "Delivery failed",
  },
  rescheduled: {
    ar: "أُعيدت الجدولة",
    en: "Rescheduled",
  },
  expired: {
    ar: "منتهي الصلاحية",
    en: "Expired",
  },
};

export function getDeliveryStatusLabel(
  status: DeliveryStatus | string,
  language: Language = "ar",
): string {
  const label = statusLabels[status as DeliveryStatus];

  return label ? label[language] : status.replace(/_/g, " ");
}
