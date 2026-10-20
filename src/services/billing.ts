import api from "./api";

export type BillingPlan = {
  id: number;
  name: string;
  slug: string;
  monthly_price: string | number;
  currency: string;
  commission_rate: string | number;
  monthly_delivery_limit: number | null;
};

export type CurrentSubscription = {
  id: number;
  status: string;
  starts_at: string;
  ends_at: string;
  provider: "stripe" | "manual";
  plan: BillingPlan;
};

export async function getBillingPlans(): Promise<BillingPlan[]> {
  const response = await api.get<{ data: BillingPlan[] }>(
    "/merchant/billing/plans"
  );
  return response.data.data;
}

export async function getCurrentSubscription(): Promise<CurrentSubscription | null> {
  const response = await api.get<{ data: CurrentSubscription | null }>(
    "/merchant/billing/current"
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
    !url.startsWith("https://checkout.stripe.com/")
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

  if (!url || !url.startsWith("https://billing.stripe.com/")) {
    throw new Error("Invalid billing portal URL");
  }

  return url;
}
