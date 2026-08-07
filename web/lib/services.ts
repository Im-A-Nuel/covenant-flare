export interface Service {
  name: string;
  cat: string;
  price: string;
  verified: boolean;
  desc: string;
  color: string;
  calls: number;
}

/** Demo x402 service catalog. Decorative/narrative -- these are display-only
 * entries, not read from chain. A covenant's real allow-list is addresses
 * (allowedRecipients), not these names. */
export const SERVICES: Service[] = [
  {
    name: "venice.ai",
    cat: "AI inference & planning",
    price: "0.05–0.40",
    verified: true,
    desc: "Reasoning, task planning and report generation for agents.",
    color: "#7e57c2",
    calls: 42,
  },
  {
    name: "market-api.demo",
    cat: "Market data & sentiment",
    price: "0.25",
    verified: true,
    desc: "Real-time sentiment, volatility and spot-price feeds.",
    color: "#2775ca",
    calls: 31,
  },
  {
    name: "inference.xyz",
    cat: "Model inference",
    price: "0.10",
    verified: true,
    desc: "Embeddings and lightweight inference endpoints.",
    color: "#2f8f5b",
    calls: 6,
  },
  {
    name: "news-feed.io",
    cat: "News & research bundles",
    price: "0.80",
    verified: false,
    desc: "Premium curated news bundles. Exceeds common per-request limits.",
    color: "#b08900",
    calls: 0,
  },
  {
    name: "scraper.cheap",
    cat: "Bulk scraping",
    price: "0.05",
    verified: false,
    desc: "Unverified bulk metadata scraper. Blocked by default policy.",
    color: "#cf4b3e",
    calls: 0,
  },
];
