export const UAE_EMIRATES = [
  { value: "abu_dhabi", ar: "أبوظبي", en: "Abu Dhabi" },
  { value: "dubai", ar: "دبي", en: "Dubai" },
  { value: "sharjah", ar: "الشارقة", en: "Sharjah" },
  { value: "ajman", ar: "عجمان", en: "Ajman" },
  { value: "umm_al_quwain", ar: "أم القيوين", en: "Umm Al Quwain" },
  { value: "ras_al_khaimah", ar: "رأس الخيمة", en: "Ras Al Khaimah" },
  { value: "fujairah", ar: "الفجيرة", en: "Fujairah" },
] as const;
export function normalizeMakani(input: string): string {
  return input.replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x6f0)).replace(/\s/g, "");
}
export type AddressDetails = {
  address_line?: string | null; building?: string | null; unit?: string | null;
  street?: string | null; area?: string | null; city?: string | null;
  emirate?: string | null; landmark?: string | null; makani_number?: string | null;
};
export function formatAddress(address: AddressDetails, ar = false): string {
  const emirate = UAE_EMIRATES.find(item => item.value === address.emirate);
  const parts = [address.address_line, address.building,
    address.unit ? `${ar ? "الوحدة" : "Unit"} ${address.unit}` : null,
    address.street, address.area, address.city,
    emirate ? (ar ? emirate.ar : emirate.en) : null,
    address.landmark ? `${ar ? "بالقرب من" : "Near"} ${address.landmark}` : null,
    address.makani_number ? `${ar ? "مكاني" : "Makani"} ${address.makani_number}` : null,
  ].map(value => value?.trim()).filter((value): value is string => Boolean(value));
  return [...new Set(parts)].join(ar ? "، " : ", ");
}

export function addressDestination(address: AddressDetails & { latitude?: number | string | null; longitude?: number | string | null }): string {
  const latitude = address.latitude;
  const longitude = address.longitude;
  if (latitude !== null && latitude !== undefined && latitude !== "" && longitude !== null && longitude !== undefined && longitude !== "") {
    const lat = Number(latitude), lng = Number(longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) return `${lat},${lng}`;
  }
  return formatAddress({ address_line: address.address_line, street: address.street, area: address.area, city: address.city, emirate: address.emirate });
}
