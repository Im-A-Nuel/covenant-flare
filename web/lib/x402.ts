import { uid } from "./utils";

export interface PaymentRequest {
  id: string;
  service: string;
  resource: string;
  priceUsd: number;
  payTo: string;
  purpose: string;
}

interface X402Accept {
  maxAmountRequired: string;
  resource: string;
  description: string;
  payTo: string;
  extra?: { decimals?: number; purpose?: string; service?: string };
}

/** Call the paid demo service. Returns either the delivered data or a 402 paywall. */
export async function requestPaidData(
  endpoint = "/api/x402/sentiment"
): Promise<{ status: "ok"; data: unknown } | { status: "paywall"; payment: PaymentRequest; endpoint: string }> {
  const res = await fetch(endpoint, { headers: { accept: "application/json" } });
  if (res.status === 402) {
    const body = await res.json();
    const accept: X402Accept = body.accepts?.[0];
    const decimals = accept.extra?.decimals ?? 2;
    const priceUsd = Number(accept.maxAmountRequired) / 10 ** decimals;
    const payment: PaymentRequest = {
      id: uid("pay"),
      service: accept.extra?.service || "market-api.demo",
      resource: accept.description,
      priceUsd,
      payTo: accept.payTo,
      purpose: accept.extra?.purpose ?? "research-data-purchase",
    };
    return { status: "paywall", payment, endpoint };
  }
  const data = await res.json();
  return { status: "ok", data };
}

export interface DeliveryResult {
  delivered: boolean;
  resource?: unknown;
}

/** Re-request the resource with a payment proof (the real settlement tx hash) in the X-PAYMENT header. */
export async function settleAndDeliver(endpoint: string, paymentProof: string): Promise<DeliveryResult> {
  const res = await fetch(endpoint, { headers: { accept: "application/json", "x-payment": paymentProof } });
  if (res.status === 402) return { delivered: false };
  const body = await res.json().catch(() => ({}));
  return { delivered: !!body.paid, resource: body.resource };
}
