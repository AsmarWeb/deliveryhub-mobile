import api from "./api";

export type BillingPlan = {
  id: number;
  name: string;
  slug: string;
  monthly_price: string | number;
  currency: string;
  commission_rate: string | number;
  monthly_delivery_limit: number | null;
  max_active_automations: number;
};

export type CurrentSubscription = {
  id: number;
  status: string;
  starts_at: string;
  ends_at: string | null;
  has_access: boolean;
  can_use_automations: boolean;
  stripe_status: string | null;
  automation_usage: number;
  provider: "stripe" | "manual";
  plan: BillingPlan;
};

export async function getBillingPlans(signal?: AbortSignal): Promise<BillingPlan[]> {
  const response = await api.get<{ data: BillingPlan[] }>(
    "/merchant/billing/plans", { signal }
  );
  return response.data.data;
}

export async function getCurrentSubscription(signal?: AbortSignal): Promise<CurrentSubscription | null> {
  const response = await api.get<{ data: CurrentSubscription | null }>(
    "/merchant/billing/current", { signal }
  );
  return response.data.data;
}

export async function createBillingCheckout(
  plan: "growth" | "business"
): Promise<string> {
  const response = await api.post<{ checkout_url: string }>(
    "/merchant/billing/checkout",
    { plan }
  );

  const url = response.data?.checkout_url;

  if (
    typeof url !== "string" ||
    !isStripeBillingUrl(url, "checkout.stripe.com")
  ) {
    throw new Error("Invalid Stripe Checkout URL");
  }

  return url;
}

export async function openBillingPortal(): Promise<string> {
  const response = await api.post<{ portal_url: string }>(
    "/merchant/billing/portal"
  );

  const url = response.data?.portal_url;

  if (!url || !isStripeBillingUrl(url, "billing.stripe.com")) {
    throw new Error("Invalid billing portal URL");
  }

  return url;
}

export function isStripeBillingUrl(value: unknown, hostname: string): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === hostname
      && !url.username && !url.password && (!url.port || url.port === "443");
  } catch { return false; }
}

export function hasPaidAccess(subscription: CurrentSubscription | null): boolean {
  return subscription?.has_access === true;
}

export function shouldManageSubscription(subscription: CurrentSubscription | null): boolean {
  return subscription?.provider === "stripe" && (
    hasPaidAccess(subscription)
    || !["canceled", "incomplete_expired"].includes(subscription.stripe_status ?? "")
  );
}

// Stable user-facing messages; never expose provider responses or secrets.
export function billingErrorMessage(error: unknown, isArabic: boolean): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const messages: Record<number, [string, string]> = {
    401: ["انتهت الجلسة. سجّل الدخول مجددًا.", "Your session expired. Sign in again."],
    403: ["لا يملك هذا الحساب صلاحية إدارة الفوترة.", "This account cannot manage billing."],
    409: ["لديك اشتراك بالفعل. افتح إدارة الاشتراك لتعديله.", "You already have a subscription. Open Manage subscription to change it."],
    429: ["طلبات كثيرة. انتظر قليلًا ثم أعد المحاولة.", "Too many requests. Wait a moment and retry."],
    503: ["الفوترة غير متاحة حاليًا. تواصل مع الدعم إذا استمرت المشكلة.", "Billing is temporarily unavailable. Contact support if this continues."],
  };
  const fallback: [string, string] = ["تعذر الاتصال بخدمة الفوترة. تحقق من الاتصال وأعد المحاولة.", "Could not connect to billing. Check your connection and retry."];
  return (messages[status ?? 0] ?? fallback)[isArabic ? 0 : 1];
}
