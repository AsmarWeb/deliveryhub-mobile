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
