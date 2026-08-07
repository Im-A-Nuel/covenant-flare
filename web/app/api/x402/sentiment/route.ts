import { NextResponse } from "next/server";

/**
 * Demo x402-enabled paid endpoint. Narrative/UX flavor for the "agent hits a
 * 402, then pays" flow -- the price and payTo quoted here are illustrative.
 * The REAL on-chain payment (RunFlow's settle step) always targets one of the
 * connected covenant's own allowedRecipients, checked and priced for real by
 * CovenantVault.pay() via FTSO, not by this route. This route never verifies
 * a CovenantVault payment itself; it just demonstrates the x402 handshake.
 *
 * GET without `X-PAYMENT` -> 402 Payment Required (x402 envelope).
 * GET with `X-PAYMENT`    -> 200, resource delivered (proof format is free-form demo text).
 */

const PRICE_USD = 0.25;
const PAY_TO = process.env.X402_PAY_TO || "0x0000000000000000000000000000000000dEaD";

function priceCents(p: number): number {
  return Math.round(p * 100);
}

function paywall() {
  return NextResponse.json(
    {
      x402Version: 1,
      error: "Payment Required",
      accepts: [
        {
          scheme: "exact",
          network: "flare-coston2",
          maxAmountRequired: priceCents(PRICE_USD).toString(),
          resource: "/api/x402/sentiment",
          description: "ETH short-term sentiment report (paid)",
          mimeType: "application/json",
          payTo: PAY_TO,
          asset: "FXRP",
          assetName: "FXRP",
          maxTimeoutSeconds: 120,
          extra: { decimals: 2, purpose: "research-data-purchase", verified: true, service: "market-api.demo" },
        },
      ],
    },
    { status: 402, headers: { "x-accept-payment": "exact flare-coston2 FXRP" } }
  );
}

export async function GET(req: Request) {
  const payment = req.headers.get("x-payment");
  if (!payment) return paywall();

  return NextResponse.json(
    {
      paid: true,
      paymentProof: payment,
      resource: {
        asset: "ETH",
        horizon: "short-term",
        sentimentScore: -0.22,
        sentimentLabel: "slightly negative",
        fundingRate: "elevated",
        socialVolume: "rising",
        confidence: 0.71,
        note: "Aggregated paid sentiment + derivatives funding. Mild downside risk, no structural red flags.",
      },
    },
    { status: 200 }
  );
}
